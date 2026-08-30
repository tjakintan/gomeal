from chefNex.agents.base import BaseAgent


class SearchAgent(BaseAgent):

    def run(self, query: str):

        return f"SearchAgent received: {query}"