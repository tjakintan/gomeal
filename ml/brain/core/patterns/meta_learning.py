from typing import List, Dict, Pattern

def update_synapse_weights(synapses: List, patterns: List[Pattern], learning_rate: float = 0.1):
    for pattern in patterns:
        for syn in synapses:
            if syn.source_id in pattern.neuron_ids and syn.target_id in pattern.neuron_ids:
                syn.strength += learning_rate
                syn.strength = min(syn.strength, 2.0)  # cap max weight