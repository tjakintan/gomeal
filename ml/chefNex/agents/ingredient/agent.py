from chefNex.agents.base import BaseAgent


class IngredientAgent(BaseAgent):

    def run(self, query: str):

        return f"IngredientAgent received: {query}"