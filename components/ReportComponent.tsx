import React, { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/provider/ThemeProvider";
import { useBlockUser, useReport } from "@/stores/useReport";
import { SpinningLogoImage } from "@/utils/Logo";
import { GradientHeader } from "@/components/GradientComponent";
import { SectionHeader } from "./SectionComponent";
import { BlockIcon, ReportIcon } from "@/icons/Icon";
import { useBanner } from "@/stores/useBanner";
import * as WebBrowser from "expo-web-browser";
import { useFeed } from "@/stores/useFeed";
import { Button } from "./ButtonComponent";

type ReportProps = {
    dark?: boolean;
    target_id: string | number;
    target_user_sub: string;
    profile_name: string;
    target_type: "post" | "message" | "user";
    onReported: () => void | Promise<void>;
};

type ReportSubmittedProps = {
    dark?: boolean;
    target_user_sub: string;
    profile_name: string;
    onDone: () => void | Promise<void>;
};

const POST_REPORT_REASONS = [
    "Food or dietary information is incorrect",
    "Recipe instructions are incorrect or unsafe",
    "Ingredients or quantities are misleading",
    "Allergen information is missing or incorrect",
    "Nutrition information is inaccurate",
    "Inappropriate or offensive content",
    "Spam or repetitive content",
    "Misleading or deceptive content",
    "Copyright or stolen recipe/content",
    "Unsafe food or cooking practices",
    "Illegal or prohibited content",
];

const USER_REPORT_REASONS = [
    "Inappropriate or offensive behavior",
    "Harassment or bullying",
    "Spam or repetitive behavior",
    "Misleading or deceptive behavior",
    "Impersonation",
    "Hate or discriminatory behavior",
    "Threats or violent behavior",
    "Scam or fraudulent behavior",
    "Sexual or explicit behavior",
    "Illegal or prohibited activity",
];

const ReportSubmitted: React.FC<ReportSubmittedProps> = ({
    dark,
    target_user_sub,
    profile_name,
    onDone,
}) => {

    const banner = useBanner();
    const { colors, textStyles } = useTheme(dark ? "dark" : undefined);
    const insets = useSafeAreaInsets();

    const blockUser = useBlockUser((s) => s.blockUser);
    const loadingBlockUser = useBlockUser((s) => s.loadingBlockUser);
    const loadFeed = useFeed((state) => state.loadFeed);
    const loadReel = useFeed((state) => state.loadReel);
    const selectedScope = useFeed((state) => state.selectedScope);

    const handleBlock = async () => {
        if (loadingBlockUser) return;

        try {
            await blockUser(target_user_sub);
            banner.success(`You have successfully blocked @${profile_name}.`);
            await Promise.all([
                loadFeed(undefined, selectedScope, false, true),
                loadReel(undefined, selectedScope, false, true),
            ]);
            onDone()
        } catch (err) {
            console.error("Failed to block user:", err);
        }
    };

    return (
        <View
            style={{
                flex: 1,
                backgroundColor: colors.background,
            }}
        >

            <SectionHeader
                dark={dark}
                title="More actions"
                subtitle="Thanks for helping keep GoMeal a better place for everyone."
                showDivider
                leftIcon={<BlockIcon color={colors.danger} />}
            />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                    paddingTop: 10,
                    paddingHorizontal: 10,
                    paddingBottom: insets.bottom + 100,
                    gap: 10,
                }}
            >
                <View 
                    style={{

                    }}
                >
                    <Text
                        className={textStyles.section}
                        style={{
                            color: colors.text,
                            marginBottom: 12,
                        }}
                    >
                        What just happened ?
                    </Text>

                    <Text
                        className={textStyles.body}
                        style={{
                            color: colors.secondaryText,
                            fontSize: 16,
                            lineHeight: 24,
                        }}
                    >
                        Your report has been submitted and will be reviewed by
                        our team. If the content violates our guidelines, we'll
                        take appropriate action.
                    </Text>
                </View>

                <View 
                    style={{ 

                    }}
                >
                    <Text
                        className={textStyles.section}
                        style={{
                            color: colors.text,
                            marginBottom: 12,
                        }}
                    >
                        You can also block this user
                    </Text>


                </View>

                <View
                    style={{
                    }}
                >
                    <Button
                        onPress={handleBlock}
                        disabled={loadingBlockUser}
                        style={{
                            height: 54,
                            width: "100%",
                            borderRadius: 27,
                            borderWidth: 1,
                            borderColor: colors.danger,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor:"transparent",
                            opacity: loadingBlockUser ? 0.6 : 1,
                        }}
                    >
                        {loadingBlockUser ? (
                            <SpinningLogoImage dark={dark} size={35} />
                        ) : (
                            <Text
                                className={textStyles.sectionText}
                                style={{
                                    color: colors.danger,
                                    fontSize: 16,
                                }}
                            >
                                {`Block @${profile_name}`}
                            </Text>
                        )}
                    </Button>

                    <Text
                        className={textStyles.body}
                        style={{
                            marginTop: 5,
                            color: colors.secondaryText,
                            fontSize: 13,
                            lineHeight: 19,
                        }}
                    >
                        Block @{profile_name} from your feed and prevent them from
                        messaging you. They won't be notified that you blocked them.
                    </Text>
                </View>

            </ScrollView>

        </View>
    );
};


