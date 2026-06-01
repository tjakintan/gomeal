import { apiFetch } from "./api";
import { API_BASE } from '../config';
import { socketEmit } from "./socket";
import { MinimumProfile, Profile, ProfileResponse, UpdateUserProfile,  } from "@/types/profile.types";
import { ReportTargetType } from "@/stores/useReport";
import { Avatar } from "@/types";

export async function get_profile_api(): Promise<ProfileResponse> {

    const response = await apiFetch(`${API_BASE}/chef/profile`, {
        method: "GET",
    });

    return response as ProfileResponse;

};

export const update_user_profile_api = async (
    profile: UpdateUserProfile
): Promise<{ profile: MinimumProfile }> => {

    const response = await apiFetch(`${API_BASE}/chef/update`, {
        method: "PATCH",
        body: JSON.stringify(profile)
    });

    return response as { profile: MinimumProfile };
};

export async function update_user_avatar_api(
    avatar: Avatar
): Promise<{ profile: MinimumProfile }> {

    const response = await apiFetch(`${API_BASE}/chef/avatar`, {
        method: "PATCH",
        body: JSON.stringify({ avatar }),
    });

    return response as { profile: MinimumProfile };
};

export async function update_user_profile_image_api(
    profile_img_url: Profile["profile_img_url"]
): Promise<{ profile_image: Pick<Profile, "sub" | "profile_img_url"> }> {

    const response = await apiFetch(`${API_BASE}/chef/profile_image`, {
        method: "PATCH",
        body: JSON.stringify({ profile_img_url }),
    });

    return response as { profile_image: Pick<Profile, "sub" | "profile_img_url"> };
};

export async function delete_post_api(
    post_id: number
): Promise<{ ok: boolean }> {

    try {
        await apiFetch(`${API_BASE}/chef/delete/${encodeURIComponent(post_id)}`, {
            method: "DELETE",
        });

        return { ok: true };
    } catch (err) {
        console.error("Delete post error:", err);
        return { ok: false };
    }
};

export async function get_report_api(
    target_id: string,
    target_type: ReportTargetType,
    reason?: string,
    details?: string
): Promise<{ ok: boolean }> {

    try {
        const res = await socketEmit<{ success: boolean; report?: boolean }>("report", {
            target_id,
            target_type,
            reason,
            details,
        });

        return { ok: !!res?.success };
        
    } catch (err) {
        console.error("Report error:", err);
        return { ok: false };
    }

};

export async function block_user_api(
    blocked_sub: string
): Promise<{ ok: boolean }> {
    try {
        const res = await socketEmit<{ success: boolean }>("block-user", {
            blocked_sub,
        });

        return { ok: !!res?.success };
    } catch (err) {
        console.error("Block user error:", err);
        return { ok: false };
    }
};

export async function get_blocked_users_api(): Promise<MinimumProfile[]> {
    try {
        const res = await socketEmit<{ blocked_users: MinimumProfile[] }>(
            "get-blocked-users",
            {}
        );

        return res?.blocked_users ?? [];
    } catch (err) {
        console.error("Get blocked users error:", err);
        return [];
    }
}

export async function remove_blocked_user_api(
    blocked_sub: string
): Promise<{ ok: boolean }> {
    try {
        const res = await socketEmit<{ success: boolean }>("remove-blocked-user", {
            blocked_sub,
        });

        return { ok: !!res?.success };
    } catch (err) {
        console.error("Remove blocked user error:", err);
        return { ok: false };
    }
};

export async function create_bug_report_api(
    section: string,
    message: string
): Promise<{ ok: boolean }> {

    try {
        const res = await apiFetch(`${API_BASE}/chef/bug-reports`, {
            method: "POST",
            body: JSON.stringify({ section, message }),
        });

        return { ok: !!(res as { success?: boolean }).success };
    } catch (err) {
        console.error("Create bug report error:", err);
        return { ok: false };
    }
};

export async function delete_account_api(): Promise<{ ok: boolean }> {

    try {

        await apiFetch(`${API_BASE}/chef/delete-account`, {
            method: "DELETE",
        });

        return { ok: true };

    } catch (err) {

        console.error("Delete account error:", err);

        return { ok: false };

    }

};

