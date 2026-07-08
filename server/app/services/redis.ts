import { createClient } from "redis";

const REDIS_PORT = process.env.REDIS_PORT;
const REDIS_URL = `redis://redis:${REDIS_PORT}`;

const redis = createClient({
    url: REDIS_URL,
});

redis.on("connect", () => {
    console.log(`redis_connected_on_port:${REDIS_PORT}`);
});

redis.on("error", (err) => {
    console.error(`redis_err_${err}`);
});

(async () => {

    try {
        await redis.connect();

    } catch (err) {
        console.error("[Redis] connection failed:", err);
    }

})();

export default redis;