import React, { useState } from "react";
import {
    Pressable,
    Text,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
    BackIcon,
    BlockIcon,
    MoreIcon,
    ReportIcon,
} from "@/icons/Icon";

import {
    Button,
    ExpandingButton,
} from "@/components/ButtonComponent";

import { GradientHeader } from "@/components/GradientComponent";
import { SpinningLogoImage } from "@/utils/Logo";
import { AvatarRender } from "@/dashboard/Avatar";
import { useTheme } from "@/provider/ThemeProvider";

type Props = {
    otherUser?: {
        sub?: string;
        profile_name: string;
        firstName?: string;
        lastName?: string;
        avatar?: any;
    } | null;

    dark?: boolean;
    isSelecting: boolean;

    loadingBlockUser: boolean;

    onClose?: () => void;
    onReport: () => void;
    onBlock: () => void;
    onClearConversation: () => void;
};

export const MessageHeader = ({
    otherUser,
    dark,
    loadingBlockUser,
    isSelecting = false,
    onClose,
    onReport,
    onBlock,
    onClearConversation,
}: Props) => {
    const { colors, textStyles } = useTheme(
        dark ? "dark" : undefined
    );

    const insets = useSafeAreaInsets();

    const [showMenu, setShowMenu] = useState(false);

    const HEADER_HEIGHT = otherUser ? 70 : 50;

    return (
        <GradientHeader
            baseColor={colors.background}
            height={HEADER_HEIGHT + insets.top}
            contentStyle={{
                height: HEADER_HEIGHT + insets.top,
                paddingTop: insets.top,
                paddingHorizontal: 15,
                flexDirection: "row",
                alignItems: "center",
            }}
        >
            {showMenu && (
                <Pressable
                    onPress={() => setShowMenu(false)}
                    style={{
                        position: "absolute",
                        top: -2000,
                        left: -2000,
                        right: -2000,
                        bottom: -2000,
                        zIndex: 11,
                    }}
                />
            )}

            {otherUser && (
                <>
                    <Button
                        clearBackground
                        onPress={() => {
                            onClearConversation();
                            onClose?.();
                        }}
                    >
                        <BackIcon color={colors.text} />
                    </Button>

                    <AvatarRender
                        avatar={otherUser.avatar}
                        size={32}
                    />

                    <View
                        style={{
                            flex: 1,
                            alignItems: "flex-start",
                            justifyContent: "center",
                            paddingHorizontal: 10,
                        }}
                    >
                        <Text
                            className={textStyles.body}
                            numberOfLines={1}
                            style={{
                                color: colors.text,
                                fontSize: 17
                            }}
                        >
                            {otherUser.profile_name}
                        </Text>

                        <Text
                            className={textStyles.small}
                            numberOfLines={1}
                            style={{
                                color: colors.secondaryText,
                                fontSize: 13
                            }}
                        >
                            {otherUser.firstName}{" "}
                            {otherUser.lastName}
                        </Text>
                    </View>
                    
                    {!isSelecting && (
                        <View
                            style={{
                                position: "absolute",
                                right: 10,
                                zIndex: 101,
                                elevation: 10,
                                top: showMenu
                                    ? insets.top
                                    : insets.top + 15,
                            }}
                        >
                            <ExpandingButton
                                expanded={showMenu}
                                anchor="top-right"
                                onPress={() =>
                                    setShowMenu((value) => !value)
                                }
                                expandedStyle={{
                                    borderRadius: 20,
                                }}
                                expandedWidth={150}
                                expandedChildren={
                                    <View
                                        style={{
                                            gap: 5,
                                            overflow: "hidden",
                                        }}
                                    >
                                        <Button
                                            onPress={() => {
                                                setShowMenu(false);
                                                onReport();
                                            }}
                                            style={{
                                                width: 125,
                                                flexDirection: "row",
                                                alignItems: "center",
                                                justifyContent:
                                                    "space-between",
                                                paddingHorizontal: 16,
                                                paddingVertical: 12,
                                                backgroundColor:
                                                    colors.background,
                                            }}
                                        >
                                            <Text
                                                style={{
                                                    color: colors.text,
                                                    fontSize: 16,
                                                }}
                                            >
                                                Report
                                            </Text>

                                            <ReportIcon
                                                color={colors.text}
                                                size={18}
                                            />
                                        </Button>

                                        <Button
                                            onPress={() => {
                                                setShowMenu(false);
                                                onBlock();
                                            }}
                                            disabled={loadingBlockUser}
                                            style={{
                                                width: 125,
                                                flexDirection: "row",
                                                alignItems: "center",
                                                justifyContent:
                                                    "space-between",
                                                paddingHorizontal: 16,
                                                paddingVertical: 12,
                                                backgroundColor:
                                                    colors.background,
                                            }}
                                        >
                                            <Text
                                                style={{
                                                    color: colors.danger,
                                                    fontSize: 16,
                                                }}
                                            >
                                                Block
                                            </Text>

                                            {loadingBlockUser ? (
                                                <SpinningLogoImage size={18} />
                                            ) : (
                                                <BlockIcon
                                                    color={colors.danger}
                                                    size={18}
                                                />
                                            )}
                                        </Button>
                                    </View>
                                }
                                clearBackground
                            >
                                <MoreIcon
                                    color={colors.text}
                                    size={15}
                                    rotate={90}
                                />
                            </ExpandingButton>
                        </View>
                    )}
                </>
            )}
        </GradientHeader>
    );
};