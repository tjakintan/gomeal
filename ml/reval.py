from __future__ import annotations

from chefNex.intent.router import IntentRouter
from chefNex.intent.intent import Intent
from chefNex.intent.classifier import Classification


router = IntentRouter()


# ---------------------------------------------------------------------------
# Real-world routing cases
# ---------------------------------------------------------------------------

ROUTING_CASES = [
    # NUTRITION
    ("how many calories are in this?", Intent.NUTRITION),
    ("how much protein is in this?", Intent.NUTRITION),
    ("what are the macros for this meal?", Intent.NUTRITION),
    ("how much sodium does this have?", Intent.NUTRITION),

    # INGREDIENT
    ("what ingredients are in this?", Intent.INGREDIENT),
    ("what is this made with?", Intent.INGREDIENT),
    ("does this contain eggs?", Intent.INGREDIENT),
    ("can I substitute the eggs?", Intent.INGREDIENT),

    # DIETARY
    ("is this vegan?", Intent.DIETARY),
    ("is this gluten free?", Intent.DIETARY),
    ("would this work for someone on keto?", Intent.DIETARY),
    ("does this contain any meat?", Intent.DIETARY),

    # PRICE
    ("how much will this cost?", Intent.PRICE),
    ("how expensive is this recipe?", Intent.PRICE),
    ("how much will the ingredients cost?", Intent.PRICE),
    ("is this a budget friendly meal?", Intent.PRICE),

    # STEPS
    ("how do I make this?", Intent.STEPS),
    ("walk me through the recipe", Intent.STEPS),
    ("what are the cooking instructions?", Intent.STEPS),
    ("how long does this need in the oven?", Intent.STEPS),

    # SEARCH
    ("find me recipes with chicken", Intent.SEARCH),
    ("search for recipes containing tofu", Intent.SEARCH),
    ("show me recipes with mushrooms", Intent.SEARCH),
    ("look for something with shrimp", Intent.SEARCH),

    # TRENDING
    ("what's trending right now?", Intent.TRENDING),
    ("what recipes are popular lately?", Intent.TRENDING),
    ("what's everyone making this week?", Intent.TRENDING),

    # RECOMMEND
    ("what should I make tonight?", Intent.RECOMMEND),
    ("what can I make with leftover rice?", Intent.RECOMMEND),
    ("give me something good to cook", Intent.RECOMMEND),
    ("what do you recommend for dinner?", Intent.RECOMMEND),

    # MEAL PLAN
    ("plan my meals for this week", Intent.MEAL_PLAN),
    ("make me a meal plan", Intent.MEAL_PLAN),
    ("plan my dinners for the next seven days", Intent.MEAL_PLAN),

    # SHOPPING
    ("make me a shopping list", Intent.SHOPPING),
    ("what groceries do I need?", Intent.SHOPPING),
    ("what do I need to buy for this?", Intent.SHOPPING),
    ("put the ingredients on my shopping list", Intent.SHOPPING),

    # IMAGE
    ("what food is in this picture?", Intent.IMAGE),
    ("what am I looking at in this photo?", Intent.IMAGE),
    ("can you identify this food?", Intent.IMAGE),

    # CHAT
    ("hey there", Intent.CHAT),
    ("hello", Intent.CHAT),
    ("thanks!", Intent.CHAT),
    ("what are you capable of?", Intent.CHAT),
]


# ---------------------------------------------------------------------------
# Contrastive cases
#
# These are intentionally similar queries where ONE word/semantic distinction
# should change the route.
# ---------------------------------------------------------------------------

