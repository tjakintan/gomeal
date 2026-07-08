from services.db import query

# ---- matching action weights in ./backend/types/user ------------
def _get_trend_candidates(limit: int = 500) -> list[dict]:
    result = query("""
        SELECT
            pe.post_id,
            pe.embedding,
            p.created_at,
            pe.updated_at
        FROM post_embeddings pe
        JOIN post p ON p.id = pe.post_id
        LEFT JOIN (
            SELECT
                target_id AS post_id,
                SUM(action_weight) AS engagement_score
            FROM user_actions
            WHERE target_type = 'POST'
            GROUP BY target_id
        ) agg ON agg.post_id = pe.post_id
        WHERE p.status = 'active'
        ORDER BY COALESCE(agg.engagement_score, 0) DESC
        LIMIT %s
    """, [limit])
    return list(result)