import json
import numpy as np
from services.redis import r

from brain.core.core.neuron import create_neuron, NeuronType
from brain.core.config.config import _load_network_config
from brain.utils.math_utils import compute_normalize_vector_1

from routes.post.post_utils import _get_seen_post_ids, _mark_ranked_posts_seen
from routes.feed.rank.diversify import _diversify_ranked_posts
from routes.user.get_user_embedding import _get_user_embedding
from routes.post.get_post_embedding import _get_post_embeddings_by_user_sub


_brain = None


def _set_rank_brain(brain):
    """
        Attach the shared brain instance used by the ranker.

        The server boots the brain once and injects it here so ranking can read
        existing user/post neurons and apply brain-based boosts without creating
        a new network per request.

        Args:
            brain: The in-memory brain/network instance.
    """

    global _brain
    _brain = brain


def _rank(
    user_sub: str,
    limit: int = 10,
    selected_scope: str | None = None,
    mark_seen: bool = False,
) -> list[int]:
    """
        Rank posts for a user by taste similarity, brain boosts, seen penalties,
        and feed diversity.

        The ranker loads the user's current taste vector from Redis, falling back
        to the saved user embedding when needed. If the user has no embedding yet,
        it returns recent posts as a cold-start fallback. When `mark_seen` is true,
        a bounded slice of the returned posts is written to the user's Redis seen
        set so future refreshes can rotate away from already-served content.

        Args:
            user_sub (str): The user's unique identifier.
            limit (int): Number of post IDs to return.
            selected_scope (str | None): Optional feed scope/category filter.
            mark_seen (bool): Whether to mark served returned posts as seen.

        Returns:
            list[int]: Ranked post IDs in feed order.
    """

# ----------- load config ------------------
    config = _load_network_config()

    if _brain is None:
        print("rank_brain_missing")
        return

    user_vec = None

    print(f"[rank_called] => u={user_sub} l={limit} s={selected_scope}")


# ------------ User Vector ------------
    raw = r.get(f"user_vec_{user_sub}")

    if raw:
        user_vec = np.array(json.loads(raw), dtype=np.float32)


# ------------ Fallback: user embeddings from Postgres ------------
    else:
        user_embedding = _get_user_embedding(user_sub=user_sub)

        if user_embedding is not None:
            if isinstance(user_embedding, str):
                user_embedding = json.loads(user_embedding)

            user_vec = np.array(user_embedding, dtype=np.float32)
            r.set(f"user_vec_{user_sub}", json.dumps(user_vec.tolist()), ex=3600)


# ------------- Candidates ----------------
    _candidate_limit = max(
        limit * getattr(config, "candidate_multiplier"),
        getattr(config, "min_candidate_limit"),
    )


# ----------- Fetch embeddings and/or scope tags -------------
    posts = _get_post_embeddings_by_user_sub(
        user_sub=user_sub,
        user_vector=user_vec,
        limit=_candidate_limit,
        selected_scope=selected_scope,
    )
    if not posts:
        return []


# ------------ Cold start: no history ------------
    if user_vec is None:
        posts.sort(key=lambda p: p["updated_at"], reverse=True)
        ranked_ids = [int(p["post_id"]) for p in posts[:limit]]

        if mark_seen:
            _mark_ranked_posts_seen(user_sub, ranked_ids, limit, config)

        return ranked_ids

    user_vec = compute_normalize_vector_1(user_vec)


# ------------ Brain-connected post ids ------------
    brain_ids = set()
    user_neuron = None

    if _brain:

        user_neuron = _brain.get_neuron_by_source_id("user", int(user_sub))

        if user_neuron is None:
            print(f"missing_user_neuron_{user_sub}_creating")

            user_neuron = create_neuron(
                neuron_type=NeuronType.user,
                source_model="user",
                source_id=int(user_sub),
                vector=user_vec.tolist() if isinstance(user_vec, np.ndarray) else user_vec,
            )
            _brain.add_neuron(user_neuron)

        if getattr(user_neuron, "out_synapses", None):
            for syn_id in user_neuron.out_synapses:
                syn = _brain.synapses.get(syn_id)
                if syn is None or syn.target_type != "neuron":
                    continue

                target_neuron = _brain.get_neuron(int(syn.target_id))
                if target_neuron is None:
                    continue

                # All post neurons are canonicalized to "post" by add_neuron.
                if getattr(target_neuron, "source_model", None) == "post":
                    brain_ids.add(int(target_neuron.source_id))


# ------------ Final Re-rank ------------
    seen_ids = _get_seen_post_ids(user_sub=user_sub)
    print(f"[rank_seen] count={len(seen_ids)} sample={list(seen_ids)[:10]}")

    fresh_scored: list[tuple[int, float, np.ndarray]] = []
    seen_scored:  list[tuple[int, float, np.ndarray]] = []

    for post in posts:

        post_id = int(post["post_id"])
        embedding = post["embedding"]

        if embedding is None:
            continue

        if isinstance(embedding, str):
            embedding = json.loads(embedding)

        post_vec = compute_normalize_vector_1(np.array(embedding, dtype=np.float32))

        # ------------ Base score ------------
        _score = float(np.dot(user_vec, post_vec))

        # ------------ Brain boost ------------
        if post_id in brain_ids:
            _score += config.brain_boost

        # ------------ Collaborative boost ------------
        _brain_score = _brain._get_score(
            user_neuron=user_neuron,
            post_id=post_id,
            config=config,
        )

        max_brain_score = abs(_score) * getattr(config, "max_brain_contribution_ratio")
        _score += min(_brain_score, max_brain_score)

        # ------------ Seen fallback bucket ------------
        if post_id in seen_ids:
            seen_scored.append((post_id, _score - config.seen_post_penalty, post_vec))
        else:
            fresh_scored.append((post_id, _score, post_vec))

    fresh_scored.sort(key=lambda x: x[1], reverse=True)
    seen_scored.sort(key=lambda x: x[1], reverse=True)

    if len(fresh_scored) >= limit:
        scored = fresh_scored
    else:
        scored = fresh_scored + seen_scored

    print(
        f"[rank_bucket] fresh={len(fresh_scored)} seen_candidates={len(seen_scored)} using={len(scored)}"
    )

# ----------- Diversify rankings ------------
    if config.diversity_enabled:
        ranked_ids = _diversify_ranked_posts(
            scored_posts=scored,
            limit=limit,
            similarity_penalty=config.diversity_similarity_penalty,
            max_similarity=config.diversity_max_similarity,
            soft_penalty=config.diversity_soft_penalty,
        )
    else:
        ranked_ids = [post_id for post_id, _, _ in scored[:limit]]

# ----------- Mark first N served posts as seen ------------
    if mark_seen:
        _mark_ranked_posts_seen(user_sub, ranked_ids, limit, config)

    return ranked_ids