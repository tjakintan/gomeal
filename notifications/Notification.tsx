import { Button } from "@/components/ButtonComponent";
import { CookIcon, MessageIcon, XIcon } from "@/icons/Icon";
import React, { useEffect, useRef, useState } from "react";
import { useNotification } from "@/notifications/useNotification";
import { useTheme } from "@/provider/ThemeProvider";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SpinningLogoImage } from "@/utils/Logo";
import { CookNotificationCard, LikeNotificationCard, MessageNotificationCard } from "@/notifications/notification.types";
import { FeedLoveIcon } from "@/icons/feed_icon";
import { formatTime } from "@/utils/time";
import { AvatarRender } from "../dashboard/Avatar";
import { Media } from "@/media/media";
import MessageScreen from "@/sections/messages/messages";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import GomealGlassView from "@/components/GlassComponent";
import { SectionHeader } from "@/components/SectionComponent";

const LikeCard: React.FC<{likes: LikeNotificationCard, dark: boolean}> = ({ likes, dark }) => {

    const { colors, textStyles} = useTheme(dark ? "dark" : undefined);

    return (

         <View style={{height: 135, borderRadius: 20, overflow: "hidden", borderWidth: 1, borderColor: colors.secondaryCard}}>

            <View
                style={{
                    gap: 20,
                    height: 40,
                    paddingHorizontal: 10,
                    flexDirection: "row",
                    backgroundColor: colors.card
                }}
                className="items-center"
            >

                <FeedLoveIcon size={20} color={colors.text} />

                <Text
                    pointerEvents="none"
                    className={textStyles.caption}
                >
                    New Like
                </Text> 

                <View
                    style={{position: "absolute", right: 20}}
                >
                    <Text className={textStyles.small}>
                        {formatTime(likes.created_at)}
                    </Text>
                </View>

            </View>

            <View className="flex-1 flex-row justify-between p-2">

                <View className="flex-row items-end gap-2">
                    <View 
                        style={{
                            height: 40,
                            width: 40, 
                            borderWidth: 1,
                            borderRadius: 999,
                            borderColor: colors.text,
                            overflow: "hidden",                   
                        }}
                        className="items-center justify-end"
                    >
                        <AvatarRender avatar={likes.actor_avatar} size={30} />
                    </View>
                    <View className="flex-col gap-1"> 
                        <Text
                            className={textStyles.sectionText}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                        >
                            {likes.actor_profile_name}
                        </Text>
                        <Text className={textStyles.small} numberOfLines={1}>
                            liked {likes.dish_name}
                        </Text>
                    </View>
                </View>

                <View style={{ width: 100, height: 75, alignSelf: "center" }} className="flex-col items-center justify-center">
        
                    <View
                        style={[
                            StyleSheet.absoluteFillObject,
                            {
                                backgroundColor: colors.card,
                                padding: 5,
                                borderRadius: 25,
                                overflow: "hidden",
                                justifyContent: "center",
                            }
                        ]}
                    >
                        <Media
                            uri={likes.dish_media_url}
                            mediaType={likes.dish_media_type}
                            style={{width: "100%", height: "100%", borderRadius: 20}}
                            disableInteraction={true}
                            //useSettingsAutoPlay={false}
                        />
        
                    </View>
        
                </View>

            </View>

        </View>

    );

};

const MessageCard: React.FC<{messages: MessageNotificationCard, dark: boolean, onOpenMessageSection?:(open: boolean) => void}> = ({ messages, dark, onOpenMessageSection }) => {

   const { colors, textStyles} = useTheme(dark ? "dark" : undefined);

    return (

        <View style={{height: 125, borderRadius: 20, overflow: "hidden", borderWidth: 1, borderColor: colors.secondaryCard}}>

            <View
                style={{
                    gap: 20,
                    height: 40,
                    paddingHorizontal: 10,
                    flexDirection: "row",
                    backgroundColor: colors.card
                }}
                className="items-center"
            >
                <MessageIcon size={20} color={colors.text} />

                <Text
                    pointerEvents="none"
                    className={textStyles.caption}
                >
                    New Message
                </Text> 

                <View
                    style={{position: "absolute", right: 20}}
                >
                    <Text className={textStyles.small}>
                        {formatTime(messages.created_at)}
                    </Text>
                </View>

            </View>

            <View className="flex-1 flex-row p-2 ">
                <View className="flex-1 flex-row items-end gap-2">
                    <View 
                        style={{
                            height: 40,
                            width: 40, 
                            borderWidth: 1,
                            borderRadius: 999,
                            borderColor: colors.text,
                            overflow: "hidden",                   
                        }}
                        className="items-center justify-end"
                    >
                        <AvatarRender avatar={messages.actor_avatar} size={30} />
                    </View>
                    <View className="flex-row gap-2">
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
                </View>
                <View className="justify-start">
                    <Button style={{height: 40, width: 100}} background onPress={() => onOpenMessageSection?.(true)}>
                        <Text className={textStyles.caption}>
                            message
                        </Text>
                    </Button>
                </View>
            </View>

        </View>

    )
};

