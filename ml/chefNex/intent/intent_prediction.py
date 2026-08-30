from dataclasses import dataclass

from ml.chefNex.intent import Intent


@dataclass(frozen=True)
class IntentPrediction:
    intent: Intent
    confidence: float  # margin between best and second-best centroid similarity, in [0, 2]
    top_similarity: float  # raw cosine similarity to the winning centroid, in [-1, 1]