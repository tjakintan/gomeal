import hashlib
import json
from pathlib import Path

import numpy as np

from ml.chefNex.intent import INTENT_REGISTRY, Intent, all_examples
from chefNex.intent.intent_prediction import IntentPrediction

from ml.routes.embed import generate_embeddings

CACHE_PATH = Path(__file__).parent / "chat_v1_centroids.json"

def _normalize(vec: np.ndarray) -> np.ndarray:
    norm = np.linalg.norm(vec)
    return vec / norm if norm > 1e-9 else vec


def _compute_unit_centroid(embeddings: list[list[float]]) -> np.ndarray:
    arr = np.array([_normalize(np.array(e)) for e in embeddings])
    return _normalize(arr.mean(axis=0))


def _registry_hash() -> str:
    """Fingerprint of every example across every intent — changes if added,
    removed, or edited of ANY example, so a stale cache can never be used silently."""
    payload = json.dumps(
        {intent.value: sorted(spec.examples) for intent, spec in INTENT_REGISTRY.items()},
        sort_keys=True,
    )
    return hashlib.sha256(payload.encode()).hexdigest()


class IntentClassifier:
    def predict(self, text: str) -> IntentPrediction:
        raise NotImplementedError


class EmbeddingClassifier(IntentClassifier):
    def __init__(self, cache_path: Path = CACHE_PATH, force_recompute: bool = False):
        self.centroids: dict[Intent, np.ndarray] = {}
        current_hash = _registry_hash()

        if not force_recompute and cache_path.exists():
            cached = json.loads(cache_path.read_text())
            if cached.get("hash") == current_hash:
                self.centroids = {
                    Intent(k): np.array(v) for k, v in cached["centroids"].items()
                }
                return  # cache hit — zero embedding calls

        # cache miss: registry changed, or no cache yet — recompute from scratch
        for intent, spec in INTENT_REGISTRY.items():
            if not spec.examples:
                continue
            embeddings = generate_embeddings(spec.examples)
            if not embeddings or len(embeddings) != len(spec.examples):
                raise RuntimeError(
                    f"generate_embeddings returned {len(embeddings) if embeddings else 0} "
                    f"vectors for {len(spec.examples)} examples of {intent}"
                )
            self.centroids[intent] = _compute_unit_centroid(embeddings)

        self._save_cache(cache_path, current_hash)

    def _save_cache(self, cache_path: Path, hash_: str) -> None:
        payload = {
            "hash": hash_,
            "centroids": {k.value: v.tolist() for k, v in self.centroids.items()},
        }
        cache_path.write_text(json.dumps(payload))

    def predict(self, text: str) -> IntentPrediction:
        raw = generate_embeddings([text])
        if not raw:
            raise RuntimeError(f"generate_embeddings returned no vector for: {text!r}")
        query = _normalize(np.array(raw[0]))

        scores = {
            intent: float(np.dot(query, centroid))
            for intent, centroid in self.centroids.items()
        }
        ranked = sorted(scores.items(), key=lambda kv: kv[1], reverse=True)
        best_intent, best_score = ranked[0]
        second_score = ranked[1][1] if len(ranked) > 1 else -1.0

        return IntentPrediction(
            intent=best_intent,
            confidence=best_score - second_score,
            top_similarity=best_score,
        )