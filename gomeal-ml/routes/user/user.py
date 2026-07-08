import os
import json
from services.db import query
import numpy as np
from dotenv import load_dotenv

load_dotenv()
from brain.utils.time_utils import _time_decay
from brain.utils.math_utils import compute_normalize_vector_1

EMBEDDING_DIM = int(os.getenv("EMBEDDING_DIM"))

def _get_user_action(user_sub: str) -> dict[str, int]:

    rows = query(
        """
            SELECT
                ua.action_type,
                COUNT(*)::int AS count
            FROM user_actions ua
            JOIN post p
                ON ua.target_id = p.id
            WHERE p.user_sub = %s
              AND ua.target_type = 'POST'
            GROUP BY ua.action_type
        """,
        [user_sub],
    )

    action_counts = {
        "CREATE_POST": 0,
        "LIKE_POST": 0,
        "COOK_POST": 0,
        "VIEW_POST": 0,
        "DELETE_POST": 0,
        "SHARE_POST": 0,
        "STAR_POST": 0,
    }

    if not rows:
        return action_counts

    for row in rows:
        if isinstance(row, tuple):
            action_type, count = row
        else:
            action_type = row["action_type"]
            count = row["count"]

        action_counts[action_type] = int(count)

    return action_counts

def _get_active_user_subs(limit: int) -> list[str]:

    rows = query(
        """
            SELECT
                p.user_sub,
                MAX(p.created_at) AS updated_at
            FROM post p
            WHERE p.status = 'active'
            GROUP BY p.user_sub
            ORDER BY MAX(p.created_at) DESC
            LIMIT %s
        """,
        [limit],
    )

    if not rows:
        return []

    result = []

    for row in rows:
        if isinstance(row, tuple):
            author_sub, _ = row
        else:
            author_sub = row["user_sub"]

        result.append(str(author_sub))

    return result