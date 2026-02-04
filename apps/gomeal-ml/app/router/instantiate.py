# app/router/instantiate.py
from ..ml.recommendation import RecommendationEngine
from ..llm.generator import LLMGenerator
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

# Instantiate once when server starts
recommender = RecommendationEngine()
llm = LLMGenerator()

class UserRequest(BaseModel):
    user_sub: str

@router.post("/ai/recommend")
async def recommend(req: UserRequest):
    recs = recommender.recommend(req.user_sub);

    enhanced = [
        {
            "title": recipe,
            "caption": llm.generate_caption(recipe)
        }
        for recipe in recs
    ]

    return {
        "status": "success",
        "recommendations": enhanced
    }
