import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Dimensions,
    Image,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

import Svg, {
    Path,
} from "react-native-svg";

import {
    LinkPreview,
} from "@flyerhq/react-native-link-preview";

import {
    useTheme,
} from "@/provider/ThemeProvider";

import {
    Message,
    MessageType,
} from "@/types/messages.types";

import {
    Media,
} from "@/media/media";

import {
    getEmojiCount,
    isEmojiOnly,
    isWebsite,
} from "@/utils/text";

import {
    useOverlay,
} from "@/stores/useOverlay";

import MediaPreview, { PreviewMedia } from "@/media/MediaPreview";
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { FileIcon } from "@/icons/Icon";

import FilePreview from "@/media/FilePreview";

import {
    useAudioPlayer,
    useAudioPlayerStatus,
    setAudioModeAsync,
} from "expo-audio";
import { BAR_COUNT, formatDuration, MAX_H, MIN_H, seededBars } from "@/utils/audio";
import { VideoPauseIcon, VideoPlayIcon } from "@/icons/video_icon";
import { MessageBubble } from "./messageBubble";

import { SpinningLogoImage } from "@/utils/Logo";

type MessageBubbleProps = {
    children?: React.ReactNode;
    isMe: boolean;
    backgroundColor: string;
    maxWidth: number;
    reply?: boolean;
};


type MessageContentProps = {
    message: Message;

    mediaMessages?: Message[];

    isSelecting: boolean;

    onSelectMessage: (
        message: Message
    ) => void;

    onToggleChecked: (
        messageId: number
    ) => void;

    onMessagePress: (
        message: Message
    ) => void;

    reply?: boolean;
};


type MediaDeckProps = {
    messages: Message[];

    isSelecting: boolean;

    onSelectMessage: (
        message: Message
    ) => void;

    onToggleChecked: (
        messageId: number
    ) => void;

    onMessagePress: (
        message: Message
    ) => void;
};


const DECK_WIDTH = 220;
const DECK_HEIGHT = 220;

const LINK_CARD_HEIGHT = 280;
const LINK_IMAGE_HEIGHT = 140;


const DeckCard = ({
    message,
    position,
    onPress,
    onLongPress,
    isSelecting,
}: {
    message: Message;
    position: "left" | "center" | "right";
    onPress: () => void;
    onLongPress: () => void;
    isSelecting: boolean;
}) => {

    const animatedStyle =
        useAnimatedStyle(() => {

            if (position === "left") {
                return {
                    transform: [
                        {
                            translateX: -28,
                        },
                        {
                            rotate: "-8deg",
                        },
                        {
                            scale: 0.91,
                        },
                    ],
                };
            }

            if (position === "right") {
                return {
                    transform: [
                        {
                            translateX: 28,
                        },
                        {
                            rotate: "8deg",
                        },
                        {
                            scale: 0.91,
                        },
                    ],
                };
            }

            return {
                transform: [
                    {
                        translateX: 0,
                    },
                    {
                        rotate: "0deg",
                    },
                    {
                        scale: 1,
                    },
                ],
            };
        });

    const isVideo =
        message.message_type === "video";

    return (
        <Animated.View
            pointerEvents={
                isSelecting || position === "center"
                    ? "auto"
                    : "none"
            }
            style={[
                {
                    position: "absolute",
                    width: DECK_WIDTH,
                    height: DECK_HEIGHT,
                    borderRadius: 20,
                    overflow: "hidden",
                    zIndex:
                        position === "center"
                            ? 3
                            : 1,
                },
                animatedStyle,
            ]}
        >
            <Media
                uri={message.content}
                mediaType={
                    isVideo
                        ? "video"
                        : "image"
                }
                style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: 20,
                }}
                imageContentFit="cover"
                videoContentFit="cover"
                startMuted
                useSettingsAutoPlay={false}
                autoPlay={
                    position === "center" &&
                    isVideo
                }
                muteControl="bottomRow"
                iconSize={18}
                onPress={onPress}
                onLongPress={onLongPress}
            />
        </Animated.View>
    );
};


