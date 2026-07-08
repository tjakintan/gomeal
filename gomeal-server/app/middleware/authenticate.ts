import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;

export interface AuthenticatedRequest extends Request {
    user?: { sub: string; email: string; [key: string]: any };
}

export const authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "unauthorized_access" });
    }

    const token = authHeader.split(" ")[1];

    try {

        const decoded = jwt.verify(token, ACCESS_SECRET) as { sub: string; email: string };
        req.user = decoded;
        next();

    } catch (err) {
        return res.status(401).json({ error: "invalid_or_expired_token" });
    }
};