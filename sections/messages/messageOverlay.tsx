import React, { useEffect, useState } from "react";
import {
    Dimensions,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { BlurView } from "expo-blur";
import * as Clipboard from "expo-clipboard";

import {
    Button,
} from "@/components/ButtonComponent";

import {
    CircleMoreIcon,
    CopyIcon,
    DeleteIcon,
    MoreIcon,
    ReplyIcon,
    ReportIcon,
} from "@/icons/Icon";

import GomealGlassView from "@/components/GlassComponent";

import { MessageBubble } from "./messageBubble";

import {
    MessageRenderer,
} from "./messageContent";

import {
    Message,
} from "@/types/messages.types";

import { useTheme } from "@/provider/ThemeProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBanner } from "@/stores/useBanner";
import { formatTime } from "@/utils/time";


const DATE_LABEL_HEIGHT = 28;


type Props = {
    selectedMessage: Message | null;
    selectedMessageGroup?: Message[];

    isSelecting: boolean;

    checkedMessages: number[];

    dark?: boolean;

    senderSub?: string;

    containerOffset: {
        x: number;
        y: number;
    };

    bubbleRect: {
        x: number;
        y: number;
        width: number;
        height: number;
    };

    menuSize: {
        width: number;
        height: number;
    };

    onMenuSize: (
        width: number,
        height: number
    ) => void;

    onStartSelecting: () => void;
    onDeleteMessages: () => void;
    onCancelSelection: () => void;
    onCloseSelected: () => void;
    onReportMessage: (messageId: number) => void;
    onReplyMessage: (message: Message) => void;
    selectedMessageShowsDate?: boolean;
};

export const MessageOverlay = ({
    selectedMessage,
    selectedMessageGroup,
    isSelecting,
    checkedMessages,
    dark,
    senderSub,
    containerOffset,
    bubbleRect,
    menuSize,
    onMenuSize,
    onStartSelecting,
    onDeleteMessages,
    onReplyMessage,
    onCancelSelection,
    onCloseSelected,
    onReportMessage,
    selectedMessageShowsDate
}: Props) => {

    const banner = useBanner();

    const [glassKey, setGlassKey] = useState(0);
       
    useEffect(() => {
        if (
            menuSize.width > 0 &&
            menuSize.height > 0
        ) {
            setGlassKey((key) => key + 1);
        }
    }, [menuSize.width, menuSize.height]);

    const { colors, textStyles } = useTheme(
        dark ? "dark" : undefined
    );

    const insets = useSafeAreaInsets();

    if (!selectedMessage && !isSelecting) {
        return null;
    }

    const screen = Dimensions.get("window");

    const EDGE_PADDING = 40;
    const MENU_GAP = 12;
    const PREFER_ABOVE_BIAS = 80;

    /*
    * bubbleRect is measured in window coordinates.
    * The menu is positioned relative to MessageScreen,
    * so convert the bubble into MessageScreen coordinates.
    */
    const bubbleLeftRel =
        bubbleRect.x - containerOffset.x;

    const bubbleTopRel =
        bubbleRect.y - containerOffset.y;

    const bubbleRightRel =
        bubbleLeftRel + bubbleRect.width;

    const bubbleBottomRel =
        bubbleTopRel + bubbleRect.height;

    const bubbleCenterXRel =
        bubbleLeftRel +
        bubbleRect.width / 2;

    /*
    * MessageScreen currently fills the available screen,
    * so use the window dimensions as the root bounds.
    *
    * IMPORTANT:
    * Do not subtract containerOffset.y here.
    * bubbleBottomRel is already relative to the root.
    */
    const rootWidth = screen.width;
    const rootHeight = screen.height - containerOffset.y;

    const spaceAbove = bubbleTopRel;

    const spaceBelow =
        rootHeight - bubbleBottomRel;

    /*
    * Prefer above the message unless there is
    * substantially more room below it.
    */
    const showBelow =
        spaceBelow >
        spaceAbove + PREFER_ABOVE_BIAS;

    const menuTopRaw = showBelow
        ? bubbleBottomRel + MENU_GAP
        : bubbleTopRel -
        menuSize.height -
        MENU_GAP;

    /*
    * Keep the menu inside the root.
    */
    const menuTop = Math.max(
        EDGE_PADDING,
        Math.min(
            menuTopRaw,
            rootHeight -
                menuSize.height -
                EDGE_PADDING
        )
    );

    /*
    * Center horizontally on the selected bubble,
    * then clamp to the screen edges.
    */
    const menuLeft = Math.max(
        EDGE_PADDING,
        Math.min(
            bubbleCenterXRel -
                menuSize.width / 2,
            rootWidth -
                menuSize.width -
                EDGE_PADDING
        )
    );

    return (
        <>
            {selectedMessage && !isSelecting && (
                <Pressable
                    style={{
                        ...StyleSheet.absoluteFillObject,
                        zIndex: 5,
                    }}
                    onPress={onCloseSelected}
                >
                    <BlurView
                        intensity={5}
                        tint={dark ? "dark" : "light"}
                        style={StyleSheet.absoluteFillObject}
                    />
                </Pressable>
            )}

            {selectedMessage && !isSelecting && (
                <>
                    <View
                        onLayout={(e) => {
                            const { width, height } =
                                e.nativeEvent.layout;

                            if (
                                width !== menuSize.width ||
                                height !== menuSize.height
                            ) {
                                onMenuSize(width, height);
                            }
                        }}
                        style={{
                            position: "absolute",
                            left:
                                menuSize.width > 0
                                    ? menuLeft
                                    : 0,
                            top:
                                menuSize.height > 0
                                    ? menuTop
                                    : 0,
                            opacity:
                                menuSize.width > 0 &&
                                menuSize.height > 0
                                    ? 1
                                    : 0,
                            zIndex: 10,
                        }}
                    >
                        <GomealGlassView
                            key={glassKey}
                            glassEffectStyle="clear"
                            style={{
                                borderRadius: 20,
                                overflow: "hidden",
                                minWidth: 150,
                                padding: 5,
                                gap: 5,
                            }}
                        >
                            <View
                                style={{
                                    alignItems: "center",
                                }}
                            >
                                <Text className={textStyles.small}>
                                    {formatTime(selectedMessage.sent_at, false)}
                                </Text>
                            </View>
                            
                            <Button
                                onPress={() => {
                                    if (selectedMessage) {
                                        onReplyMessage(selectedMessage);
                                    }
                                }}
                                style={{
                                    height: 40,
                                    gap: 10,
                                    width: "auto",
                                    flexDirection:
                                        "row",
                                    alignItems:
                                        "center",
                                    justifyContent:
                                        "flex-start",
                                }}
                            >
                                <ReplyIcon
                                    color={
                                        colors.text
                                    }
                                    size={20}
                                />
                                <Text
                                    style={{
                                        color:
                                            colors.text,
                                        fontSize: 16,
                                    }}
                                >
                                    Reply
                                </Text>
                            </Button>

                            <Button
                                onPress={
                                    onStartSelecting
                                }
                                style={{
                                    height: 40,
                                    gap: 10,
                                    width: "auto",
                                    flexDirection:
                                        "row",
                                    alignItems:
                                        "center",
                                    justifyContent:
                                        "flex-start",
                                }}
                            >
                                <CircleMoreIcon
                                    color={
                                        colors.text
                                    }
                                    size={20}
                                />
                                <Text
                                    style={{
                                        color:
                                            colors.text,
                                        fontSize: 16,
                                    }}
                                >
                                    More
                                </Text>
                            </Button>

                            <Button
                                onPress={() => {
                                    Clipboard.setString(
                                        selectedMessage.content
                                    );

                                    banner.success("Copied to clipboard")

                                    onCloseSelected();
                                }}
                                style={{
                                    height: 40,
                                    gap: 10,
                                    width: "auto",
                                    flexDirection:
                                        "row",
                                    alignItems:
                                        "center",
                                    justifyContent:
                                        "flex-start",
                                }}
                            >
                                <CopyIcon
                                    color={
                                        colors.text
                                    }
                                    size={18}
                                />
                                <Text
                                    style={{
                                        color:
                                            colors.text,
                                        fontSize: 16,
                                    }}
                                >
                                    Copy
                                </Text>
                            </Button>

                            <Button
                                onPress={() =>
                                    onReportMessage(
                                        selectedMessage.id
                                    )
                                }
                                style={{
                                    height: 40,
                                    gap: 10,
                                    width: "auto",
                                    flexDirection:
                                        "row",
                                    alignItems:
                                        "center",
                                    justifyContent:
                                        "flex-start",
                                }}
                            >
                                <ReportIcon
                                    color={
                                        colors.danger
                                    }
                                    size={18}
                                />
                                <Text
                                    style={{
                                        color:
                                            colors.danger,
                                        fontSize: 16,
                                    }}
                                >
                                    Report
                                </Text>
                            </Button>

                        </GomealGlassView>
                    </View>

                    <View
                        pointerEvents="none"
                        style={{
                            position: "absolute",
                            left:
                                bubbleRect.x -
                                containerOffset.x,
                            top:
                                bubbleRect.y -
                                containerOffset.y,
                            zIndex: 10,
                        }}
                    >
                        <MessageRenderer
                            msg={selectedMessage}
                            group={selectedMessageGroup}
                            isMe={
                                selectedMessage.sender_sub ===
                                senderSub
                            }
                            colors={colors}
                            bubbleMaxWidth={
                                bubbleRect.width
                            }
                            onSelectMessage={() => {}}
                            onMessagePress={() => {}}
                            onToggleChecked={() => {}}
                            isSelecting={isSelecting}
                        />
                    </View>
                </>
            )}

            {isSelecting && (
                <View
                    style={{
                        position: "absolute",
                        top: insets.top + 15,
                        right: 15,
                        zIndex: 61,
                        flexDirection: "row",
                        alignItems: "flex-end",
                        gap: 2,
                    }}
                >
                    <Button
                        onPress={onDeleteMessages}
                        disabled={
                            checkedMessages.length < 1
                        }
                        clearBackground
                    >
                        <DeleteIcon
                            color={colors.danger}
                        />
                    </Button>

                    <Text
                        className={
                            textStyles.small
                        }
                    >
                        {checkedMessages.length} msg
                    </Text>
                </View>
            )}
        </>
    );
};