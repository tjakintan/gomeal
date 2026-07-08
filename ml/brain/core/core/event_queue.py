from typing import List, Dict, Optional
from datetime import datetime
from uuid import uuid4
from brain.core.core.neuron import Neuron
from brain.core.core.macro_neuron import MacroNeuron
from pydantic import BaseModel, Field

class NeuronEvent(BaseModel):
    """
        Represents an activation event for a neuron.
    """
    event_id: str = Field(default_factory=lambda: str(uuid4()))
    neuron_id: int
    activation: float
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    metadata: Optional[Dict] = Field(default_factory=dict)

class EventQueue:
    """
        A simple queue to store and process neuron activation events.
    """
    def __init__(self):
        self.queue: List[NeuronEvent] = []

    def add_event(self, neuron_id: int, activation: float, metadata: Optional[Dict] = None):
        """
            Add a new neuron activation event.
        """
        event = NeuronEvent(neuron_id=neuron_id, activation=activation, metadata=metadata or {})
        self.queue.append(event)

    def process(self, brain):
        """
            Process all events in the queue:
            - Update neuron activations
            - Propagate activation to connected neurons (including macro neurons)
            - Clear the queue
        """
        while self.queue:
            event = self.queue.pop(0)

            node = brain.get_node("neuron", event.neuron_id)
            if node is None:
                continue

            node.activation += event.activation
            node.last_fired = datetime.utcnow().timestamp()

            for syn_id in getattr(node, "out_synapses", []):
                syn = brain.synapses.get(syn_id)
                if syn is None:
                    continue

                target = brain.get_node(syn.target_type, syn.target_id)
                if target is None:
                    continue

                propagated_activation = syn.propagate(event.activation)
                target.activation += propagated_activation
                target.last_fired = datetime.utcnow().timestamp()