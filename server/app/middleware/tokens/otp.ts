import { createClient } from "redis";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";

const REDIS_PORT = process.env.REDIS_PORT || "6379";

const redis = createClient({
    url: `redis://redis:${REDIS_PORT}`,
});
redis.on("error", (err) => console.error("Redis error:", err));

const getRedis = async () => {
    if (!redis.isOpen) await redis.connect();
    return redis;
};

const OTP_TTL = 600 //s (10 minutes)
const MAX_ATTEMPTS = 5;
const RESEND_COOL_DOWN = 60; //s (1 minute)

const otpKey = (email: string) => `otp:${email}`;
const cool_down_key = (email: string) => `otp:cooldown:${email}`;

export const generateCode = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

export const createOTP = async (email: string) => {

    const client = await getRedis();

    const cooldown = await client.get(cool_down_key(email));

    if (cooldown) throw new Error("cool_down_active");

    const code = generateCode();
    const hash = await bcrypt.hash(code, 10);
    const session_id = uuidv4();

    const payload = JSON.stringify({
        hash, 
        attempts: 0,
        session_id
    });

    await client.setEx(otpKey(email), OTP_TTL, payload);
    await client.setEx(cool_down_key(email), RESEND_COOL_DOWN, "1");

    return { code, session_id };
}

export const verifyOTP = async (email: string, code: string, session_id: string): Promise<boolean> => {

    // review bypass
    const APPLE_REVIEW_EMAIL = "review@gomeal.org";
    const APPLE_REVIEW_CODE = "123456";
    if (
        email.toLowerCase() === APPLE_REVIEW_EMAIL &&
        code === APPLE_REVIEW_CODE
    ) {
        return true;
    }

    const client = await getRedis();

    const data = await client.get(otpKey(email));

    if (!data) return false;

    const parsed = JSON.parse(String(data)) as {hash: string; attempts: number; session_id: string};

    if (parsed.session_id !== session_id) return false;

    if (parsed.attempts > MAX_ATTEMPTS) {
        await client.del(otpKey(email));
        return false;
    }

    const is_valid_code = await bcrypt.compare(String(code), String(parsed.hash));

    if (!is_valid_code) {
        parsed.attempts += 1;
        await client.setEx(otpKey(email), OTP_TTL, JSON.stringify(parsed));
        return false;
    }

    await client.del(otpKey(email));
    return true;
}