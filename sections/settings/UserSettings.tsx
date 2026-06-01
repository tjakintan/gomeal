import { useEffect, useState } from "react";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

import { useUser } from "@/stores/useUser";
import { resetSocket } from "@/api/socket";
import { View, Text, Pressable } from "react-native";
import { Button } from "@/components/ButtonComponent";
import { useTheme } from "@/provider/ThemeProvider";
import { LogOutIcon, DeleteIcon } from "@/icons/Icon";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useFeed } from "@/stores/useFeed";
import { useReel } from "@/stores/useReel";
import { useNotification } from "@/notifications/useNotification";
import { useMessage } from "@/stores/useMessage";
import { useCart } from "@/stores/useCart";
import { useSearch } from "@/stores/useSearch";
import { usePost } from "@/stores/usePost";

import { delete_account_api } from "@/api/profile.api";
import { SpinningLogoImage } from "@/utils/Logo";

export const clearAppState = async () => {

    await AsyncStorage.multiRemove([
        "accessToken",
        "refreshToken",
    ]);

    useFeed.setState({
        posts: [],
        reels: [],
        feedCache: {},
        reelCache: {},
        feedRequests: {},
        reelRequests: {},
        feedCursor: 0,
        reelCursor: 0,
        hasMoreFeed: true,
        hasMoreReels: true,
        selectedPost: null,
        activeReelPost: null,
        activeProfile: null,
        selectedScope: null,
    });

    useReel.setState({
        reels: [],
        history: [],
        loading: true,
        isVisible: false,
    });

    useCart.setState({
        carts: [],
        activeCart: null,
        ingredientStatusById: {},
        loadingCart: false,
    });

    useMessage.setState({
        inbox: [],
        conversations: null,
        conversationCache: {},
        conversationRequests: {},
        activeConversationKey: null,
        loadingInbox: false,
        loadingConversation: false,
        pendingConversation: null,
        inboxOpen: false,
    });

    useNotification.setState({
        notifications: null,
        unreadCount: 0,
        loadingNotifications: false,
    });

    usePost.getState().reset();

    useSearch.setState({
        trending_post: [],
        trending_user: [],
        users: [],
        posts: [],
        loading: false,
        trendLoading: false,
    });

    useUser.getState().clearUser();
    resetSocket();

};

const UserSettings: React.FC<{ open?: number}> = ({ open }) => {

    const { colors, textStyles } = useTheme();
    
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const handleLogout = async () => {
        await clearAppState();
    };

    const handleDelete = async () => {

        if (!showDeleteConfirm) {
            setShowDeleteConfirm(true);
            return;
        }

        try {

            setDeleting(true);

            const res = await delete_account_api();

            if (!res.ok) {
                return;
            }

            await clearAppState();

        } catch (err) {

            console.error("Delete account failed:", err);

        } finally {

            setDeleting(false);

        }

    };

    useEffect(() => {
        setShowDeleteConfirm(false);
    }, [open]);

    return (

        <View
            style={{
                height: showDeleteConfirm ? 400 : 175,
                borderRadius: 25, 
                backgroundColor: showDeleteConfirm ? colors.secondaryCard : colors.button
            }}
            className="flex-1 gap-5 items-center justify-center px-5"
        >

            {!showDeleteConfirm ? (
                <>
                    <Button
                        onPress={handleLogout}
                        style={{
                            width: 300,
                            height: 60,
                            flexDirection: "row",
                            gap: 10,
                            backgroundColor: colors.card,
                        }}
                        background={true}
                    >
                        <Text className={textStyles.h3}>
                            Logout
                        </Text>

                        <LogOutIcon color={colors.buttonSecondary} />
                    </Button>

                    <Button
                        onPress={() => setShowDeleteConfirm(true)}
                        style={{
                            width: 300,
                            height: 60,
                            flexDirection: "row",
                            gap: 10,
                            backgroundColor: colors.card,
                        }}
                        background={true}
                    >
                        <Text
                            className={textStyles.h3}
                            style={{
                                color: colors.danger,
                            }}
                        >
                            Delete Account
                        </Text>

                        <DeleteIcon color={colors.danger} />
                    </Button>
                </>
            ) : (
                <View
                    style={{
                        width: "100%",
                        gap: 20,
                        justifyContent: "center"
                    }}
                >

                    <Text
                        className={textStyles.h2}
                        style={{
                            color: colors.danger,
                            textAlign: "center",
                        }}
                    >
                        Delete Account
                    </Text>

                    <Text
                        className={textStyles.body}
                        style={{
                            textAlign: "center",
                            lineHeight: 22,
                        }}
                    >
                        Your account will be deactivated immediately. Account data may be retained
                        for up to 30 days before permanent deletion in accordance with our{" "}
                        <Text
                            onPress={() => WebBrowser.openBrowserAsync("https://www.gomeal.org/privacy")}
                            style={{
                                color: colors.button,
                                fontSize: 13,
                                textDecorationLine: "underline",
                                fontWeight: "600",
                            }}
                        >
                            Privacy Policy
                        </Text>
                    </Text>

                    <Button
                        onPress={handleDelete}
                        disabled={deleting}
                        style={{
                            width: 200,
                            height: 60,
                            backgroundColor: deleting ? "transparent" : colors.danger,
                            alignSelf: "center"
                        }}
                        background={true}
                    >
                        {deleting ? (
                            <View style={{ flex: 1, justifyContent: "center", alignItems: "center"}}>
                                <SpinningLogoImage size={20} />
                            </View>
                        ) : (
                            <Text
                                className={textStyles.h3}
                                style={{
                                    color: "white",
                                }}
                            >
                                Confirm
                            </Text>
                        )}
                    </Button>

                    <Button
                        onPress={() => setShowDeleteConfirm(false)}
                        style={{
                            width: 200,
                            height: 55,
                            backgroundColor: colors.background,
                            alignSelf: "center"
                        }}
                        background={true}
                    >
                        <Text className={textStyles.h3}>
                            Cancel
                        </Text>
                    </Button>

                </View>
            )}

        </View>
    );
};

export default UserSettings;