from typing import List

class Pattern:
    """
        Represents a recurring activation pattern in the network.
    """

    def __init__(self, neuron_ids: List[int]):
        normalized_ids = sorted(int(nid) for nid in neuron_ids)
        self.id = "-".join(str(nid) for nid in normalized_ids)
        self.neuron_ids = normalized_ids
        self.activation_count = 1

    def increment(self):
        self.activation_count += 1