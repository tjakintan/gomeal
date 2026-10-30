import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import {
    Dimensions,
    InteractionManager,
    Keyboard,
    View,
} from "react-native";

import {
    useTheme,
} from "@/provider/ThemeProvider";

import {
    MAX_CHAIN_DEPTH,
    useMessage,
} from "@/stores/useMessage";

import {
    useBlockUser,
    useReport,
} from "@/stores/useReport";

import {
    useFeed,
} from "@/stores/useFeed";

import {
    useOverlay,
} from "@/stores/useOverlay";

import { 
    useBottomSheet,
} from "@/stores/useBottomSheet";

import {
    useBanner,
} from "@/stores/useBanner";

import {
    usePostHog,
} from "posthog-react-native";

import {
    useSafeAreaInsets,
} from "react-native-safe-area-context";

import {
    dismissConversationNotifications,
} from "@/notifications/pushNotification";

import {
    useMessageReadListener,
    useNewMessageListener,
    useTypingListener,
} from "@/api/messages.socket";

import {
    Message,
    MessageType,
} from "@/types/messages.types";

import Report from "@/components/ReportComponent";

import {
    MessageHeader,
} from "./messageHeader";

import {
    FILE_PREVIEW_HEIGHT,
    LINK_PREVIEW_HEIGHT,
    MEDIA_PREVIEW_HEIGHT,
    MessageInput,
    MessageInputHandle,
} from "./messageInput";

import {
    MessageList,
} from "./messageList";

import {
    MessageOverlay,
} from "./messageOverlay";
import { downloadMedia, uploadMediaToS3 } from "@/api/post.api";
import { usePendingMedia } from "@/media/store/usePendingMedia";
import { CONTENT_TYPES, getMessageTypeFromUploadType, getMessageUploadType } from "@/types/media.types";

import * as Crypto from "expo-crypto";

import { usePendingFile } from "@/media/store/usePendingFile";
import { isSameDay } from "@/utils/time";
import { useSharedValue } from "react-native-reanimated";
import Block from "@/components/BlockComponent";
import { useNotification } from "@/notifications/useNotification";
import { usePendingLink } from "@/media/store/usePendingLink";
import { isWebsite } from "@/utils/text";

