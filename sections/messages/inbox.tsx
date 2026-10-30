import { Button } from "@/components/ButtonComponent";
import { SectionHeader } from "@/components/SectionComponent";
import { AvatarRender, DynamicAvatarRenderer } from "@/dashboard/Avatar";
import { DeleteIcon, SendIcon, GalleryIcon, MicIcon, FileIcon, SearchIcon, XIcon, LinkIcon } from "@/icons/Icon";
import { useTheme } from "@/provider/ThemeProvider";
import { useMessage } from "@/stores/useMessage";
import { useEffect, useState, useRef, useMemo } from "react";
import { Animated, Dimensions, Keyboard, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MessageScreen from "../messages/messages";
import { InboxConversation } from "@/types/messages.types";
import { useFeed } from "@/stores/useFeed";
import { formatCount } from "@/utils/time";
import { GradientHeader } from "@/components/GradientComponent";
import { Swipeable, ScrollView } from "react-native-gesture-handler";
import { dismissConversationNotifications } from "@/notifications/pushNotification";
import { useSlidingOverlay } from "@/stores/useSlideOverlay";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Input } from "@/components/InputComponent";
import { MinimumProfile } from "@/types/profile.types";
import { get_user_search_api } from "@/api/search.api";
import { NAV_SIZE } from "../Navigate";
import { limitLength } from "@/utils/text";



const getLastMessagePreview = (item: InboxConversation) => {
    const message = item.last_message;

    if (!message) {
        return {
            text: "No messages yet",
            type: "text",
        };
    }

    switch (message.message_type) {
        case "image":
            return {
                text: "Photo",
                type: "image",
            };

        case "video":
            return {
                text: "Video",
                type: "video",
            };

        case "gif":
            return {
                text: "GIF",
                type: "gif",
            };

        case "voice":
            return {
                text: "Voice message",
                type: "voice",
            };

        case "file":
            return {
                text: "File",
                type: "file",
            };

        case "link":
            return {
                text: message.content,
                type: "link",
            };

        case "text":
        default:
            return {
                text: message.content,
                type: "text",
            };
    }
};


const InboxMessageScreen = ({
    conversation_id,
    receiver_sub,
    onClose,
}: {
    conversation_id?: number;
    receiver_sub?: string;
    onClose: () => void;
}) => {
    const { colors } = useTheme();

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <MessageScreen
                onClose={onClose}
                conversation_id={conversation_id}
                receiver_sub={receiver_sub}
            />
        </View>
    );
};


const MENU_HEIGHT = 65;


