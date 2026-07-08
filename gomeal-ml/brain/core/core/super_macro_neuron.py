from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
import numpy as np
from uuid import uuid4
from datetime import datetime
from brain.core.core.macro_neuron import MacroNeuron

class SuperMacroNeuron(BaseModel):
    """
        Top-level abstraction built from a cluster of MacroNeurons.
        Encapsulates a higher-order semantic representation of the brain graph.
    """

    brain: Optional[Any] = None

    # Unique ID
    super_macro_neuron_id: str = Field(default_factory=lambda: str(uuid4()))

    # IDs of child macro neurons
    child_macro_ids: List[str]

    # Centroid embedding derived from child macro neurons
    embedding: List[float]

    # Graph connectivity (super-macro-to-macro or super-macro-to-super-macro)
    connections: List[str] = Field(default_factory=list)

    in_synapses: List[str] = Field(default_factory=list)
    out_synapses: List[str] = Field(default_factory=list)

    # Long-term stability weight
    strength: float = 1.0

    # Activation during inference cycles
    activation: float = 0.0

    # ISO timestamp when super macro neuron was created
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

    # timestamp of last activation (for time_between_firing)
    last_fired: float = 0.0


def create_super_macro_neuron(macro_neurons: List[MacroNeuron]) -> SuperMacroNeuron:
    """
        Creates a SuperMacroNeuron by averaging embeddings of child macro neurons
        and aggregating payload metadata.
    """

    if not macro_neurons:
        raise ValueError("Cannot create super macro neuron from empty macro neuron list")

    # 1. Compute centroid embedding
    centroid = np.mean([mn.embedding for mn in macro_neurons], axis=0).tolist()

    # 3. Create SuperMacroNeuron object
    super_macro = SuperMacroNeuron(
        child_macro_ids=[mn.id for mn in macro_neurons],
        embedding=centroid,
    )

    return super_macro