from abc import ABC, abstractmethod
from typing import Any

class BaseAgent(ABC):

    @abstractmethod
    def run(self, *args: Any, **kwargs: Any) -> Any:
        """Execute the agent."""
        raise NotImplementedError