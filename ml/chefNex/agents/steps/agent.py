from chefNex.agents.base import BaseAgent


class StepsAgent(BaseAgent):

    def run(self, query: str):

        return f"StepsAgent received: {query}"