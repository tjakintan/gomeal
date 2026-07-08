import express from "express";
import { getProfile } from "./getProfile";
import { Server, Socket } from "socket.io";
import { report } from "./report";
import { delete_post } from "../feed/actions";
import { get_notifications, mark_notifications_read } from "./notification";
import { get_reward_user_action, get_leaderboard_rankings } from "./leaderboard";
import { AuthenticatedRequest, authenticate } from "@/middleware/authenticate";
import { block_user, get_blocked_users, remove_blocked_user } from "./block";
import { get_direct_inbox } from "../messages/inbox";
import {
    _update_user_profile,
} from "./update";
import { delete_push_token, insert_push_token } from "./push";
import { update_notification_settings } from "./notification_settings";
import { create_bug_report } from "./bug";
import { delete_account } from "./deleteUser";
import sendDeleteAccountEmail from "@/email/delete";

export const user_router = express.Router();

user_router.get('/profile', authenticate, async (req: AuthenticatedRequest, res) => {

    const user_sub = req?.user?.sub;

    if (!user_sub) {
        return res.status(400).json({ error: 'request_failed_missing_body' });
    }

    try {

        const profile = await getProfile(user_sub);
        res.status(200).json(profile);

    } catch (error) {
        res.status(500).json({ error: `failed_to_fetch_profile_${error}` });
    }

});

user_router.patch("/update", authenticate, async (req: AuthenticatedRequest, res) => {
    
    const user_sub = req?.user?.sub;
    const profile = req.body ?? {};

    if (!user_sub) {
        return res.status(400).json({ error: "request_failed_missing_body" });
    }

    try {
        const updatedProfile = await _update_user_profile(user_sub, profile);

        if (!updatedProfile) {
            return res.status(404).json({ error: "user_not_found" });
        }

        res.status(200).json({ profile: updatedProfile });
    } catch (error) {
        res.status(500).json({ error: `failed_to_update_user_profile_${error}` });
    }
});

user_router.delete("/delete/:post_id", authenticate, async (req: AuthenticatedRequest, res) => {

    const user_sub = req?.user?.sub;
    const post_id = Number(req.params.post_id);

    if (!user_sub || !post_id) {
        return res.status(400).json({ error: "request_failed_missing_body" });
    }

    try {
        const deleted = await delete_post(post_id, user_sub);

        if (!deleted) {
            return res.status(404).json({ error: "post_not_found" });
        }

        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ error: `failed_to_delete_post_${error}` });
    }
});

user_router.post("/bug-reports", authenticate, async (req: AuthenticatedRequest, res) => {
    const user_sub = req?.user?.sub;
    const { section, message } = req.body ?? {};

    if (!user_sub || !section || !message?.trim()) {
        return res.status(400).json({ error: "request_failed_missing_body" });
    }

    try {
        const is_ok = await create_bug_report(
            user_sub,
            String(section).slice(0, 100),
            message.trim()
        );

        if (!is_ok) {
            return res.status(500).json({ error: "failed_to_create_bug_report" });
        }

        res.status(201).json({ success: true });
    } catch (error) {
        res.status(500).json({ error: `failed_to_create_bug_report_${error}` });
    }
});

user_router.delete("/delete-account", authenticate, async (req: AuthenticatedRequest, res) => {

        const user_sub = req?.user?.sub;

        if (!user_sub) {
            return res.status(400).json({
                error: "request_failed_missing_body",
            });
        }

        try {

            const profile = await getProfile(user_sub);

            const deleted = await delete_account(user_sub);

            if (!deleted) {
                return res.status(404).json({
                    error: "user_not_found",
                });
            }

            if (profile?.profile?.email) {
                await sendDeleteAccountEmail(profile?.profile?.email);
            }

            res.status(200).json({
                success: true,
            });

        } catch (error) {

            console.error(error);

            res.status(500).json({
                error: "failed_to_delete_account",
            });

        }

    }
);

