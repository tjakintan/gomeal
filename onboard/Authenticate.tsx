import React, { useState, useRef, useEffect } from "react";
import {
    View,
    Text,
    Animated,
    Easing,
    KeyboardAvoidingView,
    Platform,
    Linking,
    TouchableOpacity
} from "react-native";
import { useTheme } from "@/provider/ThemeProvider";
import { Input, DigitsInput, DobInput } from "@/components/InputComponent";
import { Button } from "@/components/ButtonComponent";
import {
    ONBOARD_USER_SECTIONS,
    onBoardUserSectionProps,
    onBoardUserSectionName,
} from "@/types/onBoard.types";
import {
    EmailIcon,
    ForwardEmailIcon,
    GoogleIcon,
    BackIcon,
    NextIcon,
    PersonIcon,
    TagNameIcon,
    OpenMailboxIcon,
} from "@/icons/Icon";
import { SpinningLogoImage } from "@/utils/Logo";
import { User } from "@/types/user.types";
import { SectionHeader } from "@/components/SectionComponent";
import { CreateAvatarScreen } from "@/dashboard/Avatar";
import { getDobParts, isValidDob } from "@/utils/time";
import * as WebBrowser from "expo-web-browser";
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import { useOnboarding } from "@/stores/useAuthenticate";