CONTRASTIVE_CASES = [
    # SEARCH vs RECOMMEND
    (
        "find a recipe with tofu",
        Intent.SEARCH,
        "what should I make with tofu?",
        Intent.RECOMMEND,
    ),
    (
        "look for recipes with chicken and rice",
        Intent.SEARCH,
        "what can I make with chicken and rice?",
        Intent.RECOMMEND,
    ),
    (
        "search for something with mushrooms",
        Intent.SEARCH,
        "suggest something with mushrooms",
        Intent.RECOMMEND,
    ),
    (
        "show me recipes using salmon",
        Intent.SEARCH,
        "what should I cook with salmon?",
        Intent.RECOMMEND,
    ),

    # INGREDIENT vs SHOPPING
    (
        "what ingredients are in this?",
        Intent.INGREDIENT,
        "what ingredients do I need to buy?",
        Intent.SHOPPING,
    ),
    (
        "what is this made with?",
        Intent.INGREDIENT,
        "what do I need to buy for this?",
        Intent.SHOPPING,
    ),

    # PRICE vs SHOPPING
    (
        "how much will the groceries cost?",
        Intent.PRICE,
        "what groceries do I need?",
        Intent.SHOPPING,
    ),
    (
        "how much will the ingredients cost?",
        Intent.PRICE,
        "what ingredients should I buy?",
        Intent.SHOPPING,
    ),
    (
        "what will this recipe cost me?",
        Intent.PRICE,
        "what do I need to get from the store?",
        Intent.SHOPPING,
    ),

    # INGREDIENT vs STEPS
    (
        "what ingredients go into this?",
        Intent.INGREDIENT,
        "how do I make this?",
        Intent.STEPS,
    ),
    (
        "what is used to make this?",
        Intent.INGREDIENT,
        "how is this made?",
        Intent.STEPS,
    ),

    # NUTRITION vs DIETARY
    (
        "how many carbs are in this?",
        Intent.NUTRITION,
        "is this low carb?",
        Intent.DIETARY,
    ),
    (
        "how much protein does this have?",
        Intent.NUTRITION,
        "is this high protein?",
        Intent.DIETARY,
    ),

    # RECOMMEND vs MEAL PLAN
    (
        "what should I make tonight?",
        Intent.RECOMMEND,
        "what should I eat each day this week?",
        Intent.MEAL_PLAN,
    ),
    (
        "give me an idea for dinner",
        Intent.RECOMMEND,
        "plan my dinners for the week",
        Intent.MEAL_PLAN,
    ),

    # SEARCH vs TRENDING
    (
        "find popular chicken recipes",
        Intent.SEARCH,
        "what chicken recipes are trending?",
        Intent.TRENDING,
    ),
]


# ---------------------------------------------------------------------------
# Ambiguous cases
#
# These should NOT blindly execute a specialized agent when the classifier
# cannot clearly distinguish between intents.
# ---------------------------------------------------------------------------

AMBIGUOUS_CASES = [
    "what goes into making this",
    "what do I need for this",
    "what should I make",
    "something with chicken",
    "what about this recipe",
]


# ---------------------------------------------------------------------------
# Router unit tests
# ---------------------------------------------------------------------------

def test_low_confidence_fallback() -> None:
    """Predictions below the confidence threshold must become CHAT."""

    print("\n=== LOW CONFIDENCE FALLBACK ===")

    cases = [
        (0.00, Intent.NUTRITION),
        (0.50, Intent.NUTRITION),
        (0.69, Intent.SEARCH),
        (0.699, Intent.STEPS),
    ]

    for score, intent in cases:
        classification = Classification(
            intent=intent,
            score=score,
            second_intent=Intent.CHAT,
            second_score=score - 0.01,
            margin=score - (score - 0.01),
        )

        routed = router.route(classification)

        print(
            f"{score:.3f} {intent.value:<10} "
            f"-> {routed.value}"
        )

        assert routed == Intent.CHAT


def test_confidence_boundary() -> None:
    """Exactly 0.70 should pass because the router uses '<'."""

    print("\n=== CONFIDENCE BOUNDARY ===")

    cases = [
        (0.6999, Intent.CHAT),
        (0.7000, Intent.NUTRITION),
        (0.7001, Intent.NUTRITION),
    ]

    for score, expected in cases:
        classification = Classification(
            intent=Intent.NUTRITION,
            score=score,
            second_intent=Intent.CHAT,
            second_score=0.50,
            margin=score - 0.50,
        )

        routed = router.route(classification)

        print(
            f"{score:.4f} -> {routed.value:<10} "
            f"expected={expected.value}"
        )

        assert routed == expected


def test_low_margin_fallback() -> None:
    """Ambiguous predictions should fall back to CHAT."""

    print("\n=== LOW MARGIN FALLBACK ===")

    cases = [
        (0.90, 0.02),
        (0.85, 0.029),
        (0.80, 0.00),
    ]

    for score, margin in cases:
        classification = Classification(
            intent=Intent.SEARCH,
            score=score,
            second_intent=Intent.RECOMMEND,
            second_score=score - margin,
            margin=margin,
        )

        routed = router.route(classification)

        print(
            f"score={score:.3f} "
            f"margin={margin:.3f} "
            f"-> {routed.value}"
        )

        assert routed == Intent.CHAT


def test_margin_boundary() -> None:
    """Exactly 0.03 should pass because the router uses '<'."""

    print("\n=== MARGIN BOUNDARY ===")

    cases = [
        (0.90, 0.0299, Intent.CHAT),
        (0.90, 0.0300, Intent.SEARCH),
        (0.90, 0.0301, Intent.SEARCH),
    ]

    for score, margin, expected in cases:
        classification = Classification(
            intent=Intent.SEARCH,
            score=score,
            second_intent=Intent.RECOMMEND,
            second_score=score - margin,
            margin=margin,
        )

        routed = router.route(classification)

        print(
            f"score={score:.3f} "
            f"margin={margin:.4f} "
            f"-> {routed.value:<10} "
            f"expected={expected.value}"
        )

        assert routed == expected


