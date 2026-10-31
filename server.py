from load_config import settings  # Must be first: loads the selected environment.

import asyncio
import threading
import time
import urllib.error
import urllib.request

import socketio
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from chefnex_socket import _chefNex_sockets  # noqa: E402  (after load_config has set the env)

PORT = settings.port

# The LLM/VLM server (vLLM) this service depends on. vLLM exposes GET /health.
# Derived from LLM_BASE_URL when DEV=false; skipped when DEV=true (LM Studio has no /health).
LLM_HEALTH_URL = settings.llm_health_url

# Native React Native clients send no browser Origin, so [] is fine for them.
# If the web app (app.gomeal.org) ever opens the ChefNex socket from a browser, set e.g.
# CORS_ORIGINS=https://app.gomeal.org,https://api.gomeal.org,https://www.gomeal.org
CORS_ORIGINS = list(settings.cors_origins)

# On automatically when DEV=false (needs IMDS access, see the hop-limit note).
WATCH_SPOT_INTERRUPTION = settings.watch_spot_interruption

# Set when AWS announces this spot instance will be reclaimed. /health then
# returns 503 so the ALB stops sending new connections here.
_draining = threading.Event()


# --------------------------------------------------------------------------
# Spot interruption watcher (plain thread, so it doesn't depend on the ASGI
# lifespan, which socketio.ASGIApp may not forward to FastAPI)
# --------------------------------------------------------------------------

_IMDS = "http://169.254.169.254/latest"


def _imds_token() -> str:
    req = urllib.request.Request(
        f"{_IMDS}/api/token",
        method="PUT",
        headers={"X-aws-ec2-metadata-token-ttl-seconds": "300"},
    )
    with urllib.request.urlopen(req, timeout=2) as resp:
        return resp.read().decode()


def _watch_spot_interruption() -> None:
    while not _draining.is_set():
        time.sleep(5)
        try:
            req = urllib.request.Request(
                f"{_IMDS}/meta-data/spot/instance-action",
                headers={"X-aws-ec2-metadata-token": _imds_token()},
            )
            with urllib.request.urlopen(req, timeout=2) as resp:
                print(f"[ChefNex] Spot interruption notice: {resp.read().decode()}")
                _draining.set()
        except urllib.error.HTTPError as err:
            if err.code != 404:  # 404 means no interruption is scheduled
                print(f"[ChefNex] IMDS returned {err.code}")
        except Exception:
            pass  # not on EC2, or IMDS unreachable (see hop-limit note)


if WATCH_SPOT_INTERRUPTION:
    threading.Thread(target=_watch_spot_interruption, daemon=True).start()


# --------------------------------------------------------------------------
# App
# --------------------------------------------------------------------------

app = FastAPI(title="ChefNex-API-v1")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)

sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=CORS_ORIGINS,
    max_http_buffer_size=2_000_000,  # JPEG frames; default is 1 MB
)

# Loads the in-process models (OWLv2, CLIP, bge). This runs before uvicorn
# opens the port, so the ALB sees "connection refused" (= unhealthy) until it's done.
_chefNex_sockets(sio)

socket_app = socketio.ASGIApp(sio, other_asgi_app=app)


def _llm_ready() -> bool:
    if not LLM_HEALTH_URL:
        return True
    try:
        with urllib.request.urlopen(LLM_HEALTH_URL, timeout=2) as resp:
            return resp.status == 200
    except Exception:
        return False


@app.get("/health")
async def health():
    if _draining.is_set():
        return JSONResponse({"status": "draining"}, status_code=503)

    if not await asyncio.to_thread(_llm_ready):
        return JSONResponse({"status": "llm_not_ready"}, status_code=503)

    return JSONResponse({"status": "ok"}, status_code=200)


if __name__ == "__main__":
    # One process only: the models live in this process's memory.
    uvicorn.run(
        socket_app,
        host="0.0.0.0",
        port=PORT,
        workers=1,
    )