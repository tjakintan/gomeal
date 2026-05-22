import React, { useEffect, useState } from "react";
import { useTheme } from "@/provider/ThemeProvider";
import { View, Text, Linking, Platform } from "react-native";
import { Button } from "@/components/ButtonComponent";
import { Camera } from "expo-camera";
import * as MediaLibrary from "expo-media-library";
import * as Notifications from "expo-notifications";
import { SpinningLogoImage } from "../utils/Logo";
import Svg, { Path } from "react-native-svg";
import { registerPushNotifications } from "@/notifications/pushNotification";
import { XIcon } from "@/icons/Icon";
import { SectionHeader } from "@/components/SectionComponent";

type PermissionComponentProps = {
  onGranted: () => void;
  onClose: () =>  void;
};

export default function Permissions({ onGranted, onClose }: PermissionComponentProps) {
  const { colors, textStyles } = useTheme();

  const [loading, setLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [canAskAgain, setCanAskAgain] = useState(true);

  const hasNotificationPermission = (
    permission: Notifications.NotificationPermissionsStatus
  ) => {
    if (Platform.OS === "ios") {
      return (
        permission.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED ||
        permission.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
      );
    }

    if (Platform.OS === "android") {
      return (
        typeof permission.android?.importance === "number" &&
        permission.android.importance > 0
      );
    }

    return false;
  };

  const checkPermissions = async () => {
    try {
      const camera = await Camera.getCameraPermissionsAsync();
      const mic = await Camera.getMicrophonePermissionsAsync();
      const media = await MediaLibrary.getPermissionsAsync();
      const notification = await Notifications.getPermissionsAsync();

      const requiredGranted =
        camera.status === "granted" &&
        mic.status === "granted" &&
        media.status === "granted";

      const stillCanAsk =
        camera.canAskAgain || mic.canAskAgain || media.canAskAgain;

      setCanAskAgain(stillCanAsk);
      setHasPermission(requiredGranted);

      if (requiredGranted) {
        if (!hasNotificationPermission(notification)) {
          try {
            await registerPushNotifications();
          } catch (err) {
            console.error("Push notification registration failed", err);
          }
        }

        onGranted();
      }
    } catch (err) {
      console.error("Permission check failed", err);
      setHasPermission(false);
    } finally {
      setLoading(false);
    }
  };

  const openAppSettings = async () => {
    try {
      if (Platform.OS === "ios") {
        await Linking.openURL("app-settings:");
      } else {
        await Linking.openSettings();
      }
    } catch (err) {
      console.error("Failed to open settings", err);
    }
  };

  const requestPermissions = async () => {
    setLoading(true);

    try {
      if (!canAskAgain) {
        await openAppSettings();
        return;
      }

      const camera = await Camera.requestCameraPermissionsAsync();
      const mic = await Camera.requestMicrophonePermissionsAsync();
      const media = await MediaLibrary.requestPermissionsAsync();

      const requiredGranted =
        camera.status === "granted" &&
        mic.status === "granted" &&
        media.status === "granted";

      const stillCanAsk =
        camera.canAskAgain || mic.canAskAgain || media.canAskAgain;

      setCanAskAgain(stillCanAsk);
      setHasPermission(requiredGranted);

      if (requiredGranted) {
        try {
          await registerPushNotifications();
        } catch (err) {
          console.error("Push notification registration failed", err);
        }

        onGranted();
      }
    } catch (err) {
      console.error("Permission request failed", err);
      setHasPermission(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkPermissions();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <SpinningLogoImage size={50} duration={5000} />
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          padding: 24,
          gap: 10,
        }}
      >
        <SectionHeader
          title="Permissions"
          titleClassName={textStyles.h3}
          leftIcon={<SpinningLogoImage size={25} duration={5000} />}
          showBackground
          showDivider
        />

        <Text className={textStyles.body} style={{ textAlign: "left" }}>
          GoMeal needs camera, microphone, and photo access to take and upload
          food photos and videos.
        </Text>

        <View
          style={{
            gap: 10,
            flexDirection: "row"
          }}
        >

          <Button
            background
            style={{
              width: 100,
              flexDirection: "row",
              padding: 0,
              gap: 10,
              justifyContent: "center",
            }}
            onPress={canAskAgain ? requestPermissions : openAppSettings}
          >
            <Text style={{ color: colors.background }} className={textStyles.bodyMedium}>
              {canAskAgain ? "Grant" : "Open Settings"}
            </Text>
          </Button>

          <Button
              onPress={onClose}
              style={{
                  width: 100,
                  backgroundColor: colors.danger
              }}
              background
          >
              <Text style={{ color: colors.background }} className={textStyles.bodyMedium}>
                Skip
              </Text>
          </Button>

        </View>

    </View>
    );
  }

  return null;
}
