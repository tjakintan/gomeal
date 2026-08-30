from chefNex.agents.base import BaseAgent


class RecommendAgent(BaseAgent):

    def run(self, query: str):

        return f"RecommendAgent received: {query}"