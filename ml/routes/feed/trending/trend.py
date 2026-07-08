import time
import json
import numpy as np
from services.redis import r
from datetime import datetime, timezone

from brain.utils.math_utils import compute_decay_value, compute_normalize_vector_1
from brain.core.config.config import _load_network_config

from routes.feed.trending.insert_trend import _insert_trend_post, _get_trend_post_scores
from routes.feed.rank.diversify import _diversify_ranked_posts

from routes.user.types import ACTION_WEIGHTS
from routes.user.get_user_embedding import _get_user_embedding
from routes.user.user import _get_active_user_subs, _get_user_action

from routes.post.get_trending_post_candidates import _get_trend_candidates
from routes.post.post_utils import _mark_ranked_posts_seen, _get_seen_post_ids
from routes.post.get_post_action import _get_posts_action_count

_brain = None


def _set_trends_brain(brain):
    global _brain
    _brain = brain


def _post_trends(
    user_sub: str,
    limit: int = 10,
    selected_scope: str | None = None,
    mark_seen: bool = False,
) -> list[int]:

    """
        Rank trending posts for a user using recent engagement, recency decay,
        seen-post fallback, and a light personalized boost.

        The trends feed starts from a broad candidate pool, computes a weighted
        action score using the same action semantics as the subscriber, and then
        blends in a small amount of personalized ordering from the main ranker so
        results still feel relevant to the user.

        Feed output is split into three invariant buckets before final assembly:
          - exploitation (~70 %): high action score + coactivation signal
          - exploration (~20 %): low cosine similarity to user vector (novelty)
          - new posts   (~10 %): created within new_post_window_seconds

        Args:
            user_sub (str): The user's unique identifier.
            limit (int): Number of post IDs to return.
            selected_scope (str | None): Optional feed scope/category filter.
            mark_seen (bool): Whether to mark served returned posts as seen.

        Returns:
            list[int]: Ranked trending post IDs in feed order.
    """

    print(f"[trend_called] => u={user_sub} l={limit} s={selected_scope}")

# ----------- load config ------------------
    config = _load_network_config()

    NOW = time.time()


# ------------- Candidates ----------------
    _candidate_limit = getattr(config, "min_candidate_limit", 500)


# ----------- Fetch candidate posts -------------
    posts = _get_trend_candidates(limit=_candidate_limit)
    if not posts:
        return []


# ------------ Personalized support ranking ------------
    user_vec = None
    raw = r.get(f"user_vec_{user_sub}")
    if raw:
        user_vec = np.array(json.loads(raw), dtype=np.float32)
    else:
        user_embedding = _get_user_embedding(user_sub=user_sub)
        if user_embedding is not None:
            if isinstance(user_embedding, str):
                user_embedding = json.loads(user_embedding)
            user_vec = np.array(user_embedding, dtype=np.float32)

    if user_vec is not None and np.linalg.norm(user_vec) > 0:
        user_vec = compute_normalize_vector_1(user_vec)


# ------------ Seen post ids ------------
    seen_ids = _get_seen_post_ids(user_sub=user_sub)
    print(f"[trends_seen] count={len(seen_ids)} sample={list(seen_ids)[:10]}")


# ------------ Brain ------------
    user_neuron = None

    if _brain is not None:
        try:
            user_neuron = _brain.get_neuron_by_source_id("user", int(user_sub))
        except (ValueError, TypeError):
            user_neuron = None

        # Invariant: decay stale coactivation counts each trend cycle
        _brain.decay_coactivation_counts(
            decay_factor=getattr(config, "coactivation_decay_factor")
        )


# ------------ Scoring loop ------------
    fresh_scored: list[tuple[int, float, np.ndarray, float]] = []  # (id, score, vec, created_ts)
    seen_scored:  list[tuple[int, float, np.ndarray, float]] = []

    # aggregated inexpensive lookup for post action counted 
    all_action_counts = _get_posts_action_count([int(p["post_id"]) for p in posts])

    for post in posts:

        post_id = int(post["post_id"])
        embedding = post["embedding"]

        if embedding is None:
            continue

        if isinstance(embedding, str):
            embedding = json.loads(embedding)

        post_vec = np.asarray(embedding, dtype=np.float32)

        if np.linalg.norm(post_vec) > 0:
            post_vec = compute_normalize_vector_1(post_vec)
        else:
            continue

# ------------ Action counts ------------
        action_counts = all_action_counts.get(post_id, {})

# ------------ Base weighted action score ------------
        _score = 0.0

        for action_type, action_weight in ACTION_WEIGHTS.items():
            action_count = float(
                action_counts.get(action_type, action_counts.get(action_type.lower(), 0))
            )
            _score += action_count * action_weight

# ------------ Recency decay ------------
        updated_at = post.get("updated_at")

        if updated_at:
            if isinstance(updated_at, datetime):
                if updated_at.tzinfo is None:
                    updated_at = updated_at.replace(tzinfo=timezone.utc)
                updated_at = updated_at.timestamp()

            _score *= compute_decay_value(
                delta_t=max(0.0, NOW - updated_at),
                decay_rate=getattr(config, "decay_rate"),
            )

# ------------ Personalized boost ------------
        if user_vec is not None:
            personalized_boost = float(np.dot(user_vec, post_vec))
            _score += personalized_boost * 0.10

# ------------ Multi-user collaborative boost ------------
        if _brain is not None:
            _brain_score = _brain._get_score(
                user_neuron=user_neuron,
                post_id=post_id,
                config=config,
            )

            max_brain_score = abs(_score) * getattr(config, "max_brain_contribution_ratio")
            _score += min(_brain_score, max_brain_score)

