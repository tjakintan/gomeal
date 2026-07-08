from __future__ import annotations

import re
from typing import TypedDict, Literal

from routes.feed.scopes.types import FeedScopeFamily


class ScopeConfig(TypedDict, total=False):
    family: FeedScopeFamily
    strong_keywords: list[str]
    weak_keywords: list[str]
    negative_keywords: list[str]
    threshold: int


FEED_SCOPE_REGISTRY: dict[str, ScopeConfig] = {
    "dessert": {
        "family": "intent",
        "strong_keywords": [
            "dessert", "cake", "cookie", "brownie", "pie", "pudding",
            "cheesecake", "cupcake", "muffin", "tart", "fudge", "mousse",
            "sorbet", "custard"
        ],
        "weak_keywords": [
            "chocolate", "sweet", "frosting", "icing", "caramel", "cocoa"
        ],
        "negative_keywords": [
            "chicken", "beef", "salmon", "shrimp", "garlic rice", "main course"
        ],
        "threshold": 2,
    },
    "soup": {
        "family": "dish_type",
        "strong_keywords": [
            "soup", "stew", "broth", "chowder", "bisque",
            "minestrone", "gumbo", "potage"
        ],
        "weak_keywords": [
            "stock", "boiled in broth", "simmered soup"
        ],
        "negative_keywords": [
            "sandwich", "cookie", "cake", "cupcake"
        ],
        "threshold": 2,
    },
    "appetizer": {
        "family": "dish_type",
        "strong_keywords": [
            "appetizer", "starter", "finger food", "canape",
            "crostini", "dip", "skewer"
        ],
        "weak_keywords": [
            "stuffed", "bite-sized", "party food", "small plate"
        ],
        "negative_keywords": [
            "main course", "entree", "dessert", "soup bowl"
        ],
        "threshold": 2,
    },
    "high_protein": {
        "family": "lifestyle",
        "strong_keywords": [
            "high protein", "protein packed", "protein-rich",
            "chicken breast", "turkey breast", "lean beef",
            "salmon", "tuna", "shrimp", "tofu", "tempeh",
            "greek yogurt", "cottage cheese", "eggs", "lentils"
        ],
        "weak_keywords": [
            "chicken", "beef", "turkey", "pork", "steak",
            "cod", "tilapia", "crab", "lobster", "beans"
        ],
        "negative_keywords": [
            "candy", "syrup", "frosting", "icing"
        ],
        "threshold": 3,
    },
    "quick": {
        "family": "intent",
        "strong_keywords": [
            "quick", "quick meal", "15 minute", "20 minute",
            "under 30", "ready in 10 minutes", "one pot", "no bake"
        ],
        "weak_keywords": [
            "easy", "fast", "simple", "weeknight"
        ],
        "negative_keywords": [
            "slow cooked", "overnight", "marinate overnight",
            "bake for 1 hour", "simmer for 45 minutes"
        ],
        "threshold": 2,
    },
}


def _tokenize(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").lower().strip())


def _keyword_matches(text: str, keyword: str) -> bool:
    if not text or not keyword:
        return False
    normalized_keyword = re.escape(_tokenize(keyword))
    return re.search(rf"(?<![a-z0-9]){normalized_keyword}(?![a-z0-9])", text) is not None


def _count_matches(text: str, keywords: list[str]) -> int:
    return sum(1 for keyword in keywords if _keyword_matches(text, keyword))


def _empty_scope_tags() -> dict[FeedScopeFamily, list[str]]:
    return {
        "dish_type": [],
        "cuisine": [],
        "intent": [],
        "lifestyle": [],
        "audience": [],
    }


def _score_scope(text: str, config: ScopeConfig) -> int:
    strong_hits = _count_matches(text, config.get("strong_keywords", []))
    weak_hits = _count_matches(text, config.get("weak_keywords", []))
    negative_hits = _count_matches(text, config.get("negative_keywords", []))

    score = (strong_hits * 2) + weak_hits - (negative_hits * 2)
    return score


def _create_scope(text: str) -> dict[FeedScopeFamily, list[str]]:
    normalized_text = _tokenize(text)
    scope_tags = _empty_scope_tags()

    if not normalized_text:
        return scope_tags

    for scope_name, config in FEED_SCOPE_REGISTRY.items():
        family: FeedScopeFamily = config["family"]
        threshold = config.get("threshold", 2)
        score = _score_scope(normalized_text, config)

        if score >= threshold and scope_name not in scope_tags[family]:
            scope_tags[family].append(scope_name)

    return scope_tags