from pydantic import BaseModel, Field
from typing import List, Optional, Any
import numpy as np
from uuid import uuid4
from datetime import datetime
from brain.core.core.neuron import Neuron
import threading

from routes.feed.scopes.types import Summary

# Global neuron ID counter (thread-safe)
_macro_neuron_id_lock = threading.Lock()
_macro_neuron_id_counter = 0

def _macro_next_neuron_id() -> int:
    global _macro_neuron_id_counter
    with _macro_neuron_id_lock:
        _macro_neuron_id_counter += 1
        return _macro_neuron_id_counter

class MacroNeuron(BaseModel):
    """
        Higher-order abstraction built from a cluster of neurons.
        Represents semantic compression in the brain graph.
    """

    brain: Optional[Any] = None

    # Unique ID (same reasoning as Neuron)
    macro_neuron_id: int = Field(default_factory=_macro_next_neuron_id)

    # IDs of neurons used to form this macro neuron
    child_neuron_ids: List[str]

    # Centroid embedding derived from child neurons
    vector: List[float]

    # Graph connectivity (macro-to-neuron or macro-to-macro)
    connections: List[str] = Field(default_factory=list)

    in_synapses: List[str] = Field(default_factory=list)
    out_synapses: List[str] = Field(default_factory=list)

    # Long-term stability weight
    strength: float = 1.0

    # Activation during inference cycles
    activation: float = 0.0

    # ISO timestamp when macro neuron was created in the brain
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

    # timestamp of last activation (for time_between_firing)
    last_fired: float = 0.0

    # scopes
    summary: Summary = Field(default_factory=Summary)


def create_macro_neuron(neurons: List[Neuron]) -> MacroNeuron:
    """
        Creates a macro neuron by averaging child neuron embeddings
        and aggregating common text/metadata into payload.
    """

    if not neurons:
        raise ValueError("Cannot create macro neuron from empty neuron list")

    # 1. Compute centroid embedding
    centroid = np.mean([n.vector for n in neurons], axis=0).tolist()

    # 3. Create MacroNeuron object
    macro_neuron = MacroNeuron(
        child_neuron_ids=[str(n.neuron_id) for n in neurons],
        vector=centroid,
    )

    return macro_neuron