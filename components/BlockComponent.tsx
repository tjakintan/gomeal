
import React from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import { useTheme } from "@/provider/ThemeProvider";
import { useBlockUser } from "@/stores/useReport";
import { useBanner } from "@/stores/useBanner";
import { useFeed } from "@/stores/useFeed";
import { SpinningLogoImage } from "@/utils/Logo";
import { GradientHeader } from "@/components/GradientComponent";
import { SectionHeader } from "./SectionComponent";
import { BlockIcon } from "@/icons/Icon";
import { Button } from "./ButtonComponent";
import { useOverlay } from "@/stores/useOverlay";

type BlockProps = {
    dark?: boolean;
    target_user_sub: string;
    profile_name: string;
    onBlocked: () => void | Promise<void>;
    onCancel?: () => void;
};

const Block: React.FC<BlockProps> = ({
    dark,
    target_user_sub,
    profile_name,
    onBlocked,
    onCancel,
}) => {
    const { colors, textStyles } = useTheme(
        dark ? "dark" : undefined
    );
    const insets = useSafeAreaInsets();
    const banner = useBanner();

    const blockUser = useBlockUser((s) => s.blockUser);
    const loadingBlockUser = useBlockUser(
        (s) => s.loadingBlockUser
    );

    const requestClose = useOverlay((s) => s.requestClose);

    const loadFeed = useFeed((s) => s.loadFeed);
    const loadReel = useFeed((s) => s.loadReel);
    const selectedScope = useFeed((s) => s.selectedScope);

    const handleBlock = async () => {
        if (loadingBlockUser) return;

        try {
            await blockUser(target_user_sub);

            banner.success(
                `You have successfully blocked @${profile_name}.`
            );

            await Promise.all([
                loadFeed(undefined, selectedScope, false, true),
                loadReel(undefined, selectedScope, false, true),
            ]);

            await onBlocked();
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
            <GradientHeader
                baseColor={colors.background}
                fadeSteps={[1, 1]}
                direction="top"
                zIndex={5}
            >
                <SectionHeader
                    dark={dark}
                    title="Block user"
                    subtitle="Choose who you want to see and interact with on GoMeal."
                    showDivider
                    leftIcon={
                        <BlockIcon
                            color={colors.danger}
                            size={24}
                        />
                    }
                />
            </GradientHeader>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                    flexGrow: 1,
                    paddingTop: 100,
                }}
            >
                <View
                    style={{
                        alignItems: "flex-start",
                        marginBottom: 30,
                    }}
                >

                    <Text
                        className={textStyles.section}
                        style={{
                            color: colors.text,
                            fontSize: 22,
                            textAlign: "center",
                            marginBottom: 12,
                        }}
                    >
                        Block, {profile_name} ?
                    </Text>

                    <Text
                        className={textStyles.body}
                        style={{
                            color: colors.secondaryText,
                            fontSize: 16,
                            lineHeight: 24,
                        }}
                    >
                        They won't be notified that you blocked them.
                        Their content will no longer appear in your
                        feed, and they won't be able to message you.
                    </Text>
                </View>

                <View style={{ gap: 16, marginHorizontal: 20 }}>
                    <View
                        style={{
                            padding: 16,
                            borderRadius: 16,
                            backgroundColor: colors.secondaryCard,
                            gap: 12,
                        }}
                    >
                        <Text
                            className={textStyles.sectionText}
                            style={{ color: colors.text }}
                        >
                            What happens when you block someone?
                        </Text>

                        {[
                            "Their posts won't appear in your feed.",
                            "They won't be able to message you.",
                            "You can unblock them later if you change your mind.",
                        ].map((item) => (
                            <View
                                key={item}
                                style={{
                                    flexDirection: "row",
                                    alignItems: "flex-start",
                                    gap: 10,
                                }}
                            >
                                <Text
                                    style={{
                                        color: colors.danger,
                                        fontSize: 18,
                                    }}
                                >
                                    {"\u2022"}
                                </Text>

                                <Text
                                    className={textStyles.body}
                                    style={{
                                        flex: 1,
                                        color: colors.secondaryText,
                                        fontSize: 14,
                                        lineHeight: 21,
                                    }}
                                >
                                    {item}
                                </Text>
                            </View>
                        ))}
                    </View>
                </View>
            </ScrollView>

            <GradientHeader
                baseColor={colors.background}
                height={130}
                direction="bottom"
                zIndex={5}
            >
                <View
                    style={{
                        paddingHorizontal: 20,
                        paddingTop: 12,
                        paddingBottom: Math.max(insets.bottom, 12),
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
                    
                    <Button
                        onPress={() => {requestClose()}}
                        disabled={loadingBlockUser}
                        style={{
                            height: 44,
                            alignItems: "center",
                            justifyContent: "center",
                            opacity: loadingBlockUser ? 0.5 : 1,
                        }}
                    >
                        <Text
                            className={textStyles.sectionText}
                            style={{
                                color: colors.secondaryText,
                                fontSize: 15,
                            }}
                        >
                            Cancel
                        </Text>
                    </Button>

                    <View
                        style={{
                            marginTop: 20,
                            paddingVertical: 10,
                            backgroundColor: colors.background
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
                </View>
            </GradientHeader>
        </View>
    );
};

export default Block;