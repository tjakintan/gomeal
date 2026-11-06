from __future__ import annotations

import re
from typing import TypedDict, Literal

from typing import Literal

from routes.feed.scopes.types import FeedScopeFamily

class ScopeConfig(TypedDict, total=False):
    family: FeedScopeFamily
    strong_keywords: list[str]
    weak_keywords: list[str]
    negative_keywords: list[str]
    threshold: int
    

FEED_SCOPE_REGISTRY: dict[str, ScopeConfig] = {
    # ---------- existing ----------
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

    # ---------- meal times ----------
    "breakfast": {
        "family": "dish_type",
        "strong_keywords": [
            "breakfast", "brunch", "pancake", "waffle", "omelet", "omelette",
            "french toast", "oatmeal", "granola", "scrambled eggs", "shakshuka"
        ],
        "weak_keywords": [
            "morning", "eggs", "bacon", "toast", "bagel", "smoothie", "yogurt parfait"
        ],
        "negative_keywords": [
            "dinner", "lunch", "supper"
        ],
        "threshold": 2,
    },
    "lunch": {
        "family": "dish_type",
        "strong_keywords": [
            "lunch", "sandwich", "wrap", "salad", "panini",
            "burrito bowl", "grain bowl", "quesadilla"
        ],
        "weak_keywords": [
            "bowl", "midday", "packed lunch", "lunchbox", "light meal"
        ],
        "negative_keywords": [
            "breakfast", "dessert", "pancake", "dinner"
        ],
        "threshold": 2,
    },
    "dinner": {
        "family": "dish_type",
        "strong_keywords": [
            "dinner", "supper", "main course", "entree", "roast",
            "casserole", "pot roast", "lasagna"
        ],
        "weak_keywords": [
            "steak", "pasta", "curry", "stir fry", "baked chicken", "roasted"
        ],
        "negative_keywords": [
            "breakfast", "dessert", "smoothie", "cookie", "brunch"
        ],
        "threshold": 2,
    },

    # ---------- diet / lifestyle ----------
    "vegetarian": {
        "family": "lifestyle",
        "strong_keywords": [
            "vegetarian", "meatless", "veggie", "veggie burger",
            "vegetable curry", "meat-free", "meat free"
        ],
        "weak_keywords": [
            "vegetables", "tofu", "paneer", "eggplant", "mushroom",
            "halloumi", "chickpea", "lentil", "beans"
        ],
        "negative_keywords": [
            "chicken", "beef", "pork", "bacon", "turkey", "salmon", "shrimp",
            "tuna", "steak", "sausage", "ham", "lamb", "fish", "anchovy"
        ],
        "threshold": 2,
    },
    "vegan": {
        "family": "lifestyle",
        "strong_keywords": [
            "vegan", "plant-based", "plant based", "dairy-free", "dairy free"
        ],
        "weak_keywords": [
            "tofu", "tempeh", "chickpea", "nutritional yeast", "coconut milk",
            "almond milk", "oat milk", "flax egg", "aquafaba", "lentil", "jackfruit"
        ],
        "negative_keywords": [
            "chicken", "beef", "pork", "bacon", "turkey", "salmon", "shrimp",
            "tuna", "steak", "sausage", "ham", "lamb", "fish",
            "eggs", "egg yolk", "egg whites", "honey", "ghee",
            "unsalted butter", "salted butter", "heavy cream", "cream cheese",
            "parmesan", "cheddar", "mozzarella", "feta"
        ],
        "threshold": 2,
    },
    "low_carb": {
        "family": "lifestyle",
        "strong_keywords": [
            "low carb", "low-carb", "keto", "no carb", "zucchini noodles",
            "cauliflower rice", "zoodles"
        ],
        "weak_keywords": [
            "lettuce wrap", "cauliflower", "avocado", "almond flour", "coconut flour"
        ],
        "negative_keywords": [
            "ramen", "spaghetti", "mac and cheese", "white rice",
            "pizza dough", "pancake", "syrup"
        ],
        "threshold": 2,
    },
    "healthy": {
        "family": "lifestyle",
        "strong_keywords": [
            "healthy", "nutritious", "wholesome", "clean eating",
            "low calorie", "low-calorie", "superfood"
        ],
        "weak_keywords": [
            "salad", "grilled", "steamed", "baked", "vegetables", "quinoa",
            "olive oil", "whole grain", "fresh"
        ],
        "negative_keywords": [
            "deep fried", "deep-fried", "fried chicken", "candy",
            "frosting", "syrup", "loaded"
        ],
        "threshold": 2,
    },
    "high_fiber": {
        "family": "lifestyle",
        "strong_keywords": [
            "high fiber", "high-fiber", "fiber-rich", "fiber rich",
            "whole grain", "whole wheat", "bran", "chia seeds", "flaxseed",
            "lentils", "black beans", "chickpeas", "oats", "oatmeal"
        ],
        "weak_keywords": [
            "beans", "quinoa", "barley", "broccoli", "raspberries", "avocado",
            "vegetables", "brown rice", "split peas", "artichoke"
        ],
        "negative_keywords": [
            "white bread", "white rice", "white flour", "refined flour"
        ],
        "threshold": 3,
    },

    # ---------- intent ----------
    "meal_prep": {
        "family": "intent",
        "strong_keywords": [
            "meal prep", "meal-prep", "batch cook", "make ahead", "make-ahead",
            "freezer meal", "freezer friendly", "freezer-friendly", "weekly prep"
        ],
        "weak_keywords": [
            "containers", "leftovers", "reheat", "portion", "bulk",
            "lunchbox", "stores well", "keeps for"
        ],
        "negative_keywords": [
            "serve immediately", "best served fresh", "eat right away"
        ],
        "threshold": 2,
    },
    "comfort_food": {
        "family": "intent",
        "strong_keywords": [
            "comfort food", "mac and cheese", "mac & cheese", "pot pie",
            "meatloaf", "mashed potatoes", "grilled cheese", "chicken noodle",
            "casserole", "fried chicken", "biscuits and gravy"
        ],
        "weak_keywords": [
            "creamy", "cheesy", "hearty", "warm", "gooey", "cozy", "buttery"
        ],
        "negative_keywords": [
            "low calorie", "low-calorie", "diet", "salad", "light"
        ],
        "threshold": 2,
    },
    "budget": {
        "family": "intent",
        "strong_keywords": [
            "budget", "cheap", "inexpensive", "affordable", "low cost",
            "low-cost", "frugal", "on a budget", "pantry staples"
        ],
        "weak_keywords": [
            "pantry", "rice and beans", "leftover", "simple ingredients",
            "few ingredients", "basic", "5 ingredients"
        ],
        "negative_keywords": [
            "saffron", "truffle", "wagyu", "lobster", "caviar",
            "filet mignon", "foie gras", "champagne"
        ],
        "threshold": 2,
    },

    # ---------- audience ----------
    "family_friendly": {
        "family": "audience",
        "strong_keywords": [
            "family friendly", "family-friendly", "kid friendly", "kid-friendly",
            "kids", "picky eaters", "crowd pleaser", "crowd-pleaser",
            "family dinner", "toddler"
        ],
        "weak_keywords": [
            "mild", "simple", "cheesy", "fun", "pizza", "nuggets",
            "pasta", "tacos", "mac and cheese"
        ],
        "negative_keywords": [
            "spicy", "habanero", "cocktail", "wine", "bourbon", "alcohol"
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
    # (?:e?s)? lets "cookie" match "cookies", "dip" match "dips", "sandwich" match "sandwiches"
    return re.search(
        rf"(?<![a-z0-9]){normalized_keyword}(?:e?s)?(?![a-z0-9])", text
    ) is not None


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