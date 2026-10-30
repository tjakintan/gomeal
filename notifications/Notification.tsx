import { Button } from "@/components/ButtonComponent";
import { BackIcon, CookIcon, DeleteIcon, MessageIcon, XIcon } from "@/icons/Icon";
import React, { useEffect, useRef, useState } from "react";
import { useNotification } from "@/notifications/useNotification";
import { useTheme } from "@/provider/ThemeProvider";
import { Animated, Dimensions, FlatList, Pressable, Text, TouchableOpacity, View } from "react-native";
import { SpinningLogoImage } from "@/utils/Logo";
import { GroupedPostNotificationCard, MessageNotificationCard, RecommendationNotificationCard, TrendNotificationCard } from "@/notifications/notification.types";
import { FeedLoveIcon, FeedStarIcon } from "@/icons/feed_icon";
import { formatTime } from "@/utils/time";
import { AvatarRender } from "../dashboard/Avatar";
import { Media } from "@/media/media";
import MessageScreen from "@/sections/messages/messages";
import { SectionHeader } from "@/components/SectionComponent";
import FeedProfile from "@/sections/feed/feedProfile";
import { GradientHeader } from "@/components/GradientComponent";
import { useCook } from "@/stores/useCook";
import { CookMainScreen } from "@/sections/cook";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSlidingOverlay } from "@/stores/useSlideOverlay";
import { useFeed } from "@/stores/useFeed";
import { usePostHog } from "posthog-react-native";
import { openCookOverlay } from "@/sections/cook/openCook";
import { ImageMediaType } from "@/types/media.types";
import { Swipeable } from "react-native-gesture-handler";

type GroupKind = keyof typeof GROUP_CONFIG;

const GROUP_CONFIG = {
    like: { singular: "New Like", plural: "New Likes", verb: "Liked" },
    cook: { singular: "New Cook", plural: "New Cooks", verb: "Cooked" },
    star: { singular: "New Star", plural: "New Stars", verb: "Starred" },
} as const;

const GroupIcon: React.FC<{ kind: GroupKind; size: number; color: string }> = ({ kind, size, color }) => {
    switch (kind) {
        case "like": return <FeedLoveIcon size={size} color={color} />;
        case "cook": return <CookIcon size={size} color={color} />;
        case "star": return <FeedStarIcon size={size} color={color} />;
    }
};

const MENU_HEIGHT = 65;

const AVATAR_SIZE = 36;

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const MAX_SWIPE = SCREEN_WIDTH * 0.5; 
const DELETE_THRESHOLD = SCREEN_WIDTH * 0.3; 


const AvatarStack: React.FC<{ actors: GroupedPostNotificationCard["actors"]; borderColor: string }> = ({ actors, borderColor }) => (
    <View style={{ flexDirection: "row" }}>
        {actors.map((a, i) => (
            <View
                key={i}
                style={{
                    height: AVATAR_SIZE,
                    width: AVATAR_SIZE,
                    borderRadius: 999,
                    borderWidth: 2,
                    borderColor,
                    overflow: "hidden",
                    marginLeft: i === 0 ? 0 : -12,
                    zIndex: actors.length - i, // newest on top
                }}
                className="items-center justify-end"
            >
                <AvatarRender avatar={a.avatar} size={28} background/>
            </View>
        ))}
    </View>
);


const GroupedPostCard: React.FC<{
    kind: GroupKind;
    data: GroupedPostNotificationCard;
    dark: boolean;
}> = ({ kind, data, dark }) => {
    const { colors, textStyles } = useTheme(dark ? "dark" : undefined);
    const { singular, plural, verb } = GROUP_CONFIG[kind];

    const actors = data.actors ?? [];
    const count = data.actor_count ?? 1;
    const others = count - 1;
    const latest = actors[0]?.profile_name ?? "Someone";
    const who = others > 0 ? `${latest} and ${others} other${others > 1 ? "s" : ""}` : latest;

    return (
        <View style={{ height: 125, overflow: "hidden", marginHorizontal: 10 }}>
            <View
                style={{ gap: 20, height: 40, paddingHorizontal: 10, flexDirection: "row" }}
                className="items-center"
            >
                <GroupIcon kind={kind} size={20} color={colors.text} />
                <View style={{ position: "absolute", right: 20 }}>
                    <Text className={textStyles.small}>{formatTime(data.created_at)}</Text>
                </View>
            </View>

            <View className="flex-1 flex-row justify-between p-2">
                <View className="flex-1 justify-end">
                    <AvatarStack actors={actors} borderColor={colors.background} />
                    <Text className={textStyles.sectionText}>
                        {who}
                    </Text>
                    <Text className={textStyles.small} numberOfLines={2}>
                        {verb} {data.dish_name}
                    </Text>
                </View>

                <View style={{ width: 125, height: 75, alignSelf: "center" }}>
                        <Media
                            uri={data.dish_media_url}
                            mediaType={data.dish_media_type as ImageMediaType}
                            style={{ width: "100%", height: "100%", borderRadius: 15 }}
                            disableInteraction
                            muteControl="none"
                            iconSize={15}
                        />
                </View>
            </View>
        </View>
    );
};