const MessageScreen: React.FC<{
    post_id?: number;
    conversation_id?: number;
    receiver_sub?: string;
    onClose?: () => void;
    dark?: boolean;
    onAllowToOpenProfile?: boolean;
}> = ({
    post_id,
    conversation_id,
    receiver_sub,
    onClose,
    dark,
    onAllowToOpenProfile = true,
}) => {

    const { colors } = useTheme(
        dark ? "dark" : undefined
    );

    const messageInputRef = useRef<MessageInputHandle>(null);

    const messageInputBottom = useSharedValue(0);

    const [bottomInset, setBottomInset] = useState(0);

    type Rect = { x: number; y: number; width: number; height: number };

    const measureInWindow = (ref: View | null) =>
        new Promise<Rect | null>((resolve) => {
            if (!ref) return resolve(null);
            ref.measureInWindow((x, y, width, height) =>
                resolve({ x, y, width, height })
            );
        });

    const banner = useBanner();
    const posthog = usePostHog();

    const {
        blockUser,
        loadingBlockUser,
    } = useBlockUser();

    const {
        reportTarget,
    } = useReport();

    const insets = useSafeAreaInsets();

    const sendMessage = useMessage((state) => state.sendMessage);
    const sendMessages = useMessage((state) => state.sendMessages);
    const markAsRead = useMessage((state) => state.markAsRead);
    const sendingMessage = useMessage((state) => state.sendingMessage);
    const conversations = useMessage((state) => state.conversations);
    const loadConversation = useMessage((state) => state.loadConversation);
    const deleteMessage = useMessage((state) => state.deleteMessage);
    const loadInbox = useMessage((state) => state.loadInbox);
    const clearConversation = useMessage((state) => state.clearConversation);
    const replyingTo = useMessage((state) => state.replyingTo);
    const setReplyingTo = useMessage((state) => state.setReplyingTo);

    const deleteNotification = useNotification((s) => s.deleteNotification);

    const pendingMedia =
        usePendingMedia(
            (state) => state.pendingMedia
        );

    const setPendingMedia =
        usePendingMedia(
            (state) => state.setPendingMedia
        );

    const pendingFile =
        usePendingFile(
            (state) => state.pendingFile
        );

    const clearPendingFile =
        usePendingFile(
            (state) => state.clearPendingFile
        );
        
    const selectedScope = useFeed(
        (state) => state.selectedScope
    );

    const openOverlay = useOverlay(
        (state) => state.openOverlay
    );

    const closeOverlay = useOverlay(
        (state) => state.closeOverlay
    );

    const otherUser =
        conversations?.other_user;

    const rootRef =
        useRef<View>(null);

    const bubbleRefs = useRef<
        Record<number, View | null>
    >({});

    const messageRowRefs = useRef<
        Record<number, View | null>
    >({});

    const [containerOffset, setContainerOffset] =
        useState({
            x: 0,
            y: 0,
        });

    const [bubbleRect, setBubbleRect] =
        useState({
            x: 0,
            y: 0,
            width: 0,
            height: 0,
        });

    const [menuSize, setMenuSize] =
        useState({
            width: 0,
            height: 0,
        });
        
    const [
        selectedMessage,
        setSelectedMessage,
    ] = useState<Message | null>(null);


    const [
        checkedMessages,
        setCheckedMessages,
    ] = useState<number[]>([]);

    const [
        isSelecting,
        setIsSelecting,
    ] = useState(false);

    const [
        hasLoadedConversation,
        setHasLoadedConversation,
    ] = useState(false);

    const activeConversationId =
        conversations?.conversation.id ??
        null;

    const isOtherUserTyping =
        useMessage((state) =>
            activeConversationId
                ? state.typingUsers[
                      activeConversationId
                  ]
                : false
        );

    /*
     * Socket listeners
     */
    useTypingListener(
        activeConversationId
    );

    useMessageReadListener(
        activeConversationId
    );

    useNewMessageListener(
        activeConversationId
    );

    /*
     * Conversation loading
     */
    useEffect(() => {
        let cancelled = false;

        const init = async () => {
            setHasLoadedConversation(false);
            setSelectedMessage(null);

            const data =
                await loadConversation(
                    post_id,
                    conversation_id,
                    receiver_sub
                );

            if (cancelled) return;

            if (data?.conversation?.id) {
                const id = data.conversation.id;

                const hasNotification = useNotification
                    .getState()
                    .notifications?.message.some((m) => m.conversation_id === id);

                await Promise.all([
                    markAsRead(id),
                    dismissConversationNotifications(id),
                    hasNotification
                        ? deleteNotification({ action_type: "message", conversation_id: id }).catch(() => false)
                        : Promise.resolve(),
                ]);
            }

            setHasLoadedConversation(true);
        };

        init();

        return () => {
            cancelled = true;
        };
    }, [
        post_id,
        conversation_id,
        receiver_sub,
    ]);

    /*
     * Root positioning
     */
    useEffect(() => {
        const measureGap = () => {
            rootRef.current?.measureInWindow(
                (x, y) => {
                    setContainerOffset({
                        x,
                        y,
                    });
                }
            );
        };

        const interactionHandle =
            InteractionManager.runAfterInteractions(
                measureGap
            );

        return () => {
            interactionHandle.cancel();
        };
    }, []);

    /*
     * Message selection
     */
    const handleSelectMessage = async (message: Message) => {
        const sheet = useBottomSheet.getState();
        const sheetOpen = sheet.stack[sheet.stack.length - 1]?.source === "input";

        // Keyboard/sheet closing moves the list (spacer shrinks), so settle first
        if (Keyboard.isVisible() || sheetOpen) {
            Keyboard.dismiss();
            if (sheetOpen) sheet.closeBottomSheet();
            await new Promise((r) => setTimeout(r, 300));
        }

        const [bubble, root] = await Promise.all([
            measureInWindow(bubbleRefs.current[message.id]),
            measureInWindow(rootRef.current),
        ]);
        if (!bubble || !root) return;

        const previewHeight =
            pendingMedia.length > 0 ? MEDIA_PREVIEW_HEIGHT
            : pendingFile ? FILE_PREVIEW_HEIGHT
            : usePendingLink.getState().pendingLinkUrl ? LINK_PREVIEW_HEIGHT
            : 0;

        // messageInputBottom = how much the input stack covers from the bottom
        const inputCover = messageInputBottom.value + insets.bottom;

        // one batch, so the overlay never renders with a stale rect
        setMenuSize({ width: 0, height: 0 });
        setContainerOffset({ x: root.x, y: root.y });
        setBubbleRect(bubble);
        setBottomInset(inputCover + previewHeight);
        setSelectedMessage(message);
    };


    const selectedMessageGroup = useMemo(() => {
        if (!selectedMessage?.media_group_id) {
            return undefined;
        }

        return conversations?.messages
            ?.filter(
                (message) =>
                    message.media_group_id ===
                        selectedMessage.media_group_id &&
                    message.sender_sub ===
                        selectedMessage.sender_sub
            )
            .reverse();
    }, [
        conversations?.messages,
        selectedMessage,
    ]);
        

    const handleMessagePress = (
        message: Message
    ) => {
        if (
            selectedMessage &&
            selectedMessage.id !== message.id
        ) {
            setSelectedMessage(null);
        }
    };

    /*
     * Selection
     */
    const toggleChecked = (
        messageId: number
    ) => {
        setCheckedMessages(
            (prev) =>
                prev.includes(messageId)
                    ? prev.filter(
                          (id) =>
                              id !== messageId
                      )
                    : [
                          ...prev,
                          messageId,
                      ]
        );
    };

    const cancelSelection = () => {
        setIsSelecting(false);
        setCheckedMessages([]);
    };

    /*
     * Delete selected messages
     */
    const handleDeleteMessages =
        async () => {

            if (
                !conversations?.conversation?.id ||
                checkedMessages.length === 0
            ) {
                return;
            }

            const conversationId =
                conversations.conversation.id;

            const idsToDelete = [
                ...checkedMessages,
            ];

            setCheckedMessages([]);
            setIsSelecting(false);
            setSelectedMessage(null);

            await Promise.all(
                idsToDelete.map((id) =>
                    deleteMessage(
                        id,
                        conversationId
                    )
                )
            );
        };


    /*
     * Report user
     */
    const openReport = () => {
        if (!otherUser?.sub) {
            return;
        }

        openOverlay({
            custom: (
                <Report
                    dark={dark}
                    profile_name={
                        otherUser.profile_name
                    }
                    target_user_sub={
                        otherUser.sub
                    }
                    target_id={otherUser.sub}
                    target_type="user"
                    onReported={() => {
                        posthog.capture(
                            "[Trust] => user_reported",
                            {
                                target_sub:
                                    otherUser.sub,
                            }
                        );

                        closeOverlay();
                        onClose?.();
                        loadInbox();
                    }}
                />
            ),
        });
    };


    /*
    * Block user
    */
    const openBlock = () => {
        if (!otherUser?.sub) {
            return;
        }

        openOverlay({
            custom: (
                <Block
                    dark={dark}
                    target_user_sub={otherUser.sub}
                    profile_name={otherUser.profile_name}
                    onBlocked={async () => {
                        posthog.capture(
                            "[Trust] => user_blocked",
                            {
                                target_sub: otherUser.sub,
                                source: "message",
                            }
                        );

                        closeOverlay();
                        onClose?.();

                        await loadInbox();
                    }}
                    onCancel={closeOverlay}
                />
            ),
        });
    };

    /*
     * Report message
     */
    const handleReportMessage = (
        messageId: number
    ) => {
        posthog.capture(
            "[Trust] => message_reported",
            {
                message_id: messageId,
            }
        );

        reportTarget(
            messageId,
            "message"
        );

        banner.success(
            "Message reported, To delete message hold down the message."
        );

        setSelectedMessage(null);
    };

    // reply
    const [replyChainIds, setReplyChainIds] = useState<number[] | null>(null);


    const getReplyChainIds = useCallback(
        (message: Message): number[] => {
            const allMessages = conversations?.messages ?? [];
            const byId = new Map(allMessages.map((m) => [m.id, m]));

            const childrenByParentId = new Map<number, Message[]>();

            for (const m of allMessages) {
                if (m.reply_to_id == null) continue;

                const children = childrenByParentId.get(m.reply_to_id) ?? [];
                children.push(m);
                childrenByParentId.set(m.reply_to_id, children);
            }

            // Walk upward to the oldest available ancestor.
            const ancestors: Message[] = [];
            const ancestorVisited = new Set<number>();
            let current: Message | undefined = message;

            while (current && !ancestorVisited.has(current.id)) {
                ancestorVisited.add(current.id);
                ancestors.unshift(current);

                if (
                    current.reply_to_id == null ||
                    ancestors.length >= MAX_CHAIN_DEPTH
                ) {
                    break;
                }

                current = byId.get(current.reply_to_id);
            }

            // Start with the selected message and collect every branch.
            const descendants: Message[] = [];
            const visited = new Set<number>(ancestors.map((m) => m.id));
            const queue: { id: number; depth: number }[] = [
                { id: message.id, depth: 0 },
            ];

            while (queue.length > 0) {
                const { id, depth } = queue.shift()!;

                if (depth >= MAX_CHAIN_DEPTH) continue;

                const children = childrenByParentId.get(id) ?? [];

                for (const child of children) {
                    if (visited.has(child.id)) continue;

                    visited.add(child.id);
                    descendants.push(child);
                    queue.push({ id: child.id, depth: depth + 1 });
                }
            }

            return [
                ...ancestors.map((m) => m.id),
                ...descendants
                    .sort((a, b) => {
                        const timeDiff =
                            new Date(a.sent_at).getTime() -
                            new Date(b.sent_at).getTime();

                        return timeDiff || a.id - b.id;
                    })
                    .map((m) => m.id),
            ];
        },
        [conversations?.messages],
    );


    const handleReplyMessage = useCallback(
        (message: Message) => {
            if (message.message_type === "gif") {
                setSelectedMessage(null);
                return;
            }

            setReplyChainIds(getReplyChainIds(message));
            setReplyingTo(message);
            setSelectedMessage(null);
        },
        [getReplyChainIds, setReplyingTo]
    );


    useEffect(() => {
        if (!replyingTo) {
            setReplyChainIds(null);
            return;
        }

        setReplyChainIds(getReplyChainIds(replyingTo));
    }, [
        replyingTo?.id,
        conversations?.messages,
        getReplyChainIds,
    ]);


    /*
    * Send message
    */
    const handleSend = async (
        message: string,
        messageType: MessageType = "text",
        meta?: { durationMs?: number; waveform?: number[]; replyToId?: number | null }
    ): Promise<boolean | void> => {

        if (!activeConversationId) {
            return;
        }


        const replyToId = meta?.replyToId ?? null;


        /*
        * Text or link message
        */
        if (messageType === "text") {
            const trimmedMessage = message.trim();

            if (!trimmedMessage) return;

            const messageTypeToSend: MessageType =
                isWebsite(trimmedMessage) ? "link" : "text";

            const sent = await sendMessage(
                activeConversationId,
                trimmedMessage,
                messageTypeToSend,
                null,
                undefined,
                undefined,
                undefined,
                undefined,
                replyToId
            );

            if (sent && replyToId != null) {
                setReplyingTo(sent);
            }

            return;
        }


        /*
        * Voice message
        */
        if (messageType === "voice") {
            try {
                const s3Url = await uploadMediaToS3(
                    message,
                    "audio",
                    "message_voice",
                    "audio/mp4"
                );

                if (!s3Url) {
                    return false;
                }

                const sent = await sendMessage(
                    activeConversationId,
                    s3Url,
                    "voice",
                    null,
                    undefined,
                    undefined,
                    meta?.durationMs,
                    meta?.waveform,
                    replyToId 
                );

                if (sent && replyToId != null) setReplyingTo(sent);

                return sent !== null;

            } catch (err) {
                console.error("Error sending voice message:", err);
                return false;
            }
        }


        /*
        * File message
        */
        if (messageType === "file") {

            if (!pendingFile) {
                return;
            }

            try {

                clearPendingFile();

                const s3Url =
                    await uploadMediaToS3(
                        pendingFile.uri,
                        "file",
                        "message_file",
                        pendingFile.mimeType
                    );

                if (!s3Url) {
                    return;
                }

                const sent = await sendMessage(
                    activeConversationId,
                    s3Url,
                    "file",
                    null,
                    pendingFile.name,
                    pendingFile.size,
                    undefined,
                    undefined,
                    replyToId   
                );

                if (sent && replyToId != null) setReplyingTo(sent);


            } catch (err) {

                console.error(
                    "Error sending file:",
                    err
                );
            }

            return;
        }

        /*
        * Snapshot the current selection.
        */
        const mediaItems =
            [...pendingMedia];


        if (mediaItems.length === 0) {
            return;
        }


        /*
        * All media sent in this action
        * share the same group ID.
        */
        const mediaGroupId =
            Crypto.randomUUID();


        try {

            setPendingMedia([]);

            const messages: {
                content: string;
                message_type: MessageType;
                media_group_id: string;
                reply_to_id?: number | null;
            }[] = [];


            for (const media of mediaItems) {

                /*
                * Convert the pending media type
                * into the S3 upload type.
                */
                const uploadType =
                    getMessageUploadType(
                        media.type
                    );


                if (!uploadType) {
                    continue;
                }


                /*
                * Convert the upload type back into
                * the database message type.
                */
                const currentMessageType =
                    getMessageTypeFromUploadType(
                        uploadType
                    );


                if (!currentMessageType) {
                    continue;
                }


                /*
                * Determine the actual content type
                * of the local file.
                */
                const contentType =
                    CONTENT_TYPES[
                        media.type
                    ];


                /*
                * Local file → S3.
                */
                const s3Url =
                    await uploadMediaToS3(
                        media.uri,
                        media.type,
                        uploadType,
                        contentType
                    );


                if (!s3Url) {
                    continue;
                }


                messages.push({
                    content: s3Url,

                    message_type:
                        currentMessageType,

                    media_group_id:
                        mediaGroupId,
                });
            }


            if (messages.length === 0) {
                return;
            }


            if (replyToId != null) {
                for (const message of messages) {
                    message.reply_to_id = replyToId;
                }
            }

            /*
            * Send all media messages.
            */
            const sent = await sendMessages(
                activeConversationId,
                messages,
                
            );

            if (sent.length && replyToId != null) setReplyingTo(sent[sent.length - 1]);

        } catch (err) {

            console.error(
                "Error sending media:",
                err
            );
        }
    };


    /*
    * Send GIF / meme
    */
    const handleSendGif = useCallback(
        async (uri: string, replyToId?: number | null) => {
            if (!activeConversationId || !uri) return;
            try {
                const downloaded = await downloadMedia(uri, "gif");
                const s3Url = await uploadMediaToS3(
                    downloaded.uri,
                    downloaded.mediaType,
                    "message_gif",
                    downloaded.contentType
                );
                if (!s3Url) return;

                const sent = await sendMessage(
                    activeConversationId,
                    s3Url,
                    "gif",
                    null,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    replyToId ?? null
                );

                if (sent && replyToId != null) setReplyingTo(sent);
            } catch (err) {
                console.error("Error sending GIF:", err);
            }
        },
        [activeConversationId, sendMessage, setReplyingTo]
    );


    const HEADER_HEIGHT = otherUser
        ? 70
        : 50;

    const bubbleMaxWidth =
        Dimensions.get("window").width *
        0.65;


    useEffect(() => {
        if (!conversation_id) return 
        useMessage.getState().setViewingConversation(conversation_id);
        return () => useMessage.getState().setViewingConversation(null);
    }, [conversation_id]);


    return (
        <View
            ref={rootRef}
            style={{
                flex: 1,
                backgroundColor: colors.background,
            }}
            onLayout={(e) => {
                const { width, height } = e.nativeEvent.layout;

                rootRef.current?.measureInWindow((x, y) => {
                    setContainerOffset({ x, y });
                });
            }}
        >
            <View
                style={{
                    flex: 1,
                }}
            >
                <MessageList
                    messages={
                        conversations?.messages ?? []
                    }
                    senderSub={
                        conversations?.sender_sub
                    }
                    dark={dark}
                    headerHeight={HEADER_HEIGHT}
                    bubbleMaxWidth={bubbleMaxWidth}
                    isOtherUserTyping={
                        isOtherUserTyping
                    }
                    hasLoadedConversation={
                        hasLoadedConversation
                    }
                    selectedMessage={
                        selectedMessage
                    }
                    isSelecting={
                        isSelecting
                    }
                    checkedMessages={
                        checkedMessages
                    }
                    bubbleRefs={
                        bubbleRefs
                    }
                    onSelectMessage={
                        handleSelectMessage
                    }
                    onMessagePress={
                        handleMessagePress
                    }
                    onToggleChecked={
                        toggleChecked
                    }
                    onCancelSelection={
                        cancelSelection
                    }
                    replyingTo={
                        replyingTo
                    }
                    replyChainIds={
                        replyChainIds
                    }
                    messageRowRefs={
                        messageRowRefs
                    }
                    onCancelReply={() => setReplyingTo(null)}
                    onReplyMessage={handleReplyMessage}
                    messageInputBottom={messageInputBottom} 
                    getReplyChainIds={getReplyChainIds} 
                />
            </View>

            {!isSelecting && (
                <MessageInput
                    ref={messageInputRef}
                    conversationId={
                        activeConversationId
                    }
                    sendingMessage={
                        sendingMessage
                    }
                    dark={dark}
                    onSend={handleSend}
                    onSendGif={handleSendGif}
                    replyingTo={replyingTo}    
                    messageInputBottom={messageInputBottom}         
                />
            )}

            <MessageOverlay
                selectedMessage={
                    selectedMessage
                }
                selectedMessageGroup={
                    selectedMessageGroup
                }
                isSelecting={
                    isSelecting
                }
                checkedMessages={
                    checkedMessages
                }
                dark={dark}
                senderSub={
                    conversations?.sender_sub
                }
                containerOffset={
                    containerOffset
                }
                bubbleRect={bubbleRect}
                menuSize={menuSize}
                onMenuSize={(
                    width,
                    height
                ) =>
                    setMenuSize({
                        width,
                        height,
                    })
                }
                onStartSelecting={() => {
                    setIsSelecting(true);
                    setCheckedMessages([]);
                }}
                onDeleteMessages={
                    handleDeleteMessages
                }
                onCancelSelection={
                    cancelSelection
                }
                onCloseSelected={() =>
                    setSelectedMessage(null)
                }
                onReportMessage={
                    handleReportMessage
                }
                onReplyMessage={handleReplyMessage} 
                selectedMessageShowsDate
            />

            <MessageHeader
                otherUser={otherUser}
                dark={dark}
                isSelecting={isSelecting}
                loadingBlockUser={
                    loadingBlockUser
                }
                onClose={onClose}
                onReport={openReport}
                onBlock={openBlock}
                onClearConversation={
                    clearConversation
                }
            />
        </View>
    );
};

export default MessageScreen;