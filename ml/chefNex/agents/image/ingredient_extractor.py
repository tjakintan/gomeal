from __future__ import annotations

from typing import Any

import numpy as np

from routes.embed.text import (
    generate_embeddings,
)

from routes.ingredient import (
    _find_ingredient_candidates,
)


class IngredientExtractor:

    MIN_CONFIDENCE = 0.60
    CANDIDATE_LIMIT = 5


    def extract(
        self,
        item: str,
    ) -> list[dict[str, Any]]:

        item = (
            item
            .strip()
            .lower()
        )

        if not item:

            return []

        print(
            f"[IngredientExtractor] "
            f"Finding candidates for: {item}"
        )

        embeddings = (
            generate_embeddings(
                [
                    item
                ]
            )
        )

        if (
            not embeddings
        ):

            print(
                "[IngredientExtractor] "
                "No embedding generated."
            )

            return []

        embedding = np.asarray(
            embeddings[0],
            dtype=np.float32,
        )

        candidates = (
            _find_ingredient_candidates(
                embedding=embedding,
                limit=self.CANDIDATE_LIMIT,
            )
        )

        if not candidates:

            print(
                "[IngredientExtractor] "
                "No database candidates."
            )

            return []

        matches: list[
            dict[str, Any]
        ] = []

        seen_ids: set[
            Any
        ] = set()

        for candidate in candidates:

            ingredient_id = (
                candidate.get(
                    "ingredient_id"
                )
            )

            confidence = float(
                candidate.get(
                    "similarity",
                    0.0,
                )
            )

            if (
                confidence
                < self.MIN_CONFIDENCE
            ):

                continue

            if (
                ingredient_id
                in seen_ids
            ):

                continue

            seen_ids.add(
                ingredient_id
            )

            matches.append(
                {
                    "raw": item,
                    "ingredient_id": ingredient_id,
                    "name": (
                        candidate.get(
                            "name"
                        )
                    ),
                    "confidence": confidence,
                }
            )

        print(
            f"[IngredientExtractor] "
            f"Candidates kept: "
            f"{matches}"
        )

        return matches