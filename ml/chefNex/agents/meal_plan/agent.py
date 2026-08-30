from chefNex.agents.base import BaseAgent


class MealPlanAgent(BaseAgent):

    def run(self, query: str):

        return f"MealPlanAgent received: {query}"