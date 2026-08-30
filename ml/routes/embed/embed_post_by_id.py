from __future__ import annotations

import json
from io import BytesIO
from typing import Any

import requests
from PIL import Image as PILImage

from routes.embed.text import generate_embeddings
from routes.embed.image import generate_image_embeddings

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

    return " ".join(
        part for part in parts if part
    ).strip()


def _load_post_image(image_url: str) -> PILImage.Image:
    """
    Download a post image and convert it to RGB for CLIP.
    """

    response = requests.get(
        image_url,
        timeout=20,
    )
    response.raise_for_status()

    with PILImage.open(BytesIO(response.content)) as image:
        return image.convert("RGB")


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
            dietary,
            image_url
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

    # ---------------------------------------------------------
    # Text embedding
    # BGE-base-en-v1.5
    # ---------------------------------------------------------

    text = _build_post_text(row)

    embedding = generate_embeddings(
        [text]
    )[0].tolist()

    # ---------------------------------------------------------
    # Scope tags
    # ---------------------------------------------------------

    scope_tags = _create_scope(text)

    # ---------------------------------------------------------
    # Image embedding
    # CLIP ViT-L/14-336
    # ---------------------------------------------------------

    image_url = _post_value(
        row,
        "image_url",
        8,
    )

    image_embedding = None

    if image_url:
        try:
            image = _load_post_image(image_url)

            image_embedding = generate_image_embeddings(
                [image]
            )[0].tolist()

        except Exception as e:
            print(
                f"Failed to generate image embedding "
                f"for post {post_id}: {e}"
            )

    # ---------------------------------------------------------
    # Save embeddings
    # ---------------------------------------------------------

    query(
        """
        INSERT INTO post_embeddings (
            post_id,
            embedding,
            image_embedding,
            scope_tags,
            updated_at
        )
        VALUES (
            %s,
            %s::vector,
            %s::vector,
            %s::jsonb,
            NOW()
        )
        ON CONFLICT (post_id)
        DO UPDATE SET
            embedding = EXCLUDED.embedding,
            image_embedding = EXCLUDED.image_embedding,
            scope_tags = EXCLUDED.scope_tags,
            updated_at = NOW()
        """,
        [
            post_id,
            json.dumps(embedding),
            json.dumps(image_embedding)
            if image_embedding is not None
            else None,
            json.dumps(scope_tags),
        ],
    )

    return {
        "status": "success",
        "post_id": post_id,
        "scope_tags": scope_tags,
        "has_image_embedding": image_embedding is not None,
    }