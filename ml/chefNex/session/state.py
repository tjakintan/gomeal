from dataclasses import dataclass, field
from datetime import datetime, timezone


@dataclass
class SessionState:
    # what recipe we're currently walking through, and where
    current_id: str | None = None
    current_step_index: int = 0
    total_steps: int | None = None

    # sticky user context — set once, referenced by multiple agents
    dietary_prefs: list[str] = field(default_factory=list)      # e.g. ["vegan"]
    known_allergies: list[str] = field(default_factory=list)    # e.g. ["peanuts"]

    # lightweight turn history for follow-ups like "is THAT keto" / "what about THIS"
    last_intent: str | None = None
    last_id: str | None = None
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def touch(self, intent: str) -> None:
        self.last_intent = intent
        self.updated_at = datetime.now(timezone.utc)

    def set(self, id: str, total_steps: int | None = None) -> None:
        self.current_id = id
        self.last_id = id
        self.current_step_index = 0
        self.total_steps = total_steps

    def advance_step(self) -> bool:
        """Returns False if already at the last step."""
        if self.total_steps is not None and self.current_step_index >= self.total_steps - 1:
            return False
        self.current_step_index += 1
        return True

    def previous_step(self) -> bool:
        if self.current_step_index <= 0:
            return False
        self.current_step_index -= 1
        return True

    def reset(self) -> None:
        self.current_id = None
        self.current_step_index = 0
        self.total_steps = None