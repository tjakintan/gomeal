import os
import jwt
from fastapi import Header, HTTPException

ACCESS_SECRET = os.environ["JWT_ACCESS_SECRET"]

def decode_token(token: str) -> dict:
    """Raises jwt exceptions on failure — caller decides how to handle."""
    return jwt.decode(token, ACCESS_SECRET, algorithms=["HS256"])

def _user(authorization: str = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="unauthorized_access")

    token = authorization.split(" ", 1)[1]

    try:
        return decode_token(token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="invalid_or_expired_token")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="invalid_or_expired_token")