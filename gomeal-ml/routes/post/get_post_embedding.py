import json
from services.db import query
from routes.feed.scopes.scope import FEED_SCOPE_REGISTRY

def _get_post_embeddings(limit: int) -> list[dict]:

    rows = query(
        """
            SELECT
                pe.post_id,
                pe.embedding,
                pe.updated_at
            FROM post_embeddings pe
            JOIN post p ON pe.post_id = p.id
            WHERE p.status = 'active'
              AND pe.embedding IS NOT NULL
            ORDER BY pe.updated_at DESC
            LIMIT %s
        """,
        [limit],
    )

    if not rows:
        return []

    result = []

    for row in rows:

        if isinstance(row, tuple):
            post_id, embedding, updated_at = row
        else:
            post_id    = row["post_id"]
            embedding  = row["embedding"]
            updated_at = row["updated_at"]

        result.append({
            "post_id":    post_id,
            "embedding":  embedding,
            "updated_at": updated_at,
        })

    return result


def _get_post_embedding_by_id(post_id: int) -> dict | None:
    rows = query(
        """
            SELECT
                pe.post_id,
                pe.embedding,
                pe.updated_at,
                pe.scope_tags
            FROM post_embeddings pe
            JOIN post p ON pe.post_id = p.id
            WHERE p.status = 'active'
              AND pe.embedding IS NOT NULL
              AND pe.post_id = %s
            LIMIT 1
        """,
        [post_id],
    )

    if not rows:
        return None

    row = rows[0]

    if isinstance(row, tuple):
        found_post_id, embedding, updated_at, scope_tags = row
    else:
        found_post_id = row["post_id"]
        embedding = row["embedding"]
        updated_at = row["updated_at"]
        scope_tags = row.get("scope_tags")

    if isinstance(embedding, str):
        try:
            embedding = json.loads(embedding)
        except Exception:
            pass

    if isinstance(scope_tags, str):
        try:
            scope_tags = json.loads(scope_tags)
        except Exception:
            pass

    return {
        "post_id": found_post_id,
        "embedding": embedding,
        "updated_at": updated_at,
        "scope_tags": scope_tags or {},
    }


def _get_post_embeddings_by_user_sub(
    user_sub: str,
    user_vector: list[float] | None,
    limit: int,
    selected_scope: str | None = None,
) -> list[dict]:

    params = [user_sub]
    scope_sql = ""

    if selected_scope:
        scope_meta = FEED_SCOPE_REGISTRY.get(selected_scope)

        if not scope_meta:
            return []

        family = scope_meta["family"]
        scope_sql = "AND (pe.scope_tags -> %s) ? %s"
        params.extend([family, selected_scope])

    try:
        if user_vector is not None:
            vector_str = "[" + ",".join(str(float(x)) for x in user_vector) + "]"

            rows = query(
                f"""
                SELECT
                    pe.post_id,
                    pe.embedding,
                    pe.updated_at,
                    pe.scope_tags
                FROM post_embeddings pe
                JOIN post p ON pe.post_id = p.id
                WHERE p.user_sub != %s
                  AND p.status = 'active'
                  AND pe.embedding IS NOT NULL
                  {scope_sql}
                ORDER BY pe.embedding <=> %s::vector
                LIMIT %s
                """,
                [*params, vector_str, limit],
            )
        else:
            rows = query(
                f"""
                SELECT
                    pe.post_id,
                    pe.embedding,
                    pe.updated_at,
                    pe.scope_tags
                FROM post_embeddings pe
                JOIN post p ON pe.post_id = p.id
                WHERE p.user_sub != %s
                  AND p.status = 'active'
                  AND pe.embedding IS NOT NULL
                  {scope_sql}
                ORDER BY pe.updated_at DESC
                LIMIT %s
                """,
                [*params, limit],
            )

    except Exception:
        print(
            f"vector ranking query failed: dims={len(user_vector) if user_vector is not None else None} limit={limit} scope={selected_scope}"
        )
        raise

    if not rows:
        return []

    result = []
    for row in rows:
        if isinstance(row, tuple):
            post_id, embedding, updated_at, scope_tags = row
        else:
            post_id = row["post_id"]
            embedding = row["embedding"]
            updated_at = row["updated_at"]
            scope_tags = row.get("scope_tags")

        if isinstance(embedding, str):
            try:
                embedding = json.loads(embedding)
            except Exception:
                pass

        if isinstance(scope_tags, str):
            try:
                scope_tags = json.loads(scope_tags)
            except Exception:
                pass

        result.append({
            "post_id": post_id,
            "embedding": embedding,
            "updated_at": updated_at,
            "scope_tags": scope_tags or {},
        })

    return result
