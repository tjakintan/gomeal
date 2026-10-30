import { PostHogProvider, usePostHog } from "posthog-react-native";
import { PropsWithChildren, useEffect, useRef } from "react";
import { useUser } from "@/stores/useUser";

const POSTHOG_API_KEY = process.env.EXPO_PUBLIC_POSTHOG_API_KEY!;
const POSTHOG_API_HOST = process.env.EXPO_PUBLIC_POSTHOG_API_HOST;
const POSTHOG_CAPTURE_LIFECYCLE = process.env.EXPO_PUBLIC_POSTHOG_CAPTURE_LIFECYCLE === "true";

function IdentifyUser() {
    const posthog = usePostHog();
    const user = useUser((s) => s.user);
    const identifiedRef = useRef<string | null>(null);

    useEffect(() => {
        if (user?.sub && identifiedRef.current !== user.sub) {
            posthog.identify(user.sub, {
                email: user.email ?? null,
                first_name: user.firstName ?? null,
                last_name: user.lastName ?? null,
            });
            identifiedRef.current = user.sub;
        }

        if (!user && identifiedRef.current) {
            posthog.reset();
            identifiedRef.current = null;
        }
    }, [user?.sub]);

    return null;
}

export function AnalyticsProvider({ children }: PropsWithChildren) {
    return (
        <PostHogProvider
            apiKey={POSTHOG_API_KEY}
            options={{
                host: POSTHOG_API_HOST,
                captureAppLifecycleEvents: POSTHOG_CAPTURE_LIFECYCLE,
            }}
        >
            <IdentifyUser />
            {children}
        </PostHogProvider>
    );
}