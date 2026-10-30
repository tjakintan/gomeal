import base64
import io
import uuid
import os

import jwt
import socketio

import asyncio

from cachetools import TTLCache

from agents.image import ImageAnalysis
from deps.auth import decode_token
from routes.feedback import save_feedback

# Bump this whenever the model, prompt, or any threshold changes.
# It's stored with every rating so you know which pipeline produced it.
PIPELINE_VERSION = os.getenv(
    "VLM_MODEL",
    "Qwen/Qwen3-VL-4B-Instruct",
)

# session_id -> user payload, tracks which sockets are authenticated
_authenticated_sessions: dict[str, dict] = {}

# session_id -> True while a frame is being processed, so we never
# run ImageAgent.run() concurrently for the same session.
_image_in_flight: dict[str, bool] = {}

# frame_id -> what we need to reconstruct a prediction when a rating arrives.
# TTL keeps memory bounded; frames nobody rates just expire.
_recent_frames: TTLCache = TTLCache(maxsize=200, ttl=900)

# Loaded once at import time — ImageAgent.__init__ pulls in both the
# VLM and the box detector, which is far too expensive to redo per
# connection or per frame.
_image_agent = ImageAnalysis()


def _chefNex_sockets(sio: socketio.AsyncServer):

    @sio.on("connect")
    async def connect(sid, environ, auth):
        token = (auth or {}).get("token")

        if not token:
            raise socketio.exceptions.ConnectionRefusedError("unauthorized_access")

        try:
            user = decode_token(token)
        except jwt.ExpiredSignatureError:
            raise socketio.exceptions.ConnectionRefusedError("invalid_or_expired_token")
        except jwt.InvalidTokenError:
            raise socketio.exceptions.ConnectionRefusedError("invalid_or_expired_token")

        _authenticated_sessions[sid] = user
        print(f"[chefNex_socket] => connected_{sid}_user_{user.get('sub')}")


    @sio.on("disconnect")
    async def disconnect(sid):
        _authenticated_sessions.pop(sid, None)
        _image_in_flight.pop(sid, None)
        print(f"[chefNex_socket] => disconnected_{sid}")


    @sio.on("image_frame")
    async def image_frame(sid, data):
        print(f"[chefNex_socket] image_frame_received sid={sid}")

        user = _authenticated_sessions.get(sid)

        if not user:
            print(f"[chefNex_socket] unauthorized_access sid={sid}")
            return {"error": "unauthorized_access"}

        if _image_in_flight.get(sid):
            print(f"[chefNex_socket] frame_already_processing sid={sid}")
            return {"error": "frame_already_processing"}

        _image_in_flight[sid] = True
        print(f"[chefNex_socket] processing_started sid={sid}")

        try:
            image_bytes = data["data"]
            width = int(data["width"])
            height = int(data["height"])
            pixel_format = data.get("pixel_format", "rgb")

            print(
                f"[chefNex_socket] frame_data sid={sid} bytes={len(image_bytes)} "
                f"width={width} height={height} pixel_format={pixel_format}"
            )

            results = await asyncio.to_thread(
                _image_agent.run,
                bytes(image_bytes),
                width=width,
                height=height,
                pixel_format=pixel_format,
            )

            frame_id = uuid.uuid4().hex
            for item in results["items"]:
                item["frameId"] = frame_id

            _recent_frames[frame_id] = {
                "sub": user.get("sub"),
                "image": bytes(image_bytes),
                "width": width,
                "height": height,
                "pixel_format": pixel_format,
                "items": results["items"],
                "trace": results.get("trace"),  
            }

            print(
                f"[chefNex_socket] emitting_frame_results sid={sid} "
                f"frame_id={frame_id} items={len(results['items'])} "
                f"similar_posts={len(results['similar_post_ids'])}"
            )

            await sio.emit(
                "frame_results",
                {
                    "items": results["items"],
                    "similar_post_ids": results["similar_post_ids"],
                },
                to=sid,
            )

        except Exception as exc:
            print(f"[chefNex_socket] => image_frame_error_{sid}: {type(exc).__name__}: {exc}")
            await sio.emit("detect_error", {"message": "detect_failed"}, to=sid)

        finally:
            _image_in_flight[sid] = False
            print(f"[chefNex_socket] processing_finished sid={sid}")


    @sio.on("feedback")
    async def feedback(sid, data):
        user = _authenticated_sessions.get(sid)
        if not user:
            return {"error": "unauthorized_access"}

        frame = _recent_frames.get(data.get("frame_id"))
        if not frame or frame["sub"] != user.get("sub"):
            return {"error": "frame_expired"}

        try:
            rating = int(data.get("rating", 0))
        except (TypeError, ValueError):
            return {"error": "bad_rating"}
        if rating not in (-1, 1):
            return {"error": "bad_rating"}

        item = next(
            (i for i in frame["items"] if i["id"] == data.get("item_id")),
            None,
        )

        try:
            fb_id = await asyncio.to_thread(
                save_feedback,
                user_sub=user["sub"],
                frame_id=data["frame_id"],
                item=item,
                rating=rating,
                reason=data.get("reason"),
                pipeline_version=PIPELINE_VERSION,
                trace=frame.get("trace"),
            )
        except Exception as exc:
            print(f"[chefNex_socket] feedback_error sid={sid}: {type(exc).__name__}: {exc}")
            return {"error": "feedback_failed"}

        # TODO: for 👎 (always) and sampled 👍, upload frame["image"] to S3,
        # then: await asyncio.to_thread(set_image_key, fb_id, key)

        return {"ok": True, "id": fb_id}