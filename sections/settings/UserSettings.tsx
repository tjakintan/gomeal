import { useUser } from "@/stores/useUser";
import { resetSocket } from "@/api/socket";
import { View, Text } from "react-native";
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
import { useOverlay } from "@/stores/useOverlay";
import DeleteConfirm from "@/components/DeleteComponent";


export const clearAppState = async () => {

    await AsyncStorage.multiRemove([
        "accessToken",
        "refreshToken",
    ]);

    useFeed.setState({
        posts: [],
        visiblePostIds: [],
        feedCache: {},
        reelCache: {},
        feedRequests: {},
        reelRequests: {},
        feedCursor: 0,
        reelCursor: 0,
        hasMoreFeed: true,
        hasMoreReels: true,
        loadingMoreFeed: false,
        loadingMoreReels: false,
        selectedPost: null,
        activeReelPost: null,
        activeProfile: null,
        selectedScope: null,
    });

    useReel.setState({
        order: [],
        history: [],
        origin: null,
        loading: true,
        isVisible: false,
        isAnimating: false,
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

const UserSettings: React.FC = () => {

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
            custom: (
                <DeleteConfirm
                    onConfirm={handleDelete}
                    onCancel={closeOverlay}
                />
            ),
        });
    };

    return (
        <View style={{ width: "100%", gap: 10 }}>

            <Button
                onPress={handleLogout}
                style={{ 
                    width: "100%",
                    height: 95,
                    borderRadius: 20,
                    paddingHorizontal: 16,
                    justifyContent: "center",
                    alignItems: "flex-start",
                }}
            >
                <View 
                    style={{
                        width: "100%",
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                    }}
                >
                    <View style={{ flex: 1 }}>
                        <Text
                            className={textStyles.section}
                            style={{ color: colors.text }}
                        >
                            Logout
                        </Text>
                        <Text
                            className={textStyles.small}
                            numberOfLines={1}
                            style={{ color: colors.secondaryText }}
                        >
                            Sign out of this device
                        </Text>
                    </View>
                    <LogOutIcon color={colors.button} />
                </View>
            </Button>

            <Button
                onPress={handleDeletePress}
                style={{ 
                    width: "100%",
                    height: 95,
                    borderRadius: 20,
                    paddingHorizontal: 16,
                    justifyContent: "center",
                    alignItems: "flex-start",
                }}
            >
                <View 
                    style={{
                        width: "100%",
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                    }}
                >
                    <View style={{ flex: 1 }}>
                        <Text
                            className={textStyles.section}
                            style={{ color: colors.text }}
                        >
                            Delete Account
                        </Text>
                        <Text
                            className={textStyles.small}
                            numberOfLines={1}
                            style={{ color: colors.secondaryText }}
                        >
                            Deactivate and permanently delete your account
                        </Text>
                    </View>
                    <DeleteIcon color={colors.danger} />
                </View>
            </Button>

        </View>
    );
};

export default UserSettings;