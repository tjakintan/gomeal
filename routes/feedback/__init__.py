from typing import Any

from cachetools import TTLCache
from psycopg2.extras import Json

from services.db import query 

VALID_REASONS = {"wrong_item", "wrong_box", "wrong_ingredients", "missing_item", "other"}

_label_stats_cache: TTLCache = TTLCache(maxsize=2000, ttl=300)


# ---------------------------------------------------------------- setters

def save_feedback(
    *,
    user_sub: str,
    frame_id: str,
    item: dict[str, Any] | None,   # None for "missing item" feedback
    rating: int,
    reason: str | None,
    pipeline_version: str,
    image_key: str | None = None,
    trace: dict | None = None,
) -> int:
    if rating not in (-1, 1):
        raise ValueError("rating must be -1 or 1")

    if rating == 1 or reason not in VALID_REASONS:
        reason = None  # reasons only apply to 👎

    ing = (item or {}).get("ingredient") or {}
    label = ((item or {}).get("label") or "").strip().lower() or None

    rows = query(
        """
        INSERT INTO chefnex_feedback
            (user_sub, frame_id, item_id, rating, reason, label,
             ingredient_id, match_confidence, box_score,
             pipeline_version, image_key, trace)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        ON CONFLICT (user_sub, frame_id, item_id)
        DO UPDATE SET rating     = EXCLUDED.rating,
                      reason     = EXCLUDED.reason,
                      image_key  = COALESCE(EXCLUDED.image_key, chefnex_feedback.image_key),
                      created_at = CURRENT_TIMESTAMP
        RETURNING id
        """,
        (
            user_sub, frame_id, (item or {}).get("id"), rating, reason, label,
            ing.get("id"), ing.get("confidence"), (item or {}).get("score"),
            pipeline_version, image_key, Json(trace) if trace else None,
        ),
    )
    _label_stats_cache.pop(label, None)
    return rows[0]["id"]


def set_image_key(feedback_id: int, image_key: str) -> None:
    """Call after the S3 upload finishes so the DB write never waits on S3."""
    query(
        "UPDATE chefnex_feedback SET image_key = %s WHERE id = %s",
        (image_key, feedback_id),
    )


# ---------------------------------------------------------------- getters

def get_user_vote(user_sub: str, frame_id: str, item_id: int) -> int | None:
    rows = query(
        """SELECT rating FROM chefnex_feedback
           WHERE user_sub = %s AND frame_id = %s AND item_id = %s""",
        (user_sub, frame_id, item_id),
    )
    return rows[0]["rating"] if rows else None


def get_label_stats(label: str) -> dict | None:
    key = label.strip().lower()
    if key in _label_stats_cache:
        return _label_stats_cache[key]

    rows = query(
        """SELECT label, n, down_rate::float AS down_rate, users
           FROM chefnex_label_stats WHERE label = %s""",
        (key,),
    )
    stats = rows[0] if rows else None
    _label_stats_cache[key] = stats   # caches misses too
    return stats


def get_ingredient_stats(ingredient_id: int) -> dict | None:
    rows = query(
        """
        SELECT i.id, i.name, i.category,
               COUNT(*)                           AS n,
               AVG((f.rating = -1)::int)::float   AS down_rate,
               COUNT(DISTINCT f.user_sub)         AS users
        FROM chefnex_feedback f
        JOIN ingredient i ON i.id = f.ingredient_id
        WHERE f.ingredient_id = %s
          AND f.created_at > NOW() - INTERVAL '90 days'
        GROUP BY i.id, i.name, i.category
        """,
        (ingredient_id,),
    )
    return rows[0] if rows else None


def get_worst_ingredients(min_users: int = 5, limit: int = 20) -> list[dict]:
    return query(
        """
        SELECT i.id, i.name, i.category,
               COUNT(*)                           AS n,
               AVG((f.rating = -1)::int)::float   AS down_rate,
               COUNT(DISTINCT f.user_sub)         AS users,
               AVG(f.match_confidence)::float     AS avg_match_conf
        FROM chefnex_feedback f
        JOIN ingredient i ON i.id = f.ingredient_id
        WHERE f.created_at > NOW() - INTERVAL '90 days'
        GROUP BY i.id, i.name, i.category
        HAVING COUNT(DISTINCT f.user_sub) >= %s
        ORDER BY down_rate DESC, n DESC
        LIMIT %s
        """,
        (min_users, limit),
    ) or []


def get_negative_frames(pipeline_version: str | None = None, limit: int = 100) -> list[dict]:
    return query(
        """
        SELECT id, frame_id, item_id, label, ingredient_id, reason,
               match_confidence, box_score, image_key, trace, pipeline_version
        FROM chefnex_feedback
        WHERE rating = -1
          AND image_key IS NOT NULL
          AND (%s::text IS NULL OR pipeline_version = %s)
        ORDER BY created_at DESC
        LIMIT %s
        """,
        (pipeline_version, pipeline_version, limit),
    ) or []