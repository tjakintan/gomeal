import db from "@/services/db";
import { MinimumProfile, Profile, UpdateUserProfile } from "@/types/profile.types";
import { Avatar } from "@/types/user.types";

const toMinimumProfile = (row: any): MinimumProfile => ({
    sub: row.sub,
    badge: row.badge,
    avatar: row.avatar as Avatar,
    profile_name: row.profile_name,
    firstName: row.first_name,
    bio: row.bio,
    website: row.website,
    lastName: row.last_name,
    dob: row.dob,
    profile_img_url: row.profile_img_url,
    tag_color: row.tag_color,
});

export const _update_user_profile = async (
    user_sub: string,
    profile: UpdateUserProfile
): Promise<MinimumProfile | null> => {
    try {
        const updates: string[] = [];
        const values: unknown[] = [user_sub];

        if (profile.profile_name !== undefined) {
            values.push(profile.profile_name);
            updates.push(`profile_name = $${values.length}`);
        }

        if (profile.firstName !== undefined) {
            values.push(profile.firstName);
            updates.push(`first_name = $${values.length}`);
        }

        if (profile.lastName !== undefined) {
            values.push(profile.lastName);
            updates.push(`last_name = $${values.length}`);
        }

        if (profile.dob !== undefined) {
            values.push(profile.dob);
            updates.push(`dob = $${values.length}`);
        }

        if (profile.bio !== undefined) {
            values.push(profile.bio);
            updates.push(`bio = $${values.length}`);
        }

        if (profile.website !== undefined) {
            values.push(profile.website);
            updates.push(`website = $${values.length}`);
        }

        if (profile.avatar !== undefined) {
            values.push(JSON.stringify(profile.avatar));
            updates.push(`avatar = $${values.length}::jsonb`);
        }

        if (profile.profile_img_url !== undefined) {
            values.push(profile.profile_img_url);
            updates.push(`profile_img_url = $${values.length}`);
        }

        if (profile.tag_color !== undefined) {
            values.push(profile.tag_color);
            updates.push(`tag_color = $${values.length}`);
        }

        if (!updates.length) throw new Error("no_user_profile_fields_to_update");

        const result = await db.query(
            `
            UPDATE users
            SET
                ${updates.join(",\n                ")},
                updated_at = CURRENT_TIMESTAMP,
                last_action_at = CURRENT_TIMESTAMP
            WHERE sub = $1
              AND status = 'active'
            RETURNING
                sub,
                badge,
                avatar,
                profile_name,
                first_name,
                last_name,
                dob,
                bio,
                website,
                profile_img_url,
                tag_color
            `,
            values
        );

        if (!result.rows.length) return null;

        return toMinimumProfile(result.rows[0]);

    } catch (err) {
        console.error(err);
        throw new Error("failed_to_update_user_profile");
    }
};

