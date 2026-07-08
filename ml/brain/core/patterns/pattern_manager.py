from typing import List, Dict

from brain.core.patterns.pattern import Pattern

class PatternManager:
    def __init__(self):
        self.patterns: Dict[str, Pattern] = {}

    def register_pattern(self, neuron_ids: List[int]):
        key = "-".join(str(nid) for nid in sorted(neuron_ids))

        if key in self.patterns:
            self.patterns[key].increment()
        else:
            self.patterns[key] = Pattern(neuron_ids)

        return self.patterns[key]

    def get_frequent_patterns(self, min_count: int = 2) -> List[Pattern]:
        return [p for p in self.patterns.values() if p.activation_count >= min_count]