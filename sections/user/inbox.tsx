import { Button } from "@/components/ButtonComponent";
import { SectionHeader } from "@/components/SectionComponent";
import { AvatarRender } from "@/dashboard/Avatar";
import { BackIcon, BlockIcon, DeleteIcon, MessageIcon, MoreIcon, ReportIcon, XIcon } from "@/icons/Icon";
import { useTheme } from "@/provider/ThemeProvider";
import { useMessage } from "@/stores/useMessage";
import { SpinningLogoImage } from "@/utils/Logo";
import { useEffect, useState, useRef, useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MessageScreen from "../messages/messages";
import { InboxConversation } from "@/types/messages.types";
import { useBlockUser, useReport } from "@/stores/useReport";
import { useFeed } from "@/stores/useFeed";
import { formatCount } from "@/utils/time";
import FeedProfile from "../feed/feedProfile";
import { GradientHeader } from "@/components/GradientComponent";
import { Swipeable } from "react-native-gesture-handler";
import { dismissConversationNotifications } from "@/notifications/pushNotification";
import { useSlidingOverlay } from "@/stores/useSlideOverlay";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const InboxMessageScreen = ({ item }: any) => {
    const { colors } = useTheme();
    const { closeSlidingOverlay } = useSlidingOverlay();

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <MessageScreen
                onClose={closeSlidingOverlay}
                conversation_id={item.conversation.id}
            />
        </View>
    );
};

const MENU_HEIGHT = 65;
export const InboxMainScreen: React.FC<{
  onClose: () => void;
  isFocused?: boolean;
}> = ({ onClose, isFocused }) => {

    const insets = useSafeAreaInsets();
    const { colors, textStyles } = useTheme();

    const {
        inbox,
        loadInbox,
        loadConversation,
        markAsRead,
        deleteConversation,
        lastInteractedAt,
        touchConversation,
    } = useMessage();
    const { clearActiveProfile } = useFeed();
    const { openSlidingOverlay, closeSlidingOverlay } = useSlidingOverlay();

    const [activeConversation, setActiveConversation] = useState<InboxConversation | null>(null);

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
            return; // skip loadInbox, conversation already cached
        }

        loadInbox();
    }, []);

    useEffect(() => {
        const shouldHideNav = !!activeConversation;
    }, [activeConversation]);
 
    return (
        <>
            <View
                style={{
                    ...StyleSheet.absoluteFillObject,
                    backgroundColor: colors.background,
                }}
            >

                <GradientHeader
                    height={MENU_HEIGHT}
                    baseColor={colors.background}
                    style={{
                        marginTop: insets.top,
                    }}
                    contentStyle={{
                        height: MENU_HEIGHT,
                        paddingHorizontal: 20,
                        alignItems: "center",
                        flexDirection: "row",
                    }}
                >
                    <Button onPress={() => {onClose?.()}} clearBackground>
                        <BackIcon color={colors.text} />
                    </Button>

                    <SectionHeader
                        title="Inbox"
                        showBackground
                        titleClassName={textStyles.h3}
                        leftIcon={<MessageIcon color={colors.button} size={30}/>}
                    />
                </GradientHeader>

                <View style={{ flex: 1, paddingTop: MENU_HEIGHT}}>
                    { !inbox.length ? (
                        <View className="flex-1 items-center justify-center">
                            <Text
                                className={textStyles.body}
                                style={{ color: colors.secondaryText }}
                            >
                                No messages yet
                            </Text>
                        </View>
                    ) : (
                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{
                                paddingTop: MENU_HEIGHT,
                            }}
                        >
                            {sortedInbox.map((item) => (
                                <Swipeable
                                    key={item.conversation.id}
                                    friction={2}
                                    rightThreshold={40}
                                    overshootLeft={false}
                                    renderLeftActions={(progress, dragX) => (
                                        <View
                                            style={{
                                                justifyContent: "center",
                                                alignItems: "flex-end",
                                                padding: 10
                                            }}
                                        >
                                            <Button
                                                onPress={() => deleteConversation(item.conversation.id)}
                                                style={{
                                                    backgroundColor: colors.danger,
                                                }}
                                                background
                                            >
                                                <DeleteIcon color={colors.text} />
                                            </Button>
                                        </View>
                                    )}
                                >
                                    <TouchableOpacity activeOpacity={1}>
                                        <Pressable
                                            onPress={async () => {
                                                await loadConversation(undefined, item.conversation.id);
                                                openSlidingOverlay(
                                                    <InboxMessageScreen item={item} />
                                                );
                                                touchConversation(item.conversation.id);
                                                
                                                await markAsRead(item.conversation.id);
                                                dismissConversationNotifications(item.conversation.id);
                                            }}
                                            style={{
                                                width: "100%",
                                                height: 85,
                                                paddingHorizontal: 14,
                                                borderRadius: 0,
                                                flexDirection: "row",
                                                alignItems: "center",
                                                justifyContent: "flex-start",
                                                gap: 12,
                                            }}
                                        >
                                            <AvatarRender avatar={item.other_user.avatar} size={30} />

                                            <View style={{ flex: 1, alignItems: "flex-start" }}>
                                                <Text
                                                    className={textStyles.body}
                                                    numberOfLines={1}
                                                    style={{ color: colors.text }}
                                                >
                                                    {item.other_user.profile_name}
                                                </Text>

                                                <Text
                                                    className={textStyles.small}
                                                    numberOfLines={1}
                                                    style={{ color: colors.secondaryText }}
                                                >
                                                    {item.last_message?.content ?? "No messages yet"}
                                                </Text>
                                            </View>

                                            {item.unread_count > 0 && (
                                                <View
                                                    style={{
                                                        minWidth: 24,
                                                        height: 24,
                                                        borderRadius: 999,
                                                        paddingHorizontal: 7,
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        backgroundColor: colors.button,
                                                    }}
                                                >
                                                    <Text
                                                        className={textStyles.small}
                                                        style={{ color: colors.secondaryText }}
                                                    >
                                                        {formatCount(item.unread_count)}
                                                    </Text>
                                                </View>
                                            )}
                                        </Pressable>
                                    </TouchableOpacity>
                                </Swipeable>
                            ))}
                        </ScrollView>
                    )}
                </View>

            </View>

        </>
    );
};
