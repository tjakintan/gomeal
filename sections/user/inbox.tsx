import { Button, ExpandingButton } from "@/components/ButtonComponent";
import { SectionHeader } from "@/components/SectionComponent";
import { AvatarRender } from "@/dashboard/Avatar";
import { BackIcon, BlockIcon, DeleteIcon, MoreIcon, ReportIcon, XIcon } from "@/icons/Icon";
import { useTheme } from "@/provider/ThemeProvider";
import { useMessage } from "@/stores/useMessage";
import { SpinningLogoImage } from "@/utils/Logo";
import { useEffect, useState, useRef } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MessageScreen from "../messages/messages";
import { InboxConversation } from "@/types/messages.types";
import { useBlockUser, useReport } from "@/stores/useReport";
import { useFeed } from "@/stores/useFeed";
import { formatCount } from "@/utils/time";
import FeedProfile, { FEED_CARD_PROFILE_RADIUS } from "../feed/feedProfile";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import GomealGlassView from "@/components/GlassComponent";
import { GradientHeader } from "@/components/GradientComponent";
import { Swipeable } from "react-native-gesture-handler";
import { LinearGradient } from "expo-linear-gradient";
import { BOTTOM_INSETS, BOTTOM_SNAP_POINTS } from "@/types";
import { DASHBOARD_HEIGHT } from "@/tags/ReelTag";
import { NAV_SIZE } from "../Navigate";
import { dismissConversationNotifications, dismissNotification, dismissNotificationsByType } from "@/notifications/pushNotification";

