from chefNex.agents.base import BaseAgent


class ChatAgent(BaseAgent):

    def run(self, query: str):

        return f"ChatAgent received: {query}"