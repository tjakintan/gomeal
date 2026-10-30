import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";

import {
    Dimensions,
    InteractionManager,
    Keyboard,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    useWindowDimensions,
    View,
    Image
} from "react-native";

import Animated, {
    useAnimatedStyle,
    useSharedValue,
    runOnJS,
    useAnimatedReaction,
    LinearTransition,
    FadeIn,
    FadeOut,
    useAnimatedRef,
    measure,
    makeMutable,
    useDerivedValue,
    SharedValue,
} from "react-native-reanimated";

import { useReanimatedKeyboardAnimation } from "react-native-keyboard-controller";

import {
    Button,
    ExpandingButton
} from "@/components/ButtonComponent";

import { Input } from "@/components/InputComponent";
import { GradientHeader } from "@/components/GradientComponent";

import {
    BackIcon,
    StickerIcon,
    FileIcon,
    MicIcon,
    AddIcon,
    CameraIcon,
    XIcon,
    DeleteIcon,
} from "@/icons/Icon";

import { useTheme } from "@/provider/ThemeProvider";

import {
    emitTypingStart,
    emitTypingStop,
} from "@/api/messages.api";

import { 
    uploadMediaToS3 
} from "@/api/post.api";

import { Message, MessageType } from "@/types/messages.types";
import { useBottomSheet } from "@/stores/useBottomSheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
    bottomSheetPosition,
    SheetContent,
} from "@/app/BottomSheet";

import { useSlidingOverlay } from "@/stores/useSlideOverlay";

import { 
    StickerMessageComposer, 
    MediaMessageComposer, 
    VoiceMessageComposer, 
    FileMessageComposer, 
    MessageFile,
    VoiceMessageComposerHandle
} from "./messageOptionMenu";
import { usePermissions } from "@/provider/PermissionProvider";
import { Media } from "@/media/media";
import { BlurView } from "expo-blur";
import { PendingMedia, usePendingMedia } from "@/media/store/usePendingMedia";
import { useOverlay } from "@/stores/useOverlay";
import MediaPreview, { PreviewMedia } from "@/media/MediaPreview";
import { PendingFile, usePendingFile } from "@/media/store/usePendingFile";
import FilePreview from "@/media/FilePreview";
import { Platform } from "react-native";
import { LinkPreview } from "@flyerhq/react-native-link-preview";
import { isWebsite } from "@/utils/text";
import { usePendingLink } from "@/media/store/usePendingLink";


type Props = {
    conversationId: number | null;
    sendingMessage: boolean;
    dark?: boolean;

    messageInputBottom: SharedValue<number>;

    replyingTo?: Message | null;  

    onSend: (
        message: string,
        messageType?: MessageType,
        meta?: { durationMs?: number; waveform?: number[]; replyToId?: number | null }
    ) => void | boolean | Promise<void | boolean>;

    onSendGif?: (uri: string, replyToId?: number | null) => void | Promise<void>;
};




export type MessageInputHandle = {
    focus: () => void;
};


const MENU_HEIGHT = 50;

export const MEDIA_PREVIEW_HEIGHT = 175;
export const FILE_PREVIEW_HEIGHT = 100;
export const LINK_PREVIEW_HEIGHT = 100;

let lastKeyboardHeight = 0;


export const sheetHold = makeMutable(0);


const PendingMediaRenderer = ({
    media,
    onRemove,
    dark,
    height,
}: {
    media: PendingMedia[];
    onRemove: (index: number) => void;
    dark?: boolean;
    height: number;
}) => {

    const { colors } = useTheme(
        dark ? "dark" : undefined
    );

    if (!media.length) {
        return null;
    }

    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{
                height: MEDIA_PREVIEW_HEIGHT + height - 25,
                backgroundColor: colors.secondaryCard,
                borderTopRightRadius: 17,
                borderTopLeftRadius: 17,
                paddingLeft: 10,
                paddingRight: 10,
                paddingTop: 10
            }}
            contentContainerStyle={{
                flexDirection: "row",
                gap: 8,
            }}
        >
            {media.map((item, index) => (
                <View
                    key={`${item.uri}-${index}`}
                    style={{
                        position: "relative",
                    }}
                >
                    <Media
                        uri={item.uri}
                        mediaType={
                            item.type === "video"
                                ? "video"
                                : "image"
                        }
                        style={{
                            width: 85,
                            height: MEDIA_PREVIEW_HEIGHT,
                            borderRadius: 10,
                        }}
                        onPress={() => {

                            const previewMedia: PreviewMedia[] =
                                media.map((item) => ({
                                    uri: item.uri,
                                    mediaType:
                                        item.type === "video"
                                            ? "video"
                                            : "image",
                                }));

                            useOverlay
                                .getState()
                                .openOverlay(
                                    undefined,
                                    <MediaPreview
                                        media={previewMedia}
                                        initialIndex={index}
                                        dark={dark}
                                    />
                                );
                        }}
                        imageContentFit="cover"
                        videoContentFit="cover"
                        autoPlay={false}
                        useSettingsAutoPlay={false}
                        startMuted
                    />

                    <Pressable
                        onPress={() => onRemove(index)}
                        style={{
                            position: "absolute",
                            top: 5,
                            right: 5,
                            width: 25,
                            height: 25,
                            borderRadius: 999,
                            overflow: "hidden",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <BlurView
                            intensity={80}
                            tint={dark ? "dark" : "light"}
                            style={{
                                ...StyleSheet.absoluteFillObject,
                            }}
                        />

                        <XIcon
                            color={colors.danger}
                            size={15}
                        />
                    </Pressable>
                </View>
            ))}
        </ScrollView>
    );
};