const Report: React.FC<ReportProps> = ({
    dark,
    target_id,
    target_user_sub,
    profile_name,
    target_type,
    onReported,
}) => {

    const REPORT_REASONS =
        target_type === "user"
            ? USER_REPORT_REASONS
            : POST_REPORT_REASONS;

    const banner = useBanner();
    const { colors, textStyles } = useTheme(dark ? "dark" : undefined);
    const insets = useSafeAreaInsets();

    const [submitted, setSubmitted] = useState(false);

    const reportTarget = useReport((s) => s.reportTarget);
    const loadingReport = useReport((s) => s.loadingReport);

    const [selectedReason, setSelectedReason] = useState<string | null>(null);

    const handleReport = async () => {
        if (!selectedReason || loadingReport) return;

        try {
            await reportTarget(
                target_id,
                target_type,
                selectedReason
            );
            banner.success("Your report has been submitted");
            setSubmitted(true);
        } catch (err) {
            console.error("Failed to report:", err);
        }
    };

    if (submitted) {
        return (
            <ReportSubmitted
                dark={dark}
                profile_name={profile_name}
                target_user_sub={target_user_sub}
                onDone={onReported}
            />
        );
    }

    return (
        <View
            style={{
                flex: 1,
                backgroundColor: colors.background,
            }}
        >
            {/* Header */}
            <GradientHeader
                baseColor={colors.background}
                fadeSteps={[1,1]}
                direction="top"
                zIndex={5}
            >
                <SectionHeader
                    dark={dark}
                    title="Why are you reporting ?"
                    subtitle="Select one of the below options, as the reason for this report."
                    showDivider
                    leftIcon={<ReportIcon color={colors.danger} size={24} />}
                />
            </GradientHeader>

            {/* Reasons */}
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                    paddingTop: 85,
                    paddingBottom: insets.bottom + 60,
                }}
            >
                {REPORT_REASONS.map((reason) => {
                    const selected = selectedReason === reason;

                    return (
                        <Pressable
                            key={reason}
                            onPress={() => setSelectedReason(reason)}
                            style={{
                                minHeight: 60,
                                marginHorizontal: 10,
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 10,
                            }}
                        >
                            <Text
                                className={textStyles.sectionText}
                                style={{
                                    flex: 1,
                                    color: colors.text,
                                }}
                            >
                                {reason}
                            </Text>

                            <View
                                style={{
                                    width: 20,
                                    height: 20,
                                    borderRadius: 999,
                                    borderWidth: 2,
                                    borderColor: colors.text,
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                {selected && (
                                    <View
                                        style={{
                                            width: 20,
                                            height: 20,
                                            borderRadius: 999,
                                            backgroundColor: colors.text,
                                        }}
                                    />
                                )}
                            </View>
                        </Pressable>
                    );
                })}
                <View
                    style={{
                        marginTop: 20,
                        paddingVertical: 10,
                    }}
                >
                    <Text
                        className={textStyles.body}
                        style={{
                            color: colors.secondaryText,
                        }}
                    >
                        Review our Terms of Service and learn about reporting and what should be reported.{" "}
                        <Text
                            onPress={() =>
                                WebBrowser.openBrowserAsync("https://www.gomeal.org/privacy")
                            }
                            style={{
                                color: colors.button,
                                textDecorationLine: "underline",
                            }}
                        >
                            Privacy Policy
                        </Text>
                    </Text>
                </View>
            </ScrollView>

            {/* Bottom Report Button */}
            <GradientHeader
                baseColor={colors.background}
                height={65}
                direction="bottom"
                zIndex={5}
            >
                <Button
                    onPress={handleReport}
                    disabled={!selectedReason || loadingReport}
                    style={{
                        height: 65,
                        width: "75%",
                        borderRadius: 35,
                        alignSelf: "center",
                        justifyContent: "center",
                        alignItems: "center",
                        backgroundColor: loadingReport ? "transparent" : colors.secondaryCard,
                        opacity: !selectedReason ? 0.5 : 1
                    }}
                >
                    {loadingReport ? (
                        <SpinningLogoImage dark={dark} size={35} />
                    ) : (
                        <Text
                            className={textStyles.section}
                            style={{
                                color: selectedReason
                                    ? colors.text
                                    : colors.secondaryText,
                            }}
                        >
                            Next
                        </Text>
                    )}
                </Button>
            </GradientHeader>
        </View>
    );
};

export default Report;