const CookCard: React.FC<{ cook: CookNotificationCard; dark: boolean }> = ({ cook, dark }) => {
    const { colors, textStyles } = useTheme(dark ? "dark" : undefined);

    return (
        <View style={{ height: 135, borderRadius: 20, overflow: "hidden", borderWidth: 1, borderColor: colors.secondaryCard }}>
            <View
                style={{ gap: 20, height: 40, paddingHorizontal: 10, flexDirection: "row", backgroundColor: colors.card }}
                className="items-center"
            >
                <CookIcon size={20} color={colors.text} />
                <Text pointerEvents="none" className={textStyles.caption}>New Cook</Text>
                <View style={{ position: "absolute", right: 20 }}>
                    <Text className={textStyles.small}>{formatTime(cook.created_at)}</Text>
                </View>
            </View>

            <View className="flex-1 flex-row justify-between p-2">
                <View className="flex-row items-end gap-2">
                    <View style={{ height: 40, width: 40, borderWidth: 1, borderRadius: 999, borderColor: colors.text, overflow: "hidden" }} className="items-center justify-end">
                        <AvatarRender avatar={cook.actor_avatar} size={30} />
                    </View>
                    <View className="flex-col gap-1">
                        <Text className={textStyles.sectionText} numberOfLines={1}>
                            {cook.actor_profile_name}
                        </Text>
                        <Text className={textStyles.small} numberOfLines={1}>
                            cooked {cook.dish_name}
                        </Text>
                    </View>
                </View>

                <View style={{ width: 100, height: 75, alignSelf: "center" }}>
                    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: colors.card, padding: 5, borderRadius: 25, overflow: "hidden", justifyContent: "center" }]}>
                        <Media
                            uri={cook.dish_media_url}
                            mediaType={cook.dish_media_type}
                            style={{ width: "100%", height: "100%", borderRadius: 20 }}
                            disableInteraction={true}
                        />
                    </View>
                </View>
            </View>
        </View>
    );
};

const NotificationScreen: React.FC<{ onOpen: (open: boolean) => void, dark: boolean}> = ({ onOpen, dark }) => {

    const { colors, textStyles} = useTheme(dark ? "dark" : undefined);
    const { notifications, loadingNotifications, loadNotifications} = useNotification();

    const messageSheetRef = useRef<BottomSheet>(null);
    const [activeConversationId, setActiveConversationId] = useState<number | null>(null);

    useEffect(() => {
        if (!notifications) {
            loadNotifications()
        }
    }, []);

    const notificationData = [
        ...(notifications?.like ?? []).map((item) => ({ type: "like" as const, item })),
        ...(notifications?.message ?? []).map((item) => ({ type: "message" as const, item })),
        ...(notifications?.cook ?? []).map((item) => ({ type: "cook" as const, item })),
    ].sort(
        (a, b) =>
            new Date(b.item.created_at).getTime() -
            new Date(a.item.created_at).getTime()
    );

    //console.log(notifications)

    return (
        <>

            <View
                style={{
                    height: 65,
                    paddingHorizontal: 20,
                    alignItems: "center",
                    flexDirection: "row"
                }}
                className="items-start"
            >
                <Button style={{ backgroundColor: colors.danger }} onPress={() => onOpen?.(false)} background>
                    <XIcon color={colors.background} />
                </Button>
                
                <SectionHeader
                    title="Notification"
                    showBackground
                    titleClassName={textStyles.h3}
                    dark={dark}
                />

            </View>

            <View style={{ flex: 1, backgroundColor: colors.background, padding: 10, paddingBottom: 125}}>

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
                        contentContainerStyle={{ gap: 10, padding: 5 }}
                        showsVerticalScrollIndicator={false}
                        keyExtractor={(entry, i) => `${entry.type}-${entry.item.created_at}-${i}`}
                        renderItem={({ item: entry }) => {
                            switch (entry.type) {
                            case "like":
                                return (
                                    <TouchableOpacity activeOpacity={1}>
                                        <LikeCard
                                        dark={dark}
                                        likes={entry.item as LikeNotificationCard}
                                        />
                                    </TouchableOpacity>
                                );

                            case "message":
                                return (
                                    <TouchableOpacity activeOpacity={1}>
                                        <MessageCard
                                        dark={dark}
                                        messages={entry.item as MessageNotificationCard}
                                        onOpenMessageSection={() => {
                                            setActiveConversationId(entry.item.conversation_id);
                                            messageSheetRef.current?.expand();
                                        }}
                                        />
                                    </TouchableOpacity>
                                );
                            case "cook":
                                return (
                                    <TouchableOpacity activeOpacity={1}>
                                        <CookCard dark={dark} cook={entry.item as CookNotificationCard} />
                                    </TouchableOpacity>
                                );
                            default:
                                return null;
                            }
                        }}
                    />
                )}
            </View>

            <BottomSheet
                ref={messageSheetRef}
                index={-1}
                bottomInset={125}
                snapPoints={[535]}
                enablePanDownToClose={false}
                enableContentPanningGesture={false}
                enableHandlePanningGesture={false}
                enableDynamicSizing={false}
                backgroundStyle={{ backgroundColor: "transparent", borderRadius: 40 }}
                handleComponent={() => null}
            >
                <GomealGlassView glassEffectStyle="clear" style={{height: 525, marginHorizontal: 10, borderRadius: 50}}>

                    <View
                        style={{
                        ...StyleSheet.absoluteFillObject, 
                        opacity: 0.85,
                        backgroundColor: colors.secondaryCard,
                        borderRadius: 50,
                        }}
                    />
                    
                    <BottomSheetView
                        style={{
                            height: 500,
                            marginTop: 10,
                            marginHorizontal: 10,
                            overflow: "hidden",
                            alignSelf: "center",
                            backgroundColor: colors.background,
                            borderRadius: 40
                        }}
                    >
                        {activeConversationId && (
                            <MessageScreen conversation_id={activeConversationId} onClose={() => messageSheetRef.current?.close()} />
                        )}
                    </BottomSheetView>

                </GomealGlassView>

            </BottomSheet>

        </>
    );

};

export default NotificationScreen;