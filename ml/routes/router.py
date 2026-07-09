import traceback
from typing import Literal
from fastapi import APIRouter, HTTPException, Request

from routes.feed.trending.trend import _post_trends, _user_trends
from routes.feed.rank.rank import _rank

from routes.embed.embed_user_by_sub import _embed_user_by_sub 
from routes.embed.embed_post_by_id import _embed_post_by_id

router = APIRouter()

@router.get("/")
async def status():
    return {"status": "running"}


@router.get("/health")
async def health(request: Request):
    if not request.app.state.ready:
        raise HTTPException(
            status_code=503,
            detail="[brain] => _loading..."
        )

    return {"status": "healthy"}


@router.post("/embed/{post_id}")
async def embed_route(post_id: int):
    try:
        result = _embed_post_by_id(post_id)
        return result
    
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/embed-user/{user_sub}")
async def embed_user_route(user_sub: str):
    try:
        result = _embed_user_by_sub(user_sub)
        return result
    
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
  

@router.get("/rank/{user_sub}")
async def rank_feed(
    user_sub: str,
    limit: int = 20,
    selectedScope: Literal["dessert", "soup", "appetizer", "high_protein", "quick"] | None = None,
    markSeen: bool = False,
):
    try:
        post_ids = _rank(
            user_sub=user_sub,
            limit=limit,
            selected_scope=selectedScope,
            mark_seen=markSeen,
        )

        print(post_ids)

        return {
            "user_sub": user_sub,
            "post_ids": post_ids,
        }
    
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/trend/{user_sub}")
async def trends_route(user_sub: str, limit: int):
    try:
        
        trending_posts_ids = _post_trends(
            user_sub=user_sub,
            limit=limit,
        )
        trending_users_subs = _user_trends(
            user_sub=user_sub,
            limit=limit,
        )

        return {
            "post_ids": trending_posts_ids,
            "user_subs": trending_users_subs,
        }

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
