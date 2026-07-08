import rateLimit from "express-rate-limit";
import { error } from "node:console";

export const otpLimit = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 10,
    message: {error: "too_many_request"}
})