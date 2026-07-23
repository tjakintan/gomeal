import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { socketEmit } from "@/api/socket";
import { useMessage } from "@/stores/useMessage";

import { useCook } from "@/stores/useCook";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestPushNotificationPermission() {
    const existing = await Notifications.getPermissionsAsync();

    let granted =
        existing.granted ||
        existing.ios?.status ===
            Notifications.IosAuthorizationStatus.PROVISIONAL;

    if (!granted) {
        const requested = await Notifications.requestPermissionsAsync();

        granted =
            requested.granted ||
            requested.ios?.status ===
                Notifications.IosAuthorizationStatus.PROVISIONAL;
    }

    return granted;
}

export async function registerPushNotifications() {
    if (!Device.isDevice) return null;

    if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
            name: "default",
            importance: Notifications.AndroidImportance.MAX,
        });
    }

    const existing = await Notifications.getPermissionsAsync();

    const granted =
        existing.granted ||
        existing.ios?.status ===
            Notifications.IosAuthorizationStatus.PROVISIONAL;

    if (!granted) return null;

    const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        Constants.easConfig?.projectId;

    if (!projectId) {
        throw new Error("Missing EAS projectId");
    }

    const [expoToken, deviceToken] = await Promise.all([
        Notifications.getExpoPushTokenAsync({ projectId }),
        Notifications.getDevicePushTokenAsync(),
    ]);

    await socketEmit("register-push-token", {
        token: expoToken.data,
        native_token: deviceToken.data,
        platform: Platform.OS,
    });

    return expoToken.data;
}

// resolve notification data regardless of delivery path ──────────
// Expo-relayed pushes put custom data in `content.data`.
// Raw APNs pushes (sent directly via http2, bypassing Expo's relay) only
// expose custom keys under `request.trigger.payload` on iOS, since the
// native module doesn't remap unknown top-level APNs keys into content.data.
function resolveNotificationData(request: Notifications.NotificationRequest): Record<string, any> {
  const trigger = request.trigger as any;
  return (
    request.content.data ??
    trigger?.payload?.data ??
    trigger?.payload ??
    {}
  );
}

let coldStartHandled = false;

async function handleMessageNotification(conversation_id: number) {
  const id = Number(conversation_id);

  const [inbox] = await Promise.all([
    useMessage.getState().loadInbox(),
    useMessage.getState().loadConversation(undefined, id),
  ]);

  const match = inbox.find((item) => item.conversation.id === id);

  useMessage.setState({
    pendingConversation: match ?? null,
    inboxOpen: true,
  });
};

async function handleTrendingPost(post_id: number) {

  useCook.getState().openCook(post_id);
};

// Called at module load time — before any component mounts
export function initNotificationListener() {
  // Live listener — fires when the user taps a notification
  // (app foregrounded, backgrounded, or just launched from a tap)
  Notifications.addNotificationResponseReceivedListener((response) => {
    const data = resolveNotificationData(response.notification.request);
    const { type, conversation_id, post_id } = data;

    if (type === "step_timer") return;
    
    if (type === "message" && conversation_id) {
      handleMessageNotification(Number(conversation_id));
    }

    if (type === "trending_post" && post_id) {
      handleTrendingPost(Number(post_id));
    }

    dismissNotification(response.notification.request.identifier);

  });

  // Cold start — app was fully killed and launched via notification tap
  Notifications.getLastNotificationResponseAsync().then((response) => {
    if (!response || coldStartHandled) return;
    const data = resolveNotificationData(response.notification.request);
    coldStartHandled = true;

    const { type, conversation_id, post_id } = data;

    if (type === "step_timer") return;

    if (type === "message" && conversation_id) {
      handleMessageNotification(Number(conversation_id));
    }

    if (type === "trending_post" && post_id) {
      handleTrendingPost(Number(post_id));
    }

    dismissNotification(response.notification.request.identifier);

  });
}

export async function dismissNotification(identifier?: string) {
  if (identifier) {
    await Notifications.dismissNotificationAsync(identifier);
  } else {
    await Notifications.dismissAllNotificationsAsync();
  }
}

// Dismiss every currently-presented notification of a given `type`
// (e.g. "message", "trending_post"), leaving other categories untouched.
export async function dismissNotificationsByType(type: string) {
  const presented = await Notifications.getPresentedNotificationsAsync();

  const matches = presented.filter((n) => {
    const data = resolveNotificationData(n.request);
    return data.type === type;
  });

  await Promise.all(
    matches.map((n) => Notifications.dismissNotificationAsync(n.request.identifier))
  );
}

// Dismiss only message notifications belonging to one conversation —
// use this when a specific conversation is opened, not the whole inbox.
export async function dismissConversationNotifications(conversationId: number) {
  const presented = await Notifications.getPresentedNotificationsAsync();

  const matches = presented.filter((n) => {
    const data = resolveNotificationData(n.request);
    return data.type === "message" && Number(data.conversation_id) === conversationId;
  });

  await Promise.all(
    matches.map((n) => Notifications.dismissNotificationAsync(n.request.identifier))
  );
}

export const scheduleStepTimerNotification = async (stepNumber: number, dishName: string) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Timer",
      body: `Step ${stepNumber} timer finished for ${dishName}`,
      sound: true,
      data: { type: "step_timer" },
    },
    trigger: null,
  });
};