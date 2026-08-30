import os
import redis
from dotenv import load_dotenv

load_dotenv()

REDIS_HOST = os.getenv("REDIS_HOST", "redis")
REDIS_PORT = int(os.getenv("REDIS_PORT"))

_client: redis.Redis | None = None

def get_redis() -> redis.Redis:
    """
    Returns a shared Redis client, initializing it on first call.
    Mirrors the singleton pattern in redis.ts
    """
    global _client

    if _client is None:
        _client = redis.Redis(
            host=REDIS_HOST,
            port=REDIS_PORT,
            decode_responses=True,
        )

        try:
            _client.ping()
            print(f"redis_running_on_port:{REDIS_PORT}")
        except redis.ConnectionError as err:
            print(f"[Redis] connection failed: {err}")
            raise
    return _client

r = get_redis()