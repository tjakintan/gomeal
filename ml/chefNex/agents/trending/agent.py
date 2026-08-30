from chefNex.agents.base import BaseAgent


class TrendingAgent(BaseAgent):

    def run(self, query: str):

        return f"TrendingAgent received: {query}"