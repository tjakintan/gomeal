from __future__ import annotations

from typing import Literal, TypeAlias
from pydantic import BaseModel, Field

FeedScopeFamily: TypeAlias = Literal[
    "dish_type",
    "cuisine",
    "intent",
    "lifestyle",
    "audience",
]

FeedScope: TypeAlias = Literal[
    "dessert",
    "soup",
    "appetizer",
    "high_protein",
    "quick",
    "breakfast",
    "lunch",
    "dinner",
    "vegetarian",
    "vegan",
    "low_carb",
    "healthy",
    "meal_prep",
    "comfort_food",
    "family_friendly",
    "budget",
    "high_fiber",
]


# ─── Scope models ────────────────────────────────────────────

class FeedScopeGroup(BaseModel):
    family: FeedScopeFamily
    scopes: list[FeedScope] = Field(default_factory=list)


class Scope_Summary(BaseModel):
    dish_type: list[FeedScope] = Field(default_factory=list)
    cuisine: list[FeedScope] = Field(default_factory=list)
    intent: list[FeedScope] = Field(default_factory=list)
    lifestyle: list[FeedScope] = Field(default_factory=list)
    audience: list[FeedScope] = Field(default_factory=list)


# ─── Other models ────────────────────────────────────────────

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
    other: list[str] = Field(default_factory=list)


class Nutrition_Summary(BaseModel):
    avg_calories: float | None = None
    avg_protein_g: float | None = None
    avg_carbs_g: float | None = None
    avg_sugar_g: float | None = None
    avg_fat_g: float | None = None
    avg_saturated_fat_g: float | None = None
    avg_fiber_g: float | None = None
    avg_cholesterol_mg: float | None = None
    avg_sodium_mg: float | None = None


class Time_Summary(BaseModel):
    avg_step_count: float | None = None
    avg_total_minutes: float | None = None
    under_30_ratio: float = 0.0


class Summary(BaseModel):
    top_titles: list[str] = Field(default_factory=list)
    top_keywords: list[Top_Keyword] = Field(default_factory=list)
    top_ingredients: list[Top_Ingredient] = Field(default_factory=list)
    likely_difficulty: str | None = None
    dietary: Dietary_Summary = Field(default_factory=Dietary_Summary)
    nutrition: Nutrition_Summary = Field(default_factory=Nutrition_Summary)
    timing: Time_Summary = Field(default_factory=Time_Summary)
    scopes: Scope_Summary = Field(default_factory=Scope_Summary)