# ---------------------------------------------------------------------------
# Real classifier + router evaluation
# ---------------------------------------------------------------------------

def test_real_routing() -> None:
    """Evaluate the complete classifier -> router pipeline."""

    print("\n=== REAL ROUTING ===")

    passed = 0

    for text, expected in ROUTING_CASES:
        classification = router.predict(text)
        routed = router.route(classification)

        ok = routed == expected

        print(
            f"{'✓' if ok else '✗'} {text!r}\n"
            f"    predicted={classification.intent.value:<10} "
            f"score={classification.score:.3f} "
            f"second={classification.second_intent.value if classification.second_intent else '-':<10} "
            f"second_score={classification.second_score:.3f} "
            f"margin={classification.margin:.3f}\n"
            f"    routed={routed.value:<10} "
            f"expected={expected.value}"
        )

        if ok:
            passed += 1

    accuracy = passed / len(ROUTING_CASES) * 100

    print(
        f"\nRouting accuracy: "
        f"{passed}/{len(ROUTING_CASES)} "
        f"({accuracy:.1f}%)"
    )

    assert passed == len(ROUTING_CASES)


# ---------------------------------------------------------------------------
# Contrastive evaluation
# ---------------------------------------------------------------------------

def test_contrastive_routing() -> None:
    """Check that small semantic changes produce the correct intent."""

    print("\n=== CONTRASTIVE ROUTING ===")

    passed = 0
    total = len(CONTRASTIVE_CASES) * 2

    for left_text, left_expected, right_text, right_expected in CONTRASTIVE_CASES:
        left = router.predict(left_text)
        right = router.predict(right_text)

        left_routed = router.route(left)
        right_routed = router.route(right)

        left_ok = left_routed == left_expected
        right_ok = right_routed == right_expected

        if left_ok:
            passed += 1

        if right_ok:
            passed += 1

        print(
            f"\n{'✓' if left_ok else '✗'} "
            f"{left_text!r}\n"
            f"    -> {left_routed.value} "
            f"(expected {left_expected.value}, "
            f"score={left.score:.3f}, "
            f"margin={left.margin:.3f})"
        )

        print(
            f"{'✓' if right_ok else '✗'} "
            f"{right_text!r}\n"
            f"    -> {right_routed.value} "
            f"(expected {right_expected.value}, "
            f"score={right.score:.3f}, "
            f"margin={right.margin:.3f})"
        )

    accuracy = passed / total * 100

    print(
        f"\nContrastive accuracy: "
        f"{passed}/{total} "
        f"({accuracy:.1f}%)"
    )

    assert passed == total


# ---------------------------------------------------------------------------
# Ambiguity evaluation
# ---------------------------------------------------------------------------

def test_ambiguous_queries() -> None:
    """
    Inspect ambiguous queries.

    These are not required to become CHAT automatically because some may
    still have a sufficiently strong classifier margin. The test reports
    whether the router considers them safe or ambiguous.
    """

    print("\n=== AMBIGUOUS QUERIES ===")

    for text in AMBIGUOUS_CASES:
        classification = router.predict(text)
        routed = router.route(classification)

        status = (
            "AMBIGUOUS"
            if routed == Intent.CHAT
            else "CONFIDENT"
        )

        print(
            f"{status:<10} {text!r}\n"
            f"    predicted={classification.intent.value} "
            f"score={classification.score:.3f} "
            f"second={classification.second_intent.value if classification.second_intent else '-'} "
            f"second_score={classification.second_score:.3f} "
            f"margin={classification.margin:.3f} "
            f"routed={routed.value}"
        )


# ---------------------------------------------------------------------------
# End-to-end predict_and_route
# ---------------------------------------------------------------------------

def test_predict_and_route() -> None:
    """Ensure the convenience method returns the final routed intent."""

    print("\n=== PREDICT AND ROUTE ===")

    cases = [
        ("how much protein is in this?", Intent.NUTRITION),
        ("find me recipes with tofu", Intent.SEARCH),
        ("what should I make tonight?", Intent.RECOMMEND),
        ("how much will this cost?", Intent.PRICE),
        ("hello", Intent.CHAT),
    ]

    passed = 0

    for text, expected in cases:
        result = router.predict_and_route(text)

        ok = result == expected

        print(
            f"{'✓' if ok else '✗'} "
            f"{text!r} "
            f"-> {result.value} "
            f"(expected {expected.value})"
        )

        if ok:
            passed += 1

    print(f"\n{passed}/{len(cases)} passed")

    assert passed == len(cases)


# ---------------------------------------------------------------------------
# Run everything directly
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    test_low_confidence_fallback()
    test_confidence_boundary()
    test_low_margin_fallback()
    test_margin_boundary()
    test_real_routing()
    test_contrastive_routing()
    test_ambiguous_queries()
    test_predict_and_route()

    print("\n=== ALL ROUTER TESTS PASSED ===")