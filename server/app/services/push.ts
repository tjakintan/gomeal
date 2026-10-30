import { Server } from "socket.io";
import db from "@/services/db";
import dns from "dns";
import http2 from "http2";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import { PostNotifType, PushTokenPlatform, PushTokenRow } from "@/types/notification.types";
import { get_unread_notification_count } from "@/routes/user/notification";

const APNS_KEY_ID = process.env.APNS_KEY_ID!;
const APNS_TEAM_ID = process.env.APNS_TEAM_ID!;
const APNS_BUNDLE_ID = process.env.APNS_BUNDLE_ID!;
const APNS_HOST = process.env.DEV === "true" ? "https://api.sandbox.push.apple.com" : "https://api.push.apple.com";
const APNS_KEY_PATH = path.join(process.cwd(), "app/keys/AuthKey_" + APNS_KEY_ID + ".p8");

let apnsToken: { token: string; generatedAt: number } | null = null;

const getApnsToken = () => {
    const now = Date.now();
    if (apnsToken && now - apnsToken.generatedAt < 55 * 60 * 1000) {
        return apnsToken.token;
    }
    const key = fs.readFileSync(APNS_KEY_PATH);
    const token = jwt.sign({}, key, {
        algorithm: "ES256",
        keyid: APNS_KEY_ID,
        issuer: APNS_TEAM_ID,
        expiresIn: "1h",
    });
    apnsToken = { token, generatedAt: now };
    return token;
};

export const insert_push_token = async (
    user_sub: string,
    token: string,
    platform?: PushTokenPlatform,
    device_id?: string | null,
    native_token?: string | null,
): Promise<void> => {
    await db.query(
        `INSERT INTO push_tokens (
            user_sub, token, platform, device_id, native_token, last_used_at
        ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
        ON CONFLICT (token)
        DO UPDATE SET
            user_sub = EXCLUDED.user_sub,
            platform = EXCLUDED.platform,
            device_id = EXCLUDED.device_id,
            native_token = EXCLUDED.native_token,
            last_used_at = CURRENT_TIMESTAMP`,
        [user_sub, token, platform ?? null, device_id ?? null, native_token ?? null]
    );
};

export const delete_push_token = async (
    user_sub: string,
    token: string
): Promise<void> => {
    await db.query(
        `DELETE FROM push_tokens
         WHERE user_sub = $1
           AND token = $2`,
        [user_sub, token]
    );
};

export const get_push_tokens = async (
    user_sub: string
): Promise<PushTokenRow[]> => {
    const result = await db.query(
        `SELECT token, platform, native_token
         FROM push_tokens
         WHERE user_sub = $1`,
        [user_sub]
    );
    return result.rows as PushTokenRow[];
};

export const get_push_tokens_except_user = async (
    user_sub: string
): Promise<string[]> => {
    const result = await db.query(
        `SELECT token
         FROM push_tokens
         WHERE user_sub <> $1`,
        [user_sub]
    );
    return (result.rows as PushTokenRow[]).map((row) => row.token);
};

export const count_post_notification_actors = async (
    receiver_sub: string, type: PostNotifType, post_id: number
): Promise<number> => {
    const r = await db.query(
        `SELECT COUNT(*)::int AS count FROM notifications
         WHERE receiver_sub = $1 AND action_type = $2 AND post_id = $3 AND status = 'active'`,
        [receiver_sub, type, post_id]
    );
    return r.rows[0]?.count ?? 1;
};

