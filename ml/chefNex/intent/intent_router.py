from chefNex.intent.classifier import EmbeddingClassifier
from ml.chefNex.intent import Intent, keyword_prefilter
from chefNex.intent.intent_prediction import IntentPrediction


class IntentRouter:
    def __init__(self, confidence_threshold: float = 0.08):
        # threshold is on the MARGIN (best - second-best similarity), not raw similarity
        self.confidence_threshold = confidence_threshold
        self.classifier = EmbeddingClassifier()

    def classify(self, text: str) -> IntentPrediction:
        text = text.strip()

        if not text:
            return IntentPrediction(intent=Intent.CHAT, confidence=1.0, top_similarity=1.0)

        if (fast := keyword_prefilter(text)) is not None:
            return IntentPrediction(intent=fast, confidence=1.0, top_similarity=1.0)

        prediction = self.classifier.predict(text)
        if prediction.confidence < self.confidence_threshold:
            return IntentPrediction(
                intent=Intent.UNKNOWN,
                confidence=prediction.confidence,
                top_similarity=prediction.top_similarity,
            )
        return prediction