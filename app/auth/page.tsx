"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { SignUp, ConfirmSignUp } from "../../components/cook_auth/SignUp";
import { SignIn, ForgotPassword } from "../../components/cook_auth/SignIn";
import { useEffect } from "react";

const AuthPage: React.FC = () => {

    const router = useRouter();
    const searchParams = useSearchParams();

    const mode = searchParams.get("mode");
    const payload = searchParams.get("payload");
    const email = searchParams.get("email");
    const fromSignIn = searchParams.get("fromSignIn");

    useEffect(() => {
        if (mode === "confirm" && !payload) {
          router.replace("/auth?mode=signup");
        } else if (mode === "forgot" && !fromSignIn) {
          router.replace("/auth?mode=signin");
        }
    }, [mode, payload, fromSignIn, router]);

    const payloadStr = Array.isArray(payload) ? payload[0] : payload || "";
    const emailStr = Array.isArray(email) ? email[0] : email || "";
    const fromSignInBool = fromSignIn === "true";

    switch (mode) {
        case "signin":
          return <SignIn email={emailStr} />;
        case "signup":
          return <SignUp />;
        case "confirm":
          return payloadStr ? <ConfirmSignUp payload={payloadStr} /> : null;
        case "forgot":
          return fromSignInBool ? <ForgotPassword email={emailStr} /> : null;
        default:
          return <SignIn />;
    }
};

export default AuthPage;
