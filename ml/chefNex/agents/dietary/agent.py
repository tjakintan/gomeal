from chefNex.agents.base import BaseAgent


class DietaryAgent(BaseAgent):

    def run(self, query: str):

        return f"DietaryAgent received: {query}"