const MessageCard: React.FC<{messages: MessageNotificationCard, dark: boolean }> = ({ messages, dark }) => {

   const { colors, textStyles} = useTheme(dark ? "dark" : undefined);

    const setActiveProfile = useFeed((state) => state.setActiveProfile);
    const clearActiveProfile = useFeed((state) => state.clearActiveProfile);

    const openSlidingOverlay = useSlidingOverlay((s) => s.openSlidingOverlay);
    const closeSlidingOverlay = useSlidingOverlay((s) => s.closeSlidingOverlay);

    return (

        <View style={{ height: 125, overflow: "hidden", marginHorizontal: 10 }}>

            <View
                style={{ gap: 20, height: 40, paddingHorizontal: 10, flexDirection: "row" }}
                className="items-center"
            >
                <MessageIcon size={20} color={colors.text} />

                <View
                    style={{position: "absolute", right: 20}}
                >
                    <Text className={textStyles.small}>
                        {formatTime(messages.created_at)}
                    </Text>
                </View>

            </View>

            <View className="flex-1 flex-row p-2">
                <Pressable 
                    onPress={async () => {
                        await setActiveProfile(undefined, messages.user_sub);

                        openSlidingOverlay(
                            <FeedProfile
                                showMessagesButton={false}
                                onClose={() => {
                                    clearActiveProfile();
                                    closeSlidingOverlay();
                                }}
                            />
                        );
                    }}
                    style={{
                        flex: 1, 
                        flexDirection: "row",
                        alignItems: "flex-end",
                        gap: 5
                    }}
                >
                    <View
                        style={{
                            height: AVATAR_SIZE,
                            width: AVATAR_SIZE,
                            borderRadius: 999,
                            borderWidth: 2,
                            borderColor: colors.background,
                            overflow: "hidden",
                        }}
                        className="items-center justify-end"
                    >
                        <AvatarRender avatar={messages.actor_avatar} size={28} background/>
                    </View>
                    <View className="flex-col gap-1">
                        <Text
                            className={textStyles.sectionText}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                            style={{
                                flexShrink: 1,
                                maxWidth: "55%",
                            }}
                        >
                            {messages.actor_profile_name}
                        </Text>

                        <Text
                            className={textStyles.small}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                            style={{ flexShrink: 1 }}
                        >
                            just sent you a message.
                        </Text>
                    </View>
                </Pressable>
                <View className="justify-end">
                    <Button 
                        style={{height: 40, width: 100}} 
                        background 
                        onPress={() => {
                            if (messages.conversation_id) {
                                openSlidingOverlay(
                                    <MessageScreen 
                                        conversation_id={messages.conversation_id} 
                                        onClose={closeSlidingOverlay} 
                                    />
                                )
                            }
                        }}
                    >
                        <Text className={textStyles.body} style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
                            Message
                        </Text>
                    </Button>
                </View>
            </View>

        </View>

    )
};


const RecommendationCard: React.FC<{
    recommendation: RecommendationNotificationCard;
    dark: boolean;
}> = ({ recommendation, dark }) => {
    const posthog = usePostHog();
    const { colors, textStyles } = useTheme(dark ? "dark" : undefined);

    const handleOpenRecommendation = () => {
        posthog.capture("[Notification] => recommendation_notification_opened", {
            post_id: recommendation.post_id,
        });

        openCookOverlay(recommendation.post_id);
    };

    return (
        <View
            style={{
                height: 240,
                overflow: "hidden",
            }}
        >
            <Pressable onPress={handleOpenRecommendation}>
                <View style={{ height: 150 }}>
                    <Media
                        uri={recommendation.dish_media_url}
                        mediaType={recommendation.dish_media_type as ImageMediaType}
                        style={{
                            width: "100%",
                            height: "100%",
                        }}
                        muteControl="none"
                        disableInteraction
                    />
                </View>
            </Pressable>

            <Pressable
                onPress={handleOpenRecommendation}
                style={{
                    flex: 1,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    justifyContent: "flex-start",
                    alignItems: "flex-start",
                    gap: 4,
                }}
            >
                <Text className={textStyles.caption}>
                    🍟 Recommended for you
                </Text>

                <Text
                    className={textStyles.sectionText}
                    numberOfLines={2}
                    style={{ textAlign: "left" }}
                >
                    {recommendation.dish_name}
                </Text>

                <Text className={textStyles.small}>
                    {formatTime(recommendation.created_at)}
                </Text>
            </Pressable>
        </View>
    );
};


