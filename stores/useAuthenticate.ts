import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { User } from "@/types/user.types";
import { ONBOARD_USER_SECTIONS } from "@/types/onBoard.types";
import {
    findUserByEmail,
    ConfirmUserEmail,
    verifyUserEmail,
    SignUpUser,
    SocialSignUp
} from "@/api/authenticate.api";
import { useUser } from "@/stores/useUser";

export type GoogleSignUpResponse =
    | {
          exists: true;
          user: User;
          accessToken: string;
          refreshToken: string;
      }
    | {
          exists: false;
          googleUser: {
              email: string;
              firstName?: string;
              lastName?: string;
              avatar?: string;
          };
      };

type OnboardingDraft = Partial<User> & {
    exists?: boolean;
    sub?: string;
};

type OnboardingState = {
    step: number;
    draft: OnboardingDraft;
    loading: boolean;
    error: string | null;
    sessionId: string | null;
    countdown: number;

    isLastStep: () => boolean;
    reset: () => void;
    setStep: (step: number) => void;
    nextStep: () => void;
    backStep: () => void;
    mergeDraft: (data?: OnboardingDraft) => void;

    submitStep: (data?: OnboardingDraft) => Promise<void>;
    continueWithGoogle: (idToken: string) => Promise<boolean>;
    submitEmail: (email: string) => Promise<boolean>;
    sendEmailCode: () => Promise<boolean>;
    verifyEmailCode: (code: string) => Promise<boolean>;
    resendEmailCode: () => Promise<boolean>;
    signUp: (data?: OnboardingDraft) => Promise<boolean>;

    tickCountdown: () => void;
};

const saveSession = async (result: {
    user: User;
    accessToken: string;
    refreshToken: string;
}) => {
    await AsyncStorage.setItem("accessToken", result.accessToken);
    await AsyncStorage.setItem("refreshToken", result.refreshToken);
    useUser.getState().setUser(result.user);
};

export const useOnboarding = create<OnboardingState>((set, get) => ({
    step: 0,
    draft: {},
    loading: false,
    error: null,
    sessionId: null,
    countdown: 60,

    isLastStep: () => get().step === ONBOARD_USER_SECTIONS.length - 1,

    reset: () =>
        set({
            step: 0,
            draft: {},
            loading: false,
            error: null,
            sessionId: null,
            countdown: 60,
        }),

    setStep: (step) =>
        set({
            step: Math.max(0, Math.min(step, ONBOARD_USER_SECTIONS.length - 1)),
        }),

    nextStep: () =>
        set((state) => ({
            step: Math.min(state.step + 1, ONBOARD_USER_SECTIONS.length - 1),
        })),

    backStep: () => {
        const currentStep = get().step;
        if (currentStep === 0) return;

        const prevStep = currentStep - 1;
        const prevSection = ONBOARD_USER_SECTIONS[prevStep];

        const nextStep = prevSection === "ConfirmEmail" ? prevStep - 1 : prevStep;

        set((state) => ({
            step: Math.max(0, nextStep),
            draft: prevSection === "Email" ? {} : state.draft,
        }));
    },

    mergeDraft: (data) => {
        if (!data) return;

        set((state) => ({
            draft: {
                ...state.draft,
                ...data,
            },
        }));
    },

    submitStep: async (data) => {
        get().mergeDraft(data);

        if (get().isLastStep()) {
            await get().signUp(data);
            return;
        }

        get().nextStep();
    },

    submitEmail: async (email) => {
        if (!/\S+@\S+\.\S+/.test(email)) {
            set({ error: "Invalid email" });
            return false;
        }

        set({ loading: true, error: null });

        try {
            const user = await findUserByEmail(email);

            if (user.exists) {
                get().mergeDraft({
                    email,
                    exists: true,
                    sub: user.sub,
                    firstName: user.firstName,
                    lastName: user.lastName,
                } as OnboardingDraft);
            } else {
                get().mergeDraft({ email });
            }

            get().nextStep();
            return true;
        } catch (err) {
            console.error("Email lookup failed:", err);
            set({ error: "Failed to check email" });
            return false;
        } finally {
            set({ loading: false });
        }
    },

    sendEmailCode: async () => {
        const email = get().draft.email;
        if (!email) return false;

        set({ loading: true, error: null });

        try {
            const { session_id } = await ConfirmUserEmail(email);
            set({ sessionId: session_id, countdown: 60 });
            return true;
        } catch (err) {
            console.error("Send code failed:", err);
            set({ error: "Failed to send email, please try again." });
            return false;
        } finally {
            set({ loading: false });
        }
    },

    verifyEmailCode: async (code) => {
        const { draft, sessionId } = get();

        if (!draft.email || !sessionId || code.length < 6) return false;

        set({ loading: true, error: null });

        try {
            const verified = await verifyUserEmail({
                email: draft.email,
                sub: draft.sub,
                code,
                session_id: sessionId,
            });

            if (!verified) {
                set({ error: "Invalid code" });
                return false;
            }

            if (draft.exists) {
                await saveSession(verified);
                return true;
            }

            get().nextStep();
            return true;
        } catch (err) {
            console.error("Verify code failed:", err);
            set({ error: "Invalid code, try again." });
            return false;
        } finally {
            set({ loading: false });
        }
    },

    resendEmailCode: async () => {
        if (get().countdown > 0) return false;
        return get().sendEmailCode();
    },

    continueWithGoogle: async (idToken) => {
        if (!idToken) {
            set({ error: "Missing Google token" });
            return false;
        }

        set({ loading: true, error: null });

        try {
            const result = await SocialSignUp(idToken);

            if (!result) {
                set({ error: "Google sign in failed" });
                return false;
            }

            if (result.exists) {
                await saveSession({
                    user: result.user,
                    accessToken: result.accessToken,
                    refreshToken: result.refreshToken,
                });

                return true;
            }

            get().mergeDraft({
                email: result.googleUser.email,
                firstName: result.googleUser.firstName ?? "",
                lastName: result.googleUser.lastName ?? "",
            });

            const personalStep = ONBOARD_USER_SECTIONS.indexOf("Personal");

            set({
                step: personalStep >= 0 ? personalStep : 1,
            });

            return true;
        } catch (err) {
            console.error("Google sign-up failed:", err);
            set({ error: "Google sign in failed" });
            return false;
        } finally {
            set({ loading: false });
        }
    },

    signUp: async (data) => {
        get().mergeDraft(data);

        set({ loading: true, error: null });

        try {
            const result = await SignUpUser(get().draft);

            if (!result) {
                set({ error: "Failed to create user" });
                return false;
            }

            await saveSession(result);
            return true;
        } catch (err) {
            console.error("Sign-up failed:", err);
            set({ error: "Failed to create user" });
            return false;
        } finally {
            set({ loading: false });
        }
    },

    tickCountdown: () =>
        set((state) => ({
            countdown: Math.max(0, state.countdown - 1),
        })),
}));
