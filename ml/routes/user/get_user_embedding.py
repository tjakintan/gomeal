import json
from services.db import query

def _get_user_embedding(user_sub: str):

    rows = query(
        """
            SELECT embedding
            FROM user_embeddings
            WHERE user_sub = %s
            LIMIT 1
        """,
        [user_sub],
    )

    if not rows:
        return None

    row = rows[0]
    embedding = row[0] if isinstance(row, tuple) else row["embedding"]

    if embedding is None:
        return None

    if isinstance(embedding, str):
        return json.loads(embedding)

    return embedding