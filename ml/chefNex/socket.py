import jwt
import socketio
from deps.auth import decode_token

# session_id -> user payload, tracks which sockets are authenticated
_authenticated_sessions: dict[str, dict] = {}

def _chefNex_sockets(sio: socketio.AsyncServer):

    @sio.on("connect", namespace="/chefNex")
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


    @sio.on("disconnect", namespace="/chefNex")
    async def disconnect(sid):
        _authenticated_sessions.pop(sid, None)
        print(f"[chefNex_socket] => disconnected_{sid}")


    @sio.on("pcm_chunk", namespace="/chefNex")
    async def pcm_chunk(sid, data):
        user = _authenticated_sessions.get(sid)
        if not user:
            return {"error": "unauthorized_access"}

        # data is raw PCM bytes from the client mic capture
        # TODO: feed into Silero VAD -> STT pipeline
        pass


    @sio.on("stop_listening", namespace="/chefNex")
    async def stop_listening(sid):
        user = _authenticated_sessions.get(sid)
        if not user:
            return {"error": "unauthorized_access"}

        # TODO: finalize STT segment, kick off LLM -> TTS -> PCM response,
        # emit back via sio.emit("assistant_message", ..., to=sid, namespace="/chefNex")
        # and stream audio chunks via sio.emit("audio_chunk", chunk, to=sid, namespace="/chefNex")
        pass