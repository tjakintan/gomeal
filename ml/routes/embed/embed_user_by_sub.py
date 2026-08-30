import json

from services.db import query
from ml.routes.embed.text import generate_embeddings

def _embed_user_by_sub(user_sub: str):

    rows = query(
        """
            SELECT
                sub,
                first_name,
                last_name,
                profile_name,
                email,
                avatar,
                badge,
                bread,
                xp,
                level
            FROM users
            WHERE sub = %s
            AND status = 'active'
            LIMIT 1
        """,
        [user_sub],
    )

    if not rows:
        raise Exception("user_not_found")

    row = rows[0]

    if isinstance(row, tuple):
        (
            sub,
            first_name,
            last_name,
            profile_name,
            email,
            avatar,
            badge,
            bread,
            xp,
            level,
        ) = row
    else:
        sub = row["sub"]
        first_name = row["first_name"]
        last_name = row["last_name"]
        profile_name = row["profile_name"]
        email = row["email"]
        avatar = row["avatar"]
        badge = row["badge"]
        bread = row["bread"]
        xp = row["xp"]
        level = row["level"]

    user_text = " ".join(
        part for part in [
            str(first_name or ""),
            str(last_name or ""),
            str(profile_name or ""),
            str(email or ""),
            json.dumps(avatar or {}),
            str(badge or ""),
            str(bread or ""),
            str(xp or ""),
            str(level or ""),
        ]
        if part is not None
    ).strip()

    embedding = generate_embeddings([user_text])[0]
    embedding = embedding.tolist()

    query(
        """
            INSERT INTO user_embeddings (user_sub, embedding, updated_at)
            VALUES (%s, %s::vector, NOW())
            ON CONFLICT (user_sub)
            DO UPDATE SET
                embedding = EXCLUDED.embedding,
                updated_at = NOW()
        """,
        [user_sub, json.dumps(embedding)],
    )

    return {
        "status": "success",
        "user_sub": user_sub,
    }