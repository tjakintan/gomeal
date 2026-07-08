import jwt, { SignOptions } from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import type { StringValue } from "ms";
import { createPublicKey } from "crypto";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_EXPIRES = (process.env.ACCESS_TOKEN_EXPIRES || "15m") as StringValue;
const REFRESH_EXPIRES = (process.env.REFRESH_TOKEN_EXPIRES || "7d") as StringValue;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const APPLE_CLIENT_ID = process.env.APPLE_CLIENT_ID;
const APPLE_JWKS_URL = "https://appleid.apple.com/auth/keys";

if (!ACCESS_SECRET || !REFRESH_SECRET) {
    throw new Error("JWT secrets not set in environment");
};

if (!GOOGLE_CLIENT_ID) {
    throw new Error("GOOGLE_WEB_CLIENT_ID not set in environment");
};

if (!APPLE_CLIENT_ID) {
    throw new Error("APPLE_CLIENT_ID not set in environment");
}

interface TokenPayload {
    sub: string;
    email: string;
};

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

type AppleJwk = {
    kid: string;
    kty: string;
    n: string;
    e: string;
    alg?: string;
    use?: string;
};

export type VerifiedAppleUser = {
    provider: "apple";
    provider_sub: string;
    email: string;
    firstName: string;
    lastName: string;
};

export type VerifiedGoogleUser = {
    provider: "google";
    provider_sub: string;
    email: string;
    firstName: string;
    lastName: string;
    picture?: string;
};

export const generateAccessToken = ({ sub, email }: TokenPayload): string => {
    return jwt.sign({ sub, email }, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES } as SignOptions);
};

export const generateRefreshToken = ({ sub, email }: TokenPayload): string => {
    return jwt.sign({ sub, email }, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES } as SignOptions);
};

export const verifyGoogleToken = async (
    idToken: string
): Promise<VerifiedGoogleUser> => {
    const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload?.sub || !payload.email) {
        throw new Error("invalid_google_token");
    }

    return {
        provider: "google",
        provider_sub: payload.sub,
        email: payload.email,
        firstName: payload.given_name ?? "",
        lastName: payload.family_name ?? "",
        picture: payload.picture,
    };
};

export const verifyAppleToken = async (
    identityToken: string,
    fullName?: {
        givenName?: string | null;
        familyName?: string | null;
    }
): Promise<VerifiedAppleUser> => {
    if (!APPLE_CLIENT_ID) {
        throw new Error("APPLE_CLIENT_ID not set in environment");
    }

    const decoded = jwt.decode(identityToken, { complete: true });

    if (!decoded || typeof decoded === "string" || !decoded.header.kid) {
        throw new Error("invalid_apple_token");
    }

    const response = await fetch(APPLE_JWKS_URL);

    if (!response.ok) {
        throw new Error("failed_to_fetch_apple_keys");
    }

    const { keys } = (await response.json()) as { keys: AppleJwk[] };
    const jwk = keys.find((key) => key.kid === decoded.header.kid);

    if (!jwk) {
        throw new Error("invalid_apple_token_key");
    }

    const publicKey = createPublicKey({
        key: jwk,
        format: "jwk",
    }).export({
        format: "pem",
        type: "spki",
    });

    const payload = jwt.verify(identityToken, publicKey, {
        algorithms: ["RS256"],
        audience: APPLE_CLIENT_ID,
        issuer: "https://appleid.apple.com",
    }) as jwt.JwtPayload;

    if (!payload.sub || !payload.email) {
        throw new Error("invalid_apple_token");
    }

    return {
        provider: "apple",
        provider_sub: payload.sub,
        email: payload.email,
        firstName: fullName?.givenName ?? "",
        lastName: fullName?.familyName ?? "",
    };
};