const TrendCard: React.FC<{ trend: TrendNotificationCard; dark: boolean }> = ({ trend, dark }) => {

    const posthog = usePostHog();
    const { colors, textStyles } = useTheme(dark ? "dark" : undefined);

    const handleOpenTrend = () => {
        posthog.capture("[Notification] => trend_notification_opened", {
            post_id: trend.post_id,
        });
        openCookOverlay(trend.post_id);
    };

    return (
        <View
            style={{
                height: 240,
                overflow: "hidden",
            }}
        >
            <Pressable
                onPress={handleOpenTrend}
            >
                <View
                    style={{
                        height: 150,
                    }}
                >
                    <Media
                        uri={trend.dish_media_url}
                        mediaType={trend.dish_media_type as ImageMediaType}
                        style={{
                            width: "100%",
                            height: "100%",
                        }}
                        muteControl="none"
                        disableInteraction
                    />
                </View>
            </Pressable>

            <Pressable
                onPress={handleOpenTrend}
                style={{
                    flex: 1,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    justifyContent: "flex-start",
                    alignItems: "flex-start",
                    gap: 4,
                }}
            >
                <Text className={textStyles.caption}>
                    🔥 Trending
                </Text>

                <Text
                    className={textStyles.sectionText}
                    numberOfLines={2}
                    style={{ textAlign: "left" }}
                >
                    {trend.dish_name}
                </Text>

                <Text
                    className={textStyles.small}
                    style={{ textAlign: "left" }}
                >
                    {formatTime(trend.created_at)}
                </Text>
            </Pressable>
        </View>
    );
};


const SwipeableNotificationRow: React.FC<{
    isSwiping: boolean;
    onWillOpen: () => void;
    onClose: () => void;
    onDelete: () => Promise<boolean>;
    registerRef: (ref: Swipeable | null) => void;
    children: React.ReactNode;
}> = ({ isSwiping, onWillOpen, onClose, onDelete, registerRef, children }) => {

    const { colors } = useTheme();

    const [rowHeight, setRowHeight] = useState(0);

    return (
        <Swipeable
            ref={registerRef}
            friction={1}                 
            leftThreshold={DELETE_THRESHOLD}
            overshootLeft={false}          
            onSwipeableWillOpen={() => {
                onWillOpen();
                onDelete();                
            }}
            onSwipeableClose={onClose}
            renderLeftActions={(progress, dragX) => {
                const scale = dragX.interpolate({
                    inputRange: [0, 50],
                    outputRange: [0, 1],
                    extrapolate: "clamp",
                });

                return (
                    <View
                        style={{
                            height: rowHeight,
                            width: MAX_SWIPE, 
                            backgroundColor: colors.danger,
                            justifyContent: "center",
                            alignItems: "flex-start",
                        }}
                    >
                        <Animated.View
                            style={{
                                width: 70,
                                alignItems: "center",
                                justifyContent: "center",
                                transform: [{ scale }],
                            }}
                        >
                            <DeleteIcon color="#fff" />
                        </Animated.View>
                    </View>
                );
            }}
        >
            <View
                onLayout={(e) => setRowHeight(e.nativeEvent.layout.height)}
                style={{
                    backgroundColor: isSwiping ? colors.secondaryCard : colors.background,
                }}
            >
                {children}
            </View>
        </Swipeable>
    );
};


