import { Button, CheckButton } from "@/components/ButtonComponent";
import { StyleSheet, View, Text, Platform, FlatList, Touchable, TouchableOpacity, Modal, Pressable, Dimensions, Image, GestureResponderEvent, Keyboard, InteractionManager } from "react-native";
import { BackIcon, CopyIcon, MoreIcon, ReportIcon, SeenIcon, ThreeDotsIcon, XIcon, DeleteIcon } from "@/icons/Icon";
import { useTheme } from "@/provider/ThemeProvider";
import { useMessage } from "@/stores/useMessage";
import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/InputComponent";
import { SpinningLogoImage } from "@/utils/Logo";
import { Message } from "@/types/messages.types";
import { formatTime, isSameDay } from "@/utils/time";
import Animated, { useAnimatedKeyboard, useAnimatedReaction, useAnimatedStyle } from "react-native-reanimated";
import { useReport } from "@/stores/useReport";
import { LinkPreview } from '@flyerhq/react-native-link-preview';
import { useMessageReadListener, useNewMessageListener, useTypingListener } from "@/api/messages.socket";
import { emitTypingStart, emitTypingStop } from "@/api/messages.api";
import Svg, { Path } from "react-native-svg";
import { GradientHeader } from "@/components/GradientComponent";
import { BlurView } from "expo-blur";
import * as Clipboard from "expo-clipboard";
import { KeyboardAwareScrollView, useReanimatedKeyboardAnimation } from "react-native-keyboard-controller";
import GomealGlassView from "@/components/GlassComponent";
import { useKeyboardHeight } from "@/components/keyboardComponent";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { dismissConversationNotifications } from "@/notifications/pushNotification";

const MessageBubble = ({
    children,
    isMe,
    backgroundColor,
    maxWidth,
}: {
    children: React.ReactNode;
    isMe: boolean;
    backgroundColor: string;
    maxWidth: number;
}) => {
    return (
        <View style={{ alignSelf: isMe ? "flex-end" : "flex-start" }}>
            <View
                style={{
                    backgroundColor,
                    borderRadius: 20,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    maxWidth,
                }}
            >
                {children}
            </View>
            <Svg
                width={17}
                height={14}
                viewBox="0 0 22 18"
                style={{
                    position: "absolute",
                    bottom: -2,
                    ...(isMe ? { right: -4 } : { left: -4 }),
                }}
            >
                {isMe ? (
                    <Path
                        d="M0 0 C3 3 6 6 9 9 C12 12 15 14 19 16 C13 16 5 14 0 9 Z"
                        fill={backgroundColor}
                    />
                ) : (
                    <Path
                        d="M22 0 C19 3 16 6 13 9 C10 12 7 14 3 16 C9 16 17 14 22 9 Z"
                        fill={backgroundColor}
                    />
                )}
            </Svg>
        </View>
    );
};

