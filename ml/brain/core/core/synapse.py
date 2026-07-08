from typing import Optional
from uuid import uuid4
import time
import math

class Synapse:
    """
    Represents a directed weighted connection between neurons
    (neuron ↔ macro ↔ super-macro).

    Supports:
    - Hebbian learning
    - Hierarchical abstraction penalties
    - Stability decay
    - Time tracking
    """

    def __init__(
        self,
        source_id: str,
        source_type: str,
        target_id: str,
        target_type: str,
        strength: float = 0.5,
        learning_rate: float = 0.05,
        abstraction_level_gap: int = 0,   # 0 = same level, 1 = macro jump, 2 = super jump
        abstraction_decay: float = 0.7    # how much abstraction reduces learning
    ):
        self.id = str(uuid4())
        self.source_type = source_type
        self.target_type = target_type
        self.source_id = source_id
        self.target_id = target_id

        self.strength = strength
        self.learning_rate = learning_rate

        # Hierarchy controls
        self.abstraction_level_gap = abstraction_level_gap
        self.abstraction_decay = abstraction_decay

        self.last_fired: float = 0

    # ----------------------------
    # Signal Propagation
    # ----------------------------
    def propagate(self, activation: float) -> float:
        """
        Returns weighted activation to the target neuron.
        Applies strength only (hierarchy affects learning, not signal).
        """
        weighted_activation = activation * self.strength
        self.last_fired = time.time()
        return weighted_activation

    # ----------------------------
    # Hebbian Learning
    # ----------------------------
    def update_strength(
        self,
        source_activation: float,
        target_activation: float,
        decay: float = 0.99,
    ):
        """
        Adjusts synaptic strength using hierarchy-aware Hebbian learning.
        """

        # Hierarchical learning penalty
        # Higher abstraction levels learn slower
        hierarchy_factor = math.exp(
            -self.abstraction_level_gap * self.abstraction_decay
        )

        # Hebbian update (co-activation)
        delta = (
            self.learning_rate
            * hierarchy_factor
            * source_activation
            * target_activation
        )

        self.strength += delta

        # Stability decay (prevents runaway growth)
        self.strength *= decay

        # Clamp safely to [0, 1]
        self.strength = max(0.0, min(1.0, self.strength))