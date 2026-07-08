import db from "@/services/db";
import { User, Avatar } from "@/types/user.types";
import { generateAccessToken, generateRefreshToken } from "../../middleware/tokens/token";

const getUser = async (sub: string): Promise<{ user: User; accessToken: string; refreshToken: string; } | null> => {
    const result = await db.query(
        `SELECT
            sub,
            email,
            first_name,
            last_name,
            dob,
            profile_name,
            bio,
            website,
            profile_img_url,
            avatar,
            tag_color,
            status,
            bread,
            xp,
            level,
            badge
        FROM users
        WHERE sub = $1 AND status = 'active'
        `,
        [sub]
    );

    if (!result.rowCount) return null;

    const row = result.rows[0];

    const tokenPayload = {
        sub: row.sub,
        email: row.email,
    };

    const payload: User = {
        sub: row.sub,
        email: row.email,
        firstName: row.first_name || undefined,
        lastName: row.last_name || undefined,
        dob: row.dob,
        profile_name: row.profile_name,
        bio: row.bio,
        website: row.website,
        profile_img_url: row.profile_img_url,
        avatar: row.avatar ?? undefined,
        tag_color: row.tag_color ?? null,
        bread: row.bread ?? 0,
        xp: row.xp ?? 0,
        level: row.level ?? 1,
        badge: row.badge ?? 1,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    return { user: payload, accessToken, refreshToken };
};

export default getUser;