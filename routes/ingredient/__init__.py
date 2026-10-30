from __future__ import annotations

from typing import Any

import numpy as np

from services.db import query


def _row_value(
    row: Any,
    key: str,
    index: int,
) -> Any:

    if isinstance(
        row,
        dict,
    ):
        return row[key]

    return row[index]


def _find_ingredient_candidates(
    embedding: np.ndarray,
    limit: int = 10,
) -> list[dict[str, Any]]:

    rows = query(
        """
        SELECT
            ie.ingredient_id,
            i.name,
            1 - (
                ie.embedding <=> %s::vector
            ) AS similarity
        FROM ingredient_embeddings AS ie
        INNER JOIN ingredient AS i
            ON i.id = ie.ingredient_id
        ORDER BY
            ie.embedding <=> %s::vector
        LIMIT %s
        """,
        (
            embedding.tolist(),
            embedding.tolist(),
            limit,
        ),
    )

    candidates = []

    for row in rows:

        candidates.append(
            {
                "ingredient_id": _row_value(
                    row,
                    "ingredient_id",
                    0,
                ),
                "name": _row_value(
                    row,
                    "name",
                    1,
                ),
                "similarity": float(
                    _row_value(
                        row,
                        "similarity",
                        2,
                    )
                ),
            }
        )

    return candidates


def _find_ingredient(
    embedding: np.ndarray,
) -> dict[str, Any] | None:

    candidates = (
        _find_ingredient_candidates(
            embedding=embedding,
            limit=1,
        )
    )

    if not candidates:

        return None

    return candidates[0]


def _get_ingredients() -> list[str]:

    rows = query(
        """
        SELECT
            normalized_name
        FROM ingredient
        WHERE normalized_name IS NOT NULL
          AND normalized_name != ''
        ORDER BY normalized_name
        """
    )

    return [
        _row_value(
            row,
            "normalized_name",
            0,
        )
        for row in rows
    ]