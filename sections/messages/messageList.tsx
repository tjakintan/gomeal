import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
    FlatList,
    Keyboard,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
    Button,
    CheckButton,
    Gesture,
} from "@/components/ButtonComponent";

import {
    ReplyIcon,
    SeenIcon,
    ThreeDotsIcon,
} from "@/icons/Icon";

import {
    MessageRenderer,
    MessageShakeView,
} from "./messageContent";

import {
    formatTime,
    isSameDay,
} from "@/utils/time";

import {
    Message,
} from "@/types/messages.types";

import { useTheme } from "@/provider/ThemeProvider";

import Animated, {
    Easing, useAnimatedStyle, useSharedValue, withTiming, runOnJS,
    useDerivedValue, withSpring, SharedValue,
    useAnimatedReaction,
} from "react-native-reanimated";

import { useReanimatedKeyboardAnimation } from "react-native-keyboard-controller";

import { bottomSheetPosition, bottomSheetFirstSnap } from "@/app/BottomSheet";
import { usePendingMedia } from "@/media/store/usePendingMedia";
import { FILE_PREVIEW_HEIGHT, LINK_PREVIEW_HEIGHT, MEDIA_PREVIEW_HEIGHT, sheetHold } from "./messageInput";
import { usePendingFile } from "@/media/store/usePendingFile";
import { BlurView } from "expo-blur";

import { Swipeable } from "react-native-gesture-handler";
import { Animated as RNAnimated } from "react-native";
import { MessageBubble, ReplyBar } from "./messageBubble";
import { useBottomSheet } from "@/stores/useBottomSheet";
import { usePendingLink } from "@/media/store/usePendingLink";
import { useMessage } from "@/stores/useMessage";
import { SpinningLogoImage } from "@/utils/Logo";


type Props = {
    messages: Message[];

    senderSub?: string;

    dark?: boolean;

    headerHeight: number;

    replyingTo?: Message | null;
    replyChainIds?: number[] | null;
    onReplyMessage: (message: Message) => void;

    messageInputBottom: SharedValue<number>;

    bubbleMaxWidth: number;

    isOtherUserTyping: boolean;
    hasLoadedConversation: boolean;

    selectedMessage: Message | null;
    isSelecting: boolean;

    checkedMessages: number[];

    bubbleRefs: React.MutableRefObject<
        Record<number, View | null>
    >;

    messageRowRefs: React.MutableRefObject<
        Record<number, View | null>
    >;

    otherUserName?: string;

    getReplyChainIds: (message: Message) => number[];

    onSelectMessage: (message: Message) => void;
    onMessagePress: (message: Message) => void;
    onToggleChecked: (messageId: number) => void;
    onCancelSelection: () => void;
    onCancelReply: () => void;
};


