from __future__ import annotations

import json
from typing import Any

from routes.embed.embed import generate_embeddings
from routes.feed.scopes.scope import _create_scope
from services.db import query


def _post_value(row: Any, key: str, index: int) -> Any:
    if isinstance(row, tuple):
        return row[index]
    return row[key]


def _build_post_text(row: Any) -> str:
    parts = [
        _post_value(row, "dish_name", 1) or "",
        _post_value(row, "description", 2) or "",
        _post_value(row, "difficulty", 3) or "",
        json.dumps(_post_value(row, "ingredients", 4) or []),
        json.dumps(_post_value(row, "steps", 5) or []),
        json.dumps(_post_value(row, "nutrition", 6) or {}),
        json.dumps(_post_value(row, "dietary", 7) or {}),
    ]
    return " ".join(part for part in parts if part).strip()


def _embed_post_by_id(post_id: int) -> dict[str, Any]:
    rows = query(
        """
            SELECT
                id,
                dish_name,
                description,
                difficulty,
                ingredients,
                steps,
                nutrition,
                dietary
            FROM post
            WHERE id = %s
            AND status = 'active'
            LIMIT 1
        """,
        [post_id],
    )

    if not rows:
        raise Exception("post_not_found")

    row = rows[0]
    _text = _build_post_text(row)
    embedding = generate_embeddings([_text])[0].tolist()
    scope_tags = _create_scope(_text)

    query(
        """
            INSERT INTO post_embeddings (post_id, embedding, scope_tags, updated_at)
            VALUES (%s, %s::vector, %s::jsonb, NOW())
            ON CONFLICT (post_id)
            DO UPDATE SET
                embedding = EXCLUDED.embedding,
                scope_tags = EXCLUDED.scope_tags,
                updated_at = NOW()
        """,
        [post_id, json.dumps(embedding), json.dumps(scope_tags)],
    )

    return {
        "status": "success",
        "post_id": post_id,
        "scope_tags": scope_tags,
    }

