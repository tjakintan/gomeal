from chefNex.agents.base import BaseAgent


class ShoppingAgent(BaseAgent):

    def run(self, query: str):

        return f"ShoppingAgent received: {query}"