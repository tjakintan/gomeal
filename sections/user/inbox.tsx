import { Button, ExpandingButton } from "@/components/ButtonComponent";
import { SectionHeader } from "@/components/SectionComponent";
import { AvatarRender } from "@/dashboard/Avatar";
import { BackIcon, MessageIcon, MoreIcon } from "@/icons/Icon";
import { useTheme } from "@/provider/ThemeProvider";
import { useMessage } from "@/stores/useMessage";
import { SpinningLogoImage } from "@/utils/Logo";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MessageScreen from "../messages/messages";
import { useProfile } from "@/stores/useProfile";
import { SafeAreaView } from "react-native-safe-area-context";
import { InboxConversation } from "@/types/messages.types";
import { useBlockUser, useReport } from "@/stores/useReport";
import { useFeed } from "@/stores/useFeed";

export const InboxMainScreen: React.FC<{ onClose: () => void }> = ({ onClose }) => {

    const { colors, textStyles } = useTheme();

    const {
        inbox,
        loadInbox,
        loadingInbox,
        loadConversation,
        pendingConversation,
    } = useMessage();
    const { reportTarget, loadingReport } = useReport();
    const { blockUser, loadingBlockUser } = useBlockUser();
    const { activeProfile, removeProfile, loadingProfile, clearActiveProfile } = useFeed(); 

    const [showMenu, setShowMenu] = useState(false);
    const [activeConversation, setActiveConversation] = useState<InboxConversation | null>(null);

    useEffect(() => {
        if (!pendingConversation) {
            loadInbox();
        }
    }, []);

    const closeConversation = () => {
        setActiveConversation(null);
        loadInbox();
    };

    const handleReportUser = async () => {
        if (!activeConversation || loadingReport) return;

        await reportTarget(activeConversation.other_user.sub, "user");
        setActiveConversation(null);
        loadInbox();
    };

    useEffect(() => {
        const { pendingConversation } = useMessage.getState();

        if (pendingConversation) {
            setActiveConversation(pendingConversation);
            useMessage.setState({ pendingConversation: null });
            return; // skip loadInbox, conversation already cached
        }

        loadInbox();
    }, []);

    if (activeConversation) {
        const otherUser = activeConversation.other_user;

        return (
            <View
                style={{
                    ...StyleSheet.absoluteFillObject,
                    backgroundColor: colors.background,
                    paddingBottom: 125
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
                        height: 50,
                        width: "100%",
                        paddingHorizontal: 10,
                        borderBottomWidth: 1,
                        borderColor: colors.secondaryCard,
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: colors.background,
                        elevation: 20,
                        overflow: "visible",
                    }}
                >
                    <View
                        style={{
                            flex: 1,
                            height: 40,
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 10,
                        }}
                    >
                        <AvatarRender avatar={otherUser.avatar} size={32} />

                        <View style={{ flex: 1 }}>
                            <Text
                                className={textStyles.bodyMedium}
                                numberOfLines={1}
                                style={{ color: colors.text }}
                            >
                                {otherUser.profile_name}
                            </Text>

                            <Text
                                className={textStyles.small}
                                numberOfLines={1}
                                style={{ color: colors.secondaryText }}
                            >
                                {otherUser.firstName} {otherUser.lastName}
                            </Text>
                        </View>
                    </View>

                    <ExpandingButton
                        expanded={showMenu}
                        onPress={() => setShowMenu((current) => !current)}
                        expandedChildren={
                            <View style={{ gap: 10 }}>
                                <Button
                                    onPress={async () => {}}
                                    disabled={loadingReport}
                                    style={{
                                        height: 40,
                                        width: 135,
                                        backgroundColor: colors.buttonSecondary,
                                    }}
                                    background
                                >
                                    {loadingReport ? (
                                        <SpinningLogoImage size={18} />
                                    ) : (
                                        <Text className={textStyles.caption}>Report</Text>
                                    )}
                                </Button>

                                <Button
                                    onPress={async () => {}}
                                    disabled={loadingBlockUser}
                                    style={{
                                        height: 40,
                                        width: 135,
                                        backgroundColor: colors.danger,
                                    }}
                                    background
                                >
                                    {loadingBlockUser ? (
                                        <SpinningLogoImage size={18} />
                                    ) : (
                                        <Text className={textStyles.caption}>Block</Text>
                                    )}
                                </Button>
                            </View>
                        }
                        expandedStyle={{
                            borderRadius: 20,
                            zIndex: 40,
                            elevation: 40,
                        }}
                    >
                        <MoreIcon color={colors.text} size={15} rotate={90} />
                    </ExpandingButton>
                    
                </View>

                <View
                    style={{
                        flex: 1,
                        borderBottomWidth: 1,
                        borderColor: colors.secondaryCard,
                        zIndex: 1,
                    }}
                >
                    <MessageScreen
                        conversation_id={activeConversation.conversation.id}
                        onClose={closeConversation}
                    />
                </View>
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

                <View
                    style={{
                        height: 65,
                        paddingHorizontal: 20,
                        alignItems: "center",
                        flexDirection: "row",
                    }}
                >
                    <Button onPress={() => {onClose?.()}} background>
                        <BackIcon color={colors.background} />
                    </Button>

                    <SectionHeader
                        title="Inbox"
                        showBackground
                        titleClassName={textStyles.h3}
                    />
                </View>

                <View style={{ flex: 1, padding: 10 }}>
                    {loadingInbox ? (
                        <View className="flex-1 items-center justify-center">
                            <SpinningLogoImage size={50} />
                        </View>
                    ) : !inbox.length ? (
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
                                gap: 10,
                            }}
                        >
                            {inbox.map((item) => (
                                <TouchableOpacity activeOpacity={1} key={item.conversation.id}>
                                    <Button
                                        onPress={async () => {
                                            await loadConversation(undefined, item.conversation.id);
                                            setActiveConversation(item);
                                        }}
                                        style={{
                                            width: "100%",
                                            height: 85,
                                            paddingHorizontal: 14,
                                            borderRadius: 0,
                                            borderBottomWidth: 1,
                                            borderColor: colors.text,
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
                                                    style={{ color: colors.background }}
                                                >
                                                    {item.unread_count}
                                                </Text>
                                            </View>
                                        )}
                                    </Button>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    )}
                </View>

            </View>
        </>
    );
};