const NotificationScreen: React.FC<{ onOpen: (open: boolean) => void, dark: boolean}> = ({ onOpen, dark }) => {

    const posthog = usePostHog();
    const insets = useSafeAreaInsets();
    const { colors, textStyles} = useTheme(dark ? "dark" : undefined);
    const { notifications, deleteNotification, loadingNotifications, loadNotifications} = useNotification();

    const [swipingNotificationId, setSwipingNotificationId] = useState<string | null>(null);

    const swipeableRefs = useRef(new Map<string, Swipeable>());
    const activeSwipeId = useRef<string | null>(null);

    useEffect(() => {
        if (!notifications) {
            loadNotifications()
        }
    }, []);

    const notificationData = [
        ...(notifications?.like ?? []).map((item) => ({ type: "like" as const, item })),
        ...(notifications?.star ?? []).map((item) => ({ type: "star" as const, item })),
        ...(notifications?.message ?? []).map((item) => ({ type: "message" as const, item })),
        ...(notifications?.cook ?? []).map((item) => ({ type: "cook" as const, item })),
        ...(notifications?.trend ?? []).map((item) => ({ type: "trend" as const, item })),
        ...(notifications?.recommendation ?? []).map((item) => ({ type: "recommendation" as const, item })),
    ].sort(
        (a, b) =>
            new Date(b.item.created_at).getTime() -
            new Date(a.item.created_at).getTime()
    );

    useEffect(() => {
        posthog.screen("notifications");
        if (!notifications) {
            loadNotifications()
        }
    }, []);

    return (
        <>

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
                    flexDirection: "row"
                }}
            >
                <Button onPress={() => onOpen?.(false)} clearBackground>
                    <BackIcon color={colors.text} />
                </Button>
                
                <SectionHeader
                    title="Notification"
                    showBackground
                    titleClassName={textStyles.h3}
                    dark={dark}
                    leftIcon={
                    <MaterialIcons
                        name={"notifications-active"}
                        size={30}
                        color={colors.button}
                        />
                    }
                />

            </GradientHeader>

            <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top}}>

                {loadingNotifications ? (
                    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                        <SpinningLogoImage size={50} />
                    </View>
                ) : !notifications ? (
                    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                        <Text className={textStyles.body}>
                            No notifications yet
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={notificationData}
                        contentContainerStyle={{
                            gap: 10,
                            paddingTop: MENU_HEIGHT,
                            paddingBottom: insets.bottom,
                        }}
                        showsVerticalScrollIndicator={false}
                        keyExtractor={(entry) =>
                            entry.type === "message"
                                ? `message-${entry.item.conversation_id}`
                                : `${entry.type}-${entry.item.post_id}`
                        }
                        renderItem={({ item: entry }) => {

                            const notificationId = entry.type === "message"
                                ? `message-${entry.item.conversation_id}`
                                : `${entry.type}-${entry.item.post_id}`;

                            const deleteParams =
                                entry.type === "message"
                                    ? {
                                        action_type: "message" as const,
                                        conversation_id: entry.item.conversation_id,
                                    }
                                    : {
                                        action_type: entry.type,
                                        post_id: entry.item.post_id,
                                    };

                            return (
                                <SwipeableNotificationRow
                                    isSwiping={swipingNotificationId === notificationId}
                                    registerRef={(ref) => {
                                        if (ref) swipeableRefs.current.set(notificationId, ref);
                                        else swipeableRefs.current.delete(notificationId);
                                    }}
                                    onWillOpen={() => {
                                        const prev = activeSwipeId.current;
                                        if (prev && prev !== notificationId) swipeableRefs.current.get(prev)?.close();
                                        activeSwipeId.current = notificationId;
                                        setSwipingNotificationId(notificationId);
                                    }}
                                    onClose={() => {
                                        if (activeSwipeId.current === notificationId) {
                                            activeSwipeId.current = null;
                                            setSwipingNotificationId(null);
                                        }
                                    }}
                                    onDelete={async () => {
                                        const success = await deleteNotification(deleteParams);
                                        if (success) {
                                            if (activeSwipeId.current === notificationId) activeSwipeId.current = null;
                                            swipeableRefs.current.get(notificationId)?.close();
                                            setSwipingNotificationId(null);
                                        }
                                        return success;
                                    }}
                                >
                                    <View>
                                        {entry.type === "like" ||
                                        entry.type === "cook" ||
                                        entry.type === "star" ? (
                                            <TouchableOpacity activeOpacity={1}>
                                                <GroupedPostCard
                                                    kind={entry.type}
                                                    dark={dark}
                                                    data={entry.item}
                                                />
                                            </TouchableOpacity>
                                        ) : entry.type === "message" ? (
                                            <TouchableOpacity activeOpacity={1}>
                                                <MessageCard
                                                    dark={dark}
                                                    messages={entry.item}
                                                />
                                            </TouchableOpacity>
                                        ) : entry.type === "trend" ? (
                                            <TouchableOpacity activeOpacity={1}>
                                                <TrendCard
                                                    dark={dark}
                                                    trend={entry.item}
                                                />
                                            </TouchableOpacity>
                                        ) : (
                                            <TouchableOpacity activeOpacity={1}>
                                                <RecommendationCard
                                                    dark={dark}
                                                    recommendation={entry.item}
                                                />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </SwipeableNotificationRow>
                            );
                        }}
                    />
                )}
            </View>

        </>
    );

};

export default NotificationScreen;