export const InboxMainScreen: React.FC<{
  onClose: () => void;
  isFocused?: boolean;
  setHideNav?: (v: boolean) => void;
}> = ({ onClose, isFocused, setHideNav }) => {

    const { colors, textStyles } = useTheme();

    const {
        inbox,
        loadInbox,
        loadConversation,
        markAsRead,
        deleteConversation,
    } = useMessage();
    const { reportTarget, loadingReport } = useReport();
    const { blockUser, loadingBlockUser } = useBlockUser();
    const { setActiveProfile, clearActiveProfile } = useFeed();

    const [showMenu, setShowMenu] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [activeConversation, setActiveConversation] = useState<InboxConversation | null>(null);

    const profileSheetRef = useRef<BottomSheet>(null);

    const handleOpenProfile = async (sub: string) => {
        await setActiveProfile(undefined, sub);
        setShowProfile(true);
        requestAnimationFrame(() => profileSheetRef.current?.expand());
    };

    const handleCloseProfile = () => {
        profileSheetRef.current?.close();
        setShowProfile(false);
        clearActiveProfile();
    };

    const closeConversation = () => {
        setActiveConversation(null);
        loadInbox();
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
            return; // skip loadInbox, conversation already cached
        }

        loadInbox();
    }, []);

    useEffect(() => {
        const shouldHideNav = !!activeConversation && !showProfile;
        setHideNav?.(shouldHideNav);
    }, [activeConversation, showProfile]);

    if (activeConversation) {
        const otherUser = activeConversation.other_user;

        return (
            <View
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: colors.background,
                }}
            >
                {showMenu && (
                    <Pressable
                        onPress={() => setShowMenu(false)}
                        style={{
                            ...StyleSheet.absoluteFillObject,
                            zIndex: 3,
                            elevation: 10,
                        }}
                    />
                )}

                <View
                    style={{
                        width: "100%",
                        paddingHorizontal: 10,
                        flexDirection: "row",
                        alignItems: "center",
                    }}
                >

                    <View
                        style={{
                            flex: 1,
                            height: 85,
                            paddingTop: 15,
                            flexDirection: "row",
                            alignItems: "flex-start",
                            gap: 10,
                        }}
                    >
                        {showProfile ? (
                            <Button onPress={handleCloseProfile} clearBackground>
                                <XIcon color={colors.danger} />
                            </Button>
                        ) : (
                            <Button onPress={closeConversation} clearBackground>
                                <BackIcon color={colors.text} />
                            </Button>
                        )}
                        <AvatarRender avatar={otherUser.avatar} size={32} />

                        <Button 
                            onPress={() => handleOpenProfile(otherUser.sub)}     
                            style={{ flex: 1, alignItems: "flex-start", justifyContent: "flex-start", paddingHorizontal: 0 }}
                        >
                            <Text
                                className={textStyles.bodyMedium}
                                numberOfLines={1}
                                style={{ color: colors.text }}
                            >
                                {otherUser.profile_name}
                            </Text>

                            {!showProfile && (
                                <Text
                                    className={textStyles.small}
                                    numberOfLines={1}
                                    style={{ color: colors.secondaryText }}
                                >
                                {otherUser.firstName} {otherUser.lastName}
                            </Text>
                            )}
                        </Button>

                    </View>

                    <View
                        style={{
                            position: "absolute",
                            right: 15,
                            top: 15,
                            zIndex: 20,
                            elevation: 20,
                        }}
                    >
                        <ExpandingButton
                            expanded={showMenu}
                            onPress={() => setShowMenu((current) => !current)}
                            expandedChildren={
                                <View
                                    style={{
                                        gap: 5,
                                        overflow: "hidden",
                                        minWidth: 150,
                                    }}
                                >
                                    <Button
                                        onPress={async () => {
                                            if (!activeConversation || loadingReport) return;
                                            await reportTarget(activeConversation.other_user.sub, "user");
                                            setActiveConversation(null);
                                            loadInbox();
                                        }}
                                        disabled={loadingReport}
                                        style={{
                                            width: "auto",
                                            flexDirection: "row",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            paddingHorizontal: 16,
                                            paddingVertical: 12,
                                            backgroundColor: colors.background
                                        }}
                                    >
                                        <Text style={{ color: colors.text, fontSize: 16 }}>Report</Text>
                                        {loadingReport ? (
                                            <SpinningLogoImage size={18} />
                                        ) : (
                                            <ReportIcon color={colors.text} size={18} />
                                        )}
                                    </Button>

                                    <Button
                                        onPress={async () => {
                                            if (!activeConversation || loadingBlockUser) return;
                                            await blockUser(activeConversation.other_user.sub);
                                            setActiveConversation(null);
                                            loadInbox();
                                        }}
                                        disabled={loadingBlockUser}
                                        style={{
                                            width: "auto",
                                            flexDirection: "row",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            paddingHorizontal: 16,
                                            paddingVertical: 12,
                                            backgroundColor: colors.background
                                        }}
                                    >
                                        <Text style={{ color: colors.danger, fontSize: 16 }}>Block</Text>
                                        {loadingBlockUser ? (
                                            <SpinningLogoImage size={18} />
                                        ) : (
                                            <BlockIcon color={colors.danger} size={18} />
                                        )}
                                    </Button>
                                    
                                </View>
                            }
                            expandedStyle={{
                                borderRadius: 20
                            }}
                            clearBackground
                        >
                            <MoreIcon color={colors.text} size={15} rotate={90} />
                        </ExpandingButton>
                    </View>
                    
                </View>
            
                {!showProfile && (
                    <View
                        style={{
                            flex: 1,
                            paddingBottom: DASHBOARD_HEIGHT
                        }}
                    >
                        <MessageScreen
                            showBack={false}
                            conversation_id={activeConversation.conversation.id}
                            inBottomSheet={false}
                        />
                    </View>
                )}

                {showProfile && (
                    <BottomSheet
                        ref={profileSheetRef}
                        index={0}
                        snapPoints={BOTTOM_SNAP_POINTS}
                        enablePanDownToClose={false}
                        enableContentPanningGesture={false}
                        enableHandlePanningGesture={false}
                        enableDynamicSizing={false}
                        backgroundStyle={{
                            backgroundColor: "transparent",
                            borderRadius: FEED_CARD_PROFILE_RADIUS + 10,
                        }}
                        handleComponent={() => null}
                    >
                        <View  
                            style={{ 
                                height: 610,  
                                borderTopLeftRadius: FEED_CARD_PROFILE_RADIUS + 10,
                                borderTopRightRadius: FEED_CARD_PROFILE_RADIUS + 10,
                            }}
                        >
                            <View
                                style={{
                                    ...StyleSheet.absoluteFillObject,
                                    opacity: 0.85,
                                    backgroundColor: colors.secondaryCard,
                                    borderRadius: FEED_CARD_PROFILE_RADIUS + 10,
                                }}
                            />
                            <BottomSheetView
                                style={{
                                    height: 460,
                                    marginTop: 10,
                                    marginHorizontal: 10,
                                    overflow: "hidden",
                                    alignSelf: "center",
                                    backgroundColor: colors.background,
                                    borderRadius: FEED_CARD_PROFILE_RADIUS,
                                }}
                            >
                                <FeedProfile
                                    showMore={false}
                                    showCloseButton={false}
                                    showMessagesButton={false}
                                />
                            </BottomSheetView>
                        </View>
                    </BottomSheet>
                )}

            </View>
        );
    };
 
    return (
        <>
            <View
                style={{
                    ...StyleSheet.absoluteFillObject,
                    backgroundColor: colors.background,
                }}
            >

                <GradientHeader
                    height={65}
                    baseColor={colors.background}
                    contentStyle={{
                        height: 65,
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
                    />
                </GradientHeader>

                <View style={{ flex: 1 }}>
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
                            style={{
                                paddingTop: 65,
                            }}
                            contentContainerStyle={{
                                paddingBottom: BOTTOM_INSETS,
                            }}
                        >
                            {inbox.map((item) => (
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
                                        <Button
                                            onPress={async () => {
                                                await loadConversation(undefined, item.conversation.id);
                                                await markAsRead(item.conversation.id);
                                                dismissConversationNotifications(item.conversation.id);
                                                setActiveConversation(item);
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
                                                    className={textStyles.bodyMedium}
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
                                        </Button>
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