export const MessageList = ({
    messages,
    senderSub,
    dark,
    headerHeight,
    bubbleMaxWidth,
    isOtherUserTyping,
    hasLoadedConversation,
    selectedMessage,
    onReplyMessage,
    replyingTo,
    replyChainIds,
    messageRowRefs,
    messageInputBottom,
    getReplyChainIds,
    isSelecting,
    checkedMessages,
    bubbleRefs,
    otherUserName,
    onSelectMessage,
    onMessagePress,
    onToggleChecked,
    onCancelSelection,
    onCancelReply,
}: Props) => {
    
    const { colors, textStyles } = useTheme(
        dark ? "dark" : undefined
    );

    const closeBottomSheet = useBottomSheet((state) => state.closeBottomSheet);

    const insets = useSafeAreaInsets();

    const { height: keyboardHeight } = useReanimatedKeyboardAnimation();

    const { height: screenHeight, width: screenWidth } = useWindowDimensions();

    const hasPendingMedia = usePendingMedia((state) => state.pendingMedia.length > 0);

    const hasPendingFile = usePendingFile((state) => state.pendingFile !== null);

    const hasPendingLink = usePendingLink((state) => !!state.pendingLinkUrl);

    const loadOlderMessages = useMessage(
        (state) => state.loadOlderMessages
    );

    const loadingOlderMessages = useMessage(
        (state) => state.loadingOlderMessages
    );

    const hasMoreMessages = useMessage(
        (state) => state.conversations?.hasMore ?? false
    );

    const chainProgress = useSharedValue(0);

    type ChainRow = { id: number };

    const [chainRows, setChainRows] = useState<ChainRow[]>([]);

    const [localChainIds, setLocalChainIds] = useState<number[] | null>(null);

    const activeChainIds = replyingTo ? replyChainIds : localChainIds;

    const chainVisible = !!replyingTo || localChainIds !== null;

    const blurProgress = useSharedValue(0);

    const seenIconProgress = useSharedValue(0);

    const listRef = useRef<FlatList<Message[]>>(null);

    const swipeableRefs = useRef<Record<number, Swipeable | null>>({});

    const chainScrollRef = useRef<ScrollView>(null);

    const chainRowHeights = useRef<Record<number, number>>({});

    const overlayRef = useRef<View>(null);
    
   const followsMessageSheet = useSharedValue(false);

    const [shake, setShake] = useState<{ id: number; nonce: number } | null>(null);

    const listExtraData = useMemo(() => ({ chainRows, shake }), [chainRows, shake]);

    const chainVisibleRef = useRef(chainVisible);

    chainVisibleRef.current = chainVisible;
    

    const getMessageGroups = (
        messages: Message[]
    ): Message[][] => {
        const groups: Message[][] = [];

        for (const message of messages) {
            const previousGroup =
                groups[groups.length - 1];

            if (
                previousGroup &&
                message.media_group_id &&
                previousGroup[0].media_group_id ===
                    message.media_group_id &&
                previousGroup[0].sender_sub ===
                    message.sender_sub
            ) {
                previousGroup.push(message);
            } else {
                groups.push([message]);
            }
        }

        return groups;
    };


    const messageGroups = useMemo(() => {
        return getMessageGroups(
            [...messages].reverse()
        );
    }, [messages]);


    const latestRowId = messageGroups[0]?.[0]?.id;
    const latestRowIdRef = useRef(latestRowId);
    latestRowIdRef.current = latestRowId;

    const lastReplyChainMessage = useMemo(() => {
        if (!activeChainIds?.length) return null;
        const ids = new Set(activeChainIds);
        for (let i = messages.length - 1; i >= 0; i--) {
            if (ids.has(messages[i].id)) return messages[i];
        }
        return null;
    }, [messages, activeChainIds]);


    const renderReplyAction = (side: "left" | "right") => (
        progress: RNAnimated.AnimatedInterpolation<number>,
        dragX: RNAnimated.AnimatedInterpolation<number>
    ) => {
        const scale = dragX.interpolate({
            inputRange: side === "left" ? [0, 50] : [-50, 0],
            outputRange: side === "left" ? [0, 1] : [1, 0],
            extrapolate: "clamp",
        });

        return (
            <View
                style={{
                    width: 50,
                    justifyContent: "center",
                    alignItems: side === "left" ? "flex-end" : "flex-start",
                    paddingHorizontal: 10,
                }}
            >
                <RNAnimated.View style={{ transform: [{ scale }] }}>
                    <ReplyIcon size={20} color={colors.text} />
                </RNAnimated.View>
            </View>
        );
    };


    const repliesByParentId = useMemo(() => {
        const map = new Map<number, Message[]>();
        for (const m of messages) {
            if (m.reply_to_id != null) {
                const arr = map.get(m.reply_to_id) ?? [];
                arr.push(m);
                map.set(m.reply_to_id, arr);
            }
        }
        return map;
    }, [messages]);


    const seenIconStyle = useAnimatedStyle(() => ({
        opacity: seenIconProgress.value,
        transform: [
            {
                translateY:
                    (1 - seenIconProgress.value) * 6,
            },
        ],
    }));

    
    const messagesById = useMemo(() => {
        const map = new Map<number, Message>();
        for (const m of messages) map.set(m.id, m);
        return map;
    }, [messages]);


    const latestSentId = useMemo(() => {
        for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].sender_sub === senderSub) return messages[i].id;
        }
        return null;
    }, [messages, senderSub]);


    const groupIndexByMessageId = useMemo(() => {
        const map = new Map<number, number>();
        messageGroups.forEach((group, i) => {
            for (const m of group) map.set(m.id, i);
        });
        return map;
    }, [messageGroups]);


    const scrollToMessage = useCallback((messageId: number) => {
        const index = groupIndexByMessageId.get(messageId);
        if (index == null) return;

        setShake({ id: messageId, nonce: Date.now() });

        listRef.current?.scrollToIndex({
            index,
            animated: true,
            viewPosition: 0.5,
        });
    }, [groupIndexByMessageId]);


    const scrollToBottom = useCallback((animated = true) => {
        listRef.current?.scrollToOffset({ offset: 0, animated });
    }, []);


    const openChain = (msg: Message) => {
        if (isSelecting) return;

        const ids = getReplyChainIds(msg);

        if (ids.length > 1) {
            setLocalChainIds(ids);
        }
    };


    const closeChain = useCallback(() => {
        if (replyingTo) {
            onCancelReply();
        } else {
            setLocalChainIds(null);
        }

        Keyboard.dismiss();
        closeBottomSheet();

        // once now, once after the keyboard/sheet/spacer finished animating
        requestAnimationFrame(() => scrollToBottom());
        setTimeout(() => scrollToBottom(), 300);
    }, [replyingTo, onCancelReply, closeBottomSheet, scrollToBottom]);


    const handleMessageTap = (msg: Message, opensChain: boolean) => {
        onMessagePress(msg);
        if (opensChain) openChain(msg);
    };


    /*
    * This is the exact amount of space
    * the regular message list adds above
    * the messages because of the keyboard,
    * bottom sheet, or pending media/file.
    */
    const isMessageInputSheetOpen = useBottomSheet((state) => {
        const top = state.stack[state.stack.length - 1];

        return top?.source === "input";
    });


    useEffect(() => {
        followsMessageSheet.value = isMessageInputSheetOpen;

        if (!isMessageInputSheetOpen) {
            sheetHold.value = 0;
        }
    }, [isMessageInputSheetOpen, followsMessageSheet]);

    const spacerHeight = useDerivedValue(() => {
        const hold = followsMessageSheet.value
            ? sheetHold.value
            : 0;

        const keyboardOffset = Math.max(
            0,
            Math.abs(keyboardHeight.value)
        );

        // Only follow the bottom sheet opened by MessageInput.
        const rawSheetHeight = followsMessageSheet.value
            ? Math.max(
                0,
                screenHeight - bottomSheetPosition.value
            )
            : 0;

        const sheetHeight = followsMessageSheet.value
            ? bottomSheetFirstSnap.value > 0
                ? Math.min(
                    rawSheetHeight,
                    bottomSheetFirstSnap.value
                )
                : rawSheetHeight
            : 0;

        const previewHeight = hasPendingMedia
            ? MEDIA_PREVIEW_HEIGHT
            : hasPendingFile
                ? FILE_PREVIEW_HEIGHT
                : hasPendingLink
                    ? LINK_PREVIEW_HEIGHT
                    : 0;

        const obstruction = hold > 0
            ? hold
            : keyboardOffset > 10
                ? keyboardOffset
                : sheetHeight;

        return Math.max(
            0,
            Math.max(messageInputBottom.value, obstruction)
                + previewHeight
                - 10
        );
    });


    useAnimatedReaction(
        () => {
            const hold = sheetHold.value;
            if (hold <= 0) return false;
            return screenHeight - bottomSheetPosition.value >= hold;
        },
        (arrived) => {
            if (arrived) sheetHold.value = 0;
        },
        [screenHeight]
    );


    /*
    * The real FlatList uses this spacer.
    */
    const spacerStyle = useAnimatedStyle(
        () => ({
            height: spacerHeight.value,
        })
    );


    /*
    * The reply-chain messages are rendered
    * outside the FlatList, so compensate for
    * changes to the same spacer.
    */
    const replyChainStyle = useAnimatedStyle(() => {
        const topReserved = insets.top + headerHeight;
        const bottomReserved = spacerHeight.value;

        const maxChainHeight = Math.max(
            100,
            screenHeight - topReserved - bottomReserved
        );

        return {
            position: "absolute",
            left: 0,
            right: 0,
            bottom: bottomReserved,
            height: maxChainHeight,
            transform: [
                {
                    translateY: (1 - chainProgress.value) * 30,
                },
            ],
            opacity: chainProgress.value,
        };
    });


    const blurStyle = useAnimatedStyle(
        () => ({
            opacity:
                blurProgress.value,
        })
    );


    const scrollChainToBottom = useCallback(() => {
        if (!chainVisibleRef.current) return;
        requestAnimationFrame(() => {
            chainScrollRef.current?.scrollToEnd({ animated: false });
        });
    }, []);
    

    useAnimatedReaction(
        () => Math.round(spacerHeight.value),
        (current, previous) => {
            if (previous !== null && current !== previous) {
                runOnJS(scrollChainToBottom)();
            }
        },
        [scrollChainToBottom]
    );


    /**
    *  Chain
    * 
    */
    const chainShownRef = useRef(false);

    useEffect(() => {
        if (!chainVisible || !activeChainIds?.length) {
            chainShownRef.current = false;
            blurProgress.value = withTiming(0, { duration: 250 });
            chainProgress.value = withTiming(0, { duration: 250 }, (finished) => {
                if (finished) runOnJS(setChainRows)([]);
            });
            return;
        }

        if (!chainShownRef.current) chainProgress.value = 0;
        chainShownRef.current = true;

        const chainMessages = activeChainIds
            .map((id) => messagesById.get(id))
            .filter((m): m is Message => !!m)
            .map((m) => ({ id: m.id }));

        if (!chainMessages.length) return;

        setChainRows(chainMessages);

        blurProgress.value = withTiming(1, { duration: 250 });
        chainProgress.value = withTiming(1, {
            duration: 300,
            easing: Easing.out(Easing.cubic),
        });
    }, [chainVisible, replyingTo?.id, activeChainIds, messagesById]);


    useEffect(() => {
        if (replyingTo || selectedMessage || isSelecting) setLocalChainIds(null);
    }, [replyingTo?.id, selectedMessage, isSelecting]);
    

    useEffect(() => {
        if (chainVisible && lastReplyChainMessage?.sender_sub === senderSub) {
            seenIconProgress.value = 0;
            seenIconProgress.value = withSpring(1, { damping: 15, stiffness: 180, mass: 0.7 });
        } else {
            seenIconProgress.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });
        }
    }, [chainVisible, replyingTo?.id, lastReplyChainMessage?.id, senderSub]);


    return (
        <>
            {/* Message */}
            {messages.length > 0 && (
                <Animated.FlatList<Message[]>
                    ref={listRef}
                    style={{
                        zIndex: 2,
                    }}
                    contentContainerStyle={{
                        gap: 5,
                        paddingHorizontal: 10,
                        paddingTop: headerHeight + 10,
                        paddingBottom:
                            insets.top +
                            headerHeight +
                            10,
                    }}
                    ListHeaderComponent={
                        <View>
                            {hasLoadedConversation && isOtherUserTyping && (
                                <View style={{ alignSelf: "flex-start" }}>
                                    <MessageBubble
                                        isMe={false}
                                        backgroundColor={colors.secondaryCard}
                                        maxWidth={70}
                                    >
                                        <ThreeDotsIcon color={colors.text} size={22} />
                                    </MessageBubble>
                                </View>
                            )}
                            <Animated.View style={spacerStyle} />
                        </View>
                    }
                    data={messageGroups}
                    onEndReached={() => {
                        if (hasLoadedConversation && hasMoreMessages) {
                            loadOlderMessages();
                        }
                    }}
                    onEndReachedThreshold={0.3}
                    ListFooterComponent={
                        loadingOlderMessages ? (
                            <View style={{ paddingVertical: 12, alignItems: "center" }}>
                                <SpinningLogoImage size={20} />
                            </View>
                        ) : null
                    }
                    scrollEnabled={!selectedMessage && !isSelecting}
                    inverted
                    overScrollMode="never"
                    showsVerticalScrollIndicator
                    keyExtractor={(group) => String(group[0]?.id)}
                    extraData={listExtraData}
                    onScrollToIndexFailed={(info) => {
                        listRef.current?.scrollToOffset({
                            offset: info.averageItemLength * info.index,
                            animated: true,
                        });
                        setTimeout(() => {
                            listRef.current?.scrollToIndex({
                                index: info.index,
                                animated: true,
                                viewPosition: 0.5,
                            });
                        }, 150);
                    }}
                    renderItem={({ item: group, index }) => {

                        const msg = group[0];

                        if (!msg) {
                            return null;
                        }

                        const isMe =
                            msg.sender_sub === senderSub;

                        const nextGroup =
                            messageGroups[index + 1];

                        const nextMessage =
                            nextGroup?.[0];

                        const showDateLabel =
                            !nextMessage ||
                            !isSameDay(
                                msg.sent_at,
                                nextMessage.sent_at
                            );

                        const hiddenForChain = chainRows.some((r) => r.id === msg.id);

                        const isChainRoot = msg.reply_to_id == null;

                        const shaking = shake != null && group.some((m) => m.id === shake.id);

                        const canReply = msg.message_type !== "gif"

                        const replyCount = isChainRoot ? (() => {
                            const counted = new Set<number>();
                            const stack = group.map((g) => g.id); 

                            while (stack.length) {
                                const id = stack.pop()!;
                                for (const r of repliesByParentId.get(id) ?? []) {
                                    if (!counted.has(r.id)) {
                                        counted.add(r.id);
                                        stack.push(r.id); 
                                    }
                                }
                            }
                            return counted.size;
                        })() : 0;

                        const hasReplyLabel = isChainRoot && replyCount > 0;

                        const parentMessage = msg.reply_to_id != null ? messagesById.get(msg.reply_to_id) : undefined;

                        return (
                            <Animated.View
                                ref={(ref: View | null) => { messageRowRefs.current[msg.id] = ref; }}
                                style={hiddenForChain ? { opacity: 0 } : undefined}
                            >
                                
                                {isSelecting && (
                                    <View
                                        pointerEvents="box-none"
                                        style={{
                                            ...StyleSheet.absoluteFillObject,
                                        }}
                                    >
                                        <TouchableOpacity
                                            activeOpacity={1}
                                            style={
                                                StyleSheet.absoluteFillObject
                                            }
                                            onPress={
                                                onCancelSelection
                                            }
                                        />
                                    </View>
                                )}

                                {showDateLabel && (
                                    <View
                                        style={{
                                            alignItems: "center",
                                            paddingVertical: 10
                                        }}
                                    >
                                        <Text
                                            className={
                                                textStyles.small
                                            }
                                        >
                                            {formatTime(
                                                msg.sent_at,
                                                false
                                            )}
                                        </Text>
                                    </View>
                                )}

                                {parentMessage && (() => {
                                    const parentIsMe = parentMessage.sender_sub === senderSub;

                                    const label = isMe ? "You replied" : "Replied to you";

                                    return (
                                        <View
                                            style={{
                                                width: "100%",
                                                alignItems: isMe ? "flex-end" : "flex-start",
                                                marginBottom: 10,
                                                gap: 10,
                                            }}
                                        >
                                            <Text
                                                style={{
                                                    alignSelf: isMe ? "flex-end" : "flex-start",
                                                    color: colors.secondaryCard,
                                                    fontSize: 13,
                                                    fontWeight: "500",
                                                    paddingHorizontal: 5,
                                                }}
                                            >
                                                {label}
                                            </Text>

                                            <View
                                                style={{
                                                    flexDirection: isMe ? "row-reverse" : "row",
                                                    alignItems: "stretch",
                                                    gap: 8,
                                                    maxWidth: bubbleMaxWidth,
                                                    opacity: 0.55, 
                                                }}
                                            >
                                                <Pressable
                                                    onPress={() => scrollToMessage(parentMessage.id)}
                                                    hitSlop={8}
                                                    style={{
                                                        flexDirection: isMe ? "row-reverse" : "row",
                                                        alignItems: "stretch",
                                                        gap: 8,
                                                        maxWidth: bubbleMaxWidth,
                                                    }}
                                                >
                                                    <ReplyBar color={colors.text + "33"} />

                                                    <View 
                                                        pointerEvents="none" 
                                                        style={{ 
                                                            flexShrink: 1
                                                            }}
                                                    >
                                                        <MessageRenderer
                                                            msg={parentMessage}
                                                            isMe={parentIsMe}
                                                            colors={colors}
                                                            bubbleMaxWidth={bubbleMaxWidth - 12}
                                                            isSelecting={false}
                                                            onSelectMessage={() => {}}
                                                            onToggleChecked={() => {}}
                                                            onMessagePress={() => {}}
                                                            currentUserSub={senderSub}
                                                            otherUserName={otherUserName}
                                                            onReplyPreviewPress={() => {}}
                                                            reply
                                                        />

                                                    </View>

                                                </Pressable>

                                            </View>

                                        </View>
                                    );
                                })()}

                                <MessageShakeView
                                    active={shaking}
                                    nonce={shake?.nonce}
                                    style={{
                                        width: "100%",
                                        flexDirection: "row",
                                        justifyContent: isMe ? "flex-end" : "flex-start",
                                        alignItems: "center",
                                        gap: 10,
                                    }}
                                >
                                    {isSelecting && !isMe && (
                                        <CheckButton
                                            style={{
                                                width: 20,
                                                height: 20,
                                                borderRadius: 999,
                                                zIndex: 6,
                                                elevation: 6,
                                            }}
                                            value={checkedMessages.includes(
                                                msg.id
                                            )}
                                            onChange={() =>
                                                onToggleChecked(
                                                    msg.id
                                                )
                                            }
                                        />
                                    )}

                                    <Swipeable
                                        ref={(ref) => {
                                            swipeableRefs.current[msg.id] = ref;
                                        }}
                                        // Other person's message: swipe left.
                                        renderLeftActions={
                                            !isMe
                                                ? renderReplyAction("left")
                                                : undefined
                                        }
                                        // Your message: swipe right.
                                        renderRightActions={
                                            isMe
                                                ? renderReplyAction("right")
                                                : undefined
                                        }
                                        leftThreshold={40}
                                        rightThreshold={40}
                                        overshootLeft={false}
                                        overshootRight={false}
                                        friction={2}
                                        enabled={!isSelecting && canReply}
                                        onSwipeableWillOpen={() => {
                                            onReplyMessage(msg);
                                            swipeableRefs.current[msg.id]?.close();
                                        }}
                                        containerStyle={{
                                            width: bubbleMaxWidth,
                                            overflow: "visible",
                                            flexDirection: "row",
                                            justifyContent: isMe ? "flex-end" : "flex-start",
                                        }}
                                    >
                                        <View
                                            ref={(ref) => {
                                                bubbleRefs.current[msg.id] = ref;
                                            }}
                                            style={{
                                                maxWidth: bubbleMaxWidth,
                                            }}
                                            collapsable={false}
                                        >
                                            <View collapsable={false}>
                                                <Pressable
                                                    onPress={() => handleMessageTap(msg, !hasReplyLabel)}
                                                    onLongPress={() => { onSelectMessage(msg); }}
                                                    delayLongPress={350}
                                                >
                                                    <MessageRenderer
                                                        msg={msg}
                                                        group={group}
                                                        isMe={isMe}
                                                        colors={colors}
                                                        bubbleMaxWidth={bubbleMaxWidth}
                                                        isSelecting={isSelecting}
                                                        onSelectMessage={onSelectMessage}
                                                        onToggleChecked={onToggleChecked}
                                                        onMessagePress={onMessagePress}
                                                        currentUserSub={senderSub}
                                                        otherUserName={otherUserName}
                                                        onReplyPreviewPress={() => {}}
                                                        reply={false}
                                                    />
                                                </Pressable>
                                            </View>

                                            {hasReplyLabel && (
                                                <Button
                                                    onPress={() => openChain(msg)}
                                                    hitSlop={8}
                                                    style={{
                                                        alignSelf: isMe ? "flex-end" : "flex-start",
                                                        paddingHorizontal: 5,
                                                        paddingTop: 5,
                                                    }}
                                                >
                                                    <Text
                                                        style={{
                                                            color: colors.button,
                                                            fontSize: replyCount === 1 ? 13 : 12,
                                                            fontWeight: "400",
                                                        }}
                                                    >
                                                        {replyCount === 1 ? "1 Reply" : `${replyCount} Replies`}
                                                    </Text>
                                                </Button>
                                            )}

                                            <View
                                                style={{
                                                    flexDirection: "row",
                                                    justifyContent: isMe
                                                        ? "flex-end"
                                                        : "flex-start",
                                                    marginTop: 1,
                                                    gap: 5,
                                                    paddingHorizontal: 5,
                                                }}
                                            >
                                                {isMe && latestSentId === msg.id && (
                                                    <SeenIcon
                                                        size={20}
                                                        color={
                                                            msg.is_read
                                                                ? colors.button
                                                                : colors.text
                                                        }
                                                    />
                                                )}
                                            </View>

                                        </View>

                                    </Swipeable>
                                    
                                    {isSelecting && isMe && (
                                        <CheckButton
                                            style={{
                                                width: 20,
                                                height: 20,
                                                borderRadius: 999,
                                                zIndex: 6,
                                                elevation: 6,
                                            }}
                                            value={checkedMessages.includes(
                                                msg.id
                                            )}
                                            onChange={() =>
                                                onToggleChecked(
                                                    msg.id
                                                )
                                            }
                                        />
                                    )}
                                </MessageShakeView>
                                
                            </Animated.View>
                        );
                    }}
                />
            )}


            {/* Chain Reply */}
            {chainVisible && (
                <View
                    ref={overlayRef}
                    style={[StyleSheet.absoluteFill, { zIndex: 5 }]}
                    collapsable={false}
                >
                    <Animated.View
                        style={[StyleSheet.absoluteFill, { zIndex: 3 }, blurStyle]}
                    >
                        <BlurView
                            intensity={30}
                            tint={dark ? "dark" : "light"}
                            style={StyleSheet.absoluteFill}
                        />
                    </Animated.View>

                    <Animated.View
                        pointerEvents="box-none"
                        style={[
                            {
                                zIndex: 4,
                                overflow: "hidden",
                                padding: 1,
                            },
                            replyChainStyle,
                        ]}
                    >
                        <Pressable
                            style={{
                                flex: 1,
                                justifyContent: "flex-end"
                            }}
                            onPress={closeChain}
                        >

                            <ScrollView
                                ref={chainScrollRef}
                                showsVerticalScrollIndicator
                                nestedScrollEnabled
                                bounces={false}
                                style={{
                                    flexGrow: 0
                                }}
                            >

                                <TouchableOpacity
                                    activeOpacity={1}
                                    style={{
                                        flex: 1,
                                        gap: 5,
                                        paddingBottom: 80,
                                        justifyContent: "flex-end",
                                    }}
                                    onPress={closeChain}
                                >

                                    {chainRows.map((row, idx) => {
                                        const group = messageGroups.find((g) => g[0]?.id === row.id);
                                        const msg = group?.[0];
                                        if (!msg || !group) return null;

                                        const isMe = msg.sender_sub === senderSub;

                                        const prevMsg = idx > 0
                                            ? messageGroups.find((g) => g[0]?.id === chainRows[idx - 1].id)?.[0]
                                            : null;

                                        const showDateLabel =
                                            !prevMsg || !isSameDay(prevMsg.sent_at, msg.sent_at);

                                        return (
                                            <View
                                                key={row.id}
                                                onLayout={(e) => {
                                                    chainRowHeights.current[row.id] =
                                                        e.nativeEvent.layout.height;
                                                }}
                                                style={{ paddingHorizontal: 10 }}
                                            >
                                                {showDateLabel && (
                                                    <View style={{ alignItems: "center", paddingBottom: 10 }}>
                                                        <Text className={textStyles.small}>
                                                            {formatTime(msg.sent_at, false)}
                                                        </Text>
                                                    </View>
                                                )}

                                                <View
                                                    onStartShouldSetResponder={() => true}
                                                    onResponderTerminationRequest={() => false}
                                                    style={{
                                                        flexDirection: "row",
                                                        alignSelf: isMe ? "flex-end" : "flex-start",
                                                    }}
                                                >
                                                    <View 
                                                        style={{ 
                                                            maxWidth: bubbleMaxWidth 
                                                        }}
                                                    >

                                                        <MessageRenderer
                                                            msg={msg}
                                                            group={group}
                                                            isMe={isMe}
                                                            colors={colors}
                                                            bubbleMaxWidth={bubbleMaxWidth}
                                                            isSelecting={false}
                                                            onSelectMessage={() => {}}
                                                            onToggleChecked={() => {}}
                                                            onMessagePress={() => {}}
                                                            currentUserSub={senderSub}
                                                            otherUserName={otherUserName}
                                                            onReplyPreviewPress={() => {}}
                                                        />

                                                        <View
                                                            style={{
                                                                flexDirection: "row",
                                                                justifyContent: isMe ? "flex-end" : "flex-start",
                                                                marginTop: 1,
                                                                gap: 5,
                                                                paddingHorizontal: 5,
                                                            }}
                                                        >
                                                            {isMe && lastReplyChainMessage?.id === msg.id && (
                                                                <Animated.View style={seenIconStyle}>
                                                                    <SeenIcon
                                                                        size={20}
                                                                        color={
                                                                            lastReplyChainMessage.is_read
                                                                                ? colors.button
                                                                                : colors.text
                                                                        }
                                                                    />
                                                                </Animated.View>
                                                            )}
                                                        </View>

                                                    </View>

                                                </View>
                                            </View>
                                        );
                                    })}

                                </TouchableOpacity>
    
                            </ScrollView>

                        </Pressable>

                    </Animated.View>

                </View>
            )}

        </>
    );
};

