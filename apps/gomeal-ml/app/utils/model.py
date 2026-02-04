from pydantic import BaseModel, Field
from typing import List, Optional, Literal, Dict
from enum import Enum

# Structure Helpers
class ActionType(str, Enum):
    clicked_post = "clicked_post"
    liked_post = "liked_post"
    sent_message = "sent_message"
    opened_notification = "opened_notification"

class TargetType(str, Enum):
    post = "post"
    message = "message"
    conversation = "conversation"
    notification = "notification"

class PromptType(str, Enum):
    recommendation = "recommendation"
    generative = "generative"
    imageRecognition = "imageRecognition"
    suggestive = "suggestive"


# Structure
class UserAction(BaseModel):
    id: Optional[int] = None
    user_sub: str
    action_type: ActionType  # 'clicked_post', 'liked_post', 'sent_message', 'opened_notification', etc.
    target_type: TargetType # 'post', 'message', 'conversation', 'notification'
    target_id: Optional[int] = None
    metadata: Optional[Dict] = Field(default_factory=dict)
    action_weight: float = 1.0
    action_summary: Optional[str] = None
    context: Optional[Dict] = Field(default_factory=dict)
    created_at: Optional[str] = None  # ISO timestamp


class UserEngagement(BaseModel):
    user_sub: str
    post_clicks: int = 0
    post_likes: int = 0
    messages_sent: int = 0
    notifications_opened: int = 0
    last_message_id: Optional[int] = None
    last_post_id: Optional[int] = None
    dietary_preferences: Dict[str, bool] = Field(default_factory=dict)
    image_interactions: List[Dict] = Field(default_factory=list)  # e.g., [{"image_id": 123, "action": "view"}]
    engagement_score: float = 0.0
    last_updated: Optional[str] = None  # ISO timestamp


class Prompt(BaseModel):
    id: Optional[int] = None
    name: str
    template: Optional[str] = None  # e.g., "Analyze {last_user_message} and {user_context} to suggest next actions"
    description: Optional[str] = None
    prompt_type: PromptType
    dynamic: bool = True  # whether placeholders are filled dynamically
    metadata: Dict = Field(default_factory=dict)  # optional extra config
    created_at: Optional[str] = None  # ISO timestamp


class Ingredient(BaseModel):
    name: str
    quantity: Optional[str] = None
    unit: Optional[str] = None


class Nutrition(BaseModel):
    servings: Optional[int] = None
    calories_per_serving: Optional[float] = None
    protein_g: Optional[float] = None
    carbs_g: Optional[float] = None
    sugar_g: Optional[float] = None
    fat_g: Optional[float] = None
    saturated_fat_g: Optional[float] = None
    fiber_g: Optional[float] = None
    cholesterol_mg: Optional[float] = None
    sodium_mg: Optional[float] = None


class Dietary(BaseModel):
    vegetarian: bool = False
    vegan: bool = False
    gluten_free: bool = False
    dairy_free: bool = False
    nut_free: bool = False
    keto: bool = False
    halal: bool = False
    pescatarian: bool = False
    kosher: bool = False
    other: bool = False


class Recipe(BaseModel):
    dish_name: str
    description: str
    difficulty: Literal["easy", "medium", "hard"]
    image_url: Optional[str] = None
    ingredients: List[Ingredient]
    steps: List[str]
    nutrition: Nutrition = Field(default_factory=Nutrition)
    dietary: Dietary = Field(default_factory=Dietary)
