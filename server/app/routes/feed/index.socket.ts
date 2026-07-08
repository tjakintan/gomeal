import { Server, Socket } from "socket.io";
import log_user_actions, { mapFeedActionToUserAction } from "../user/log";
import { setFeedActionCount } from "./actions";
import { create_notification } from "../user/notification";
import { get_post_user_sub, getFeedActionCounts } from "./actions";
import { ActionWeights } from "@/types/user.types";
import { send_push_notification_to_user_devices } from "../../services/push";
import { get_user_profile_name } from "../user/getProfile";
import { fetch_post_image_url } from "./feed";

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

                if (receiver_sub && action_type === "post_love") {

                    const is_liking = counts.post_love > before.post_love; 

                    if (is_liking) {

                        const notification = await create_notification({
                            receiver_sub,
                            actor_sub: user_sub,
                            action_type: "like",
                            post_id,
                        });

                        if (notification) {

                            io.to(receiver_sub).emit("new-notification");

                            const [pf_name, image_url] = await Promise.all([
                                get_user_profile_name(user_sub),
                                fetch_post_image_url(post_id),
                            ]);
                            
                            await send_push_notification_to_user_devices({
                                receiver_sub,
                                title: "Like",
                                body: `${pf_name} liked your recipe`,
                                image_url: image_url ?? undefined,
                                data: {
                                    type: "like",
                                    post_id: String(post_id),
                                },
                            });
                        }
                    }
                };

                if (receiver_sub && action_type === "post_cook") {

                    const is_cooking = counts.post_cook > before.post_cook;

                    if (is_cooking) {

                        const notification = await create_notification({
                            receiver_sub,
                            actor_sub: user_sub,
                            action_type: "cook",
                            post_id,
                        });

                        if (notification) {

                            io.to(receiver_sub).emit("new-notification");

                            const [pf_name, image_url] = await Promise.all([
                                get_user_profile_name(user_sub),
                                fetch_post_image_url(post_id),
                            ]);

                            await send_push_notification_to_user_devices({
                                receiver_sub,
                                title: "Cooked",
                                body: `${pf_name} cooked your recipe`,
                                image_url: image_url ?? undefined,
                                data: {
                                    type: "cook",
                                    post_id: String(post_id),
                                },
                            });

                        }
                    }
                };

            } catch {
                callback?.({ error: "failed_to_fetch_counts" });
            }
        });

    });

}