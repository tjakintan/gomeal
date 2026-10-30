import { AppState, AppStateStatus, Image, Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { getSocket, socketEmit } from "@/api/socket";
import { useMessage } from "@/stores/useMessage";

import { useCook } from "@/stores/useCook";
import { useSlidingOverlay } from "@/stores/useSlideOverlay";
import { CookMainScreen } from "@/sections/cook";
import MessageScreen from "@/sections/messages/messages";
import { openCookOverlay } from "@/sections/cook/openCook";
import { useEffect } from "react";
import { useBannerStore } from "@/stores/useBanner";
import { MessageIcon } from "@/icons/Icon";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});


export async function syncBadgeCount(count: number) {
  try {
    await Notifications.setBadgeCountAsync(Math.max(0, count));
  } catch (e) {
    console.warn("setBadgeCountAsync failed", e);
  }
};

//report app state
export const useAppStateReporter = () => {
    useEffect(() => {
        let mounted = true;
        const report = (state: AppStateStatus) =>
            socketEmit("app-state", { state }).catch(() => {});

        report(AppState.currentState);
        const sub = AppState.addEventListener("change", report);

        let off: (() => void) | undefined;
        getSocket().then((sock) => {
            if (!mounted) return;
            const onConnect = () => report(AppState.currentState);
            sock.on("connect", onConnect);
            off = () => sock.off("connect", onConnect);
        });

        return () => {
            mounted = false;
            sub.remove();
            off?.();
        };
    }, []);
};

const bannerBody = (type: string, content: string, count: number): string => {
    switch (type) {
        case "text":
            return content;
        case "image":
            return count > 1 ? `Sent you ${count} images` : "Sent you an image";
        case "video":
            return count > 1 ? `Sent you ${count} videos` : "Sent you a video";
        case "gif":
            return "Sent you a GIF";
        case "voice":
            return "Sent you a voice message";
        case "file":
            return count > 1 ? `Sent you ${count} files` : "Sent you a file";
        case "link":
          return "Sent you a link"
        default:
            return "Sent you a message";
    }
};

type MessageBannerPayload = {
    conversation_id: number;
    title: string;
    message_type: string;
    content: string;
    count: number;
    profile_image_url: string | null;
};

export const useMessageBannerListener = () => {
    useEffect(() => {
        let mounted = true;
        let off: (() => void) | undefined;

        getSocket().then((sock) => {
            if (!mounted) return;

            const handler = (p: MessageBannerPayload) => {
                if (useMessage.getState().viewingConversationId === p.conversation_id) return;

                useBannerStore.getState().showCustom({
                    icon: p.profile_image_url
                        ? <Image source={{ uri: p.profile_image_url }} style={{ width: 36, height: 36, borderRadius: 18 }} />
                        : <MessageIcon size={24} color="#888" />,
                    title: p.title,
                    text: bannerBody(p.message_type, p.content, p.count),
                    onPress: () => handleMessageNotification(p.conversation_id),
                });
            };

            sock.on("message-sent-in-app", handler);
            off = () => sock.off("message-banner", handler);
        });

        return () => {
            mounted = false;
            off?.();
        };
    }, []);
};

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
  useMessage.setState({ pendingConversation: match ?? null });

  useSlidingOverlay.getState().openSlidingOverlay(
    <MessageScreen 
      conversation_id={id} 
      onClose={() => useSlidingOverlay.getState().closeSlidingOverlay()}
    />
  );
}


async function handleNotiPost(post_id: number) { openCookOverlay(post_id); }


// Called at module load time — before any component mounts
export function initNotificationListener() {
  // Live listener — fires when the user taps a notification
  // (app foregrounded, backgrounded, or just launched from a tap)
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = resolveNotificationData(response.notification.request);
    const { type, conversation_id, post_id } = data;

    if (type === "step_timer") return;
    
    if (type === "message" && conversation_id) {
      handleMessageNotification(Number(conversation_id));
    }

    if (type === "trending_post" && post_id) {
      handleNotiPost(Number(post_id));
    }

    if (type === "recommended_post" && post_id) {
      handleNotiPost(Number(post_id));
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
      handleNotiPost(Number(post_id));
    }

    if (type === "recommended_post" && post_id) {
      handleNotiPost(Number(post_id));
    }

    dismissNotification(response.notification.request.identifier);

  });

  return () => sub.remove()
}

export async function dismissNotification(identifier?: string) {
  if (identifier) {
    await Notifications.dismissNotificationAsync(identifier);
  } else {
    await Notifications.dismissAllNotificationsAsync();
  }
}

// Dismiss every currently-presented notification of a given `type`
// (e.g. "message", "trending_post", "recommend_post"), leaving other categories untouched.
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