# ------------ created_at timestamp (for new-post bucket) ------------
        created_at = post.get("created_at")
        if isinstance(created_at, datetime):
            if created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=timezone.utc)
            created_ts = created_at.timestamp()
        elif isinstance(created_at, (int, float)):
            created_ts = float(created_at)
        else:
            created_ts = 0.0

# ------------ Seen fallback bucket ------------
        if post_id in seen_ids:
            seen_scored.append((post_id, _score - getattr(config, "seen_post_penalty"), post_vec, created_ts))
        else:
            fresh_scored.append((post_id, _score, post_vec, created_ts))


# ------------ Sort fresh candidates (score descending) ------------
    fresh_scored.sort(key=lambda x: x[1], reverse=True)


# ---------------- get scores ---------------------------------------

    top_post_ids = [
        post_id
        for post_id, _, _, _ in fresh_scored[:limit]
    ]

    previous_scores = _get_trend_post_scores(top_post_ids)

# ------------ Invariant: write trend scores AFTER sort, top N only ------------
    min_trend_score = getattr(config, "min_trend_score", 0.01)

    for rank, (post_id, score, _, _created_ts) in enumerate(fresh_scored[:limit], start=1):

        if score < min_trend_score:
            break  # sorted descending — everything after is also below floor

        previous_score = previous_scores.get(post_id, 0.0)
        trend_velocity = score - previous_score

        _insert_trend_post(
            post_id=post_id,
            trend_score=score,
            trend_rank=rank,
            trend_velocity=trend_velocity,
        )

    seen_scored.sort(key=lambda x: x[1], reverse=True)

    if len(fresh_scored) >= limit:
        pool = fresh_scored
    else:
        pool = fresh_scored + seen_scored

    print(
        f"[trends_bucket] fresh={len(fresh_scored)} seen_candidates={len(seen_scored)} using={len(pool)}"
    )


# ------------ Exploration bucket split ------------
    explore_ratio       = getattr(config, "explore_ratio", 0.20)
    new_post_ratio      = getattr(config, "new_post_ratio", 0.10)
    explore_threshold   = getattr(config, "explore_similarity_threshold", 0.30)
    new_post_window     = getattr(config, "new_post_window_seconds", 172800)

    exploit_limit = int(limit * (1.0 - explore_ratio - new_post_ratio))
    explore_limit = int(limit * explore_ratio)
    new_limit     = limit - exploit_limit - explore_limit

    exploit_posts: list[tuple[int, float, np.ndarray]] = []
    explore_posts: list[tuple[int, float, np.ndarray]] = []
    new_posts:     list[tuple[int, float, np.ndarray]] = []

    for post_id, score, post_vec, created_ts in pool:

        is_new = created_ts > 0 and (NOW - created_ts) < new_post_window

        if is_new and len(new_posts) < new_limit:
            new_posts.append((post_id, score, post_vec))
            continue

        if user_vec is not None:
            sim = float(np.dot(user_vec, post_vec))
            is_novel = sim < explore_threshold
        else:
            is_novel = False

        if is_novel and len(explore_posts) < explore_limit:
            explore_posts.append((post_id, score, post_vec))
        else:
            exploit_posts.append((post_id, score, post_vec))

    scored: list[tuple[int, float, np.ndarray]] = (
        exploit_posts[:exploit_limit] +
        explore_posts[:explore_limit] +
        new_posts[:new_limit]
    )

    print(
        f"[trends_explore] exploit={len(exploit_posts[:exploit_limit])} "
        f"explore={len(explore_posts[:explore_limit])} new={len(new_posts[:new_limit])}"
    )


# ----------- Diversify ranked positioning ------------
    if getattr(config, "diversity_enabled"):
        ranked_ids = _diversify_ranked_posts(
            scored_posts=scored,
            limit=limit,
            similarity_penalty=getattr(config, "diversity_similarity_penalty"),
            max_similarity=getattr(config, "diversity_max_similarity"),
            soft_penalty=getattr(config, "diversity_soft_penalty"),
        )
    else:
        ranked_ids = [post_id for post_id, _, _ in scored[:limit]]


# ----------- Mark first N served posts as seen ------------
    if mark_seen:
        _mark_ranked_posts_seen(user_sub, ranked_ids, limit, config)

    return ranked_ids


def _user_trends(
    user_sub: str,
    limit: int = 10,
) -> list[str]:

    """
        Rank trending users by the weighted number of actions against their posts.

        The user trends feed gathers active creators, aggregates action counts
        against each creator's posts, and returns the creators with the strongest
        engagement totals.

        Args:
            user_sub (str): The viewer's unique identifier.
            limit (int): Number of user subs to return.

        Returns:
            list[str]: Ranked creator subs in feed order.
    """

# ----------- load config ------------------
    config = _load_network_config()


# ------------- Candidates ----------------
    _candidate_limit = min(
        100,
        max(limit * getattr(config, "candidate_multiplier"), 50)
    )

# ----------- Fetch candidate users -------------
    candidate_subs = _get_active_user_subs(limit=_candidate_limit)
    if not candidate_subs:
        return []


# ------------ Final Re-rank ------------
    scored: list[tuple[str, float]] = []

    for candidate_sub in candidate_subs:

        if candidate_sub == user_sub:
            continue

# ------------ Action counts against user ------------
        action_counts = _get_user_action(user_sub=candidate_sub) or {}

# ------------ Base weighted action score ------------
        _score = 0.0

        for action_type, action_weight in ACTION_WEIGHTS.items():
            action_count = float(
                action_counts.get(action_type, action_counts.get(action_type.lower(), 0))
            )
            _score += action_count * action_weight

        scored.append((candidate_sub, _score))

# ------------ Sort final user trends ------------
    scored.sort(key=lambda x: x[1], reverse=True)
    ranked_subs = [candidate_sub for candidate_sub, _ in scored[:limit]]

    return ranked_subs