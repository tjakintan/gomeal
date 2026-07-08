from services.redis import r

def _mark_post_seen(user_sub: str, post_id: int, config) -> None:
    seen_key = f"user_seen_posts_{user_sub}"
    added = r.sadd(seen_key, post_id)
    r.expire(seen_key, config.seen_post_ttl_seconds)
    print(f"[post_mark_seen] user={user_sub} post={post_id} added={added}")


def _mark_ranked_posts_seen(user_sub: str, ranked_ids: list[int], limit: int, config) -> None:
    
    """
        Mark a controlled slice of served ranked posts as seen for a user.

        This is used when a feed response is actually committed to the UI. It
        prevents refreshes from repeatedly returning the same top posts, while
        only marking a bounded number so the candidate pool does not get burned
        too aggressively.

        Args:
            user_sub (str): The user's unique identifier.
            ranked_ids (list[int]): Final ranked post IDs returned for the feed.
            limit (int): Requested feed size.
            config: Loaded neural network/ranking config.
    """

    mark_seen_count = min(
        int(limit * config.served_seen_ratio),
        config.served_seen_max_count,
        len(ranked_ids),
    )

    if mark_seen_count > 0:
        seen_key = f"user_seen_posts_{user_sub}"
        added = r.sadd(seen_key, *ranked_ids[:mark_seen_count])
        r.expire(seen_key, config.seen_post_ttl_seconds)
        print(f"[rank_mark_seen] => requested={mark_seen_count} added={added}")


def _get_seen_post_ids(user_sub: str) -> set[int]:

    """
        Load the user's seen post IDs from Redis / --!PSQL -yet.

        Redis set members may come back as bytes depending on the client
        configuration, so this normalizes each value into an int and ignores
        malformed entries instead of failing the whole ranking request.

        Args:
            user_sub (str): The user's unique identifier.

        Returns:
            set[int]: Post IDs currently treated as seen/downranked.
    """

    raw_ids = r.smembers(f"user_seen_posts_{user_sub}")
    seen_ids: set[int] = set()

    for raw_id in raw_ids:
        if isinstance(raw_id, bytes):
            raw_id = raw_id.decode("utf-8")

        try:
            seen_ids.add(int(raw_id))
        except (TypeError, ValueError):
            continue

    return seen_ids