export const send_apns_notification = ({
    deviceToken,
    title,
    body,
    image_url,
    image_urls,
    collapseId,
    data = {},
    badge,
}: {
    deviceToken: string;
    title: string;
    body: string;
    image_url?: string;
    image_urls?: string[];
    collapseId?: string;
    data?: Record<string, unknown>;
    badge?: number;
}): Promise<void> => {
    return new Promise((resolve, reject) => {
        const token = getApnsToken();
        const cleanDeviceToken = deviceToken.replace(/[\s<>]/g, "");

        const images = [
            ...new Set([
                ...(image_url ? [image_url] : []),
                ...(image_urls ?? []),
            ]),
        ].filter((url) => /^https?:\/\//i.test(url));

        const payload = JSON.stringify({
            aps: {
                alert: { title, body },
                sound: "default",
                "mutable-content": 1,
                ...(collapseId ? { "thread-id": collapseId } : {}),
                ...(badge !== undefined ? { badge } : {}),
            },
            ...(images.length ? { image_url: images[0] } : {}),
            data: {
                ...data,
                ...(images.length
                    ? {
                        image_url: images[0],
                        image_urls: images,
                    }
                    : {}),
            },
        });

        const client = http2.connect(APNS_HOST);
        client.on("error", reject);

        const req = client.request({
            ":method": "POST",
            ":path": `/3/device/${cleanDeviceToken}`,
            authorization: `bearer ${token}`,
            "apns-topic": APNS_BUNDLE_ID,
            "apns-push-type": "alert",
            "apns-priority": "10",
            "content-type": "application/json",
            ...(collapseId ? { "apns-collapse-id": collapseId.slice(0, 64) } : {}),
        });

        let status: number;
        let responseBody = "";

        req.on("response", (headers) => {
            status = headers[":status"] as number;
        });

        req.on("data", (chunk) => {
            responseBody += chunk;
        });

        req.on("end", () => {
            clearTimeout(timeout);
            client.close();

            if (status === 200) {
                resolve();
            } else {
                reject(
                    new Error(`APNS error ${status}: ${responseBody}`)
                );
            }
        });

        req.on("error", (err) => {
            clearTimeout(timeout);
            client.close();
            reject(err);
        });

        const timeout = setTimeout(() => {
            client.destroy();
            reject(new Error("APNS notification timed out"));
        }, 10000);

        req.write(payload);
        req.end();
    });
};

export const send_push_notification = async ({
    token,
    title,
    body,
    image_url,
    image_urls,
    collapseId,
    data = {},
    badge,
}: {
    token: string;
    title: string;
    body: string;
    image_url?: string;
    image_urls?: string[];
    collapseId?: string;
    data?: Record<string, unknown>;
    badge?: number;
}) => {
    const images = [
        ...new Set([
            ...(image_url ? [image_url] : []),
            ...(image_urls ?? []),
        ]),
    ].filter((url) => /^https?:\/\//i.test(url));

    const primaryImage = images[0];
    const notificationData = {
        ...data,
        ...(primaryImage ? { image_url: primaryImage } : {}),
        ...(images.length ? { image_urls: images } : {}),
    };

    const isNativeToken = /^[0-9a-f]{64}$/i.test(token);

    if (isNativeToken) {
        return send_apns_notification({
            deviceToken: token,
            title,
            body,
            image_url: primaryImage,
            image_urls: images,
            data: notificationData,
            badge,
            collapseId
        });
    }

    const payload = {
        to: token,
        sound: "default",
        title,
        body,
        mutableContent: true,
        data: notificationData,
        ...(primaryImage ? { image: primaryImage } : {}),
        ...(badge !== undefined ? { badge } : {}),
    };

    const res = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
            Accept: "application/json",
            "Accept-Encoding": "gzip, deflate",
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    return res.json();
};

export const send_push_notification_to_user_devices = async ({
    receiver_sub,
    title,
    body,
    image_url,
    image_urls,
    collapse_key,
    data,
}: {
    receiver_sub: string;
    title: string;
    body: string;
    image_url?: string;
    image_urls?: string[];
    collapse_key?: string
    data?: Record<string, unknown>;
}) => {
    const [tokens, badge] = await Promise.all([
        get_push_tokens(receiver_sub),
        get_unread_notification_count(receiver_sub),
    ]);

    await Promise.all(
        tokens.map((row) =>
            send_push_notification({
                token: row.native_token ?? row.token,
                title,
                body,
                image_url,
                image_urls,
                data,
                badge,
                collapseId: collapse_key,
            })
        )
    );
};

export async function push_alert_user_device(
    io: Server,
    args: {
        receiver_sub: string;
        title: string;
        body: string;           
        message_type: string;
        content: string;    
        count: number;             
        image_urls: string[];
        data: Record<string, unknown>;
    }
) {
    const sockets = await io.in(args.receiver_sub).fetchSockets();
    const activeSockets = sockets.filter((s) => s.data.appState === "active");

    if (activeSockets.length > 0) {
        activeSockets.forEach((s) =>
            s.emit("message-sent-in-app", {
                conversation_id: Number(args.data.conversation_id),
                title: args.title,
                message_type: args.message_type,
                content: args.message_type === "text" ? args.content.slice(0, 80) : "",
                count: args.count,
                profile_image_url: args.data.profile_image_url ?? null,
            })
        );
        return;
    }

    await send_push_notification_to_user_devices({
        receiver_sub: args.receiver_sub,
        title: args.title,
        body: args.body,
        image_url: args.image_urls[0],
        image_urls: args.image_urls,
        data: args.data,
    });
}