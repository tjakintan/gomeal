import db from "@/services/db";
import dns from "dns";
import http2 from "http2";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import { PushTokenPlatform, PushTokenRow } from "@/types/notification.types";

const APNS_KEY_ID = "58YXF8X388";
const APNS_TEAM_ID = "UGQD4SYSL4";
const APNS_BUNDLE_ID = "com.gomeal.mobile";
const APNS_HOST = process.env.DEV === "true" ? "https://api.sandbox.push.apple.com" : "https://api.push.apple.com";
const APNS_KEY_PATH = path.join(process.cwd(), "app/keys/AuthKey_58YXF8X388.p8");

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

export const send_apns_notification = ({
    deviceToken,
    title,
    body,
    image_url,
    data = {},
}: {
    deviceToken: string;
    title: string;
    body: string;
    image_url?: string;
    data?: Record<string, unknown>;
}): Promise<void> => {
    return new Promise((resolve, reject) => {
        const token = getApnsToken();
        const cleanDeviceToken = deviceToken.replace(/[\s<>]/g, "");

        const payload = JSON.stringify({
            aps: {
                alert: { title, body },
                sound: "default",
                "mutable-content": 1,
            },
            data: {        
                ...data,
            },
            ...(image_url ? { image: image_url } : {}),
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
            client.close();
            if (status === 200) {
                resolve();
            } else {
                console.error("[APNS] Failed", { status, body: responseBody, deviceToken: cleanDeviceToken });
                reject(new Error(`APNS error ${status}: ${responseBody}`));
            }
        });

        req.on("error", (err) => {
            client.close();
            reject(err);
        });

        const timeout = setTimeout(() => {
            client.destroy();
            reject(new Error(`APNS timeout for token: ${cleanDeviceToken}`));
        }, 10000);

        req.on("end", () => clearTimeout(timeout));

        req.write(payload);
        req.end();
    });
};

export const send_push_notification = async ({
    token,
    title,
    body,
    image_url,
    data = {},
}: {
    token: string;
    title: string;
    body: string;
    image_url?: string;
    data?: Record<string, unknown>;
}) => {
    const isNativeToken = /^[0-9a-f]{64}$/i.test(token);

    if (isNativeToken) {
        return send_apns_notification({ deviceToken: token, title, body, image_url, data });
    }

    const payload = {
        to: token,
        sound: "default",
        title,
        body,
        mutableContent: true,
        data: {
            ...data,
            ...(image_url ? { image: image_url } : {}),
        },
        ...(image_url ? { image: image_url } : {}),
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
    data,
}: {
    receiver_sub: string;
    title: string;
    body: string;
    image_url?: string;
    data?: Record<string, unknown>;
}) => {
    const tokens = await get_push_tokens(receiver_sub);
    await Promise.all(
        tokens.map((row) =>
            send_push_notification({
                token: row.native_token ?? row.token,
                title,
                body,
                image_url,
                data,
            })
        )
    );
};