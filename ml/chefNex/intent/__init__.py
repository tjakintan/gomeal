from dataclasses import dataclass, field
from enum import Enum

class Intent(str, Enum):
    # Recipe knowledge (contextual OR global — same agents either way)
    INGREDIENT = "ingredient"
    NUTRITION = "nutrition"
    DIETARY = "dietary"
    PRICE = "price"
    STEPS = "steps"

    # Discovery (global only — no single recipe in scope)
    SEARCH = "search"
    TRENDING = "trending"
    RECOMMEND = "recommend"
    MEAL_PLAN = "meal_plan"
    SHOPPING = "shopping"

    # General
    IMAGE = "image"      # user really does say "what's in this photo"
    CHAT = "chat"
    UNKNOWN = "unknown"  # fallback — not a training class, has no examples

    # NOT in this enum at all — POST is a UI event carried on session
    # context (post_id), not a text-classified intent.


# Recipe-knowledge intents work whether or not a post/context is in
# scope (agent reads session.context if present, else asks or searches
# the user's saved recipes). Used by the router to decide the candidate
# set: discovery intents are excluded whenever context is present, since
# "how much protein" beats "what's trending" as a reading once a post
# is in view — but domain intents stay valid in both states.
DOMAIN_INTENTS = frozenset({
    Intent.INGREDIENT, Intent.NUTRITION, Intent.DIETARY, Intent.PRICE, Intent.STEPS,
})

# Discovery intents assume no single recipe is in scope.
DISCOVERY_INTENTS = frozenset({
    Intent.SEARCH, Intent.TRENDING, Intent.RECOMMEND, Intent.MEAL_PLAN, Intent.SHOPPING,
})


@dataclass(frozen=True)
class IntentSpec:
    examples: list[str]
    keywords: tuple[str, ...] = field(default_factory=tuple)
    priority: int = 0


INTENT_REGISTRY: dict[Intent, IntentSpec] = {
    Intent.NUTRITION: IntentSpec(
        keywords=("calorie", "protein", "macro", "fat", "carb", "healthy", "nutrition"),
        examples=[
            "How many calories are in this?", "How much protein?", "Nutrition facts",
            "What are the macros?", "How much fat?", "How many carbs?", "Is this healthy?",
            "What's the nutritional value?", "cals?", "how much sugar",
            "is this high protein", "breakdown the nutrition for me",
            "how many calories per serving",
        ],
    ),
    Intent.INGREDIENT: IntentSpec(
        keywords=("ingredient", "substitute", "replace", "contain", "allergy", "allergic"),
        examples=[
            "What ingredients are needed?", "What goes into this recipe?",
            "Can I replace butter?", "Substitute eggs", "Does this contain nuts?",
            "What ingredients does this have?", "is there dairy in this",
            "what can I use instead of milk", "full ingredient list",
            "am I allergic to anything in this",
        ],
    ),
    Intent.DIETARY: IntentSpec(
        keywords=("vegan", "vegetarian", "keto", "gluten", "halal", "kosher", "paleo", "diet"),
        examples=[
            "Is this vegan?", "Is this vegetarian?", "Is this keto?", "Is this gluten free?",
            "Can I eat this on keto?", "Is this halal?", "is this paleo friendly",
            "is this dairy free", "would this work for a low carb diet", "is it kosher",
        ],
    ),
    Intent.PRICE: IntentSpec(
        keywords=("cost", "price", "expensive", "cheap", "$", "budget"),
        examples=[
            "How much does this cost?", "What's the price?", "How expensive is this?",
            "Is this cheap?", "how much will this run me", "cost per serving",
            "is this budget friendly",
        ],
    ),
    Intent.STEPS: IntentSpec(
        keywords=("cook", "recipe", "instructions", "step", "how do i make"),
        examples=[
            "How do I cook this?", "Show me the recipe.", "What are the instructions?",
            "Walk me through it.", "What's the next step?", "how long do i bake this",
            "what temperature", "how do I make this", "give me the directions",
        ],
    ),
    Intent.SEARCH: IntentSpec(
        keywords=("find", "search", "look up", "show me recipes"),
        examples=[
            "Find me a pasta recipe", "Search for chicken recipes",
            "Look up vegan desserts", "Show me recipes with salmon",
            "find something with ground beef", "search low calorie dinners",
            "do you have any soup recipes",
        ],
    ),
    Intent.TRENDING: IntentSpec(
        keywords=("trending", "popular", "hot right now", "what's everyone"),
        examples=[
            "What's trending tonight?", "What's popular right now?",
            "Show me trending recipes", "What is everyone cooking",
            "what's hot on gomeal right now", "top recipes this week",
        ],
    ),
    Intent.RECOMMEND: IntentSpec(
        keywords=("recommend", "suggest", "what should i", "i have"),
        examples=[
            "What should I cook tonight?", "Recommend something for dinner",
            "I have chicken and rice, what can I make",
            "suggest a recipe for me", "what do you think I'd like",
            "give me a recipe idea", "surprise me with a recipe",
        ],
    ),
    Intent.MEAL_PLAN: IntentSpec(
        keywords=("meal plan", "plan my week", "meal prep", "weekly menu"),
        examples=[
            "Build me a meal plan", "Plan my meals for the week",
            "help me meal prep for the week", "make me a weekly menu",
            "plan dinners for the next 5 days", "I need a meal plan",
        ],
    ),
    Intent.SHOPPING: IntentSpec(
        keywords=("shopping list", "grocery", "add to cart", "buy"),
        examples=[
            "Add this to my shopping list", "Make me a grocery list",
            "what do I need to buy for this", "add these ingredients to my cart",
            "build a grocery list for this week", "what's on my shopping list",
        ],
    ),
    Intent.IMAGE: IntentSpec(
        keywords=("picture", "image", "photo", "look at", "identify"),
        examples=[
            "What is in this picture?", "Analyze this image.", "Look at this meal.",
            "Identify this food.", "Describe this dish.", "what dish is this",
            "can you tell what this is from the photo",
        ],
    ),
    Intent.CHAT: IntentSpec(
        examples=[
            "Hello", "How are you?", "Good morning", "Tell me a joke", "What can you do?",
            "thanks", "who made you", "lol",
        ],
    ),
}


