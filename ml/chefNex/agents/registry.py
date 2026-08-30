import logging
from typing import Protocol

from chefNex.intent import Intent
from chefNex.session.state import SessionState

from chefNex.agents.ingredient import IngredientAgent
from chefNex.agents.steps import StepsAgent
from chefNex.agents.dietary import DietaryAgent
from chefNex.agents.nutrition import NutritionAgent
from chefNex.agents.price import PriceAgent
from chefNex.agents.image import ImageAgent
from chefNex.agents.chat import ChatAgent
from chefNex.agents.search import SearchAgent
from chefNex.agents.trending import TrendingAgent
from chefNex.agents.recommend import RecommendAgent
from chefNex.agents.meal_plan import MealPlanAgent
from chefNex.agents.shopping import ShoppingAgent

logger = logging.getLogger(__name__)


class Agent(Protocol):
    def run(self, text: str, *, session: SessionState) -> str: ...


# Intents allowed to permanently skip agent registration — not a gap,
# just no agent needed (small talk falls through to a canned response).
UNROUTED_INTENTS = {Intent.CHAT, Intent.UNKNOWN}

# Intents that SHOULD have an agent but don't yet — discovery layer is
# still being built out. Warn at import instead of hard-failing so the
# app stays runnable, but make it loud so this doesn't get forgotten.
TODO_INTENTS = {
    Intent.SEARCH,
    Intent.TRENDING,
    Intent.RECOMMEND,
    Intent.MEAL_PLAN,
    Intent.SHOPPING,
}

AGENT: dict[Intent, type[Agent]] = {
    Intent.INGREDIENT: IngredientAgent,
    Intent.STEPS: StepsAgent,
    Intent.DIETARY: DietaryAgent,
    Intent.NUTRITION: NutritionAgent,
    Intent.PRICE: PriceAgent,
    Intent.IMAGE: ImageAgent,
    Intent.CHAT: ChatAgent,
    Intent.SEARCH: SearchAgent,
    Intent.TRENDING: TrendingAgent,
    Intent.RECOMMEND: RecommendAgent,
    Intent.MEAL_PLAN: MealPlanAgent,
    Intent.SHOPPING: ShoppingAgent,
}


def _validate_agents() -> None:
    registered = AGENT.keys()
    unaccounted = {i for i in Intent} - registered - UNROUTED_INTENTS - TODO_INTENTS
    if unaccounted:
        raise ValueError(f"Intent(s) missing agent registration: {unaccounted}")

    todo_gap = TODO_INTENTS - registered
    if todo_gap:
        logger.warning(
            "Discovery intents classified but not yet routed to an agent "
            "(will fall back to generic response): %s",
            sorted(i.value for i in todo_gap),
        )


_validate_agents()


class AgentManager:
    def __init__(self):
        self._instances: dict[Intent, Agent] = {}

    def get(self, intent: Intent) -> Agent | None:
        if intent not in AGENT:
            logger.warning("No agent class registered for intent=%s", intent)
            return None
        if intent not in self._instances:
            self._instances[intent] = AGENT[intent]()
        return self._instances[intent]

    def run(self, intent: Intent, text: str, session: SessionState) -> str:
        agent = self.get(intent)

        if agent is None:
            return "I'm not sure how to help with that yet."

        session.touch(intent.value)

        try:
            return agent.run(text, session=session)
        except Exception:
            logger.exception("Agent for intent=%s failed on input=%r", intent, text)
            return "Something went wrong on my end — mind trying that again?"