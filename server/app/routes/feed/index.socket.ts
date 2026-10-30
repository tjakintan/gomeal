import { Server, Socket } from "socket.io";
import log_user_actions, { mapFeedActionToUserAction } from "../user/log";
import { get_post_by_id, setFeedActionCount } from "./actions";
import { create_notification } from "../user/notification";
import { get_post_user_sub, getFeedActionCounts } from "./actions";
import { ActionWeights } from "@/types/user.types";
import { count_post_notification_actors, send_push_notification_to_user_devices } from "../../services/push";
import { get_user_profile_name } from "../user/getProfile";
import { fetch_post_image_url } from "./feed";

const GROUPED_ACTIONS = {
    post_love: { type: "like", title: "Like",   emoji: "❤️", verb: "liked" },
    post_cook: { type: "cook", title: "Cooked", emoji: "🍳", verb: "cooked" },
    post_star: { type: "star", title: "Star",   emoji: "⭐️", verb: "starred" },
} as const;

export function feed_sockets(io: Server) {

    io.on("connection", (socket: Socket) => {

        const user_sub = socket.data.user?.sub;

        socket.on("set-count", async (data, callback) => {

            const { post_id, action_type } = data;

            if (!post_id || !user_sub || !action_type) {
                return callback?.({ error: "request_failed_missing_body" });
            }

            try {

                const before = await getFeedActionCounts(post_id);
                const counts = await setFeedActionCount(post_id, user_sub, action_type);
                const receiver_sub = await get_post_user_sub(post_id);
                
                callback?.({ counts });
                socket.broadcast.emit(`counts_updated_post_${post_id}`, { counts });

                const mappedAction = mapFeedActionToUserAction(action_type);

                if (mappedAction) {

                    let wasAdded = false;

                    if (action_type === "post_love") {
                        wasAdded = counts.post_love > before.post_love;
                    } else if (action_type === "post_cook") {
                        wasAdded = counts.post_cook > before.post_cook;
                    } else if (action_type === "post_star") {
                        wasAdded = counts.post_star > before.post_star;
                    } else if (action_type === "post_share") {
                        wasAdded = counts.post_share > before.post_share;
                    }

                    if (wasAdded) {

                        await log_user_actions({
                            user_sub,
                            action_type: mappedAction,
                            target_type: "POST",
                            target_id: post_id,
                            metadata: {
                                feed_action_type: action_type,
                                receiver_sub,
                            },
                            context: {
                                source: "feed_action",
                            },
                            action_weight: ActionWeights[mappedAction],
                        });

                    }
                }

                const cfg = GROUPED_ACTIONS[action_type as keyof typeof GROUPED_ACTIONS];

                if (receiver_sub && cfg && counts[action_type as keyof typeof counts] > before[action_type as keyof typeof before]) {

                    const notification = await create_notification({
                        receiver_sub, actor_sub: user_sub, action_type: cfg.type, post_id,
                    });

                    if (notification) {
                        io.to(receiver_sub).emit("new-notification");

                        const [pf_name, image_url, actor_count] = await Promise.all([
                            get_user_profile_name(user_sub),
                            fetch_post_image_url(post_id),
                            count_post_notification_actors(receiver_sub, cfg.type, post_id),
                        ]);

                        const others = actor_count - 1;
                        const who = others > 0
                            ? `${pf_name} and ${others} other${others > 1 ? "s" : ""}`
                            : pf_name;

                        await send_push_notification_to_user_devices({
                            receiver_sub,
                            title: `${cfg.emoji} ${cfg.title}`,
                            body: `${who} ${cfg.verb} your recipe`,
                            image_url: image_url ?? undefined,
                            collapse_key: `${cfg.type}_${post_id}`, 
                            data: { type: cfg.type, post_id: String(post_id) },
                        });
                    }
                }

            } catch {
                callback?.({ error: "failed_to_fetch_counts" });
            }
        });

        socket.on("mark-post-seen", async (data, callback) => {
            const post_id = Number(data?.post_id);

            if (!user_sub || !Number.isInteger(post_id) || post_id <= 0) {
                return callback?.({ error: "request_failed_missing_body" });
            }

            try {
                // Only mark existing, active posts as seen.
                const post = await get_post_by_id(post_id);

                if (!post) {
                    return callback?.({ error: "post_not_found" });
                }

                const before = await getFeedActionCounts(post_id);

                // post_view uses INSERT ... ON CONFLICT DO NOTHING.
                const counts = await setFeedActionCount(
                    post_id,
                    user_sub,
                    "post_view"
                );

                callback?.({ success: true, counts });

                // Notify other clients only if this was a new view.
                if (counts.post_view > before.post_view) {
                    socket.broadcast.emit(`counts_updated_post_${post_id}`, {
                        counts,
                    });
                }
            } catch (err) {
                console.error("[mark-post-seen] Failed:", err);
                callback?.({ error: "failed_to_mark_post_seen" });
            }
        });

    });

}