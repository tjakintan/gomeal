from services.db import query

def _get_post_by_id(post_id: int) -> dict | None:
    rows = query(
        """
            SELECT
                p.id,
                p.user_sub,
                p.dish_name,
                p.description,
                p.image_url,
                p.media_type,
                p.status,
                u.profile_name,
                u.first_name,
                u.last_name
            FROM post p
            LEFT JOIN users u
                ON u.sub = p.user_sub
            WHERE p.id = %s
              AND p.status = 'active'
            LIMIT 1
        """,
        [post_id],
    )

    if not rows:
        return None

    row = rows[0]

    if isinstance(row, tuple):
        (
            found_post_id,
            user_sub,
            dish_name,
            description,
            image_url,
            media_type,
            status,
            profile_name,
            first_name,
            last_name,
        ) = row
    else:
        found_post_id = row["id"]
        user_sub = row["user_sub"]
        dish_name = row["dish_name"]
        description = row["description"]
        image_url = row["image_url"]
        media_type = row["media_type"]
        status = row["status"]
        profile_name = row["profile_name"]
        first_name = row["first_name"]
        last_name = row["last_name"]

    return {
        "post_id": found_post_id,
        "user_sub": user_sub,
        "dish_name": dish_name,
        "description": description,
        "image_url": image_url,
        "media_type": media_type,
        "status": status,
        "profile_name": profile_name,
        "first_name": first_name,
        "last_name": last_name,
    }