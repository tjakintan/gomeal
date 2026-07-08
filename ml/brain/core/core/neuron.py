from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Dict, Any
from uuid import uuid4
from enum import Enum
from datetime import datetime
import os
import threading

# Global neuron ID counter (thread-safe)
_neuron_id_lock = threading.Lock()
_neuron_id_counter = 0

def _next_neuron_id() -> int:
    global _neuron_id_counter
    with _neuron_id_lock:
        _neuron_id_counter += 1
        return _neuron_id_counter
    
# Global embedding dimensionality loaded from environment config
EMBEDDING_DIM = int(os.getenv("EMBEDDING_DIM", "768"))

class NeuronType(str, Enum):
    """
        Defines the semantic category of a neuron.
        Used to segment brain regions and control activation rules.
    """
    recipe = "recipe"             
    user = "user" 


class Neuron(BaseModel):
    """
        Core semantic unit of the goMeal Brain.

        A Neuron represents:
        - A structured entity from the database
        - Its semantic embedding
        - Its cognitive state (activation, strength)
        - Its graph connectivity to other neurons
    """

    brain: Optional[Any] = None

    # Auto-assigned unique identifier from global counter
    neuron_id: int = Field(default_factory=_next_neuron_id)

    # Semantic classification of this neuron
    neuron_type: NeuronType

    # Name of the originating Pydantic model (e.g., "Recipe", "UserAction")
    source_model: str

    # Primary key of the originating database record (if applicable)
    source_id: Optional[int] = None
 
    # Dense vector representation in semantic embedding space
    vector: List[float]

    @field_validator("vector")
    @classmethod
    def check_embedding_dim(cls, v):
        """
            Ensures vector dimensionality matches configured model size.
            Prevents cross-model vector corruption.
        """
        if len(v) != EMBEDDING_DIM:
            raise ValueError(f"vector must be {EMBEDDING_DIM}-dimensional")
        return v

    # Long-term memory weight (decays slowly over time)
    strength: float = 1.0

    # Current contextual activation value (computed during inference cycle)
    activation: float = 0.0

    # IDs of connected neurons (semantic + structural links)
    connections: List[str] = Field(default_factory=list)

    in_synapses: List[str] = Field(default_factory=list)
    out_synapses: List[str] = Field(default_factory=list)

    # ISO timestamp when neuron was created in the brain
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

    # timestamp of last activation (for time_between_firing)
    last_fired: float = 0.0

def create_neuron(
    neuron_type: NeuronType,
    source_model: str,
    source_id: Optional[int], # source is is optional, that is we dont exactly need a source_id(more optimal with one) 
    vector: List[float],
    text: Optional[Dict] = None # Readable neuron context, very optional
) -> Neuron:
    """
        Creates a new Neuron with DEFAULT activation and strength.
    """

    return Neuron(
        neuron_type=neuron_type,
        source_model=source_model,
        source_id=source_id,
        vector=vector,
    )