import { Button } from "@/components/ButtonComponent";
import { StyleSheet, View, Text, KeyboardAvoidingView, Platform, FlatList, Touchable, TouchableOpacity, Modal, Pressable, Dimensions, Image } from "react-native";
import { BackIcon, SeenIcon, ThreeDotsIcon } from "@/icons/Icon";
import { useTheme } from "@/provider/ThemeProvider";
import { useMessage } from "@/stores/useMessage";
import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/InputComponent";
import { SpinningLogoImage } from "@/utils/Logo";
import { Message } from "@/types/messages.types";
import { formatTime, isSameDay } from "@/utils/time";
import Animated, { useAnimatedKeyboard, useAnimatedStyle } from "react-native-reanimated";
import { useReport } from "@/stores/useReport";
import { LinkPreview } from '@flyerhq/react-native-link-preview';
import { useMessageReadListener, useNewMessageListener, useTypingListener } from "@/api/messages.socket";
import { emitTypingStart, emitTypingStop } from "@/api/messages.api";
import Svg, { Path } from "react-native-svg";

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
const MessageScreen: React.FC<{post_id?: number; conversation_id?: number; receiver_sub?: string; onClose?: () => void}> = ({ post_id, conversation_id, receiver_sub, onClose}) => {
    
    const { colors, textStyles } = useTheme();
    const { reportTarget, loadingReport } = useReport();

    const [text, setText] = useState("");
    const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
    const bubbleMaxWidth = Dimensions.get("window").width * 0.65;
    const { sendMessage, markAsRead, sendingMessage, removeMessage, conversations, loadConversation, loadingConversation } = useMessage();

    const hasTypedMessage = text.trim().length > 0;
    const [hasLoadedConversation, setHasLoadedConversation] = useState(false);

    const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const activeConversationId = conversations?.conversation.id ?? null;
    const isOtherUserTyping = useMessage((s) =>
        activeConversationId ? s.typingUsers[activeConversationId] : false
    );

    useTypingListener(activeConversationId);
    useMessageReadListener(activeConversationId);
    useNewMessageListener(activeConversationId);

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
                await markAsRead(data.conversation.id);
            }

            setHasLoadedConversation(true);
        };

        init();

        return () => {
            cancelled = true;
        };
    }, [post_id, conversation_id, receiver_sub]);

    //console.log(conversations?.messages);

    return (
        <View style={{...StyleSheet.absoluteFillObject, backgroundColor: colors.background}}>

            {selectedMessage && (
                <Pressable
                    onPress={() => setSelectedMessage(null)}
                    style={{
                        ...StyleSheet.absoluteFillObject,
                        zIndex: 1,
                    }}
                />
            )}

            <View
                style={{
                    height: 70,
                    paddingHorizontal: 15,
                    flexDirection: "row"
                }}
                className="items-center"
            >
                <Button onPress={onClose} background>
                    <BackIcon color={colors.background} />
                </Button>

                <Text
                    style={{ position: "absolute", left: 0, right: 0, textAlign: "center" }}
                    pointerEvents="none"
                    className={textStyles.h3}
                >
                    Messages
                </Text>
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={215}
            >
    
                <View style={{ flex: 1 }} className="w-full">

                    {(loadingConversation || !hasLoadedConversation) ? (
                        <View className="flex-1 items-center justify-center">
                            <SpinningLogoImage size={30} />
                        </View>
                    ) : !conversations || !conversations?.messages.length ? (
                        <View className="flex-1 items-center justify-center">
                            <Text className={textStyles.caption}>No messages yet</Text>
                        </View>
                    ) : (
                        <FlatList
                            style={{ zIndex: 2 }}
                            contentContainerStyle={{ paddingHorizontal: 10, paddingVertical: 5}}
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
                                    setSelectedMessage((current) =>
                                        current?.id === msg.id ? null : msg
                                    );
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
                                        {showDateLabel && (
                                            <View style={{ alignItems: "center", marginVertical: 8 }}>
                                                <Text className={textStyles.caption}>
                                                    {formatTime(msg.sent_at, false)}
                                                </Text>
                                            </View>
                                        )}

                                        <Button
                                            style={{
                                                alignSelf: isMe ? "flex-end" : "flex-start",
                                                borderRadius: 0,
                                                padding: 0,
                                                height: "auto",
                                                marginBottom: 5,
                                                maxWidth: bubbleMaxWidth,
                                                alignItems: "stretch",
                                                backgroundColor: "transparent",
                                            }}
                                        >

                                            <View
                                                style={{
                                                    alignSelf: isMe ? "flex-end" : "flex-start",
                                                    maxWidth: bubbleMaxWidth,
                                                    alignItems: isMe ? "flex-end" : "flex-start",
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
                                                            touchableWithoutFeedbackProps={{
                                                                onLongPress: toggleSelectedMessage,
                                                                delayLongPress: 250,
                                                            }}
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
                                                    {(msg.is_read) ? (
                                                        <SeenIcon size={16} color={colors.button} />
                                                    ) : (
                                                        <SeenIcon size={16} color={colors.text} />
                                                    )}
                                                </View>

                                                {selectedMessage?.id === msg.id && (
                                                    <View
                                                        style={{ 
                                                            height: 30,
                                                            width: 60,
                                                            alignSelf: "flex-end",
                                                            justifyContent: "flex-end",
                                                            alignItems: "flex-end"
                                                        }}
                                                    >
                                                        <Button
                                                            style={{
                                                                height: 30,
                                                                width: 60,
                                                                backgroundColor: colors.danger,
                                                            }}
                                                            disabled={loadingReport}
                                                            onPress={async () => {
                                                                try {
                                                                    await reportTarget(msg.id, "message");
                                                                    removeMessage(msg.id);
                                                                    setSelectedMessage(null);
                                                                } catch (err) {
                                                                    console.error("Could not report message:", err);
                                                                }
                                                            }}
                                                            background
                                                        >
                                                            {loadingReport ? (
                                                                <SpinningLogoImage size={18} />
                                                            ) : (
                                                                <Text className={textStyles.caption}>
                                                                    Report
                                                                </Text>
                                                            )}
                                                        </Button>
                                                    </View>
                                                )}
                                            </View>

                                        </Button>

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

                <View
                    style={{
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        paddingBottom: 20,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        backgroundColor: colors.background,
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
                            containerStyle={{ width: "100%" }}
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
                                markAsRead(conversations.conversation.id);
                            }}
                        >
                            {sendingMessage ? (
                                <SpinningLogoImage size={24} />
                            ) : (
                                <BackIcon rotate={90} color={colors.background} size={23} />
                            )}
                        </Button>
                    )}
                </View>

            </KeyboardAvoidingView>


        </View>  
    )
};

export default MessageScreen;