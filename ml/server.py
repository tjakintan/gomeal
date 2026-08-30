import os
import sys
import subprocess
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import socketio
import uvicorn
import asyncio

from routes.feed.trending.trend import _set_trends_brain
from jobs.trend_refresh import _start_trend_score_refresh_job

load_dotenv()
from brain.boot import _boot_brain
from brain.api.subscriber import _set_subscription_brain, _start_thread
from routes.feed.rank.rank import _set_rank_brain

from routes.router import router

from services.socket_service import _sockets
from chefNex.socket import _chefNex_sockets

PORT = int(os.getenv("PORT", 6969))

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

sio = socketio.AsyncServer(cors_allowed_origins="*")
socket_app = socketio.ASGIApp(sio, other_asgi_app=app)

_sockets(sio)
_chefNex_sockets(sio)

app.state.ready = False
_ready = False

def _boot():
    global _ready
    
    print("[brain] => _booting")

    brain = _boot_brain()
    _set_rank_brain(brain)
    _set_trends_brain(brain)
    _set_subscription_brain(brain)
    _start_thread()

    app.state.ready = True
    _ready = True

    print("[brain] => _booted✅")

    _start_trend_score_refresh_job(interval_seconds=900)


@app.on_event("startup")
async def startup():
    asyncio.create_task(asyncio.to_thread(_boot))


if __name__ == "__main__":
    print(f"[SERVER] => Running on port {PORT}")
    uvicorn.run(socket_app, host="0.0.0.0", port=PORT)



