from services.db import query

def _get_trend_post_scores(post_ids: list[int]) -> dict[int, float]:
    sql = """
        SELECT id, trend_score
        FROM post
        WHERE id = ANY(%s)
    """
    results = query(sql, [post_ids]) or []

    return {
        int(row["id"]): float(row["trend_score"] or 0.0)
        for row in results
    }


def _insert_trend_post(
    post_id: int,
    trend_score: float,
    trend_rank: int,
    trend_velocity: float = 0.0,
    explore_score: float = 0.0,
):
    sql = """
        UPDATE post
        SET
            trend_score = %s,
            trend_rank = %s,
            trend_velocity = %s,
            explore_score = %s,
            last_ranked_at = NOW()
        WHERE id = %s
    """

    query(
        sql,
        [
            trend_score,
            trend_rank,
            trend_velocity,
            explore_score,
            post_id,
        ],
    )