const MediaDeck = ({
    messages,
    isSelecting,
    onSelectMessage,
    onToggleChecked,
    onMessagePress,
}: MediaDeckProps) => {

    if (!messages.length) {
        return null;
    }

    const center =
        messages[0];

    const left =
        messages.length > 1
            ? messages[1]
            : undefined;

    const right =
        messages.length > 2
            ? messages[2]
            : undefined;


    const handlePress = (
        message: Message
    ) => {

        if (isSelecting) {
            onToggleChecked(
                message.id
            );
            return;
        }

        const initialIndex =
            messages.findIndex(
                (item) =>
                    item.id === message.id
            );

        const previewMedia: PreviewMedia[] =
            messages.map(
                (item) => ({
                    uri: item.content,
                    mediaType:
                        item.message_type ===
                        "video"
                            ? "video"
                            : "image",
                })
            );

        useOverlay
            .getState()
            .openOverlay(
                undefined,
                <MediaPreview
                    media={previewMedia}
                    initialIndex={
                        initialIndex >= 0
                            ? initialIndex
                            : 0
                    }
                />
            );
    };

    const handleLongPress = (
        message: Message
    ) => {
        if (isSelecting) {
            onToggleChecked(message.id);
            return;
        }

        onSelectMessage(message);
    };


    return (
        <View
            style={{
                width: DECK_WIDTH + 50,
                height: DECK_HEIGHT + 10,
                alignItems: "center",
                justifyContent: "center",
            }}
        >

            {left && (
                <DeckCard
                    message={left}
                    isSelecting={isSelecting}
                    position="left"
                    onPress={() =>
                        handlePress(left)
                    }
                    onLongPress={() =>
                        handleLongPress(left)
                    }
                />
            )}

            {right && (
                <DeckCard
                    message={right}
                    isSelecting={isSelecting}
                    position="right"
                    onPress={() =>
                        handlePress(right)
                    }
                    onLongPress={() =>
                        handleLongPress(right)
                    }
                />
            )}

            <DeckCard
                message={center}
                isSelecting={isSelecting}
                position="center"
                onPress={() =>
                    handlePress(center)
                }
                onLongPress={() =>
                    handleLongPress(center)
                }
            />

        </View>
    );
};


