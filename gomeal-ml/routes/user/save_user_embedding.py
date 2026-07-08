import numpy as np
from services.db import query

def _save_user_embedding(user_sub: str, embedding: np.ndarray):
    from services.db import query

    vector_str = "[" + ",".join(str(float(x)) for x in embedding.tolist()) + "]"

    query(
        """
            INSERT INTO user_embeddings (user_sub, embedding, updated_at)
            VALUES (%s, %s::vector, NOW())
            ON CONFLICT (user_sub)
            DO UPDATE SET
                embedding = EXCLUDED.embedding,
                updated_at = NOW()
        """,
        [user_sub, vector_str],
    )