const WelcomeScreen: React.FC<{ onNext?: () => void }> = () => {
    const { colors } = useTheme();

    const {
        step,
        draft,
        loading,
        reset,
        submitStep,
        backStep,
        setStep,
        isLastStep,
    } = useOnboarding();

    useEffect(() => {
        reset();

        GoogleSignin.configure({
            webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
            iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
            offlineAccess: true,
        });

    }, []);

    return (
        <View style={{ flex: 1 }}>
            {loading && isLastStep() && (
                <View
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: colors.background,
                        zIndex: 999,
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <SpinningLogoImage size={50} />
                </View>
            )}
            <View
                style={{
                    height: step > 0 ? 72 : 28,
                    paddingTop: 10,
                    gap: 14,
                }}
                className="w-full flex-col"
            >
                <View
                    style={{
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <View
                        style={{
                            width: 275,
                            flexDirection: "row",
                            gap: 5,
                            alignItems: "center",
                        }}
                    >
                        {Array.from({ length: ONBOARD_USER_SECTIONS.length }).map(
                            (_, index) => {
                                const active = index <= step;

                                return (
                                    <View
                                        key={index}
                                        style={{
                                            flex: 1,
                                            height: 10,
                                            borderRadius: 999,
                                            backgroundColor: active
                                                ? colors.button
                                                : colors.card,
                                            opacity: active ? 1 : 0.3,
                                        }}
                                    />
                                );
                            }
                        )}
                    </View>
                </View>

                {step > 0 && (
                    <View
                        style={{ height: 34 }}
                        className="flex-row px-5 items-center justify-between"
                    >
                        <Button onPress={backStep} background>
                            <BackIcon color={colors.text} />
                        </Button>
                    </View>
                )}
            </View>

            <View style={{ flex: 1 }}>
                {ONBOARD_USER_SECTIONS.map((section, index) => {
                    const ActiveSection = SECTION_COMPONENTS[section];

                    if (index !== step) return null;

                    return (
                        <AnimatedSection key={section}>
                            <ActiveSection
                                onNext={submitStep}
                                onBack={backStep}
                                draft={draft}
                            />
                        </AnimatedSection>
                    );
                })}
            </View>
        </View>
    );
};

const AnimatedSection: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const translateX = useRef(new Animated.Value(60)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(translateX, {
                toValue: 0,
                useNativeDriver: true,
                damping: 18,
                stiffness: 120,
            }),
            Animated.timing(opacity, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    return (
        <Animated.View style={{ flex: 1, opacity, transform: [{ translateX }] }}>
            {children}
        </Animated.View>
    );
};

const Identity: React.FC<onBoardUserSectionProps> = ({ onNext }) => {

    const { colors, textStyles } = useTheme();
    const { continueWithGoogle } = useOnboarding();

    const handleGoogleSignup = async () => {
        try {
            await GoogleSignin.hasPlayServices({
                showPlayServicesUpdateDialog: true,
            });

            const userInfo = await GoogleSignin.signIn();
            const idToken = userInfo.data?.idToken;

            if (!idToken) {
                console.log("Google sign in failed: missing idToken");
                return;
            }

            await continueWithGoogle(idToken);
        } catch (error: any) {
            if (error.code === statusCodes.SIGN_IN_CANCELLED) {
                return;
            }

            if (error.code === statusCodes.IN_PROGRESS) {
                return;
            }

            if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
                console.log("Google Play Services not available");
                return;
            }

            console.error("Google sign in error:", error);
        }
    };

    return (
        <View
            style={{
                flex: 1,
                padding: 10,
                gap: 10,
                justifyContent: "flex-end",
            }}
        >
            <SectionHeader
                title="Welcome"
                titleClassName={textStyles.h3}
                leftIcon={<SpinningLogoImage size={30} />}
                subtitle="Sign in, or continue with email to get started"
            />

            <Button
                style={{
                    flexDirection: "row",
                    gap: 10,
                    width: "100%",
                    height: 60,
                    backgroundColor: colors.card,
                }}
                onPress={() => onNext?.()}
            >
                <Text className={textStyles.sectionText}>Continue with email</Text>
                <ForwardEmailIcon color={colors.text} />
            </Button>

            <Button
                style={{
                    flexDirection: "row",
                    gap: 10,
                    width: "100%",
                    height: 60,
                    backgroundColor: colors.card,
                }}
                onPress={handleGoogleSignup}
            >
                <Text className={textStyles.sectionText}>Continue with Google</Text>
                <GoogleIcon />
            </Button>

<View
    style={{
        width: "100%",
        alignItems: "center",
        justifyContent: "center",
        paddingTop: 8,
        paddingBottom: 16,
        paddingHorizontal: 20,
    }}
>
    <Text
        style={{
            color: colors.secondaryText,
            fontSize: 12,
            textAlign: "center",
            lineHeight: 18,
        }}
    >
        By continuing, you agree to GoMeal’s{" "}
        <Text
            onPress={() =>
                WebBrowser.openBrowserAsync(
                    "https://www.gomeal.org/privacy"
                )
            }
            style={{
                color: colors.button,
                textDecorationLine: "underline",
                fontWeight: "600",
            }}
        >
            Privacy Policy
        </Text>
    </Text>
</View>
            
        </View>
    );
};

const Email: React.FC<onBoardUserSectionProps> = () => {
    const { colors } = useTheme();
    const { loading, error, submitEmail } = useOnboarding();
    const [email, setEmail] = useState("");

    return (
        <View style={{ flex: 1 }} className="w-full p-2 gap-2 justify-start">
            <SectionHeader
                title="Email"
                subtitle="Type your email in the space provided, to see if you have an account"
            />

            <View >
                <Input
                    value={email}
                    onChangeText={setEmail}
                    placeholder="email"
                    placeholderTextColor={colors.secondaryText}
                    label={error ?? ""}
                    leftIcon={
                        loading ? (
                            <SpinningLogoImage size={30} />
                        ) : (
                            <EmailIcon color={colors.text} />
                        )
                    }
                    onSubmitEditing={() => submitEmail(email)}
                    returnKeyType="done"
                    multiline={false}
                    style={{ fontSize: 15 }}
                    disabled={false}
                />
            </View>
        </View>
    );
};

const ConfirmEmail: React.FC<onBoardUserSectionProps> = ({ draft }) => {
    const { textStyles } = useTheme();

    const {
        loading,
        error,
        countdown,
        sendEmailCode,
        verifyEmailCode,
        resendEmailCode,
        tickCountdown,
    } = useOnboarding();

    const existingUser = draft?.exists === true;

    const [code, setCode] = useState("");
    const [inputKey, setInputKey] = useState(0);

    useEffect(() => {
        if (countdown === 60) {
            sendEmailCode();
        }
    }, []);

    useEffect(() => {
        if (countdown <= 0) return;

        const timer = setInterval(() => {
            tickCountdown();
        }, 1000);

        return () => clearInterval(timer);
    }, [countdown]);

    const handleResend = async () => {
        const sent = await resendEmailCode();

        if (sent) {
            setCode("");
            setInputKey((key) => key + 1);
        }
    };

    return (
        <View style={{ flex: 1 }} className="w-full p-2 gap-2 justify-start">
            <SectionHeader
                title={existingUser ? `Welcome back, ${draft?.firstName}` : ""}
                subtitle={`Enter the OTP code sent to ${draft?.email}, from @gomeal.org`}
            />

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                className="flex-col gap-5 p-2 items-center justify-center"
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 130 : 80}
            >
                <OpenMailboxIcon size={150} />

                <View className="w-full p-1">
                    <DigitsInput
                        key={inputKey}
                        label={error ?? undefined}
                        length={6}
                        separator
                        onComplete={setCode}
                    />
                </View>

                <View className="p-1">
                    <Button
                        style={{ width: 100 }}
                        onPress={() => verifyEmailCode(code)}
                        disabled={!code || loading}
                        background={!loading}
                    >
                        {loading ? (
                            <SpinningLogoImage size={20} />
                        ) : (
                            <Text className={textStyles.sectionText}>Submit</Text>
                        )}
                    </Button>
                </View>

                <View className="w-full items-center justify-center gap-3 flex-row p-2">
                    {countdown > 0 ? (
                        <View className="w-full items-center justify-center p-2">
                            <Text
                                className={textStyles.sectionText}
                                style={{ opacity: 0.4 }}
                            >
                                Resend in {countdown}s
                            </Text>
                        </View>
                    ) : (
                        <Button
                            style={{ width: 100 }}
                            onPress={handleResend}
                            disabled={loading}
                            background
                        >
                            <Text className={textStyles.sectionText}>Resend</Text>
                        </Button>
                    )}
                </View>
            </KeyboardAvoidingView>
        </View>
    );
};

const Personal: React.FC<onBoardUserSectionProps> = ({ onNext, draft }) => {
    const { colors, textStyles } = useTheme();

    const [dob, setDob] = useState("");
    const [profile_name, setProfileName] = useState("");
    const [firstName, setFirstName] = useState(draft?.firstName ?? "");
    const [lastName, setLastName] = useState(draft?.lastName ?? "");
    const [dobError, setDobError] = useState("");

    const buttonHeight = useRef(new Animated.Value(0)).current;

    const handleContinue = () => {
        const [dobMonth, dobDay, dobYear] = getDobParts(dob);

        if (!isValidDob(dobMonth, dobDay, dobYear)) {
            setDobError("Invalid");
            return;
        }

        // --- age verification (> 13 years) --------------
        const today = new Date();
        const birthDate = new Date(Number(dobYear), Number(dobMonth) - 1, Number(dobDay));
        const age = today.getFullYear() - birthDate.getFullYear();
        const hasHadBirthdayThisYear =
            today.getMonth() > birthDate.getMonth() ||
            (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());
        const exactAge = hasHadBirthdayThisYear ? age : age - 1;

        if (exactAge < 13) {
            setDobError("You must be at least 13");
            return;
        }

        setDobError("");
        onNext?.({ firstName, lastName, profile_name, dob });
    };

    useEffect(() => {
        const hasInput = profile_name.trim() && firstName.trim() && lastName.trim() && dob.trim();

        Animated.timing(buttonHeight, {
            toValue: hasInput ? 60 : 0,
            useNativeDriver: false,
            duration: 1500,
            easing: Easing.out(Easing.cubic),
        }).start();
    }, [profile_name, firstName, lastName, dob]);

    return (
        <View style={{ flex: 1 }} className="w-full p-2 justify-start">
            <SectionHeader
                title="Account"
                subtitle="Please add your name and age for verification"
            />

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 130 : 80}
            >
                <View
                    style={{
                        flex: 1,
                        paddingHorizontal: 5,
                        paddingVertical: 10,
                        justifyContent: "space-between",
                    }}
                >
                    <View style={{ borderRadius: 30, overflow: "hidden" }}>
                        <View style={{ margin: 15, gap: 5 }}>
                            <Text className={textStyles.caption}>Profile Name:</Text>

                            <Input
                                value={profile_name}
                                onChangeText={setProfileName}
                                placeholder="tag"
                                placeholderTextColor={colors.secondaryText}
                                leftIcon={<TagNameIcon color={colors.text} />}
                                returnKeyType="done"
                                multiline={false}
                                style={{ fontSize: 15 }}
                                containerStyle={{ width: 175 }}
                                disabled={false}
                            />
                        </View>

                        <View
                            style={{
                                margin: 15,
                                flexDirection: "row",
                                justifyContent: "space-between",
                            }}
                        >
                            <View>
                                <Text className={textStyles.caption}>First Name:</Text>

                                <Input
                                    value={firstName}
                                    onChangeText={(val) => {
                                        setFirstName(val);
                                    }}
                                    placeholder="First name"
                                    placeholderTextColor={colors.secondaryText}
                                    leftIcon={<PersonIcon color={colors.text} />}
                                    returnKeyType="done"
                                    multiline={false}
                                    style={{ fontSize: 15 }}
                                    containerStyle={{ width: 145 }}
                                    disabled={false}
                                />
                            </View>

                            <View>
                                <Text className={textStyles.caption}>Last Name:</Text>

                                <Input
                                    value={lastName}
                                    onChangeText={(val) => {
                                        setLastName(val);
                                    }}
                                    placeholder="Last name"
                                    placeholderTextColor={colors.secondaryText}
                                    returnKeyType="done"
                                    multiline={false}
                                    style={{ fontSize: 15 }}
                                    containerStyle={{ width: 190 }}
                                    disabled={false}
                                />
                            </View>
                        </View>

                        <View
                            style={{
                                margin: 15,
                                width: "65%",
                                gap: 5,
                            }}
                        >
                            <Text className={textStyles.caption}>Birthday:</Text>

                            <DobInput
                                value={dob}
                                size={45}
                                label={dobError}
                                onChangeText={(val) => {
                                    setDobError("");
                                    setDob(val);
                                }}
                                placeholder="mm/dd/yyyy"
                                disabled={false}
                            />
                        </View>
                    </View>

                    <Animated.View
                        style={{
                            height: buttonHeight,
                            overflow: "hidden",
                            paddingHorizontal: 10,
                        }}
                    >
                        <Button
                            style={{
                                height: 50,
                                width: 200,
                                alignSelf: "center",
                                flexDirection: "row",
                                backgroundColor: colors.button,
                                gap: 10,
                            }}
                            onPress={handleContinue}
                        >
                            <Text className={textStyles.bodyMedium}>Avatar</Text>
                        </Button>
                    </Animated.View>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
};

const Avatar: React.FC<onBoardUserSectionProps> = ({
    onNext,
    draft,
    onBack,
}) => {
    return (
        <CreateAvatarScreen
            onBack={() => onBack?.()}
            onNext={(data) => onNext?.(data)}
            draft={draft}
        />
    );
};

const SECTION_COMPONENTS: Record<
    onBoardUserSectionName,
    React.FC<onBoardUserSectionProps>
> = {
    Identity,
    Personal,
    Email,
    ConfirmEmail,
    Avatar,
};

export default WelcomeScreen;


