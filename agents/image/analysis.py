from __future__ import annotations

from pathlib import Path
from typing import Any

from PIL import Image as PILImage

import io

from agents.image.box_detector import (
    BoxDetector,
)

from agents.ingredient import (
    IngredientImageDetector,
    IngredientExtractor,
    IngredientExpander,
)

from agents.image.find_similar import (
    SimilarPostFinder,
)

class ImageAnalysis():

    MAX_IMAGE_SIZE = 768

    def __init__(
        self,
    ) -> None:

        print(
            "Initializing ImageAgent..."
        )

        self.ingredient_detector = (
            IngredientImageDetector()
        )

        self.ingredient_extractor = (
            IngredientExtractor()
        )

        self.box_detector = (
            BoxDetector()
        )

        self.ingredient_expander = (
            IngredientExpander(
                model=self.ingredient_detector.model,
                processor=self.ingredient_detector.processor,
                device=self.ingredient_detector.device,
            )
        )

        self.similar_post_finder = (
            SimilarPostFinder()
        )


    def run(
        self,
        image_path: str | Path | bytes,
        phrases: str | list[str] | None = None,
        *,
        width: int | None = None,
        height: int | None = None,
        pixel_format: str = "rgb",
        similar_posts_limit: int = 10,
    ) -> dict[str, Any]:

        (
            image,
            original_width,
            original_height,
        ) = self._load_image(
            image_path,
            width=width,
            height=height,
            pixel_format=pixel_format,
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

        (
            candidates,
            expansion_lookup,
        ) = self._build_candidates(
            visible_items
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

        detection = self._restore_boxes_to_original(
            detection,
            original_width=original_width,
            original_height=original_height,
            processed_width=image.width,
            processed_height=image.height,
        )

        components = (
            self._build_components(
                visible_items,
                expansion_lookup,
            )
        )

        boxes = (
            self._build_boxes(
                detection,
                expansion_lookup,
                components,
                frame_width=original_width,
                frame_height=original_height,
            )
        )

        print(
            f"[ImageAgent] "
            f"Finding similar posts"
        )

        similar_post_ids = (
            self.similar_post_finder.find(
                image,
                limit=similar_posts_limit,
            )
        )

        print(
            f"[ImageAgent] "
            f"Similar posts: {similar_post_ids}"
        )

        trace = self._build_trace(
            visible_items=visible_items,
            candidates=candidates,
            detection=detection,
            expansion_lookup=expansion_lookup,
            components=components,
            similar_post_ids=similar_post_ids,
        )

        return {
            "items": boxes,
            "similar_post_ids": similar_post_ids,
            "trace": trace,
        }

    
    def _build_candidates(
        self,
        visible_items: list[str],
    ) -> tuple[
        list[str],
        dict[str, dict[str, Any]],
    ]:

        candidates: list[str] = []

        expansion_lookup: dict[
            str,
            dict[str, Any],
        ] = {}

        for item in visible_items:

            item_key = (
                item
                .strip()
                .lower()
            )

            if not item_key:
                continue

            candidates.append(
                item_key
            )

            expansion_lookup[
                item_key
            ] = (
                self.ingredient_extractor.extract(
                    item_key
                )
            )

        return (
            self._deduplicate(
                candidates
            ),
            expansion_lookup,
        )


    def _build_components(
        self,
        visible_items: list[str],
        expansion_lookup: dict[
            str,
            dict[str, Any],
        ],
    ) -> dict[
        str,
        list[dict[str, Any]],
    ]:

        raw_components_by_item: dict[
            str,
            list[str],
        ] = {}

        all_components: list[str] = []

        # ---------------------------------------------------------
        # Phase 1:
        # Expand only items that do not have a trusted DB match.
        # ---------------------------------------------------------

        for item in visible_items:

            item_key = (
                item
                .strip()
                .lower()
            )

            if not item_key:
                continue

            result = (
                expansion_lookup.get(
                    item_key,
                    {},
                )
            )

            should_expand = bool(
                result.get(
                    "should_expand",
                    False,
                )
            )

            best_match = (
                result.get(
                    "match"
                )
            )

            # This is already a trusted ingredient.
            # Example:
            #
            # "lettuce" -> Lettuce
            #
            # No expansion needed.
            if not should_expand:

                raw_components_by_item[
                    item_key
                ] = []

                continue

            # -----------------------------------------------------
            # Expand dish / food item.
            #
            # Examples:
            #
            # pizza
            # pancakes
            # french fries
            # hamburger
            # -----------------------------------------------------

            if best_match is not None:

                confidence = float(
                    best_match.get(
                        "confidence",
                        0.0,
                    )
                )

                print(
                    f"[ImageAgent] "
                    f"Expanding {item_key} "
                    f"({confidence:.2%} DB match)"
                )

            else:

                print(
                    f"[ImageAgent] "
                    f"Expanding {item_key} "
                    f"(no trusted DB match)"
                )

            raw_components = (
                self.ingredient_expander.expand(
                    item_key
                )
            )

            raw_components = (
                self._deduplicate(
                    raw_components
                )
            )

            # Store the raw component names for this item.
            raw_components_by_item[
                item_key
            ] = raw_components

            all_components.extend(
                raw_components
            )

        # ---------------------------------------------------------
        # Phase 2:
        # Deduplicate all components and resolve them against
        # the ingredient database in ONE batch.
        # ---------------------------------------------------------

        all_components = (
            self._deduplicate(
                all_components
            )
        )

        if not all_components:

            return {
                item_key: []
                for item_key in raw_components_by_item
            }

        print(
            f"[ImageAgent] "
            f"Resolving {len(all_components)} "
            f"unique components: "
            f"{all_components}"
        )

        component_lookup = (
            self.ingredient_extractor.extract_components(
                all_components
            )
        )

        # ---------------------------------------------------------
        # Phase 3:
        # Convert each raw component into the canonical
        # ingredient representation.
        # ---------------------------------------------------------

        components: dict[
            str,
            list[dict[str, Any]],
        ] = {}

        for (
            item_key,
            raw_components,
        ) in raw_components_by_item.items():

            resolved_components: list[
                dict[str, Any]
            ] = []

            for component in raw_components:

                component_result = (
                    component_lookup.get(
                        component,
                        {},
                    )
                )

                component_match = (
                    component_result.get(
                        "match"
                    )
                )

                if component_match is not None:
                    resolved_components.append(
                        {
                            "id": component_match.get("ingredient_id"),
                            "name": component_match.get("name"),
                            "category": component_match.get("category"),
                            "media_url": component_match.get("media_url"),
                            "price": component_match.get("price"),
                            "confidence": component_match.get("confidence", 0.0),
                        }
                    )

                else:
                    resolved_components.append(
                        {
                            "id": None,
                            "name": component,
                            "category": None,
                            "media_url": None,
                            "price": None,
                            "confidence": None,
                        }
                    )

            components[
                item_key
            ] = resolved_components

        return components


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
    def _build_trace(
        *,
        visible_items: list[str],
        candidates: list[str],
        detection: dict[str, Any],
        expansion_lookup: dict[str, dict[str, Any]],
        components: dict[str, list[dict[str, Any]]],
        similar_post_ids: list[int],
    ) -> dict[str, Any]:
        """
        Small, JSON-safe snapshot of every pipeline stage, stored with
        each rating. Scalars and strings only: no numpy types, no
        Decimals (ingredient.price is numeric), no media URLs.
        """

        labels = detection.get("labels", [])
        scores = detection.get("scores", [])

        grounded = [
            {"label": str(l).strip().lower(), "score": round(float(s), 3)}
            for l, s in zip(labels, scores)
        ]
        grounded_labels = {g["label"] for g in grounded}

        matches: dict[str, Any] = {}

        for key, result in expansion_lookup.items():
            m = result.get("match")

            matches[key] = {
                "ingredient_id": m.get("ingredient_id") if m else None,
                "name": m.get("name") if m else None,
                "confidence": (
                    round(float(m["confidence"]), 3)
                    if m and m.get("confidence") is not None
                    else None
                ),
                "match_type": m.get("match_type") if m else None,
                "should_expand": bool(result.get("should_expand", False)),
            }

        return {
            "visible_items": visible_items,                 # VLM output
            "candidates": candidates,                       # sent to the box detector
            "grounded": grounded,                           # what the detector actually boxed
            "ungrounded": [                                 # VLM saw it, detector never boxed it
                c for c in candidates if c not in grounded_labels
            ],
            "matches": matches,                             # DB match per visible item
            "expansions": {                                 # resolved components per expanded item
                key: [c.get("name") for c in comps]
                for key, comps in components.items()
                if comps
            },
            "similar_post_ids": similar_post_ids[:10],
            "thresholds": {                                 # so each row records the settings it ran with
                "expand": IngredientExtractor.EXPAND_CONFIDENCE,
                "component_min": IngredientExtractor.COMPONENT_MIN_CONFIDENCE,
            },
        }
    
    
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


    @staticmethod
    def _resize_image(
        image: PILImage.Image,
        max_size: int,
    ) -> PILImage.Image:

        if image.width <= max_size and image.height <= max_size:
            return image

        image = image.copy()

        image.thumbnail(
            (max_size, max_size),
            PILImage.Resampling.LANCZOS,
        )

        return image


    def _load_image(
        self,
        image_source: str | Path | bytes,
        *,
        width: int | None = None,
        height: int | None = None,
        pixel_format: str = "rgb",
    ) -> tuple[PILImage.Image, int, int]:

        if isinstance(image_source, bytes):

            if pixel_format.lower() in ("jpeg", "jpg", "png"):

                image = (
                    PILImage
                    .open(io.BytesIO(image_source))
                    .convert("RGB")
                )

                original_width = image.width
                original_height = image.height

                image = self._resize_image(
                    image,
                    self.MAX_IMAGE_SIZE,
                )

                print(
                    f"[ImageAgent] "
                    f"Original: {original_width}x{original_height} "
                    f"→ Processed: {image.width}x{image.height}"
                )

                return (
                    image,
                    original_width,
                    original_height,
                )

            if width is None or height is None:
                raise ValueError(
                    "width and height are required "
                    "when loading a raw pixel buffer"
                )

            mode = (
                "RGB"
                if pixel_format.lower() == "rgb"
                else "RGBA"
                if pixel_format.lower() == "rgba"
                else None
            )

            if mode is None:
                raise ValueError(
                    f"Unsupported pixel_format: {pixel_format!r}"
                )

            expected_size = width * height * len(mode)

            if len(image_source) != expected_size:
                raise ValueError(
                    f"Buffer size {len(image_source)} doesn't match "
                    f"expected {expected_size} for {width}x{height} {mode}"
                )

            image = (
                PILImage
                .frombuffer(
                    mode,
                    (width, height),
                    image_source,
                    "raw",
                    mode,
                    0,
                    1,
                )
                .convert("RGB")
            )

            original_width = image.width
            original_height = image.height

            image = self._resize_image(
                image,
                self.MAX_IMAGE_SIZE,
            )

            print(
                f"[ImageAgent] "
                f"Original: {original_width}x{original_height} "
                f"→ Processed: {image.width}x{image.height}"
            )

            return (
                image,
                original_width,
                original_height,
            )

        path = Path(image_source)

        if not path.exists():
            raise FileNotFoundError(
                f"Image not found: {image_source}"
            )

        image = (
            PILImage
            .open(path)
            .convert("RGB")
        )

        original_width = image.width
        original_height = image.height

        image = self._resize_image(
            image,
            self.MAX_IMAGE_SIZE,
        )

        print(
            f"[ImageAgent] "
            f"Original: {original_width}x{original_height} "
            f"→ Processed: {image.width}x{image.height}"
        )

        return (
            image,
            original_width,
            original_height,
        )


    @staticmethod
    def _get_components_for_ingredient(
        label: str,
        ingredient: dict[str, Any],
        components: dict[
            str,
            list[dict[str, Any]],
        ],
    ) -> list[dict[str, Any]]:

        candidates = [
            label,
        ]

        ingredient_name = (
            ingredient.get(
                "name"
            )
        )

        if isinstance(
            ingredient_name,
            str,
        ):

            candidates.append(
                ingredient_name
            )

        # First try an exact visible-item match.
        for candidate in candidates:

            candidate_key = (
                candidate
                .strip()
                .lower()
            )

            if candidate_key in components:

                return components[
                    candidate_key
                ]

        # Handle labels such as:
        # "fries" -> "french fries"
        matches: list[str] = []

        for candidate in candidates:

            candidate_key = (
                candidate
                .strip()
                .lower()
            )

            for (
                item_key,
                item_components,
            ) in components.items():

                if (
                    candidate_key in item_key
                    or item_key in candidate_key
                ):

                    matches.extend(
                        item_components
                    )

        return ImageAnalysis._deduplicate(
            matches
        )


    @staticmethod
    def _build_boxes(
        detection: dict[str, Any],
        expansion_lookup: dict[
            str,
            dict[str, Any],
        ],
        components: dict[
            str,
            list[dict[str, Any]],
        ],
        *,
        frame_width: int,
        frame_height: int,
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

            label_key = (
                label
                .strip()
                .lower()
            )

            result = (
                expansion_lookup.get(
                    label_key,
                    {},
                )
            )

            best_match = (
                result.get(
                    "match"
                )
            )

            ingredient_components = (
                components.get(
                    label_key,
                    [],
                )
            )

            if best_match is not None:
                ingredient = {
                    "id": best_match.get("ingredient_id"),
                    "name": best_match.get("name"),
                    "category": best_match.get("category"),
                    "media_url": best_match.get("media_url"),
                    "price": best_match.get("price"),
                    "confidence": best_match.get("confidence", 0.0),
                    "ingredients": ingredient_components,
                }
            elif result.get("should_expand", False):
                ingredient = {
                    "id": None,
                    "name": label,
                    "category": None,
                    "media_url": None,
                    "price": None,
                    "confidence": None,
                    "ingredients": ingredient_components,
                }
            else:
                ingredient = None

            results.append(
                {
                    "id": index,
                    "label": label,
                    "box": box,
                    "frameWidth": frame_width,
                    "frameHeight": frame_height,
                    "ingredient": ingredient,
                }
            )

        return results


    @staticmethod
    def _restore_boxes_to_original(
        detection: dict[str, Any],
        *,
        original_width: int,
        original_height: int,
        processed_width: int,
        processed_height: int,
    ) -> dict[str, Any]:

        scale_x = (
            original_width / processed_width
        )

        scale_y = (
            original_height / processed_height
        )

        boxes = detection.get(
            "boxes",
            [],
        )

        restored_boxes = []

        for box in boxes:

            x1, y1, x2, y2 = box

            restored_boxes.append([
                x1 * scale_x,
                y1 * scale_y,
                x2 * scale_x,
                y2 * scale_y,
            ])

        return {
            **detection,
            "boxes": restored_boxes,
        }


    def find_similar_posts(
        self,
        image_path: str | Path | bytes,
        *,
        limit: int = 10,
        width: int | None = None,
        height: int | None = None,
        pixel_format: str = "rgb",
    ) -> list[int]:

        (
            image,
            _,
            _,
        ) = self._load_image(
            image_path,
            width=width,
            height=height,
            pixel_format=pixel_format,
        )

        return self.similar_post_finder.find(
            image,
            limit=limit,
        )