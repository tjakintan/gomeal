from __future__ import annotations

import json
from typing import Any

from PIL import Image as PILImage

from routes.embed.image import generate_image_embeddings
from services.db import query


class SimilarPostFinder:

    def find(
        self,
        image: PILImage.Image,
        *,
        limit: int = 10,
        probes: int = 10,
        exclude_post_id: int | None = None,
    ) -> list[int]:

        embedding = generate_image_embeddings(
            [image]
        )[0].tolist()

        return self._query_similar(
            embedding,
            limit=limit,
            probes=probes,
            exclude_post_id=exclude_post_id,
        )

    @staticmethod
    def _query_similar(
        embedding: list[float],
        *,
        limit: int,
        probes: int,
        exclude_post_id: int | None,
    ) -> list[int]:

        sql = """
            SET LOCAL ivfflat.probes = %s;

            SELECT pe.post_id
            FROM post_embeddings pe
            JOIN post p ON p.id = pe.post_id
            WHERE pe.image_embedding IS NOT NULL
            AND p.status = 'active'
        """

        params: list[Any] = [probes]

        if exclude_post_id is not None:
            sql += " AND pe.post_id != %s"
            params.append(exclude_post_id)

        sql += """
            ORDER BY pe.image_embedding <=> %s::vector
            LIMIT %s
        """

        params.append(json.dumps(embedding))
        params.append(limit)

        rows = query(sql, params)

        return [
            row[0] if isinstance(row, tuple) else row["post_id"]
            for row in rows
        ]