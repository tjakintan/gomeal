import { send_push_missed_message, send_push_noti_cooking_reminder, send_push_noti_trending, send_push_noti_we_think_youll_like } from "./noti";

export const jobs = () => {
    send_push_noti_cooking_reminder();
    send_push_noti_trending();
    send_push_missed_message();
    send_push_noti_we_think_youll_like();
}
