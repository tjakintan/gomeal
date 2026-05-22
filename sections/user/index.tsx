import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/provider/ThemeProvider";
import { useProfile } from "@/stores/useProfile";
import { CameraIcon, EditIcon, GalleryIcon, GroceryIcon,  MessageIcon, PersonIcon, PersonSettingIcon } from "@/icons/Icon";
import { Button } from "@/components/ButtonComponent";
import { Media } from "@/media/media";
import { useEffect, useRef } from "react";
import { ScrollView } from "react-native-gesture-handler";
import { SectionHeader } from "@/components/SectionComponent";
import { BadgeRender } from "@/dashboard/Avatar";
import { InboxMainScreen } from "./inbox";
import { InfoMainScreen } from "./account";
import * as ImagePicker from "expo-image-picker";
import { GroceryMainScreen } from "./grocery";
import { EditAvatarScreen } from "@/dashboard/Avatar";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { useState } from "react";
import { uploadMediaToS3 } from "@/api/post.api";
import { Profile } from "./profile";

export default function UserScreen() {
  const { data, loadProfile, updateAvatar, updateProfileImage } = useProfile();
  const { colors, textStyles } = useTheme();

  type UserOverlay = "avatar" | "inbox" | "grocery" | "info" | null;
  const [activeOverlay, setActiveOverlay] = useState<UserOverlay>(null);
  const [uploadingProfileImage, setUploadingProfileImage] = useState(false);

  const mediaSheetRef = useRef<BottomSheet>(null);

  const closeOverlay = () => {
    mediaSheetRef.current?.close();
    setActiveOverlay(null);
  };

  const openOverlay = (overlay: Exclude<UserOverlay, null>) => {
    mediaSheetRef.current?.close();
    setActiveOverlay(overlay);
  };

  const saveProfileImage = async (uri: string) => {
    setUploadingProfileImage(true);

    try {
      const s3Url = await uploadMediaToS3(uri, "image", "users/profile_images");
      if (!s3Url) return;

      await updateProfileImage(s3Url);
    } catch (err) {
      console.error("Failed to save profile image:", err);
    } finally {
      setUploadingProfileImage(false);
    }
  };

  const openCamera = async () => {
    mediaSheetRef.current?.close();

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      await saveProfileImage(result.assets[0].uri);
    }
  };

  const openGallery = async () => {
    mediaSheetRef.current?.close();

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      await saveProfileImage(result.assets[0].uri);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  return (
    <>
      <View className="flex-1 flex-col items-center justify-start">

        <View style={{ gap: 10, padding: 10 }} className="w-full">

          <View style={{ height: 145 }} className="w-full">
            <Button
              disabled={uploadingProfileImage}
              onPress={() => mediaSheetRef.current?.expand()}
              style={{
                height: "100%",
                width: "100%",
                borderRadius: 30,
                borderBottomLeftRadius: 0,
                backgroundColor: colors.card,
                borderWidth: 2,
                borderColor: colors.secondaryCard,
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                gap: 5,
              }}
            >
              {data?.profile?.profile_img_url && (
                <Media
                  uri={data.profile.profile_img_url}
                  mediaType="image"
                  style={{
                    ...StyleSheet.absoluteFillObject,
                    borderRadius: 28,
                    borderBottomLeftRadius: 0,
                  }}
                  imageContentFit="cover"
                />
              )}

              <View
                style={{
                  height: 54,
                  width: 54,
                  borderRadius: 999,
                  backgroundColor: colors.background,
                  opacity: 0.85,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <EditIcon color={colors.text} size={28} />
              </View>
            </Button>
          </View>

          <View style={{ flexDirection: "row", alignItems: "flex-end", marginTop: -50 }}>

            <Button
              onPress={() => openOverlay("avatar")}
              style={{
                height: 100,
                width: 100,
                borderRadius: 999,
                backgroundColor: colors.card,
                borderWidth: 5,
                borderColor: colors.background,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <PersonIcon color={colors.text} size={25} />
            </Button>

            <View
              style={{
                flex: 1,
                gap: 10,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "flex-start",
                paddingVertical: 5,
                paddingHorizontal: 5,
                paddingBottom: 4,
                borderRadius: 5,
              }}
            >

              <Button onPress={() => openOverlay("inbox")} >
                <MessageIcon color={colors.text} size={25} />
              </Button>

              <Button onPress={() => openOverlay("grocery")} >
                <GroceryIcon color={colors.text} size={25} />
              </Button>

              <Button onPress={() => openOverlay("info")} >
                <PersonSettingIcon color={colors.text} size={22} />
              </Button>

            </View>

          </View>

        </View>

        <Profile />

        <BottomSheet
          ref={mediaSheetRef}
          index={-1}
          snapPoints={[110]}
          enablePanDownToClose
          backgroundStyle={{ 
            backgroundColor: colors.background,
            borderRadius: 35,
            shadowColor: colors.text,
            shadowOpacity: 0.15,
            shadowRadius: 3,
            shadowOffset: { width: 0, height: 4 },
            elevation: 5,            
          }}
          handleIndicatorStyle={{ backgroundColor: colors.secondaryCard, width: 45, height: 7 }}
        >
          <BottomSheetView 
            style={{ 
              padding: 15, 
              gap: 12, 
              flexDirection: "row", 
              alignItems: "center", 
            }}
          >

            <Button
              onPress={openCamera}
              style={{
                flex: 1,
                height: 60,
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
              background
            >
              <CameraIcon color={colors.text} size={30} />
            </Button>

            <Button
              onPress={openGallery}
              style={{
                flex: 1,
                height: 60,
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
              background
            >
              <GalleryIcon color={colors.text} size={30} />
            </Button>

          </BottomSheetView>

        </BottomSheet>

      </View>

      {activeOverlay === "inbox" && <InboxMainScreen onClose={closeOverlay} />}

      {activeOverlay === "grocery" && <GroceryMainScreen onClose={closeOverlay} />}

      {activeOverlay === "info" && <InfoMainScreen onClose={closeOverlay} />}

      {activeOverlay === "avatar" && (
        <EditAvatarScreen
          avatar={data?.profile?.avatar}
          onClose={closeOverlay}
          onConfirm={async (avatar) => {
            await updateAvatar(avatar);
            closeOverlay();
          }}
        />
      )}

    </>
  );
}