def _validate_registry() -> None:
    trainable = {i for i in Intent if i is not Intent.UNKNOWN}
    missing = trainable - INTENT_REGISTRY.keys()
    if missing:
        raise ValueError(f"Intent(s) missing from registry: {missing}")

    empty = [i for i, spec in INTENT_REGISTRY.items() if not spec.examples]
    if empty:
        raise ValueError(f"Intent(s) with no examples: {empty}")

    uncategorized = trainable - Intent.UNKNOWN.__class__.__members__.keys()  # no-op guard, see below
    grouped = DOMAIN_INTENTS | DISCOVERY_INTENTS | {Intent.IMAGE, Intent.CHAT}
    ungrouped = trainable - grouped
    if ungrouped:
        raise ValueError(
            f"Intent(s) not in DOMAIN_INTENTS, DISCOVERY_INTENTS, or general set: {ungrouped}"
        )

    seen: dict[str, Intent] = {}
    for intent, spec in INTENT_REGISTRY.items():
        for ex in spec.examples:
            key = ex.strip().lower()
            if key in seen and seen[key] is not intent:
                raise ValueError(f"Duplicate example {ex!r} in both {seen[key]} and {intent}")
            seen[key] = intent


_validate_registry()


def all_examples() -> list[tuple[str, Intent]]:
    return [(ex, intent) for intent, spec in INTENT_REGISTRY.items() for ex in spec.examples]


def keyword_prefilter(text: str, allowed: frozenset[Intent] | None = None) -> Intent | None:
    """Cheap keyword pass before the classifier. If `allowed` is given
    (e.g. DOMAIN_INTENTS when session.context is set), only considers
    intents in that set — keeps the prefilter in sync with whatever
    candidate restriction the classifier itself is using.
    """
    lowered = text.lower()
    hits = [
        (intent, spec.priority)
        for intent, spec in INTENT_REGISTRY.items()
        if (allowed is None or intent in allowed) and any(kw in lowered for kw in spec.keywords)
    ]
    return max(hits, key=lambda h: h[1])[0] if hits else None