const PendingFileRenderer = ({
    file,
    onRemove,
    dark,
    height
}: {
    file: PendingFile;
    onRemove: () => void;
    dark?: boolean;
    height: number;
}) => {
    const { colors, textStyles } = useTheme(
        dark ? "dark" : undefined
    );

    return (
        <View
            style={{
                height: FILE_PREVIEW_HEIGHT + height - 30,
                width: "100%",
                backgroundColor: colors.secondaryCard,
                borderTopLeftRadius: 17,
                borderTopRightRadius: 17,
                padding: 5,
                flexDirection: "row",
                alignItems: "flex-start",
            }}
        >
            <Pressable
                onPress={() => {
                    useOverlay
                        .getState()
                        .openOverlay(
                            undefined,
                            <FilePreview
                                uri={file.uri}
                                fileName={file.name}
                            />
                        );
                }}
                style={{
                    width: "100%",
                    height: FILE_PREVIEW_HEIGHT,
                    borderRadius: 12,
                    backgroundColor: colors.background,
                    flexDirection: "row",
                    padding: 5
                }}
            >

                <View
                    style={{
                        flex: 1,
                        marginLeft: 12,
                        minWidth: 0,
                        alignSelf: "flex-end",
                        paddingBottom: 11
                    }}
                >
                    <Text
                        className={textStyles.section}
                        numberOfLines={1}
                        style={{
                            color: colors.text,
                        }}
                    >
                        {file.name}
                    </Text>

                </View>

                <Pressable
                    onPress={onRemove}
                    style={{
                        position: "absolute",
                        top: 5,
                        right: 5,
                        width: 25,
                        height: 25,
                        borderRadius: 999,
                        overflow: "hidden",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <BlurView
                        intensity={80}
                        tint={dark ? "dark" : "light"}
                        style={{
                            ...StyleSheet.absoluteFillObject,
                        }}
                    />
                    <XIcon
                        color={colors.danger}
                        size={17}
                    />
                </Pressable>
            </Pressable>
        </View>
    );
};


const PendingLinkRenderer = ({
    url,
    dark,
    onRemove,
    height,
}: {
    url: string;
    dark?: boolean;
    onRemove: () => void;
    height: number;
}) => {
    const { colors, textStyles } = useTheme(
        dark ? "dark" : undefined
    );

    if (!url) return null;

    return (
        <View
            style={{
                height: LINK_PREVIEW_HEIGHT + height - 30,
                width: "100%",
                backgroundColor: colors.secondaryCard,
                borderTopLeftRadius: 17,
                borderTopRightRadius: 17,
                padding: 5,
                overflow: "hidden",
            }}
        >
            <View
                style={{
                    height: LINK_PREVIEW_HEIGHT,
                    width: "100%",
                    borderRadius: 12,
                    overflow: "hidden",
                    backgroundColor: colors.background,
                }}
            >
                <LinkPreview
                    key={url}
                    text={url}
                    enableAnimation={false}
                    renderLinkPreview={({ previewData: data }) => (
                        <View
                            style={{
                                height: "100%",
                                width: "100%",
                                flexDirection: "row",
                                alignItems: "center",
                                paddingHorizontal: 10,
                                paddingVertical: 6,
                                paddingRight: 38,
                                gap: 10,
                                overflow: "hidden",
                            }}
                        >
                            {!!data?.image?.url && (
                                <Image
                                    source={{ uri: data.image.url }}
                                    style={{
                                        width: 64,
                                        height: Math.max(36, LINK_PREVIEW_HEIGHT - 25),
                                        flexShrink: 0,
                                        borderRadius: 8,
                                        backgroundColor: colors.secondaryCard,
                                    }}
                                    resizeMode="cover"
                                />
                            )}

                            <View
                                style={{
                                    flex: 1,
                                    minWidth: 0,
                                    maxHeight: "100%",
                                    justifyContent: "center",
                                    overflow: "hidden",
                                    gap: 3,
                                }}
                            >
                                <Text
                                    className={textStyles.section}
                                    numberOfLines={2}
                                    ellipsizeMode="tail"
                                    style={{
                                        color: colors.text,
                                        flexShrink: 1,
                                    }}
                                >
                                    {data?.title || url}
                                </Text>

                                {!!data?.description && (
                                    <Text
                                        numberOfLines={2}
                                        ellipsizeMode="tail"
                                        style={{
                                            color: colors.text,
                                            opacity: 0.65,
                                            fontSize: 12,
                                            flexShrink: 1,
                                        }}
                                    >
                                        {data.description}
                                    </Text>
                                )}

                                <Text
                                    numberOfLines={1}
                                    ellipsizeMode="middle"
                                    style={{
                                        color: colors.button,
                                        fontSize: 11,
                                        flexShrink: 1,
                                    }}
                                >
                                    {data?.link || url}
                                </Text>
                            </View>
                        </View>
                    )}
                />

                <Pressable
                    onPress={onRemove}
                    hitSlop={8}
                    style={{
                        position: "absolute",
                        top: 5,
                        right: 5,
                        zIndex: 2,
                        width: 25,
                        height: 25,
                        borderRadius: 999,
                        overflow: "hidden",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <BlurView
                        intensity={80}
                        tint={dark ? "dark" : "light"}
                        style={StyleSheet.absoluteFillObject}
                    />
                    <XIcon
                        color={colors.danger}
                        size={17}
                    />
                </Pressable>
            </View>

        </View>
    );
};


export const MessageInput = forwardRef<MessageInputHandle, Props>(({
    conversationId,
    sendingMessage,
    dark,

    messageInputBottom,

    replyingTo,

    onSend,
    onSendGif,
}, ref) => {

    const insets = useSafeAreaInsets();

    const { colors, textStyles } = useTheme(
        dark ? "dark" : undefined
    );

    const { requestPermissions } = usePermissions();

    const [text, setText] = useState("");

    const replyingToRef = useRef(replyingTo);
    
    replyingToRef.current = replyingTo;

    const isOverlayClosing = useSlidingOverlay((s) => s.isClosing);
    const isOverlaySwiping = useSlidingOverlay((s) => s.isSwiping);
    const overlayLeaving = isOverlayClosing || isOverlaySwiping;
    
    const pendingMedia = usePendingMedia((state) => state.pendingMedia);
    const setPendingMedia = usePendingMedia((state) => state.setPendingMedia);
    const addPendingMedia = usePendingMedia((state) => state.addPendingMedia);
    const removePendingMediaAt = usePendingMedia((state) => state.removePendingMediaAt);

    const pendingFile = usePendingFile((state) => state.pendingFile);
    const setPendingFile = usePendingFile((state) => state.setPendingFile);
    const clearPendingFile = usePendingFile((state) => state.clearPendingFile);

    const pendingLinkUrl = usePendingLink((state) => state.pendingLinkUrl);
    const setPendingLinkUrl = usePendingLink((state) => state.setPendingLinkUrl);

    const voiceRef = useRef<VoiceMessageComposerHandle>(null);
    const [voiceMode, setVoiceMode] = useState(false);
    const [pendingVoice, setPendingVoice] = useState<MessageFile | null>(null);

    const [showMenu, setShowMenu] = useState(false);

    const inputRef = useRef<TextInput>(null);

    const rootRef = useAnimatedRef<View>();

    const followsMessageSheet = useSharedValue(false);
    

    useImperativeHandle(ref, () => ({
        focus: () => {
            inputRef.current?.focus();
        },
    }));

    const firstSnap = useSharedValue(0);

    const inputContainerRef = useAnimatedRef<View>();

    const baseInputHeight = useSharedValue(0);
    const inputTranslateY = useSharedValue(0);  
    const inputContainerHeight = useSharedValue(0);

    useDerivedValue(() => {
        messageInputBottom.value =
            (inputContainerHeight.value - 40) + baseInputHeight.value - inputTranslateY.value;
    });

    useAnimatedReaction(
        () => inputContainerHeight.value,
        (height, previousHeight) => {
            if (height !== previousHeight) {
                messageInputBottom.value =
                    (height - 40) + baseInputHeight.value - inputTranslateY.value;
            }
        }
    );

    const inputContainerX = useSharedValue(0);
    const inputContainerY = useSharedValue(0);
    const inputContainerWidth = useSharedValue(0);
    
    const pendingFocusRef = useRef(false);

    const isMessageInputSheetOpen = useBottomSheet((state) => {
        const top = state.stack[state.stack.length - 1];

        return top?.source === "input";
    });

    const openBottomSheet = useBottomSheet(
        (state) => state.openBottomSheet
    );

    const closeBottomSheet = useBottomSheet(
        (state) => state.closeBottomSheet
    );

    const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const { height: screenHeight } = useWindowDimensions();

    const { height } = useReanimatedKeyboardAnimation();


    const handleInputFocus = () => {
        if (!isMessageInputSheetOpen) {
            return;
        }

        pendingFocusRef.current = true;
        closeBottomSheet();
    };


    const handleRemovePendingLink = useCallback(() => {
        setPendingLinkUrl("");
    }, [setPendingLinkUrl]);


    const inputAnimatedStyle = useAnimatedStyle(() => {
        const rawSheetOffset = Math.min(
            0,
            bottomSheetPosition.value - screenHeight + 20
        );

        const maxLift =
            firstSnap.value > 0
                ? -firstSnap.value + 20
                : rawSheetOffset;

        const sheetOffset = Math.max(maxLift, rawSheetOffset);

        const keyboardOffset = Math.min(0, height.value + 20);
        const keyboardOpen = height.value < -10;

        const translateY = !followsMessageSheet.value
            ? keyboardOpen
                ? keyboardOffset
                : 0
            : sheetHold.value
                ? -firstSnap.value + 20
                : keyboardOpen
                    ? keyboardOffset
                    : sheetOffset;

        inputTranslateY.value = translateY;

        return {
            transform: [{ translateY }],
        };
    });


    const pendingMediaAnimatedStyle = useAnimatedStyle(() => {
        return {
            position: "absolute",

            left: inputContainerX.value,

            width: inputContainerWidth.value,

            bottom: MENU_HEIGHT + 15,

            transform: [
                {
                    translateY:
                        inputTranslateY.value,
                },
            ],
        };
    });


    useEffect(() => {
        const measureInput = () => {
            const measurement = measure(inputContainerRef);

            if (!measurement) return;

            inputContainerX.value = measurement.pageX;
            inputContainerY.value = measurement.pageY;
            inputContainerWidth.value = measurement.width;
            inputContainerHeight.value = measurement.height;
        };

        const interactionHandle =
            InteractionManager.runAfterInteractions(measureInput);

        return () => interactionHandle.cancel();
    }, [
        text,
        pendingLinkUrl,
        pendingMedia.length,
        pendingFile,
        voiceMode,
    ]);


    useEffect(() => {

        const measureGap = () => {

            rootRef.current?.measureInWindow(
                (x, y, w, h) => {

                    const gap =
                        Dimensions.get("window").height -
                        (y + h);

                }
            );
        };

        const interactionHandle =
            InteractionManager.runAfterInteractions(
                measureGap
            );

        return () => {

            interactionHandle.cancel();

            if (typingTimerRef.current) {
                clearTimeout(
                    typingTimerRef.current
                );
            }
        };

    }, []);


    useEffect(() => {
        if (!overlayLeaving) return;

        Keyboard.dismiss();
        setShowMenu(false);
        pendingFocusRef.current = false;
        if (isMessageInputSheetOpen) closeBottomSheet();   
    }, [overlayLeaving, isMessageInputSheetOpen, closeBottomSheet]);


    useEffect(() => {
        if (!isOverlayClosing) return;

        setPendingMedia([]);
        clearPendingFile();
        setVoiceMode(false);
    }, [isOverlayClosing]);


    useEffect(() => {
        if (!replyingTo) return;

        const id = requestAnimationFrame(() => {
            inputRef.current?.focus();
        });

        return () => cancelAnimationFrame(id);
    }, [replyingTo?.id]);


    useEffect(() => {
        const evt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
        const sub = Keyboard.addListener(evt, (e) => {
            lastKeyboardHeight = e.endCoordinates.height;
        });
        return () => sub.remove();
    }, []);


    useEffect(() => {
        followsMessageSheet.value = isMessageInputSheetOpen;

        if (!isMessageInputSheetOpen) {
            sheetHold.value = 0;
        }
    }, [isMessageInputSheetOpen]);


    const prevTextRef = useRef("");

    useEffect(() => {
        const prev = prevTextRef.current;
        prevTextRef.current = text;

        if (voiceMode || pendingMedia.length > 0 || pendingFile) return;

        const isPaste = text.length - prev.length > 1;

        const match = text.match(
            isPaste
                ? /https?:\/\/[^\s<>"']+|www\.[^\s<>"']+/i
                : /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+)\s/i   // typed: needs trailing space
        );

        const found = (match?.[1] ?? match?.[0])?.replace(/[.,!?;:)]+$/, "") ?? "";
        if (!found) return;

        const normalized = /^https?:\/\//i.test(found) ? found : `https://${found}`;
        if (normalized === pendingLinkUrl) return;

        setText((current) =>
            current.replace(found, "").replace(/\s{2,}/g, " ").trim()
        );
        setPendingLinkUrl(normalized);

        requestAnimationFrame(() => {
            setText((current) =>
                current.replace(found, "").replace(/\s{2,}/g, " ").trim()
            );
            // if nothing is left, force the native view to reset too
            if (!text.replace(found, "").trim()) {
                inputRef.current?.clear();
            }
        });
    }, [text, voiceMode, pendingMedia.length, pendingFile, pendingLinkUrl]);


    const handleOpenSheet = (content: React.ReactNode) => {
        const firstSnapPoint =
            lastKeyboardHeight > 0 ? lastKeyboardHeight : 320;

        const secondSnapPoint = screenHeight - insets.top - 60;

        firstSnap.value = firstSnapPoint;

        sheetHold.value = Keyboard.isVisible()
            ? firstSnapPoint
            : 0;

        openBottomSheet(
            <SheetContent>{content}</SheetContent>,
            [firstSnapPoint, secondSnapPoint],
            0,
            0,
            false,
            false,
            false,
            "input",
        );

        Keyboard.dismiss();
    };

    const handleOpenMediaMessageComposer = useCallback(() => {
        Keyboard.dismiss();
        requestPermissions({
            permissions: ["camera", "microphone", "mediaLibrary"],
            title: "Allow GoMeal to access your photos and camera",
            description:
                "Camera access lets you take meal photos and record videos. Microphone access lets your videos include audio. Photo Library access lets you choose photos and videos to send in messages. You can change these permissions later in Settings.",
            deniedDescription:
                "Camera, microphone, and/or photo access has been disabled. Please enable the required permissions for GoMeal in Settings.",
            onGranted: () => {
                handleOpenSheet(
                    <MediaMessageComposer
                        dark={dark}
                        onDone={(result, uri) => {

                            setPendingLinkUrl("");
                            clearPendingFile();
                            setVoiceMode(false);

                            if (Array.isArray(result)) {
                                const media: PendingMedia[] = result
                                    .filter(
                                        (item) =>
                                            item.type === "image" ||
                                            item.type === "video"
                                    )
                                    .map((item) => ({
                                        uri: item.uri!,
                                        type: item.type as "image" | "video",
                                    }));

                                setPendingMedia(media);
                                return;
                            }

                            if (!uri) return;

                            if (
                                result !== "image" &&
                                result !== "video"
                            ) {
                                return;
                            }

                            setPendingMedia([]);
                            addPendingMedia({
                                uri,
                                type: result,
                            });
                        }}
                    />
                );
            },
        });
    }, [dark, requestPermissions, handleOpenSheet]);


    const handleOpenStickerComposer = useCallback(() => {
        handleOpenSheet(
            <StickerMessageComposer
                dark={dark}
                onDone={async (result, uri) => {
                    if (result !== "gif" || !uri) return;

                    await onSendGif?.(uri, replyingToRef.current?.id ?? null);
                }}
                onCancel={() => {
                    closeBottomSheet();
                }}
            />
        );
    }, [
        dark,
        handleOpenSheet,
        closeBottomSheet,
        onSendGif,
    ]);


    const handleOpenFileMessageComposer = useCallback(() => {
        handleOpenSheet(
            <FileMessageComposer
                dark={dark}
                onDone={(result) => {
                    if (
                        typeof result !== "object" ||
                        Array.isArray(result) ||
                        !("uri" in result)
                    ) {
                        return;
                    }

                    setPendingLinkUrl("");
                    setPendingMedia([]);
                    setVoiceMode(false);

                    setPendingFile(result);

                    closeBottomSheet();
                }}
                onCancel={() => {
                    closeBottomSheet();
                }}
            />
        );
    }, [
        dark,
        handleOpenSheet,
        onSend,
        closeBottomSheet,
    ]);


    const handleOpenVoiceMessageComposer = useCallback(() => {
        requestPermissions({
            permissions: ["microphone"],
            title: "Allow GoMeal to access your microphone",
            description:
                "Microphone access lets you record voice messages. You can change this permission later in Settings.",
            deniedDescription:
                "Microphone access has been disabled. Please enable it in Settings to record a voice message.",
            onGranted: () => {
                setText("");
                setPendingLinkUrl("");
                clearPendingFile();
                setPendingMedia([]);
                setPendingVoice(null);
                setVoiceMode(true);
            },
        });
    }, [
        requestPermissions,
    ]);


    const handleTextChange = (value: string) => {
        setText(value);

        const trimmed = value.trim();

        if (!conversationId) {
            return;
        }

        if (trimmed.length === 0) {

            if (typingTimerRef.current) {
                clearTimeout(typingTimerRef.current);
                typingTimerRef.current = null;
            }

            emitTypingStop(conversationId);
            return;
        }

        emitTypingStart(conversationId);

        if (typingTimerRef.current) {
            clearTimeout(typingTimerRef.current);
        }

        typingTimerRef.current = setTimeout(() => {
            emitTypingStop(conversationId);
        }, 5000);
    };


    const handleSend = async () => {
        if (!conversationId || sendingMessage) return;

        const replyToId = replyingTo?.id ?? null;
        const messageText = text.trim();

        // Sends the typed text as its own message AFTER an attachment.
        // No replyToId here: the reply attaches to the first message only.
        const sendTrailingText = async () => {
            if (!messageText) return;

            if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
            emitTypingStop(conversationId);
            setText("");

            await onSend(messageText, "text", { replyToId: null });
        };

        /* Pending link + optional trailing text */
        if (pendingLinkUrl) {
            const url = pendingLinkUrl;

            // Clear only after a successful send.
            const sent = await onSend(url, "text", { replyToId });

            if (sent === false) return;

            setPendingLinkUrl("");

            await sendTrailingText();
            return;
        }

        /* Voice (no text input in voice mode, so unchanged) */
        if (pendingVoice) {
            const ok = await onSend(pendingVoice.uri, "voice", {
                durationMs: pendingVoice.durationMs,
                waveform: pendingVoice.waveform,
                replyToId,
            });
            if (ok !== false) {
                setPendingVoice(null);
                setVoiceMode(false);
            }
            return;
        }

        /* File + optional text */
        if (pendingFile) {
            const ok = await onSend(pendingFile.uri, "file", { replyToId });
            if (ok === false) return;
            await sendTrailingText();
            return;
        }

        /* Media group + optional text */
        if (pendingMedia.length > 0) {
            const media = pendingMedia[0];
            const ok = await onSend(media.uri, media.type, { replyToId });
            if (ok === false) return;   // don't send the caption if media failed
            await sendTrailingText();
            return;
        }

        /* Text only (unchanged) */
        if (!messageText) return;

        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        emitTypingStop(conversationId);
        setText("");

        await onSend(messageText, "text", { replyToId });
    };


    const handleDeleteVoice = useCallback(async () => {
        await voiceRef.current?.cancel(); 
        setPendingVoice(null);
        setVoiceMode(false);
    }, []);


    if (!conversationId) {
        return null;
    }


    return (
        <>

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

            {pendingMedia.length > 0 && (
                <Animated.View
                    pointerEvents="box-none"
                    style={[
                        {
                            position: "absolute",
                            zIndex: 11,
                            marginLeft: 20,
                        },
                        pendingMediaAnimatedStyle,
                    ]}
                >
                    <PendingMediaRenderer
                        media={pendingMedia}
                        dark={dark}
                        onRemove={(index) => removePendingMediaAt(index)}
                        height={inputContainerHeight.value}
                    />
                </Animated.View>
            )}

            {pendingFile && (
                <Animated.View
                    pointerEvents="box-none"
                    style={[
                        {
                            position: "absolute",
                            zIndex: 11,
                            marginLeft: 20,
                        },
                        pendingMediaAnimatedStyle,
                    ]}
                >
                    <PendingFileRenderer
                        file={pendingFile}
                        dark={dark}
                        onRemove={clearPendingFile}
                        height={inputContainerHeight.value}
                    />
                </Animated.View>
            )}

            {!voiceMode &&
                pendingMedia.length === 0 &&
                !pendingFile &&
                !!pendingLinkUrl && (
                    <Animated.View
                        pointerEvents="box-none"
                        style={[
                            {
                                position: "absolute",
                                zIndex: 11,
                                marginLeft: 20,
                            },
                            pendingMediaAnimatedStyle,
                        ]}
                    >
                        <PendingLinkRenderer
                            url={pendingLinkUrl}
                            dark={dark}
                            height={inputContainerHeight.value}
                            onRemove={handleRemovePendingLink}
                        />
                    </Animated.View>
                )}

            <Animated.View
                ref={rootRef}
                onLayout={(e) => {
                    baseInputHeight.value = e.nativeEvent.layout.height;
                }}
                style={[{ width: "100%", zIndex: 11 }, inputAnimatedStyle]}
            >

                <GradientHeader
                    baseColor={colors.background}
                    fadeSteps={replyingTo ? [0, 0] : [1, 0.85, 0.5, 0]}
                    height={MENU_HEIGHT + 10}
                    direction="bottom"
                    contentStyle={{
                        minHeight: MENU_HEIGHT + 10,
                        maxHeight: 200,
                        paddingHorizontal: 20,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",

                        borderTopLeftRadius: 30,
                        borderTopRightRadius: 30,
                    }}
                >
                    {null}
                </GradientHeader>

                <GradientHeader
                    baseColor={colors.background}
                    fadeSteps={[0,0]}
                    height={MENU_HEIGHT}
                    direction="bottom"
                    contentStyle={{
                        minHeight: MENU_HEIGHT,
                        maxHeight: 200,
                        paddingHorizontal: 20,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",

                        borderTopLeftRadius: 30,
                        borderTopRightRadius: 30,
                    }}
                >
                    {/* Actual message row */}
                    <View
                        style={{
                            height: "100%",
                            width: "100%",
                            flexDirection: "row",
                            justifyContent: "center",
                            bottom: insets.bottom - 5
                        }}
                    >
                        <View
                            style={{
                                alignSelf: "flex-end"
                            }}
                        >
                            {voiceMode ? (
                                <Button
                                    clearBackground
                                    onPress={handleDeleteVoice}
                                    style={{
                                        width: 40,
                                        height: 40,
                                        padding: 0,
                                        borderRadius: 20,
                                        alignItems: "center",
                                        justifyContent: "center",
                                    }}
                                >
                                    <DeleteIcon
                                        color={colors.danger}
                                        size={21}
                                    />
                                </Button>
                            ) : (
                                <ExpandingButton
                                    expanded={showMenu}
                                    clearBackground
                                    anchor="bottom-left"
                                    onPress={() => setShowMenu(true)}
                                    collapsedSize={40}
                                    expandedWidth={200}
                                    expandedHeight={275}
                                    glassEffectStyle="regular"
                                    borderRadius={20}
                                    expandedChildren={
                                        <View
                                            style={{
                                                height: "100%",
                                                width: "100%",
                                                padding: 10,
                                                alignItems: "center",
                                            }}
                                        >
                                            {/* Camera */}
                                            <Pressable
                                                onPress={() => {
                                                    setShowMenu(false);
                                                    handleOpenMediaMessageComposer();
                                                }}
                                                style={{
                                                    width: "100%",
                                                    flex: 1,
                                                    flexDirection: "row",
                                                    alignItems: "center",
                                                    paddingHorizontal: 8,
                                                    gap: 12,
                                                }}
                                            >
                                                <View
                                                    style={{
                                                        width: 50,
                                                        height: 50,
                                                        borderRadius: 999,
                                                        backgroundColor: "#f0edb7",
                                                        justifyContent: "center",
                                                        alignItems: "center",
                                                    }}
                                                >
                                                    <CameraIcon
                                                        color="#373c06"
                                                        size={28}
                                                    />
                                                </View>

                                                <Text
                                                    className={textStyles.body}
                                                    style={{
                                                        color: colors.text,
                                                        fontSize: 17,
                                                    }}
                                                >
                                                    Camera
                                                </Text>
                                            </Pressable>

                                            {/* Gif */}
                                            <Pressable
                                                onPress={() => {
                                                    setShowMenu(false);
                                                    handleOpenStickerComposer();
                                                }}
                                                style={{
                                                    width: "100%",
                                                    flex: 1,
                                                    flexDirection: "row",
                                                    alignItems: "center",
                                                    paddingHorizontal: 8,
                                                    gap: 12,
                                                }}
                                            >
                                                <View
                                                    style={{
                                                        width: 50,
                                                        height: 50,
                                                        borderRadius: 999,
                                                        backgroundColor: "#FFE4F3",
                                                        justifyContent: "center",
                                                        alignItems: "center",
                                                    }}
                                                >
                                                    <StickerIcon
                                                        color="#E83E8C"
                                                        size={28}
                                                    />
                                                </View>

                                                <Text
                                                    className={textStyles.body}
                                                    style={{
                                                        color: colors.text,
                                                        fontSize: 17,
                                                    }}
                                                >
                                                    Sticker
                                                </Text>
                                            </Pressable>

                                            {/* File */}
                                            <Pressable
                                                onPress={() => {
                                                    setShowMenu(false);
                                                    handleOpenFileMessageComposer();
                                                }}
                                                style={{
                                                    width: "100%",
                                                    flex: 1,
                                                    flexDirection: "row",
                                                    alignItems: "center",
                                                    paddingHorizontal: 8,
                                                    gap: 12,
                                                }}
                                            >
                                                <View
                                                    style={{
                                                        width: 50,
                                                        height: 50,
                                                        borderRadius: 999,
                                                        backgroundColor: "#E3F2FF",
                                                        justifyContent: "center",
                                                        alignItems: "center",
                                                    }}
                                                >
                                                    <FileIcon
                                                        color="#2487E8"
                                                        size={28}
                                                    />
                                                </View>

                                                <Text
                                                    className={textStyles.body}
                                                    style={{
                                                        color: colors.text,
                                                        fontSize: 17,
                                                    }}
                                                >
                                                    File
                                                </Text>
                                            </Pressable>

                                            {/* Voice */}
                                            <Pressable
                                                onPress={() => {
                                                    setShowMenu(false);
                                                    handleOpenVoiceMessageComposer();
                                                }}
                                                style={{
                                                    width: "100%",
                                                    flex: 1,
                                                    flexDirection: "row",
                                                    alignItems: "center",
                                                    paddingHorizontal: 8,
                                                    gap: 12,
                                                }}
                                            >
                                                <View
                                                    style={{
                                                        width: 50,
                                                        height: 50,
                                                        borderRadius: 999,
                                                        backgroundColor: "#E8DEFF",
                                                        justifyContent: "center",
                                                        alignItems: "center",
                                                    }}
                                                >
                                                    <MicIcon
                                                        color="#7B3FE4"
                                                        size={28}
                                                    />
                                                </View>

                                                <Text
                                                    className={textStyles.body}
                                                    style={{
                                                        color: colors.text,
                                                        fontSize: 17,
                                                    }}
                                                >
                                                    Audio
                                                </Text>
                                            </Pressable>
                                        </View>
                                    }
                                >
                                    <AddIcon
                                        color={colors.button}
                                        size={20}
                                    />
                                </ExpandingButton>
                            )}
                        </View>

                        <Animated.View
                            ref={inputContainerRef}
                            onLayout={(event) => {
                                const { x, width, height } = event.nativeEvent.layout;

                                inputContainerX.value = x;
                                inputContainerWidth.value = width;

                                inputContainerHeight.value = height;
                            }}
                            style={{
                                flex: 1,
                                minWidth: 0,
                                alignSelf: "flex-end",
                                marginLeft: 8,
                            }}
                        >
                            {voiceMode ? (
                                <VoiceMessageComposer
                                    ref={voiceRef}
                                    dark={dark}
                                    autoStart
                                    onDone={(result) => {
                                        if (
                                            typeof result !== "object" ||
                                            Array.isArray(result) ||
                                            !("uri" in result)
                                        ) {
                                            return;
                                        }
                                        setPendingVoice(result);
                                    }}
                                />
                            ) : (
                                <Input
                                    ref={inputRef}
                                    multiline
                                    value={text}
                                    disabled={sendingMessage}
                                    growDirection="top"
                                    placeholder={replyingTo ? "Reply" : "Message"}
                                    onFocus={handleInputFocus}
                                    onChangeText={handleTextChange}
                                    maxHeight={200}
                                    dark={dark}
                                    containerStyle={{
                                        width: "100%",
                                        borderBottomRightRadius: 17,
                                        borderBottomLeftRadius: 17,
                                        borderTopRightRadius:
                                            pendingMedia.length > 0 ||
                                            pendingFile !== null ||
                                            !!pendingLinkUrl
                                                ? 0
                                                : 17,
                                        borderTopLeftRadius:
                                            pendingMedia.length > 0 ||
                                            pendingFile !== null ||
                                            !!pendingLinkUrl
                                                ? 0
                                                : 17,
                                    }}
                                    style={{
                                        borderTopRightRadius: 0,
                                        borderTopLeftRadius: 0,
                                    }}
                                />
                            )}
                        </Animated.View>

                        {!text.trim() && !voiceMode && (
                            <Animated.View
                                entering={FadeIn.duration(150)}
                                exiting={FadeOut.duration(150)}
                                layout={LinearTransition.duration(220)}
                                style={{
                                    alignItems: "center",
                                    justifyContent: "center",
                                    alignSelf: "flex-end"
                                }}
                            >
                                <View
                                    style={{
                                        marginLeft: 8
                                    }}
                                >
                                    <Button
                                        onPress={handleOpenStickerComposer}
                                    >
                                        <StickerIcon
                                            color={colors.button}
                                            size={26}
                                        />
                                    </Button>
                                </View>
                            </Animated.View>
                        )}

                        <View
                            style={{
                                marginLeft: 8,
                                alignSelf: "flex-end"
                            }}
                        >
                            <Button
                                style={{
                                    width: 50,
                                    height: 40,
                                    padding: 0,
                                    borderRadius: 20,
                                    opacity: sendingMessage ? 0.5 : 1,
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                                disabled={
                                    sendingMessage ||
                                    (
                                        !text.trim() &&
                                        !pendingLinkUrl &&
                                        pendingMedia.length === 0 &&
                                        !pendingFile &&
                                        !pendingVoice
                                    )
                                }
                                clearBackground
                                onPress={handleSend}
                            >
                                <BackIcon
                                    rotate={90}
                                    color={colors.button}
                                    size={21}
                                />
                            </Button>
                        </View>

                    </View>

                </GradientHeader>

            </Animated.View>

        </>
    );
});