export function user_sockets(io: Server) {

    io.on("connection", (socket: Socket) => {

        const user_sub = socket.data.user?.sub;
        if (user_sub) socket.join(user_sub);

        socket.on("report", async (data, callback) => {
            const { target_id, target_type, reason, details } = data ?? {};

            if (!user_sub || !target_id || !target_type) {
                return callback?.({ error: "request_failed_missing_body" });
            }

            if (!["post", "message", "user"].includes(target_type)) {
                return callback?.({ error: "invalid_report_target_type" });
            }

            try {
                const is_ok = await report(
                    user_sub,
                    target_type,
                    String(target_id),
                    reason,
                    details
                );

                callback?.({ success: true, report: is_ok });

                io.emit(`report_created`, {
                    target_id: String(target_id),
                    target_type,
                });

            } catch (error) {
                callback?.({ error: "failed_to_report" });
            }
            
        });

        socket.on("block-user", async (data, callback) => {
            const { blocked_sub } = data ?? {};

            if (!user_sub || !blocked_sub) {
                return callback?.({ error: "request_failed_missing_body" });
            }

            try {
                await block_user(user_sub, String(blocked_sub));

                callback?.({ success: true });

                io.to(user_sub).emit("user-blocked", {
                    blocked_sub: String(blocked_sub),
                });
            } catch (error) {
                callback?.({ error: "failed_to_block_user" });
            }
        });

        socket.on("get-blocked-users", async (data, callback) => {

            if (!user_sub) {
                return callback?.({ error: "request_failed_missing_body" });
            }

            try {
                const blocked_users = await get_blocked_users(user_sub);
                callback?.({ blocked_users });
            } catch {
                callback?.({ error: "failed_to_get_blocked_users" });
            }
        });

        socket.on("remove-blocked-user", async (data, callback) => {
            const { blocked_sub } = data ?? {};

            if (!user_sub || !blocked_sub) {
                return callback?.({ error: "request_failed_missing_body" });
            }

            try {
                await remove_blocked_user(user_sub, String(blocked_sub));

                callback?.({ success: true });

                io.to(user_sub).emit("user-unblocked", {
                    blocked_sub: String(blocked_sub),
                });
            } catch {
                callback?.({ error: "failed_to_remove_blocked_user" });
            }
        });

        socket.on("get-inbox", async (data, callback) => {

            if (!user_sub) {
                return callback?.({ error: "request_failed_missing_body" });
            }

            try {
                const inbox = await get_direct_inbox(user_sub);
                callback?.({ inbox });
            } catch (err) {
                console.error("[socket:get-inbox]_failed", {
                    user_sub,
                    err,
                });
                callback?.({ error: "failed_to_get_inbox" });
            }
        });

        socket.on("update-notification-settings", async (data, callback) => {
            if (!user_sub) {
                return callback?.({ error: "request_failed_missing_body" });
            }

            const { likes, messages, cook, cookingReminderTime, timezone } = data ?? {};

            if (
                likes !== undefined &&
                typeof likes !== "boolean"
            ) {
                return callback?.({ error: "invalid_likes_setting" });
            }

            if (
                messages !== undefined &&
                typeof messages !== "boolean"
            ) {
                return callback?.({ error: "invalid_messages_setting" });
            }

            if (cook !== undefined && typeof cook !== "boolean") {
                return callback?.({ error: "invalid_cook_setting" });
            }

            if (
                cookingReminderTime !== undefined &&
                cookingReminderTime !== null &&
                typeof cookingReminderTime !== "string"
            ) {
                return callback?.({ error: "invalid_cooking_reminder_time" });
            }

            if (timezone !== undefined && typeof timezone !== "string") {
                return callback?.({ error: "invalid_timezone" });
            }

            try {

                const settings = await update_notification_settings(user_sub, {
                    ...(likes !== undefined ? { likes } : {}),
                    ...(messages !== undefined ? { messages } : {}),
                    ...(cook !== undefined ? { cook } : {}),
                    ...(cookingReminderTime !== undefined ? { cookingReminderTime } : {}),
                    ...(timezone !== undefined ? { timezone } : {}),
                });

                callback?.({ settings });
            } catch (err) {
                console.error("Update notification settings error:", err);
                callback?.({ error: "failed_to_update_notification_settings" });
            }
        });

        socket.on("get-notifications", async (data, callback) => {

            if (!user_sub) {
                return callback?.({ error: "request_failed_missing_body" });
            }

            try {
                const notifications = await get_notifications(user_sub);
                callback?.({ notifications });
            } catch {
                callback?.({ error: "failed_to_get_notifications" });
            }
        });

        socket.on("mark-notifications-read", async (data, callback) => {

            if (!user_sub) return callback?.({ error: "request_failed_missing_body" });

            try {
                await mark_notifications_read(user_sub);
                callback?.({ success: true });
            } catch {
                callback?.({ error: "failed_to_mark_read" });
            }
        });

        socket.on("register-push-token", async (data, callback) => {
            if (!user_sub) {
                return callback?.({ error: "request_failed_missing_body" });
            }

            const { token, platform, device_id, native_token } = data ?? {};

            if (!token) {
                return callback?.({ error: "missing_push_token" });
            }

            if (platform && !["ios", "android", "web"].includes(platform)) {
                return callback?.({ error: "invalid_platform" });
            }

            try {
                await insert_push_token(user_sub, token, platform, device_id ?? null, native_token ?? null);
                callback?.({ success: true });
            } catch (err) {
                console.error("Register push token error:", err);
                callback?.({ error: "failed_to_register_push_token" });
            }
        });

        socket.on("delete-push-token", async (data, callback) => {
            if (!user_sub) {
                return callback?.({ error: "request_failed_missing_body" });
            }

            const { token } = data ?? {};

            if (!token) {
                return callback?.({ error: "missing_push_token" });
            }

            try {
                await delete_push_token(user_sub, token);

                callback?.({ success: true });
            } catch (err) {
                console.error("Delete push token error:", err);
                callback?.({ error: "failed_to_delete_push_token" });
            }
        });

        socket.on("reward-action", async (data, callback) => {

            const { action } = data;

            if (!user_sub || !action) {
                return callback?.({ error: "request_failed_missing_body" });
            }

            try {
                const reward = await get_reward_user_action(user_sub, action);
                if (!reward) return callback?.({ error: "failed_to_get_reward" });
                callback?.({ reward });
                io.emit("leaderboard-updated");
            } catch {
                callback?.({ error: "failed_to_get_reward" });
            }

        });

        socket.on("get-leaderboard", async (data, callback) => {
            const { limit = 10, cursor = 0 } = data ?? {};
            try {
                const page = await get_leaderboard_rankings(limit, cursor);
                if (!page) return callback?.({ error: "failed_to_get_leaderboard" });
                return callback?.({
                    rankings: page.rankings,
                    nextCursor: cursor + page.rankings.length,
                    hasMore: page.hasMore,
                });
            } catch {
                callback?.({ error: "failed_to_get_leaderboard" });
            }
        });

        socket.on("update-profile", async (data, callback) => {

            if (!user_sub) {
                return callback?.({
                    error: "request_failed_missing_body",
                });
            }

            try {

                const profile = await _update_user_profile(
                    user_sub,
                    data ?? {}
                );

                if (!profile) {
                    return callback?.({
                        error: "user_not_found",
                    });
                }

                callback?.({
                    success: true,
                    profile,
                });

                io.to(user_sub).emit(
                    "profile-updated",
                    profile
                );

            } catch (error) {

                console.error(
                    "[socket:update-profile]",
                    error
                );

                callback?.({
                    error: "failed_to_update_user_profile",
                });

            }

        });

    });
}