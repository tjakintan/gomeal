import numpy as np

def _diversify_ranked_posts(
    scored_posts: list[tuple[int, float, np.ndarray]],
    limit: int,
    similarity_penalty: float,
    max_similarity: float,
    soft_penalty: float,
) -> list[int]:
    """
        Re-ranks already-ranked & scored posts to reduce feed over-saturation.

        The first ranking pass scores posts by relevance to the user's taste vector.
        This second pass keeps that relevance score, but penalizes candidates that
        are too similar to posts already selected for the final feed.

        Args:
            scored_posts:
                Ranked candidate posts as (post_id, base_score, normalized_vector).
                Higher base_score means the post is more relevant before diversity.
            limit:
                Number of final post IDs to return.
            similarity_penalty:
                Hard penalty applied when a candidate is too close to a selected post.
            max_similarity:
                Cosine similarity threshold where the hard penalty begins.
            soft_penalty:
                Always-on penalty scaled by nearest selected-post similarity.

        Returns:
            A diversified list of post IDs, ordered for the feed.
    """

    # Posts already chosen for the final feed.
    # Their vectors become the comparison set for future candidates.
    selected: list[tuple[int, np.ndarray]] = []

    # Work on a copy so callers can reuse the original scored list.
    remaining = scored_posts[:]

    # Final diversified post order.
    result: list[int] = []

    while remaining and len(result) < limit:
        best_index = 0
        best_score = float("-inf")

        for index, (post_id, base_score, post_vec) in enumerate(remaining):

            # Compare the candidate to the closest post already selected.
            # Vectors should be normalized before this function, so dot product (cosine similarity)
            if selected:
                nearest_similarity = max(
                    float(np.dot(post_vec, selected_vec))
                    for _, selected_vec in selected
                )
            else:
                nearest_similarity = 0.0

            adjusted_score = base_score

            # Strongly push down near-duplicates of already selected posts.
            if nearest_similarity >= max_similarity:
                adjusted_score -= similarity_penalty

            # Gently prefer variety even below the hard similarity threshold.
            adjusted_score -= nearest_similarity * soft_penalty

            if adjusted_score > best_score:
                best_score = adjusted_score
                best_index = index

        # Move the best adjusted candidate into the final feed.
        post_id, _, post_vec = remaining.pop(best_index)
        selected.append((post_id, post_vec))
        result.append(post_id)

    return result
