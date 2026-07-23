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
import { useOverlay } from "@/stores/useOverlay";
import { DASHBOARD_HEIGHT } from "@/tags/ReelTag";

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

const DeleteConfirmContent: React.FC<{
    onConfirm: () => Promise<void>;
    onCancel: () => void;
}> = ({ onConfirm, onCancel }) => {

    const { colors, textStyles } = useTheme();
    const [deleting, setDeleting] = useState(false);

    const handleConfirm = async () => {
        try {
            setDeleting(true);
            await onConfirm();
        } finally {
            setDeleting(false);
        }
    };

    return (
        <View style={{ flex: 1, width: "100%", gap: 20, justifyContent: "center", alignItems: "center" }}>

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
                onPress={handleConfirm}
                disabled={deleting}
                style={{
                    width: 200,
                    height: 60,
                    backgroundColor: deleting ? "transparent" : colors.danger,
                    alignSelf: "center",
                }}
                background={true}
            >
                {deleting ? (
                    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
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
                onPress={onCancel}
                disabled={deleting}
                style={{
                    width: 200,
                    height: 55,
                    alignSelf: "center",
                }}
                background={true}
            >
                <Text className={textStyles.h3}>
                    Cancel
                </Text>
            </Button>

        </View>
    );
};

const UserSettings: React.FC= () => {

    const { colors, textStyles } = useTheme();
    const openOverlay = useOverlay((state) => state.openOverlay);
    const closeOverlay = useOverlay((state) => state.closeOverlay);

    const handleLogout = async () => {
        await clearAppState();
    };

    const handleDelete = async () => {

        try {

            const res = await delete_account_api();

            if (!res.ok) {
                return;
            }

            closeOverlay();
            await clearAppState();

        } catch (err) {

            console.error("Delete account failed:", err);

        }

    };

    const handleDeletePress = () => {
        openOverlay({
            title: "Delete Account",
            custom: (
                <DeleteConfirmContent
                    onConfirm={handleDelete}
                    onCancel={closeOverlay}
                />
            ),
        });
    };

    return (

        <View
            style={{
                height: 175,
                marginHorizontal: 10,
                borderRadius: 25,
                backgroundColor: colors.button,
            }}
            className="flex-1 gap-5 items-center justify-center px-5"
        >

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
                onPress={handleDeletePress}
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

        </View>
    );
};

export default UserSettings;