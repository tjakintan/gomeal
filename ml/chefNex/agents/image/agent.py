from __future__ import annotations

from pathlib import Path
from typing import Any

from PIL import Image as PILImage

from chefNex.agents.base import (
    BaseAgent,
)

from chefNex.agents.image.box_detector import (
    BoxDetector,
)

from chefNex.agents.image.ingredient_detector import (
    IngredientDetector,
)

from chefNex.agents.image.ingredient_extractor import (
    IngredientExtractor,
)


class ImageAgent(BaseAgent):

    def __init__(
        self,
    ) -> None:

        print(
            "Initializing ImageAgent..."
        )

        self.ingredient_detector = (
            IngredientDetector()
        )

        self.ingredient_extractor = (
            IngredientExtractor()
        )

        self.box_detector = (
            BoxDetector()
        )


    def run(
        self,
        image_path: str | Path,
        phrases: str | list[str] | None = None,
    ) -> dict[str, Any]:

        image = self._load_image(
            image_path
        )

        visible_items = (
            self.ingredient_detector.detect(
                image
            )
        )

        print(
            f"[ImageAgent] "
            f"Visible items: {visible_items}"
        )

        candidates = (
            self._build_candidates(
                visible_items
            )
        )

        if phrases:

            candidates.extend(
                self._normalize_phrases(
                    phrases
                )
            )

        candidates = (
            self._deduplicate(
                candidates
            )
        )

        print(
            f"[ImageAgent] "
            f"Grounding "
            f"{len(candidates)} candidates: "
            f"{candidates}"
        )

        detection = (
            self.box_detector.ground(
                image,
                candidates,
            )
        )

        detected_boxes = (
            self._build_boxes(
                detection
            )
        )

        return {
            "visible_items": visible_items,
            "candidates": candidates,
            "raw": visible_items,
            "boxes": detected_boxes,
        }


    def _build_candidates(
        self,
        visible_items: list[str],
    ) -> list[str]:

        candidates: list[str] = []

        for item in visible_items:

            candidates.append(
                item
            )

            matches = (
                self.ingredient_extractor.extract(
                    item
                )
            )

            for match in matches:

                name = match.get(
                    "name"
                )

                if isinstance(
                    name,
                    str,
                ):

                    candidates.append(
                        name
                    )

        return self._deduplicate(
            candidates
        )


    @staticmethod
    def _normalize_phrases(
        phrases: str | list[str],
    ) -> list[str]:

        if isinstance(
            phrases,
            str,
        ):

            phrases = [
                phrases
            ]

        results: list[str] = []

        for phrase in phrases:

            if not isinstance(
                phrase,
                str,
            ):

                continue

            phrase = (
                phrase
                .strip()
                .lower()
            )

            if phrase:

                results.append(
                    phrase
                )

        return results


    @staticmethod
    def _deduplicate(
        items: list[str],
    ) -> list[str]:

        seen: set[str] = set()

        results: list[str] = []

        for item in items:

            if not isinstance(
                item,
                str,
            ):

                continue

            item = (
                item
                .strip()
                .lower()
            )

            if (
                not item
                or item in seen
            ):

                continue

            seen.add(
                item
            )

            results.append(
                item
            )

        return results


    def _load_image(
        self,
        image_path: str | Path,
    ) -> PILImage.Image:

        path = Path(
            image_path
        )

        if not path.exists():

            raise FileNotFoundError(
                f"Image not found: "
                f"{image_path}"
            )

        return (
            PILImage
            .open(
                path
            )
            .convert(
                "RGB"
            )
        )


    @staticmethod
    def _build_boxes(
        detection: dict[str, Any],
    ) -> list[dict[str, Any]]:

        labels = detection.get(
            "labels",
            [],
        )

        boxes = detection.get(
            "boxes",
            [],
        )

        scores = detection.get(
            "scores",
            [],
        )

        results: list[
            dict[str, Any]
        ] = []

        for index, (
            label,
            box,
            score,
        ) in enumerate(
            zip(
                labels,
                boxes,
                scores,
            ),
            start=1,
        ):

            results.append(
                {
                    "id": index,
                    "label": label,
                    "box": box,
                    "confidence": score,
                }
            )

        return results