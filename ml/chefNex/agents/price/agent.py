from chefNex.agents.base import BaseAgent


class PriceAgent(BaseAgent):

    def run(self, query: str):

        return f"PriceAgent received: {query}"