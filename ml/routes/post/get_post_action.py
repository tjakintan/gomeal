from services.db import query

def _get_posts_action_count(post_ids: list[int]) -> dict[int, dict]:
    result = query("""
        SELECT
            target_id,
            action_type,
            COUNT(*) as count
        FROM user_actions
        WHERE target_id = ANY(%s)
        GROUP BY target_id, action_type
    """, [post_ids])

    counts: dict[int, dict] = {}
    for row in result:
        pid = int(row["target_id"])
        if pid not in counts:
            counts[pid] = {}
        counts[pid][row["action_type"]] = int(row["count"])
    return counts


def _get_post_user_action_count(post_id: int, user_sub: str) -> list[str]:
    rows = query(
        """
            SELECT action_type
            FROM post_actions
            WHERE post_id = %s
              AND user_sub = %s
        """,
        [post_id, user_sub],
    )
    return [row["action_type"] for row in rows]