const MessageScreen: React.FC<{
    post_id?: number;
    showBack?: boolean;
    showX?: boolean;
    conversation_id?: number;
    receiver_sub?: string;
    onClose?: () => void;
    dark?: boolean;
    inBottomSheet?: boolean;
}> = ({ post_id, showBack = true, showX = false, conversation_id, receiver_sub, onClose, dark, inBottomSheet = true }) => {

    const { colors, textStyles } = useTheme(dark ? "dark" : undefined);
    const { reportTarget, loadingReport } = useReport();
    const {
        sendMessage,
        markAsRead,
        sendingMessage,
        removeMessage,
        conversations,
        loadConversation,
        loadingConversation,
        deleteMessage,
    } = useMessage(); 

    const [text, setText] = useState("");
    const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

    const rootRef = useRef<View>(null);
    const [containerOffset, setContainerOffset] = useState({ x: 0, y: 0 });
    const [bubbleRect, setBubbleRect] = useState({ x: 0, y: 0, width: 0, height: 0 });
    const [menuSize, setMenuSize] = useState({ width: 0, height: 0 });

    const bubbleRefs = useRef<Record<number, View | null>>({});
    const bubbleMaxWidth = Dimensions.get("window").width * 0.65;

    const hasTypedMessage = text.trim().length > 0;
    const [hasLoadedConversation, setHasLoadedConversation] = useState(false);

    const [checkedMessages, setCheckedMessages] = useState<number[]>([]);
    const [isSelecting, setIsSelecting] = useState(false);

    const toggleChecked = (messageId: number) => {
        setCheckedMessages(prev =>
            prev.includes(messageId)
                ? prev.filter(id => id !== messageId)
                : [...prev, messageId]
        );
    };

    const { height } = useReanimatedKeyboardAnimation();
    const { keyboardHeight, isKeyboardVisible } = useKeyboardHeight((_, visible) => {
        if (visible) {
            rootRef.current?.measureInWindow((x, y, w, h) => {
                const gap = Dimensions.get("window").height - (y + h);
                setBottomGap(Math.max(0, gap));
            });
        }
    });

    const [bottomGap, setBottomGap] = useState(0);
    const kbAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: Math.min(0, height.value + bottomGap) }],
    }));

    const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const activeConversationId = conversations?.conversation.id ?? null;
    const isOtherUserTyping = useMessage((s) =>
        activeConversationId ? s.typingUsers[activeConversationId] : false
    );

    useTypingListener(activeConversationId);
    useMessageReadListener(activeConversationId);
    useNewMessageListener(activeConversationId);

    // ---- buttons(delete_msg etc) ------------------
    const handleDeleteMessages = async () => {
        if (!conversations?.conversation.id || checkedMessages.length === 0) return;

        const conversation_id = conversations.conversation.id;

        const idsToDelete = [...checkedMessages];

        // optimistic UI (instant remove)
        idsToDelete.forEach((id) => {
            removeMessage(id);
        });

        setCheckedMessages([]);
        setIsSelecting(false);
        setSelectedMessage(null)

        // backend calls (can be parallel)
        await Promise.all(
            idsToDelete.map((id) =>
                deleteMessage(id, conversation_id)
            )
        );
    };

    // -- menu omni-direction --------------------
    const screen = Dimensions.get("window");
    const EDGE_PADDING = 40;
    const MENU_GAP = 10;
    const PREFER_ABOVE_BIAS = 40;
    const KEYBOARD_TOP_CLEARANCE = inBottomSheet ? -70 : 70;

    const bubbleTopRel = bubbleRect.y - containerOffset.y;
    const bubbleBottomRel = bubbleTopRel + bubbleRect.height;
    const bubbleCenterXRel = bubbleRect.x - containerOffset.x + bubbleRect.width / 2;

    const spaceAbove = bubbleTopRel;
    const spaceBelow = screen.height - containerOffset.y - bubbleBottomRel;

    const showBelow = spaceBelow > spaceAbove + PREFER_ABOVE_BIAS;

    const menuTopRaw = showBelow
        ? bubbleBottomRel + MENU_GAP
        : bubbleTopRel - menuSize.height - MENU_GAP;

    const menuTop = Math.max(
        EDGE_PADDING,
        Math.min(menuTopRaw, screen.height - containerOffset.y - menuSize.height - EDGE_PADDING)
    );

    const menuLeft = Math.max(
        EDGE_PADDING,
        Math.min(
            bubbleCenterXRel - menuSize.width / 2,
            screen.width - menuSize.width - EDGE_PADDING
        )
    );

    // -- Link --------------------
    const isLink = (content: string): boolean => {
        return /https?:\/\/[^\s]+/.test(content);
    };

    useEffect(() => {
        let cancelled = false;

        const init = async () => {
            setHasLoadedConversation(false);
            setSelectedMessage(null);

            const data = await loadConversation(
                post_id,
                conversation_id,
                receiver_sub
            );

            if (cancelled) return;

            if (data?.conversation?.id) {
                const id = data.conversation.id;

                await Promise.all([
                    markAsRead(id),
                    dismissConversationNotifications(id),
                ]);
            }

            setHasLoadedConversation(true);
        };

        init();

        return () => {
            cancelled = true;
        };
    }, [post_id, conversation_id, receiver_sub]);

    useEffect(() => {
        const measureGap = () => {
            rootRef.current?.measureInWindow((x, y, w, h) => {
                const gap = Dimensions.get("window").height - (y + h);
                setBottomGap(Math.max(0, gap));
            });
        };

        // Primary measurement: settle bottomGap once mount + any entrance animation
        // (bottom sheet open, etc.) finishes — works identically whether embedded
        // in a sheet (bottomGap > 0) or full-screen (bottomGap ≈ 0)
        const interactionHandle = InteractionManager.runAfterInteractions(measureGap);

        return () => {
            interactionHandle.cancel();
        };
    }, []);

    
    return (
        <View
            ref={rootRef}
            style={{ flex: 1, backgroundColor: colors.background }}
            onLayout={() => {
                rootRef.current?.measureInWindow((x, y) => {
                    setContainerOffset({ x, y });
                });
            }}
        >

            {selectedMessage && !isSelecting && (
                <Pressable
                    style={{
                        ...StyleSheet.absoluteFillObject,
                        zIndex: 5,
                    }}
                    onPress={() => setSelectedMessage(null)}
                >
                    <BlurView
                        intensity={7}
                        tint={dark ? "dark" : "light"}
                        style={StyleSheet.absoluteFill}
                    />
                </Pressable>
            )}

            {menuSize.width === 0 && !isSelecting &&  (
                <View
                    onLayout={(e) => {
                        const { width, height } = e.nativeEvent.layout;
                        setMenuSize({ width, height });
                    }}
                    style={{
                        position: "absolute",
                        left: -9999,
                        top: -9999,
                        opacity: 0,
                    }}
                    pointerEvents="none"
                >
                    <GomealGlassView
                        glassEffectStyle="clear"
                        style={{
                            borderRadius: 14,
                            overflow: "hidden",
                            minWidth: 150,
                            paddingHorizontal: 5
                        }}
                    >
                        <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
                            <Text style={{ fontSize: 16 }}>More</Text>
                        </View>
                        <View style={{ height: 1 }} />
                        <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
                            <Text style={{ fontSize: 16 }}>Copy</Text>
                        </View>
                        <View style={{ height: 1 }} />
                        <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
                            <Text style={{ fontSize: 16 }}>Report</Text>
                        </View>
                    </GomealGlassView>
                </View>
            )}

            {selectedMessage && !isSelecting &&  (
                <View
                    style={{
                        position: "absolute",
                        left: menuLeft,
                        top: menuTop,
                        zIndex: 10,
                    }}
                >
                    <GomealGlassView
                        glassEffectStyle="clear"
                        style={{
                            borderRadius: 20,
                            overflow: "hidden",
                            minWidth: 150,
                            padding: 5,
                            gap: 5
                        }}
                    >
                        <Button
                            onPress={() => {
                                setIsSelecting(true);
                                setCheckedMessages([]);
                            }}
                            style={{
                                height: 40,
                                width: "auto",
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "space-between",
                                paddingHorizontal: 16,
                                paddingVertical: 0,
                                backgroundColor: colors.background
                            }}
                        >
                            <Text style={{ color: colors.text, fontSize: 16 }}>More</Text>
                            <MoreIcon color={colors.text} size={18} />
                        </Button>
                        
                        <Button
                            onPress={() => {
                                Clipboard.setString(selectedMessage.content);
                                setSelectedMessage(null);
                            }}
                            style={{
                                height: 40,
                                width: "auto",
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "space-between",
                                paddingHorizontal: 16,
                                paddingVertical: 0,
                                backgroundColor: colors.background
                            }}
                        >
                            <Text style={{ color: colors.text, fontSize: 16 }}>Copy</Text>
                            <CopyIcon color={colors.text} size={18} />
                        </Button>

                        <Button
                            onPress={() => {
                                const messageId = selectedMessage.id;
                                reportTarget(messageId, "message");
                                setSelectedMessage(null);
                            }}
                            style={{
                                height: 40,
                                width: "auto",
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "space-between",
                                paddingHorizontal: 16,
                                paddingVertical: 0,
                            }}
                        >
                            <Text style={{ color: colors.danger, fontSize: 16 }}>Report</Text>
                            <ReportIcon color={colors.danger} size={18} />
                        </Button>

                    </GomealGlassView>
                </View>
            )}

            {selectedMessage && !isSelecting &&  (
                <View
                    pointerEvents="none"
                    style={{
                        position: "absolute",
                        left: bubbleRect.x - containerOffset.x,
                        top: bubbleRect.y - containerOffset.y,
                        zIndex: 60,
                    }}
                >
                    <MessageBubble
                        isMe={selectedMessage.sender_sub === conversations?.sender_sub}
                        backgroundColor={
                            selectedMessage.sender_sub === conversations?.sender_sub
                                ? colors.button
                                : colors.card
                        }
                        maxWidth={bubbleRect.width}
                    >
                        <Text style={{ color: colors.text }}>{selectedMessage.content}</Text>
                    </MessageBubble>
                </View>
            )}

            {isSelecting && (
                <View
                    style={{
                        position: "absolute",
                        top: 15,
                        right: 15,
                        zIndex: 11,
                        flexDirection: "row",
                        alignItems: "flex-end",
                        gap: 2
                    }}
                >
                    <Button
                        onPress={handleDeleteMessages}
                        disabled={!(checkedMessages.length >= 1)}
                        clearBackground
                    >
                        <DeleteIcon color={colors.danger} />
                    </Button>
                    <Text
                        style={{

                        }}
                        className={textStyles.small}
                    >
                        {checkedMessages.length} msg
                    </Text>

                </View>
            )}

            <View 
                style={{ flex: 1 }} 
                className="w-full" 
            >

                {!conversations || !conversations?.messages.length ? (
                    <View className="flex-1 items-center justify-center">
                        <Text className={textStyles.caption}>No messages yet</Text>
                    </View>
                ) : (
                    <FlatList
                        style={{ zIndex: 2 }}
                        contentContainerStyle={{ gap: 5, paddingHorizontal: 10, paddingTop: isKeyboardVisible ? keyboardHeight + KEYBOARD_TOP_CLEARANCE : 70, paddingBottom: 25 }}
                        data={[...conversations.messages].reverse()}
                        inverted
                        overScrollMode="never"
                        showsVerticalScrollIndicator={false} 
                        keyExtractor={(msg: Message) => String(msg.id)}
                        renderItem={({ item: msg, index }: { item: Message; index: number}) => {

                            const isMe = msg.sender_sub === conversations?.sender_sub;
                        
                            const is_first_msg = [...conversations.messages].reverse();
                            const showDateLabel = !is_first_msg[index + 1] || !isSameDay(msg.sent_at, is_first_msg[index + 1].sent_at);

                            const toggleSelectedMessage = () => {
                                const ref = bubbleRefs.current[msg.id];
                                if (!ref || !rootRef.current) return;

                                // Measure the container fresh, at the same moment as the bubble — don't
                                // rely on the `onLayout` containerOffset capture, since that can run
                                // while a parent BottomSheet (e.g. from NotificationScreen) is still
                                // mid-animation into its final position, leaving `containerOffset` stale
                                // for the rest of the screen's lifetime.
                                rootRef.current.measureInWindow((rootX, rootY) => {
                                    ref.measureInWindow((x, y, width, height) => {
                                        setContainerOffset({ x: rootX, y: rootY });
                                        setBubbleRect({ x, y, width, height });
                                        setSelectedMessage(msg);
                                    });
                                });
                            };

                            return (
                                <TouchableOpacity
                                    activeOpacity={1}
                                    onPress={() => {
                                        if (selectedMessage && selectedMessage.id !== msg.id) {
                                            setSelectedMessage(null);
                                        }
                                    }}
                                    onLongPress={toggleSelectedMessage}
                                >
                                    {isSelecting && (
                                        <View
                                            pointerEvents="box-none"
                                            style={{
                                                ...StyleSheet.absoluteFillObject,
                                            }}
                                        >

                                            <Pressable
                                                style={StyleSheet.absoluteFillObject}
                                                onPress={() => {
                                                    setIsSelecting(false);
                                                    setCheckedMessages([]);
                                                }}
                                            />
                                        </View>
                                    )}

                                    {showDateLabel && (
                                        <View style={{ alignItems: "center", marginVertical: 8 }}>
                                            <Text className={textStyles.caption}>
                                                {formatTime(msg.sent_at, false)}
                                            </Text>
                                        </View>
                                    )}

                                    <View
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
                                                    elevation: 6
                                                }}
                                                value={checkedMessages.includes(msg.id)}
                                                onChange={() => toggleChecked(msg.id)}
                                            />
                                        )}

                                        <View
                                            ref={(ref) => {
                                                bubbleRefs.current[msg.id] = ref;
                                            }}
                                            style={{
                                                maxWidth: bubbleMaxWidth,
                                            }}
                                        >
                                            {/* message bubble */}
                                            <MessageBubble
                                                isMe={isMe}
                                                backgroundColor={isMe ? colors.button : colors.card}
                                                maxWidth={bubbleMaxWidth}
                                            >
                                                {isLink(msg.content) ? (  
                                                    <LinkPreview
                                                        text={msg.content}
                                                        enableAnimation
                                                        renderLinkPreview={({ previewData }) => (
                                                            <View
                                                                style={{
                                                                    width: "100%",
                                                                    backgroundColor: isMe ? colors.button : colors.card,
                                                                    borderRadius: 12,
                                                                    overflow: "hidden",
                                                                    padding: 10,
                                                                    gap: 5,
                                                                }}
                                                            >
                                                                {!!previewData?.image?.url && (
                                                                    <Image
                                                                        source={{ uri: previewData.image.url }}
                                                                        style={{
                                                                            width: "100%",
                                                                            height: 150,
                                                                            backgroundColor: colors.background,
                                                                            borderRadius: 10,
                                                                        }}
                                                                        resizeMode="cover"
                                                                    />
                                                                )}

                                                                {!!previewData?.title && (
                                                                    <Text className={textStyles.h3} style={{ color: colors.text, fontWeight: "600" }}>
                                                                        {previewData.title}
                                                                    </Text>
                                                                )}

                                                                {!!previewData?.description && (
                                                                    <Text  style={{ color: colors.text, opacity: 0.75, marginTop: 4 }}>
                                                                        {previewData.description}
                                                                    </Text>
                                                                )}

                                                                {!!previewData?.link && (
                                                                    <Text style={{ color: colors.text, opacity: 0.55, marginTop: 6 }}>
                                                                        {previewData.link}
                                                                    </Text>
                                                                )}
                                                            </View>
                                                        )}
                                                    />
                                                ) : (
                                                    <Text style={{ color: colors.text }}>{msg.content}</Text>
                                                )}
                                            </MessageBubble>

                                            {/* icon row */}
                                            <View
                                                style={{
                                                    flexDirection: "row",
                                                    justifyContent: isMe ? "flex-end" : "flex-start",
                                                    marginTop: 1,
                                                    gap: 5,
                                                    paddingHorizontal: 5,
                                                }}
                                            >
                                                {isMe && (
                                                    msg.is_read
                                                        ? <SeenIcon size={16} color={colors.button} />
                                                        : <SeenIcon size={16} color={colors.text} />
                                                )}
                                            </View>
                                            
                                        </View>

                                        {isSelecting && isMe && (
                                            <CheckButton
                                                style={{
                                                    width: 20,
                                                    height: 20,
                                                    borderRadius: 999,
                                                    zIndex: 6,
                                                    elevation: 6                                                    
                                                }}
                                                value={checkedMessages.includes(msg.id)}
                                                onChange={() => toggleChecked(msg.id)}
                                            />
                                        )}

                                    </View>

                                </TouchableOpacity>
                            );

                        }}
                    />
                )}

                {hasLoadedConversation && isOtherUserTyping && (
                    <View style={{ paddingHorizontal: 10, marginBottom: 5 }}>
                        <MessageBubble
                            isMe={false}
                            backgroundColor={colors.card}
                            maxWidth={70}
                        >
                            <ThreeDotsIcon color={colors.text} size={22} />
                        </MessageBubble>
                    </View>
                )}

            </View>

            {!isSelecting && (
                <Animated.View
                    style={[
                        { position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 3, backgroundColor: "red" },
                        kbAnimatedStyle,
                    ]}
                >
                    <GradientHeader
                        baseColor={colors.background}
                        direction="bottom"
                        contentStyle={{
                            padding: 10,
                            height: 60,
                            flexDirection: "row",
                            alignItems: "center",
                            backgroundColor: isKeyboardVisible ? colors.background : undefined,
                            paddingBottom: isKeyboardVisible ? undefined : 40,
                            borderTopLeftRadius: 30,
                            borderTopRightRadius: 30,
                            shadowColor: colors.text,
                            shadowOffset: {
                                width: 0,
                                height: -4,
                            },
                            shadowOpacity: 0.1,
                            shadowRadius: 12,
                            elevation: 10,
                            gap: 8,
                            justifyContent: "center"
                        }}
                    >
                        <View style={{ flex: 1, minWidth: 0 }}>
                            <Input
                                multiline={false}
                                value={text}
                                disabled={sendingMessage}
                                placeholder="Message.."
                                onChangeText={(value) => {
                                    setText(value);
                                    if (!activeConversationId) return;

                                    emitTypingStart(activeConversationId);

                                    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
                                    typingTimerRef.current = setTimeout(() => {
                                        emitTypingStop(activeConversationId!);
                                    }, 5000);
                                }}
                                dark={dark}
                                containerStyle={{ width: "100%", borderRadius: 30, backgroundColor: colors.card}}
                            />
                        </View>

                        {hasTypedMessage && (
                            <Button
                                style={{
                                    width: 50,
                                    padding: 0,
                                    borderRadius: 20,
                                    alignItems: "center",
                                    justifyContent: "center",
                                    opacity: sendingMessage ? 0.5 : 1
                                }}
                                disabled={sendingMessage}
                                background
                                onPress={async () => {
                                    const messageText = text.trim();

                                    if (!conversations?.conversation.id || !messageText) return;

                                    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);

                                    emitTypingStop(activeConversationId!);
                                    setText("");

                                    await sendMessage(conversations.conversation.id, messageText);
                                }}
                            >
                                <BackIcon rotate={90} color={colors.text} size={23} />
                            </Button>
                        )}
                    </GradientHeader>

                </Animated.View>
            )}

            <GradientHeader
                baseColor={colors.background}
                height={50}
            >
                {showBack && (
                    <View
                        pointerEvents="box-none"
                        style={{
                            ...StyleSheet.absoluteFillObject,
                            top: 15,
                            left: 15,
                            zIndex: 5,
                            elevation: 5,
                        }}
                    >
                        <Button
                            clearBackground
                            onPress={onClose}
                        >
                            <BackIcon color={colors.text} />
                        </Button>
                    </View>
                )}

                {showX && (
                    <View
                        pointerEvents="box-none"
                        style={{
                            ...StyleSheet.absoluteFillObject,
                            left: 15,
                            top: 15,
                            zIndex: 5,
                            elevation: 5,
                        }}
                    >
                        <Button
                            clearBackground
                            onPress={onClose}
                        >
                            <XIcon color={colors.danger} />
                        </Button>
                    </View>
                )}
            </GradientHeader>

        </View>  
    )
};

export default MessageScreen;