export const Inbox: React.FC<{
  isFocused?: boolean;
}> = ({ isFocused }) => {

    const insets = useSafeAreaInsets();
    const { colors, textStyles } = useTheme();

    const inbox = useMessage((s) => s.inbox);
    const lastInteractedAt = useMessage((s) => s.lastInteractedAt);

    const loadInbox = useMessage((s) => s.loadInbox);
    const loadConversation = useMessage((s) => s.loadConversation);
    const markAsRead = useMessage((s) => s.markAsRead);
    const deleteConversation = useMessage((s) => s.deleteConversation);
    const touchConversation = useMessage((s) => s.touchConversation);

    const { clearActiveProfile } = useFeed();
    const { openSlidingOverlay, closeSlidingOverlay } = useSlidingOverlay();

    const [swipingConversationId, setSwipingConversationId] = useState<number | null>(null);
    const [activeConversation, setActiveConversation] = useState<InboxConversation | null>(null);
    const [isConversationOpen, setIsConversationOpen] = useState(false);


    const [search, setSearch] = useState("");
    const [userResults, setUserResults] = useState<MinimumProfile[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);


    const trimmed = search.trim();
    const isSearching = trimmed.length >= 3;


    const swipeableRefs = useRef(
        new Map<number, Swipeable>()
    );


    const activeSwipeId = useRef<number | null>(null);


    const handleCloseProfile = () => {
        closeSlidingOverlay();
        clearActiveProfile();
    };


    const sortedInbox = useMemo(() => {
        const getSortKey = (item: InboxConversation) => {
            const localTouch = lastInteractedAt[item.conversation.id] ?? 0;
            const serverTime = item.last_message?.sent_at
                ? new Date(item.last_message.sent_at).getTime()
                : 0;
            return Math.max(localTouch, serverTime);
        };

        return [...inbox].sort((a, b) => getSortKey(b) - getSortKey(a));
    }, [inbox, lastInteractedAt]);


    const visibleInbox = useMemo(() => {
        return sortedInbox.filter((item) => item.last_message != null);
    }, [sortedInbox]);


    const filteredInbox = useMemo(() => {
        if (!trimmed) return visibleInbox;

        const q = trimmed.toLowerCase();

        return visibleInbox.filter((item) =>
            item.other_user.profile_name.toLowerCase().includes(q)
        );
    }, [visibleInbox, trimmed]);


    const existingSubs = useMemo(
        () => new Set(visibleInbox.map((item) => item.other_user.sub)),
        [visibleInbox]
    );


    const newPeople = useMemo(
        () => userResults.filter((user) => !existingSubs.has(user.sub)),
        [userResults, existingSubs]
    );

    
    const hasInboxMatch = filteredInbox.length > 0;

    const showPeopleDropdown =
        isSearching &&
        !isConversationOpen &&
        !hasInboxMatch;
        

    const startChat = (user: MinimumProfile) => {

        Keyboard.dismiss();
        
        setIsConversationOpen(true);

        openSlidingOverlay(
            <InboxMessageScreen
                receiver_sub={user.sub}
                onClose={() => {
                    setIsConversationOpen(false);
                    closeSlidingOverlay();
                    loadInbox();
                }}
            />
        );

        setSearch("");
    };


    useEffect(() => {
        if (!isFocused) {
            handleCloseProfile();
        }
    }, [isFocused]);


    useEffect(() => {
        const { pendingConversation } = useMessage.getState();

        if (pendingConversation) {
            setActiveConversation(pendingConversation);
            useMessage.setState({ pendingConversation: null });
        }

        loadInbox();
    }, []);


    useEffect(() => {
        if (!isSearching) {
            setUserResults([]);
            setSearchLoading(false);
            return;
        }

        let cancelled = false;
        setSearchLoading(true);

        const t = setTimeout(async () => {
            try {
                const res = await get_user_search_api(trimmed);
                if (!cancelled) setUserResults(res ?? []);
            } catch (err) {
                console.error("Inbox user search failed:", err);
            } finally {
                if (!cancelled) setSearchLoading(false);
            }
        }, 300);

        return () => {
            cancelled = true;
            clearTimeout(t);
        };
    }, [trimmed, isSearching]);

 
    return (
        <View
            style={{
                ...StyleSheet.absoluteFillObject,
            }}
        >

            <GradientHeader
                height={MENU_HEIGHT}
                baseColor={colors.background}
                contentStyle={{
                    height: MENU_HEIGHT,
                    paddingHorizontal: 10,
                    justifyContent: "center",
                    alignItems: "stretch",
                }}
            >
                <Input
                    multiline={false}
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search"
                    onIconPress={() => {
                        if (showPeopleDropdown) {
                            setSearch("");
                            setUserResults([]);
                            Keyboard.dismiss();
                        }
                    }}
                    iconBackground={showPeopleDropdown && newPeople.length !== 0}
                    leftIcon={
                        showPeopleDropdown && newPeople.length !== 0 ? (
                            <XIcon color={colors.danger} size={24} />
                        ) : (
                            <SearchIcon color={colors.text} size={24} />
                        )
                    }
                />
            </GradientHeader>

            {/* People search dropdown */}
            {showPeopleDropdown && newPeople.length !== 0 && (
                <View
                    style={{
                        position: "absolute",
                        top: MENU_HEIGHT + 5,
                        left: 10,
                        right: 10,
                        zIndex: 100,
                        elevation: 10,
                        height: 200,
                        overflow: "hidden",
                        borderRadius: 15,
                        padding: 5,
                        backgroundColor: colors.card,
                    }}
                >

                    {searchLoading && newPeople.length === 0 ? (
                        <View style={{ paddingTop: 8 }}>
                            <EmptyUserSearch />
                        </View>
                    ) : (
                        <ScrollView
                            keyboardShouldPersistTaps="handled"
                            nestedScrollEnabled
                            showsVerticalScrollIndicator
                        >
                            {newPeople.map((user) => (
                                <View
                                    key={user.sub}
                                    style={{
                                        width: "100%",
                                        minHeight: 64,
                                        paddingHorizontal: 10,
                                        paddingVertical: 8,
                                        flexDirection: "row",
                                        alignItems: "center",
                                        gap: 12,
                                    }}
                                >
                                    {/* User details — tap to start chat */}
                                    <TouchableOpacity
                                        activeOpacity={0.7}
                                        onPress={() => startChat(user)}
                                        style={{
                                            flex: 1,
                                            minWidth: 0,
                                            flexDirection: "row",
                                            alignItems: "center",
                                            gap: 12,
                                        }}
                                    >
                                        <DynamicAvatarRenderer
                                            avatar={user.avatar}
                                            badge={user.badge}
                                            showBadge
                                            background
                                            size={30}
                                        />

                                        <View
                                            style={{
                                                flex: 1,
                                                minWidth: 0,
                                                justifyContent: "center",
                                            }}
                                        >
                                            <Text
                                                className={textStyles.body}
                                                numberOfLines={1}
                                                style={{ color: colors.text }}
                                            >
                                                {limitLength(user.profile_name, 20)}
                                            </Text>

                                            <Text
                                                className={textStyles.small}
                                                numberOfLines={1}
                                                style={{ color: colors.secondaryText }}
                                            >
                                                {limitLength(user.firstName ?? "", 10)} {limitLength(user.lastName ?? "", 20)}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>

                                    {/* Send icon — far right */}
                                    <TouchableOpacity
                                        activeOpacity={0.65}
                                        onPress={() => startChat(user)}
                                        hitSlop={8}
                                        style={{
                                            width: 40,
                                            height: 40,
                                            alignItems: "center",
                                            justifyContent: "center",
                                            borderRadius: 999,
                                            backgroundColor: colors.button,
                                            marginRight: 5,
                                        }}
                                    >
                                        <SendIcon
                                            size={22}
                                            color={colors.text}
                                        />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </ScrollView>
                    )}
                </View>
            )}

            <ScrollView
                showsVerticalScrollIndicator
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
                directionalLockEnabled={false}
                contentContainerStyle={{
                    paddingTop: showPeopleDropdown
                        ? MENU_HEIGHT + 200
                        : MENU_HEIGHT,
                    paddingBottom: NAV_SIZE + insets.bottom,
                }}
            >
                {filteredInbox.map((item) => (
                    <TouchableOpacity
                        activeOpacity={1}
                        key={item.conversation.id}
                    >
                    <Swipeable
                        
                        ref={(ref) => {
                            if (ref) {
                                swipeableRefs.current.set(item.conversation.id, ref);
                            } else {
                                swipeableRefs.current.delete(item.conversation.id);
                            }
                        }}
                        friction={1.5}
                        leftThreshold={40}
                        rightThreshold={40}
                        dragOffsetFromLeftEdge={10}
                        dragOffsetFromRightEdge={10}
                        overshootLeft={false}
                        overshootRight={false}
                        enableTrackpadTwoFingerGesture
                        onSwipeableWillOpen={() => {
                            const nextId = item.conversation.id;
                            const previousId = activeSwipeId.current;

                            if (previousId !== null && previousId !== nextId) {
                                swipeableRefs.current.get(previousId)?.close();
                            }

                            activeSwipeId.current = nextId;
                            setSwipingConversationId(nextId);
                        }}
                        onSwipeableClose={() => {
                            if (activeSwipeId.current === item.conversation.id) {
                                activeSwipeId.current = null;
                                setSwipingConversationId(null);
                            }
                        }}
                        renderLeftActions={(progress, dragX) => {
                            const scale = dragX.interpolate({
                                inputRange: [0, 50],
                                outputRange: [0, 1],
                                extrapolate: "clamp",
                            });

                            return (
                                <View
                                    style={{
                                        height: 85,
                                        width: 85,
                                        justifyContent: "center",
                                        alignItems: "center",
                                    }}
                                >
                                    <Animated.View style={{ transform: [{ scale }] }}>
                                        <Button
                                            onPress={() =>
                                                deleteConversation(item.conversation.id)
                                            }
                                            clearBackground
                                        >
                                            <DeleteIcon color={colors.danger} />
                                        </Button>
                                    </Animated.View>
                                </View>
                            );
                        }}
                    >
                        <Button
                            onPress={async () => {
                                Keyboard.dismiss();
                                
                                setIsConversationOpen(true);

                                await loadConversation(undefined, item.conversation.id);

                                openSlidingOverlay(
                                    <InboxMessageScreen
                                        conversation_id={item.conversation.id}
                                        onClose={() => {
                                            setIsConversationOpen(false);
                                            closeSlidingOverlay();
                                        }}
                                    />
                                );

                                touchConversation(item.conversation.id);

                                await markAsRead(item.conversation.id);
                                dismissConversationNotifications(item.conversation.id);

                                setSearch("");
                            }}
                            style={{
                                width: "100%",
                                height: 85,
                                borderRadius: 0,
                                paddingHorizontal: 14,
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "flex-start",
                                gap: 12,
                                backgroundColor: swipingConversationId === item.conversation.id
                                    ? colors.secondaryCard
                                    : colors.background,
                            }}
                        >
                            <DynamicAvatarRenderer 
                                avatar={item.other_user.avatar} 
                                badge={item.other_user.badge} 
                                showBadge 
                                background  
                                size={25} 
                            />

                            <View style={{ flex: 1, alignItems: "flex-start" }}>
                                <Text
                                    className={textStyles.body}
                                    numberOfLines={1}
                                    style={{ color: colors.text, fontSize: 15 }}
                                >
                                    {item.other_user.profile_name}
                                </Text>

                                {(() => {
                                    const preview = getLastMessagePreview(item);
                                    const isMedia = preview.type !== "text";

                                    return (
                                        <View
                                            style={{
                                                flexDirection: "row",
                                                alignItems: "center",
                                                gap: 5,
                                            }}
                                        >
                                            {preview.type === "image" && (
                                                <GalleryIcon color={colors.button} size={15} />
                                            )}

                                            {preview.type === "video" && (
                                                <GalleryIcon color={colors.button} size={15} />
                                            )}

                                            {preview.type === "gif" && (
                                                <GalleryIcon color={colors.button} size={15} />
                                            )}

                                            {preview.type === "voice" && (
                                                <MicIcon color={colors.button} size={15} />
                                            )}

                                            {preview.type === "file" && (
                                                <FileIcon color={colors.button} size={15} />
                                            )}

                                            {preview.type === "link" && (
                                                <LinkIcon color={colors.button} size={15} />
                                            )}

                                            <Text
                                                className={textStyles.body}
                                                numberOfLines={1}
                                                style={{
                                                    color: isMedia || preview.type === "link"
                                                        ? colors.button
                                                        : colors.secondaryText,
                                                    fontSize: 12,
                                                }}
                                            >
                                                {preview.text}
                                            </Text>
                                        </View>
                                    );
                                })()}
                            </View>

                            {item.unread_count > 0 && (
                                <View
                                    style={{
                                        minWidth: 22,
                                        height: 22,
                                        borderRadius: 999,
                                        paddingHorizontal: 7,
                                        alignItems: "center",
                                        justifyContent: "center",
                                        backgroundColor: colors.button,
                                    }}
                                >
                                    <Text
                                        style={{
                                            color: "white",
                                            fontSize: 10,
                                            fontWeight: "800",
                                            lineHeight: 12,
                                            textAlign: "center",
                                        }}
                                        numberOfLines={1}
                                    >
                                        {formatCount(item.unread_count)}
                                    </Text>
                                </View>
                            )}
                        </Button>
                    </Swipeable>
                    </TouchableOpacity>
                ))}
            </ScrollView>

        </View>
    );
};


const EmptyUserSearch = ({ dark }: { dark?: boolean }) => {
    const { colors } = useTheme(dark ? "dark" : undefined);

    const opacity = useRef(new Animated.Value(0.45)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: 0.9,
                    duration: 700,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0.45,
                    duration: 700,
                    useNativeDriver: true,
                }),
            ])
        );

        animation.start();

        return () => animation.stop();
    }, [opacity]);

    const bone = (
        width: number | `${number}%`,
        height: number,
        radius = 8
    ) => (
        <Animated.View
            style={{
                width,
                height,
                borderRadius: radius,
                backgroundColor: colors.secondaryCard,
                opacity,
            }}
        />
    );

    return (
        <View
            style={{
                width: "100%",
                paddingHorizontal: 5,
                paddingBottom: 5,
                gap: 4,
            }}
        >
            {[1, 2, 3].map((i) => (
                <View
                    key={i}
                    style={{
                        width: "100%",
                        minHeight: 58,
                        paddingHorizontal: 8,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                    }}
                >
                    {bone(40, 40, 999)}

                    <View style={{ flex: 1, gap: 7 }}>
                        {bone("48%", 11)}
                        {bone("32%", 9)}
                    </View>
                </View>
            ))}
        </View>
    );
};