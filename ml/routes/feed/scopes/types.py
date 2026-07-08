from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime

class FeedScopeFamily(BaseModel):
    family: Literal["dish_type", "cuisine", "intent", "lifestyle", "audience"]
    scopes: List[str] = Field(default_factory=list)

class Top_Ingredient(BaseModel):
    name: str
    count: int = 0
    score: float = 0.0

class Top_Keyword(BaseModel):
    word: str
    count: int = 0
    score: float = 0.0

class Dietary_Summary(BaseModel):
    vegetarian: float = 0.0
    vegan: float = 0.0
    gluten_free: float = 0.0
    dairy_free: float = 0.0
    nut_free: float = 0.0
    keto: float = 0.0
    halal: float = 0.0
    pescatarian: float = 0.0
    kosher: float = 0.0
    other: List[str] = Field(default_factory=list)

class Nutrition_Summary(BaseModel):
    avg_calories: Optional[float] = None
    avg_protein_g: Optional[float] = None
    avg_carbs_g: Optional[float] = None
    avg_sugar_g: Optional[float] = None
    avg_fat_g: Optional[float] = None
    avg_saturated_fat_g: Optional[float] = None
    avg_fiber_g: Optional[float] = None
    avg_cholesterol_mg: Optional[float] = None
    avg_sodium_mg: Optional[float] = None

class Time_Summary(BaseModel):
    avg_step_count: Optional[float] = None
    avg_total_minutes: Optional[float] = None
    under_30_ratio: float = 0.0

class Scope_Summary(BaseModel):
    dish_type: List[str] = Field(default_factory=list)
    cuisine: List[str] = Field(default_factory=list)
    intent: List[str] = Field(default_factory=list)
    lifestyle: List[str] = Field(default_factory=list)
    audience: List[str] = Field(default_factory=list)

class Summary(BaseModel):
    top_titles: List[str] = Field(default_factory=list)
    top_keywords: List[Top_Keyword] = Field(default_factory=list)
    top_ingredients: List[Top_Ingredient] = Field(default_factory=list)
    likely_difficulty: Optional[str] = None
    dietary: Dietary_Summary = Field(default_factory=Dietary_Summary)
    nutrition: Nutrition_Summary = Field(default_factory=Nutrition_Summary)
    timing: Time_Summary = Field(default_factory=Time_Summary)
    scopes: Scope_Summary = Field(default_factory=Scope_Summary)