from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .router.instantiate import router

app = FastAPI(title="gomealAI Backend")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(router)