const FileMessageContent = ({
    message,
    isSelecting,
    onToggleChecked,
    onSelectMessage,
}: {
    message: Message;
    isSelecting: boolean;
    onToggleChecked: (messageId: number) => void;
    onSelectMessage: (message: Message) => void;
}) => {
    const {
        colors,
        textStyles,
    } = useTheme();

    return (
        <Pressable
            onPress={() => {

                if (isSelecting) {
                    onToggleChecked(message.id);
                    return;
                }

                useOverlay
                    .getState()
                    .openOverlay(
                        undefined,
                        <FilePreview
                            uri={message.content}
                            fileName={message.file_name}
                        />
                    );
            }}
            onLongPress={
                !isSelecting
                    ? () =>
                        onSelectMessage(message)
                    : undefined
            }
            style={{
                flexDirection: "row",
                alignItems: "center",
                width: 240,
                minHeight: 70,
            }}
        >
            <View
                style={{
                    width: 52,
                    height: 52,
                    borderRadius: 13,
                    backgroundColor: "#E3F2FF",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <FileIcon
                    color="#2487E8"
                    size={28}
                />
            </View>

            <View
                style={{
                    flex: 1,
                    marginLeft: 12,
                    minWidth: 0,
                }}
            >
                <Text
                    className={textStyles.section}
                    numberOfLines={1}
                    style={{
                        color: colors.text,
                        fontSize: 15,
                    }}
                >
                    {message.file_name || "File"}
                </Text>

                {!!message.file_size && (
                    <Text
                        style={{
                            color: colors.text,
                            opacity: 0.55,
                            fontSize: 12,
                            marginTop: 3,
                        }}
                    >
                        {message.file_size
                            ? `${(message.file_size / (1024 * 1024)).toFixed(2)} MB`
                            : ""}
                    </Text>
                )}
            </View>
        </Pressable>
    );
};



let activeVoicePlayer: { pause: () => void } | null = null;
const VoiceMessageContent = ({
    message,
    isSelecting,
    onToggleChecked,
    onSelectMessage,
}: {
    message: Message;
    isSelecting: boolean;
    onToggleChecked: (messageId: number) => void;
    onSelectMessage: (message: Message) => void;
}) => {
    const { colors } = useTheme();

    // Lazy-load: don't create a player for every voice message in the list
    const [activated, setActivated] = useState(false);
    const player = useAudioPlayer(activated ? message.content : null);
    const status = useAudioPlayerStatus(player);

    const autoStartedRef = useRef(false);

    // Real waveform from the server, normalized so the loudest bar fills the height.
    // Falls back to a seeded fake one for older messages.
    const bars = useMemo(() => {
        const wf = message.waveform;

        if (wf && wf.length > 0) {
            const peak = Math.max(...wf, 1);
            return wf.map((v) => v / peak);
        }

        return seededBars(message.id);
    }, [message.id, message.waveform]);

    const playNow = useCallback(async () => {
        try {
            await setAudioModeAsync({
                playsInSilentMode: true,
                allowsRecording: false,
            });

            if (activeVoicePlayer && activeVoicePlayer !== player) {
                activeVoicePlayer.pause();
            }
            activeVoicePlayer = player;

            if (status.duration > 0 && status.currentTime >= status.duration) {
                player.seekTo(0);
            }
            player.play();
        } catch (error) {
            console.error("Failed to play voice message:", error);
        }
    }, [player, status.duration, status.currentTime]);

    // First tap loads the audio; start playing once it's ready
    useEffect(() => {
        if (activated && status.isLoaded && !autoStartedRef.current) {
            autoStartedRef.current = true;
            playNow();
        }
    }, [activated, status.isLoaded, playNow]);

    // Reset to the start when playback finishes
    useEffect(() => {
        if (status.didJustFinish) {
            player.seekTo(0);
        }
    }, [status.didJustFinish, player]);

    // Release the "active" slot on unmount
    useEffect(() => {
        return () => {
            if (activeVoicePlayer === player) {
                activeVoicePlayer = null;
            }
        };
    }, [player]);

    const handlePress = () => {
        if (isSelecting) {
            onToggleChecked(message.id);
            return;
        }

        if (!activated) {
            setActivated(true);
            return;
        }

        if (!status.isLoaded) return;

        if (status.playing) {
            player.pause();
            return;
        }

        playNow();
    };

    const progress =
        status.duration > 0 ? status.currentTime / status.duration : 0;

    // Server duration is available before the audio loads
    const totalSeconds = Math.round(
        (message.duration_ms ?? 0) / 1000 || status.duration || 0
    );

    const shownSeconds = status.playing
        ? Math.floor(status.currentTime)
        : totalSeconds;

    const loading = activated && !status.isLoaded;

    return (
        <Pressable
            onPress={handlePress}
            onLongPress={
                !isSelecting ? () => onSelectMessage(message) : undefined
            }
            style={{
                flexDirection: "row",
                alignItems: "center",
                width: 220,
                height: 40,
            }}
        >
            <View
                style={{
                    width: 34,
                    height: 34,
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: loading ? 0.4 : 1,
                }}
            >
                {status.playing ? (
                    <VideoPauseIcon color={colors.text} size={20} />
                ) : (
                    <VideoPlayIcon color={colors.text} size={20} />
                )}
            </View>

            <View
                style={{
                    flex: 1,
                    height: 28,
                    marginHorizontal: 6,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                }}
            >
                {bars.map((v, i) => {
                    const played = progress > 0 && i / bars.length <= progress;
                    return (
                        <View
                            key={i}
                            style={{
                                width: 2,
                                height: MIN_H + v * (MAX_H - MIN_H),
                                borderRadius: 2,
                                backgroundColor: colors.text,
                                opacity: played ? 0.95 : 0.35,
                            }}
                        />
                    );
                })}
            </View>

            <Text
                style={{
                    color: colors.text,
                    opacity: 0.7,
                    fontSize: 14,
                    minWidth: 32,
                    textAlign: "right",
                }}
            >
                {formatDuration(shownSeconds)}
            </Text>
        </Pressable>
    );
};

export const MessageReplyPreview = ({
    message,
    isMe,
    colors,
    maxWidth,
}: {
    message: Message;
    isMe: boolean;
    colors: any;
    maxWidth: number;
}) => {
    const { content, message_type } = message;

    const renderPreview = () => {
        switch (message_type) {
            case "image":
            case "gif":
                return (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Image
                            source={{ uri: content }}
                            style={{ width: 34, height: 34, borderRadius: 8, opacity: 0.6 }}
                            resizeMode="cover"
                        />
                        <Text style={{ color: colors.text, opacity: 0.55, fontSize: 14 }}>
                            {message_type === "gif" ? "GIF" : "Photo"}
                        </Text>
                    </View>
                );

            case "video":
                return (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <View style={{ width: 34, height: 34, borderRadius: 8, overflow: "hidden" }}>
                            <Image
                                source={{ uri: content }}
                                style={{ width: "100%", height: "100%", opacity: 0.6 }}
                                resizeMode="cover"
                            />
                            <View
                                style={[StyleSheet.absoluteFillObject, { alignItems: "center", justifyContent: "center" }]}
                                pointerEvents="none"
                            >
                                <VideoPlayIcon color={colors.text} size={14} />
                            </View>
                        </View>
                        <Text style={{ color: colors.text, opacity: 0.55, fontSize: 14 }}>Video</Text>
                    </View>
                );

            case "voice":
                return (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <VideoPlayIcon color={colors.text} size={16} />
                        <Text style={{ color: colors.text, opacity: 0.55, fontSize: 14 }}>
                            Voice message
                        </Text>
                    </View>
                );

            case "file":
                return (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <FileIcon color={colors.text} size={16} />
                        <Text
                            numberOfLines={1}
                            style={{ color: colors.text, opacity: 0.55, fontSize: 14, maxWidth: maxWidth - 60 }}
                        >
                            {message.file_name || "File"}
                        </Text>
                    </View>
                );

            default:
                return (
                    <Text
                        numberOfLines={1}
                        style={{ color: colors.text, opacity: 0.45, fontSize: 14 }}
                    >
                        {content}
                    </Text>
                );
        }
    };

    return (
        <View
            style={{
                alignSelf: isMe ? "flex-end" : "flex-start",
                borderWidth: 1,
                borderColor: colors.text + "33",
                borderRadius: 18,
                paddingHorizontal: 12,
                paddingVertical: 8,
                maxWidth,
                backgroundColor: "transparent",
            }}
        >
            {renderPreview()}
        </View>
    );
};

const MessageContent = ({
    message,
    mediaMessages,
    isSelecting,
    onSelectMessage,
    onToggleChecked,
    onMessagePress,
    reply
}: MessageContentProps) => {

    const {
        colors,
        textStyles,
    } = useTheme();

    const {
        content,
        message_type,
    } = message;

    const wrap = (node: React.ReactNode) => reply ? <View style={{ opacity: 0.55 }}>{node}</View> : node;

    const [loadingPreview, setLoadingPreview] = useState(true);

    const bubbleMaxWidth =
        Dimensions.get("window").width *
        0.65;

    useEffect(() => {
        setLoadingPreview(true);
    }, [content]);


    /*
     * Emoji-only
     */
    if (
        message_type === "text" &&
        isEmojiOnly(content)
    ) {

        const count =
            getEmojiCount(content);

        if (count <= 2) {

            const fontSize =
                count === 1
                    ? 70
                    : 36;

            return (
                <Text
                    style={{
                        fontSize,
                        lineHeight:
                            fontSize + 6,
                    }}
                >
                    {content.trim()}
                </Text>
            );
        }
    }


    /*
    * Voice
    */
    if (message_type === "voice") {
        return (
            <VoiceMessageContent
                message={message}
                isSelecting={isSelecting}
                onToggleChecked={onToggleChecked}
                onSelectMessage={onSelectMessage}
            />
        );
    }


    /*
     * File
     */
    if (message_type === "file") {

        return (
            <FileMessageContent
                message={message}
                isSelecting={isSelecting}
                onToggleChecked={onToggleChecked}
                onSelectMessage={onSelectMessage}
            />
        );
    }

    /*
     * GIF
     */
    if (message_type === "gif") {

        return (
            <Media
                uri={content}
                mediaType="image"
                style={{
                    width: 100,
                    height: 100,
                    borderRadius: 20,
                }}
                imageContentFit="cover"
                onPress={() => {

                    if (isSelecting) {
                        onToggleChecked(
                            message.id
                        );
                        return;
                    }

                    onMessagePress(message);
                }}
                onLongPress={
                    !isSelecting
                        ? () =>
                            onSelectMessage(
                                message
                            )
                        : undefined
                }
            />
        );
    }


    /*
     * Image
     */
    if (message_type === "image") {

        return (
            <Media
                uri={content}
                mediaType="image"
                style={{
                    width: 220,
                    height: 220,
                    borderRadius: 20,
                }}
                imageContentFit="cover"
                onPress={() => {

                    if (isSelecting) {
                        onToggleChecked(
                            message.id
                        );
                        return;
                    }

                    const media =
                        mediaMessages?.length
                            ? mediaMessages
                            : [message];

                    const initialIndex =
                        media.findIndex(
                            (item) =>
                                item.id ===
                                message.id
                        );

                    useOverlay
                        .getState()
                        .openOverlay(
                            undefined,
                            <MediaPreview
                                media={media.map(
                                    (message) => ({
                                        uri: message.content,
                                        mediaType:
                                            message.message_type ===
                                            "video"
                                                ? "video"
                                                : "image",
                                    })
                                )}
                                initialIndex={
                                    initialIndex >= 0
                                        ? initialIndex
                                        : 0
                                }
                            />
                        );
                }}
                onLongPress={
                    !isSelecting
                        ? () =>
                            onSelectMessage(
                                message
                            )
                        : undefined
                }
            />
        );
    }


    /*
     * Video
     */
    if (message_type === "video") {

        return (
            <Media
                uri={content}
                mediaType="video"
                style={{
                    width: 220,
                    height: 220,
                    borderRadius: 20,
                }}
                startMuted
                useSettingsAutoPlay={false}
                autoPlay
                muteControl="bottomRow"
                iconSize={20}
                videoContentFit="cover"
                onPress={() => {

                    if (isSelecting) {
                        onToggleChecked(
                            message.id
                        );
                        return;
                    }

                    const media =
                        mediaMessages?.length
                            ? mediaMessages
                            : [message];

                    const initialIndex =
                        media.findIndex(
                            (item) =>
                                item.id ===
                                message.id
                        );

                    useOverlay
                        .getState()
                        .openOverlay(
                            undefined,
                            <MediaPreview
                                media={media.map(
                                    (message) => ({
                                        uri: message.content,
                                        mediaType:
                                            message.message_type ===
                                            "video"
                                                ? "video"
                                                : "image",
                                    })
                                )}
                                initialIndex={
                                    initialIndex >= 0
                                        ? initialIndex
                                        : 0
                                }
                            />
                        );
                }}
                onLongPress={
                    !isSelecting
                        ? () =>
                            onSelectMessage(
                                message
                            )
                        : undefined
                }
            />
        );
    }


    /*
    * Normal text
    */
    if (
        message_type !== "link" &&
        !isWebsite(content)
    ) {
        return wrap(
            <Text
                className={textStyles.body}
                style={{
                    fontSize: 15,
                    color: colors.text,
                }}
            >
                {content}
            </Text>
        );
    }


    /*
    * URL preview
    */
    return (
        <View
            style={{
                width: bubbleMaxWidth,
                maxWidth: "100%",
                alignSelf: "stretch",
                height: LINK_CARD_HEIGHT,      // fixed from the first frame
                overflow: "hidden",
                borderRadius: 12,
                backgroundColor: colors.card,
            }}
        >
            <LinkPreview
                key={content}
                text={content}
                enableAnimation={false}        // the animation itself changes height
                onPreviewDataFetched={() => setLoadingPreview(false)}
                renderLinkPreview={({ previewData }) => {
                    const hasImage = !!previewData?.image?.url;

                    return (
                        <View
                            onLayout={() => {
                                if (previewData?.title || previewData?.description || hasImage || previewData?.link) {
                                    setLoadingPreview(false);
                                }
                            }}
                            style={{
                                width: "100%",
                                height: LINK_CARD_HEIGHT,
                                backgroundColor: colors.card,
                                borderRadius: 12,
                                overflow: "hidden",
                                padding: 10,
                                gap: 5,
                            }}
                        >
                            {hasImage && (
                                <Image
                                    source={{ uri: previewData!.image!.url }}
                                    style={{
                                        width: "100%",
                                        height: LINK_IMAGE_HEIGHT,
                                        backgroundColor: colors.background,
                                        borderRadius: 10,
                                    }}
                                    resizeMode="cover"
                                />
                            )}

                            {!!previewData?.title && (
                                <Text
                                    className={textStyles.h3}
                                    numberOfLines={2}
                                    style={{ color: colors.text, fontWeight: "600" }}
                                >
                                    {previewData.title}
                                </Text>
                            )}

                            {!!previewData?.description && (
                                <Text
                                    numberOfLines={hasImage ? 2 : 6}
                                    style={{ color: colors.text, opacity: 0.75, marginTop: 4 }}
                                >
                                    {previewData.description}
                                </Text>
                            )}

                            {!!previewData?.link && (
                                <Text
                                    numberOfLines={1}
                                    style={{ color: colors.button, marginTop: "auto" }}
                                >
                                    {previewData.link}
                                </Text>
                            )}
                        </View>
                    );
                }}
            />

            {loadingPreview && (
                <View
                    pointerEvents="none"
                    style={{
                        ...StyleSheet.absoluteFillObject,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: colors.card,
                        borderRadius: 12,
                        zIndex: 10,
                    }}
                >
                    <SpinningLogoImage size={30} />
                </View>
            )}
        </View>
    );
};


const MediaGroup = ({
    messages,
    isSelecting,
    onSelectMessage,
    onToggleChecked,
    onMessagePress,
}: {
    messages: Message[];

    isSelecting: boolean;

    onSelectMessage: (
        message: Message
    ) => void;

    onToggleChecked: (
        messageId: number
    ) => void;

    onMessagePress: (
        message: Message
    ) => void;
}) => {

    const mediaMessages =
        messages.filter(
            (message) =>
                message.message_type === "image" ||
                message.message_type === "gif" ||
                message.message_type === "video"
        );

    if (
        mediaMessages.length === 0
    ) {
        return null;
    }


    /*
     * Single media
     */
    if (
        mediaMessages.length === 1
    ) {

        const message =
            mediaMessages[0];

        return (
            <MessageContent
                message={message}
                mediaMessages={
                    mediaMessages
                }
                isSelecting={
                    isSelecting
                }
                onSelectMessage={
                    onSelectMessage
                }
                onToggleChecked={
                    onToggleChecked
                }
                onMessagePress={
                    onMessagePress
                }
            />
        );
    }


    /*
     * Multiple media
     */
    return (
        <MediaDeck
            messages={mediaMessages}
            isSelecting={isSelecting}
            onSelectMessage={onSelectMessage}
            onToggleChecked={onToggleChecked}
            onMessagePress={onMessagePress}
        />
    );
};


export const MessageRenderer = ({
    msg,
    group,
    isMe,
    colors,
    bubbleMaxWidth,
    isSelecting,
    onSelectMessage,
    onToggleChecked,
    onMessagePress,
    currentUserSub,  
    otherUserName,      
    onReplyPreviewPress,  
    reply = false,
}: {
    msg: Message;

    group?: Message[];

    isMe: boolean;

    colors: any;

    bubbleMaxWidth: number;

    isSelecting: boolean;

    onSelectMessage: (
        message: Message
    ) => void;

    onToggleChecked: (
        messageId: number
    ) => void;

    onMessagePress: (
        message: Message
    ) => void;
    currentUserSub?: string;
    otherUserName?: string;
    onReplyPreviewPress?: (messageId: number) => void;
    reply?: boolean;
}) => {

    const mediaMessages =
        group?.filter(
            (message) =>
                message.message_type === "image" ||
                message.message_type === "gif" ||
                message.message_type === "video"
        ) ?? [];

    const isMedia =
        msg.message_type === "image" ||
        msg.message_type === "gif" ||
        msg.message_type === "video";


    /*
     * Media group
     */
    if (
        isMedia &&
        msg.media_group_id &&
        mediaMessages.length > 0
    ) {

        return (
            <View
                style={{
                    alignSelf: isMe
                        ? "flex-end"
                        : "flex-start",
                }}
            >
                <MediaGroup
                    messages={
                        mediaMessages
                    }
                    isSelecting={
                        isSelecting
                    }
                    onSelectMessage={
                        onSelectMessage
                    }
                    onToggleChecked={
                        onToggleChecked
                    }
                    onMessagePress={
                        onMessagePress
                    }
                />
            </View>
        );
    }


    /*
     * Normal media
     */
    if (isMedia) {

        return (
            <View
                style={{
                    alignSelf: isMe
                        ? "flex-end"
                        : "flex-start",
                }}
            >
                <MessageContent
                    message={msg}
                    mediaMessages={
                        mediaMessages.length
                            ? mediaMessages
                            : [msg]
                    }
                    isSelecting={
                        isSelecting
                    }
                    onSelectMessage={
                        onSelectMessage
                    }
                    onToggleChecked={
                        onToggleChecked
                    }
                    onMessagePress={
                        onMessagePress
                    }
                />
            </View>
        );
    }


    /*
     * Emoji-only
     */
    const emojiOnly =
        msg.message_type === "text" &&
        isEmojiOnly(msg.content) &&
        getEmojiCount(msg.content) <= 2;

    if (emojiOnly) {

        return (
            <View
                style={{
                    alignSelf: isMe
                        ? "flex-end"
                        : "flex-start",
                }}
            >
                <MessageContent
                    message={msg}
                    isSelecting={
                        isSelecting
                    }
                    onSelectMessage={
                        onSelectMessage
                    }
                    onToggleChecked={
                        onToggleChecked
                    }
                    onMessagePress={
                        onMessagePress
                    }
                    reply={reply}
                />
            </View>
        );
    }

    /*
    * Standalone link preview — don't render inside MessageBubble
    */
    if (
        (
            msg.message_type === "link" ||
            (
                msg.message_type === "text" &&
                isWebsite(msg.content)
            )
        ) &&
        !isEmojiOnly(msg.content)
    ) {
        return (
            <View
                style={{
                    alignSelf: isMe ? "flex-end" : "flex-start",
                    maxWidth: bubbleMaxWidth,
                }}
            >
                <MessageContent
                    message={msg}
                    isSelecting={isSelecting}
                    onSelectMessage={onSelectMessage}
                    onToggleChecked={onToggleChecked}
                    onMessagePress={onMessagePress}
                    reply={reply}
                />
            </View>
        );
    }

    /*
     * Normal bubble
     */
    return (
        <MessageBubble
            isMe={isMe}
            backgroundColor={
                reply ? colors.secondaryCard : isMe
                    ? colors.button
                    : colors.secondaryCard
            }
            maxWidth={
                bubbleMaxWidth
            }
            reply={reply}
        >
            <MessageContent
                message={msg}
                isSelecting={
                    isSelecting
                }
                onSelectMessage={
                    onSelectMessage
                }
                onToggleChecked={
                    onToggleChecked
                }
                onMessagePress={
                    onMessagePress
                }
                reply={reply}
            />
        </MessageBubble>
    );
};

export const MessageShakeView = ({
    active,
    nonce,
    style,
    children,
}: {
    active: boolean;
    nonce?: number;
    style?: any;
    children: React.ReactNode;
}) => {
    const r = useSharedValue(0); // degrees

    useEffect(() => {
        if (!active) return;

        r.value = withDelay(
            450, // let the scroll finish first
            withSequence(
                withTiming(-2.2, { duration: 45 }),
                withTiming(2.2, { duration: 70 }),
                withTiming(-1.6, { duration: 70 }),
                withTiming(1.6, { duration: 70 }),
                withTiming(-0.8, { duration: 60 }),
                withTiming(0.8, { duration: 60 }),
                withTiming(0, { duration: 50 })
            )
        );
    }, [active, nonce]);

    const shakeStyle = useAnimatedStyle(() => ({
        transform: [{ rotateZ: `${r.value}deg` }],
    }));

    return <Animated.View style={[style, shakeStyle]}>{children}</Animated.View>;
};