import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { socketEmit } from "@/api/socket";
import { useMessage } from "@/stores/useMessage";

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export async function registerPushNotifications() {
    
    if (!Device.isDevice) return null;

    if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
            name: "default",
            importance: Notifications.AndroidImportance.MAX,
        });
    }

    const existing = await Notifications.getPermissionsAsync();

    let granted = existing.granted || existing.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;

    if (!granted) {
        const requested = await Notifications.requestPermissionsAsync();

        granted = requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
    }

    if (!granted) return null;

    const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        Constants.easConfig?.projectId;

    if (!projectId) {
        throw new Error("Missing EAS projectId");
    }

    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    console.log("Push notification token:", token.data);

    await socketEmit("register-push-token", {
        token: token.data,
        platform: Platform.OS,
    });

    return token.data;
};

export function registerNotificationResponseListener() {

    async function handleNotification(conversation_id: number) {
        const id = Number(conversation_id);

        const [inbox] = await Promise.all([
            useMessage.getState().loadInbox(),
            useMessage.getState().loadConversation(undefined, id),
        ]);

        const match = inbox.find((item) => item.conversation.id === id);

        if (match) {
            useMessage.setState({ pendingConversation: match });
        }

        useMessage.getState().openInbox();
    }

    const listener = Notifications.addNotificationResponseReceivedListener((response) => {
        const { type, conversation_id } = response.notification.request.content.data ?? {};
        if (type === "message" && conversation_id) {
            handleNotification(Number(conversation_id));
        }
    });

    Notifications.getLastNotificationResponseAsync().then((response) => {
        const { type, conversation_id } = response?.notification.request.content.data ?? {};
        if (type === "message" && conversation_id) {
            handleNotification(Number(conversation_id));
        }
    });

    return listener;
}