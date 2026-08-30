from chefNex.agents.base import BaseAgent


class NutritionAgent(BaseAgent):

    def run(self, query: str):

        return f"NutritionAgent received: {query}"