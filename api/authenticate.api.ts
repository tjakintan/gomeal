import { User } from "@/types/user.types";
import { API_BASE } from '../config';
import { GoogleSignUpResponse, AppleSignUpResponse } from "@/stores/useAuthenticate";

export async function findUserByEmail(email: string): Promise<{ exists: false } | { exists: true; sub: string, firstName: string; lastName: string }> {
    
    const response = await fetch(`${API_BASE}/auth/findUser/${encodeURIComponent(email)}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    });

    if (!response.ok) return { exists: false };

    const data = await response.json();
    return { exists: true, sub: data.sub, firstName: data.firstName, lastName: data.lastName };
    
};

export async function ConfirmUserEmail(email: string): Promise<{sent: boolean, session_id: string}> {

    const response = await fetch(`${API_BASE}/auth/send-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
    });

    if (response.status === 404) return {sent: false, session_id: ""};

    if (!response.ok) {
        throw new Error(`Failed to send confirmation email: ${response.status}`);
    }

    const data = await response.json();
    return { sent: data.sent, session_id: data.session_id };

};

export async function verifyUserEmail({
    email,
    sub,
    code,
    session_id,
}: {
    email: string;
    sub?: string;
    code: string;
    session_id: string;
}): Promise<{
    user: User;
    accessToken: string;
    refreshToken: string;
} | null> {

    const response = await fetch(`${API_BASE}/auth/verify-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, sub, code, session_id }),
    });

    if (!response.ok) return null;

    return await response.json();
    
}

export async function SignUpUser(draft: Partial<User>): Promise<{user: User; accessToken: string;refreshToken: string;} | null> {
    
    try {
        const response = await fetch(`${API_BASE}/auth/sign-up`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(draft),
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            return null;
        }

        const data: {user: User;accessToken: string;refreshToken: string;} = await response.json();
        return data;

    } catch (err) {
        console.error("Sign-up error:", err);
        return null;
    }
};

export async function SocialSignUp(idToken: string): Promise<GoogleSignUpResponse | null> {
    try {
        const response = await fetch(`${API_BASE}/auth/social-sign-up`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ idToken }),
        });

        if (!response.ok) {
            return null;
        }

        const data: GoogleSignUpResponse = await response.json();
        return data;

    } catch (err) {
        console.error("Social sign-up error:", err);
        return null;
    }
};

export async function AppleSignUp(
  identityToken: string,
  fullName?: { givenName?: string | null; familyName?: string | null }
): Promise<AppleSignUpResponse | null> {
  const response = await fetch(`${API_BASE}/auth/apple-sign-up`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identityToken, fullName }),
  });

  if (!response.ok) return null;
  return await response.json();
}



