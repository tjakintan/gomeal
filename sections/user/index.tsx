import { View, Text, StyleSheet, RefreshControl, Animated, Pressable, Keyboard, Linking } from "react-native";
import { useTheme } from "@/provider/ThemeProvider";
import { useProfile } from "@/stores/useProfile";
import { CalendarIcon, CameraIcon, CheckIcon, CommentIcon, EditIcon, EmptyIcon, GalleryIcon, GroceryIcon, InfoIcon, MessageIcon, PencilIcon, PersonIcon, PersonSettingIcon, PictureIcon } from "@/icons/Icon";
import { Button } from "@/components/ButtonComponent";
import { Media } from "@/media/media";
import { useEffect, useRef, useState } from "react";
import { SectionHeader } from "@/components/SectionComponent";
import { InboxMainScreen } from "./inbox";
import { InfoMainScreen } from "./account";
import * as ImagePicker from "expo-image-picker";
import { GroceryMainScreen } from "./grocery";
import { EditAvatarScreen } from "@/dashboard/Avatar";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { uploadMediaToS3 } from "@/api/post.api";
import { Profile } from "./profile";
import ImageCropPicker from "react-native-image-crop-picker";
import { GradientHeader } from "@/components/GradientComponent";
import { ACCENT_COLORS, BOTTOM_INSETS } from "@/types";
import { DASHBOARD_HEIGHT } from "@/tags/ReelTag";
import { Input } from "@/components/InputComponent";
import GomealGlassView from "@/components/GlassComponent";
import { formatMonthDayYear } from "@/utils/time";
import { capitalize, isWebsite, limitLength } from "@/utils/text";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useKeyboardHeight } from "@/components/keyboardComponent";
import PermissionContent from "@/components/PermissionComponent";
import { useOverlay } from "@/stores/useOverlay";

export default function UserScreen({
  isFocused,
  setHideNav,
}: {
  isFocused?: boolean;
  setHideNav?: (v: boolean) => void;
}) {

  const { data, updateProfile, loadProfile, refreshPosts } = useProfile();
  const { colors, textStyles } = useTheme();
  const { keyboardHeight, isKeyboardVisible } = useKeyboardHeight();

  type UserOverlay = "avatar" | "inbox" | "grocery" | "info" | null;
  const [activeOverlay, setActiveOverlay] = useState<UserOverlay>(null);

  const [bio, setBio] = useState(data?.profile?.bio ?? "");
  const [website, setWebsite] = useState(data?.profile?.website ?? "");
  const [editingBio, setEditingBio] = useState(false);
  const [editingWebsite, setEditingWebsite] = useState(false);
  const [websiteError, setWebsiteError] = useState("");
  const [uploadingProfileImage, setUploadingProfileImage] = useState(false);

  // ----- loading / empty state -----------------------------------------
  const [initialLoading, setInitialLoading] = useState(true);
  const [pullRefreshing, setPullRefreshing] = useState(false);

  const mediaSheetRef = useRef<BottomSheet>(null);

  // ----- overlays -----------------------------------------
  const closeOverlay = () => {
    mediaSheetRef.current?.close();
    setActiveOverlay(null);
  };

  const openOverlay = (overlay: Exclude<UserOverlay, null>) => {
    mediaSheetRef.current?.close();
    setActiveOverlay(overlay);
  };

  // ----- update pfp, bio, website -----------------------------------------
  const saveProfileImage = async (uri: string) => {
    setUploadingProfileImage(true);

    try {
      const s3Url = await uploadMediaToS3(uri, "image", "users/profile_images");
      if (!s3Url) return;

      await updateProfile({ 
        profile_img_url: s3Url
      });
    } catch (err) {
      console.error("Failed to save profile image:", err);
    } finally {
      setUploadingProfileImage(false);
    }
  };

  const saveBio = async () => {
    setEditingBio(false);
    await updateProfile({ bio: bio.trim() });
  };

  const saveWebsite = async () => {
    const trimmed = website.trim();

    if (trimmed && !isWebsite(trimmed)) {
      setWebsiteError("Invalid");
      return;
    }

    setWebsiteError("");
    setEditingWebsite(false);
    await updateProfile({ website: trimmed });
  };

  const { openOverlay: openGlobalOverlay, closeOverlay: closeGlobalOverlay } = useOverlay();

  // ----- camera and gallery -----------------------------------------
  const openCamera = async () => {
    mediaSheetRef.current?.close();

    const image = await ImageCropPicker.openCamera({
      width: 1280,
      height: 720,
      cropping: true,
      cropperCircleOverlay: false,
    });

    await saveProfileImage(image.path);
  };

  const openGallery = async () => {
    mediaSheetRef.current?.close();

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 1,
    });

    if (result.canceled) return;

    await new Promise((resolve) => setTimeout(resolve, 800));

    try {
      const image = await ImageCropPicker.openCropper({
        path: result.assets[0].uri.replace("file://", ""),
        width: 1280,
        height: 720,
        cropperCircleOverlay: false,
        forceJpg: true,
        mediaType: "photo",
      });
      await saveProfileImage(image.path);
    } catch (err: any) {
      if (err?.code === "E_PICKER_CANCELLED" || err?.message?.includes("cancelled")) return;
      console.error("Cropper error:", err);
    }
  };

  // ----- permissions -----------------------------------------
  const requestCameraPermission = async () => {
    const permission = await ImagePicker.getCameraPermissionsAsync();

    if (permission.granted) {
      await openCamera();
      return;
    }

    openGlobalOverlay({
      custom: (
        <PermissionContent
          title="Allow GoMeal to access your camera"
          description={
            permission.canAskAgain
              ? "Camera access lets you take a profile picture. You can change this access later in Settings."
              : "Camera access has been disabled. Enable Camera access for GoMeal in Settings to take a profile picture."
          }
          continueText={
            permission.canAskAgain ? "Continue" : "Open Settings"
          }
          onContinue={async () => {
            if (permission.canAskAgain) {
              const result =
                await ImagePicker.requestCameraPermissionsAsync();

              if (!result.granted) return;

              closeGlobalOverlay();
              await openCamera();
            } else {
              closeGlobalOverlay();
              Linking.openSettings();
            }
          }}
        />
      ),
    });
  };

  const requestGalleryPermission = async () => {
    const permission = await ImagePicker.getMediaLibraryPermissionsAsync();

    if (permission.granted) {
      await openGallery();
      return;
    }

    openGlobalOverlay({
      custom: (
        <PermissionContent
          title="Allow GoMeal to access your photos"
          description={
            permission.canAskAgain
              ? "Photo Library access lets you choose a profile picture. You can change this access later in Settings."
              : "Photo Library access has been disabled. Enable Photos access for GoMeal in Settings to choose a profile picture."
          }
          continueText={
            permission.canAskAgain ? "Continue" : "Open Settings"
          }
          onContinue={async () => {
            if (permission.canAskAgain) {
              const result =
                await ImagePicker.requestMediaLibraryPermissionsAsync();

              if (!result.granted) return;

              closeGlobalOverlay();
              await openGallery();
            } else {
              closeGlobalOverlay();
              Linking.openSettings();
            }
          }}
        />
      ),
    });
  };

  // ----- initial load -----------------------------------------
  useEffect(() => {
    (async () => {
      await loadProfile();
      setInitialLoading(false);
    })();
  }, []);

  // ----- pull to refresh -----------------------------------------
  const handlePullRefresh = async () => {
    if (pullRefreshing) return;
    setPullRefreshing(true);
    try {
      await Promise.all([loadProfile(), refreshPosts()]);
    } catch (err) {
      console.error("Failed to refresh profile:", err);
    } finally {
      setPullRefreshing(false);
    }
  };

  // ----- sync bio & website -----------------------------------------
  useEffect(() => {
    if (data?.profile && !editingBio) {
      setBio(data.profile.bio ?? "");
    }
  }, [data?.profile?.bio]);

  useEffect(() => {
    if (data?.profile && !editingWebsite) {
      setWebsite(data.profile.website ?? "");
    }
  }, [data?.profile?.website]);

  useEffect(() => {
    if (!isFocused && (editingBio || editingWebsite)) {
      setEditingBio(false);
      setEditingWebsite(false);
    }
  })

  // ----- empty / loading states -----------------------------------------
  if (initialLoading) {
    return <EmptyUserScreen mode="loading" />;
  }

  if (!data?.profile) {
    return (
      <EmptyUserScreen
        mode="empty"
        onRetry={async () => {
          setInitialLoading(true);
          await loadProfile();
          setInitialLoading(false);
        }}
      />
    );
  }

  // ----- render -----------------------------------------
  return (
    <>

      {!activeOverlay && (
        <View
          style={{
            position: "absolute",
            top: 5,
            height: 65,
            width: "100%",
            alignItems: "flex-end",
            paddingHorizontal: 10,
            zIndex: 11
          }}
        >

          <View
            style={{
              flex: 1,
              gap: 10,
              flexDirection: "row",
              alignItems: "flex-end",
              justifyContent: "flex-start",
              paddingVertical: 5,
              paddingHorizontal: 5,
            }}
          >

            <View className="items-center gap-1">
              <Button onPress={() => openOverlay("avatar")} clearBackground>
                  <PersonIcon color={colors.text} size={23} />
              </Button>
              <Text className={textStyles.small} style={{ color: colors.secondaryText }}>Avatar</Text>
            </View>

            <View className="items-center gap-1">
              <Button onPress={() => openOverlay("inbox")} clearBackground>
                  <MessageIcon color={colors.text} size={25} />
              </Button>
              <Text className={textStyles.small} style={{ color: colors.secondaryText }}>Inbox</Text>
            </View>

            <View className="items-center gap-1">
              <Button onPress={() => openOverlay("grocery")} clearBackground>
                  <GroceryIcon color={colors.text} size={25} />
              </Button>
              <Text className={textStyles.small} style={{ color: colors.secondaryText }}>Grocery</Text>
            </View>

            <View className="items-center gap-1">
              <Button onPress={() => openOverlay("info")} clearBackground>
                  <PersonSettingIcon color={colors.text} size={22} />
              </Button>
              <Text className={textStyles.small} style={{ color: colors.secondaryText }}>Account</Text>
            </View>

          </View>

        </View>
      )}

      <KeyboardAwareScrollView 
        showsVerticalScrollIndicator={false}
        style={{
          flexDirection: "column",
        }}
        contentContainerStyle={{
          paddingBottom: BOTTOM_INSETS
        }}
        enableAutomaticScroll={false}
        refreshControl={
          <RefreshControl
            refreshing={pullRefreshing}
            onRefresh={handlePullRefresh}
            tintColor="transparent"       
            colors={["transparent"]}     
            progressBackgroundColor="transparent" 
          />
        }
      >

        <View 
          style={{ 
            width: "100%",
            marginTop: 60,
          }}
        >

          <SectionHeader 
              title="Picture" 
              titleClassName={textStyles.h3}
              subtitle="Tap the edit icon to choose a profile banner"
              showDivider
              leftIcon={<PictureIcon size={25} color={colors.text} />}
          />

          <View 
            style={{
              padding: 10
            }}
          >
            <Button
              disabled={uploadingProfileImage}
              onPress={() => mediaSheetRef.current?.expand()}
              style={{
                height: 145,
                width: "100%",
                backgroundColor: colors.card,
                borderWidth: 2,
                borderRadius: 10,
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
                    borderBottomLeftRadius: 0,
                  }}
                  imageContentFit="cover"
                />
              )}

              <GomealGlassView
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
              </GomealGlassView>

            </Button>
          </View>

        </View>

        <View
          style={{
            width: "100%",
            borderRadius: 25,
          }}
        >
          <GradientHeader
            height={75}
            baseColor={colors.background}
            contentStyle={{
              width: "100%",
              borderRadius: 25,
            }}
          >
            <SectionHeader 
                title="Profile" 
                titleClassName={textStyles.h3}
                subtitle="Tap the `pencil` to edit the info shown in the banner of your profile"
                showDivider
                leftIcon={<InfoIcon size={25} color={colors.text} />}
            />
          </GradientHeader>

          <View
            style={{
              flex: 1,
              padding: 10,
            }}
          >
            <View
              style={{
                flex: 1,
                gap: 20,
                borderRadius: 20,
                backgroundColor: colors.card,
                paddingTop: 70,
                padding: 10,
                flexDirection: "column",
                justifyContent: "flex-end"
              }}
            >

              <View
                style={{
                  padding: 10,
                  backgroundColor: colors.secondaryCard,
                  borderRadius: 20
                }}
              >

                <Text
                  className={textStyles.section}
                  numberOfLines={1}
                  style={{
                    fontSize: 20,
                  }}
                  ellipsizeMode="tail"
                >
                  {data?.profile?.profile_name}
                </Text>

                <Text
                  className={textStyles.body}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  style={{
                    color: colors.secondaryText ?? colors.text,
                    opacity: 0.8,
                    fontSize: 13,
                  }}
                >
                  {capitalize(data?.profile?.firstName)}{" "}
                  {capitalize(data?.profile?.lastName)}
                </Text>

                <View 
                  style={{
                    gap: 3,
                    marginTop: 15,
                    alignItems: "center",
                    flexDirection: "row"
                  }}
                >
                  <CalendarIcon color={colors.text} size={10} />
                    <Text className={textStyles.small}>
                      Joined on: {data?.profile?.date_joined
                        ? formatMonthDayYear(data.profile.date_joined)
                        : "Unknown"}
                    </Text>
                </View>

              </View>

              <View
                style={{
                  justifyContent: "flex-end",
                  gap: 12,
                }}
              >

                {/* Bio */}
                <View>
                  <View
                    style={{
                      position: "absolute",
                      right: -10,
                      top: 0,
                      zIndex: 1,
                      elevation: 1,
                    }}
                  >
                    <Button
                      onPress={() => {
                        if (!editingBio) {
                          setEditingBio(true);
                          return;
                        }
                        saveBio();
                      }}
                      clearBackground
                    >
                      {editingBio ? (
                        <CheckIcon color={colors.text} />
                      ) : (
                        <PencilIcon color={colors.text} size={18}/>
                      )}
                    </Button>
                  </View>
                  <Text
                    className={textStyles.small}
                    style={{
                      marginBottom: 6,
                      color: colors.secondaryText ?? colors.text,
                    }}
                  >
                    Bio
                  </Text>

                  <Input
                    value={bio}
                    onChangeText={(text) => setBio(limitLength(text, 160))}
                    multiline
                    placeholder={!data?.profile?.bio ? "I like to cook..." : data.profile.bio}
                    placeholderClassName={textStyles.small}
                    style={{
                      height: 85,
                      backgroundColor: editingBio ? colors.secondaryCard : colors.card,
                      
                    }}
                    editable={editingBio}
                  />

                  {editingBio && (
                    <Text
                      className={textStyles.small}
                      style={{
                        marginTop: 4,
                        textAlign: "right",
                        color: (160 - bio.length) <= 0 ? colors.danger : colors.secondaryText,
                      }}
                    >
                      {(160 - bio.length)} characters left
                    </Text>
                  )}
                </View>

                {/* Website */}
                <View>
                  <View
                    style={{
                      position: "absolute",
                      right: -10,
                      top: 0,
                      zIndex: 1,
                      elevation: 1,
                    }}
                  >
                    <Button
                      onPress={() => {
                        if (!editingWebsite) {
                          setEditingWebsite(true);
                          return;
                        }
                        saveWebsite();
                      }}
                      clearBackground
                    >
                      {editingWebsite ? (
                        <CheckIcon color={colors.text} />
                      ) : (
                        <PencilIcon color={colors.text} size={18}/>
                      )}
                    </Button>
                  </View>
                  <Text
                    className={textStyles.small}
                    style={{
                      marginBottom: 6,
                      color: colors.secondaryText ?? colors.text,
                    }}
                  >
                    Website
                  </Text>
                  <Input
                    value={website}
                    onChangeText={(text) => {
                      setWebsiteError("");
                      setWebsite(text);
                    }}
                    label={websiteError || undefined}
                    placeholder={!data?.profile?.website ? "https://" : data.profile.website}
                    placeholderClassName={textStyles.small}
                    keyboardType="url"
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={{
                      backgroundColor: editingWebsite ? colors.secondaryCard : colors.card
                    }}
                    editable={editingWebsite}
                  />
                </View>

                {/* Tag Color */}
                <View>
                  <Text
                    className={textStyles.small}
                    style={{
                      marginBottom: 6,
                      color: colors.secondaryText ?? colors.text,
                    }}
                  >
                    Tag Color
                  </Text>

                  <View className="flex-row flex-wrap gap-3">
                    {Object.entries(ACCENT_COLORS).map(([name, value]) => {
                      const isActive = data?.profile?.tag_color === name;
                      const isNone = name === "none";
                      return (
                        <Button
                          key={name}
                          onPress={() => updateProfile({ tag_color: name })}
                          style={{
                            backgroundColor: value,
                            width: 36,
                            height: 36,
                            borderRadius: 999,
                            borderWidth: isActive ? 3 : 0,
                            borderColor: colors.text,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {isNone && (
                            <EmptyIcon size={22} color={colors.text} />
                          )}
                        </Button>
                      );
                    })}
                  </View>
                </View>

              </View>

            </View>
          </View>
        </View>

        <Profile />

      </KeyboardAwareScrollView>

      <BottomSheet
        ref={mediaSheetRef}
        index={-1}
        snapPoints={[250 + DASHBOARD_HEIGHT]}
        enablePanDownToClose
        backgroundStyle={{
          backgroundColor: colors.background,
          borderRadius: 35,
          shadowColor: colors.text,
          shadowOpacity: 0.10,
          shadowRadius: 3,
          shadowOffset: { width: 0, height: -4 },
          elevation: 5,
        }}
        handleIndicatorStyle={{ backgroundColor: colors.secondaryCard, width: 45, height: 7 }}
      >
        <BottomSheetView 
          style={{ 
            padding: 15, 
            gap: 12, 
            flexDirection: "row",
            justifyContent: "center", 
            alignItems: "center", 
          }}
        >

          <Button
            onPress={requestCameraPermission}
            style={{
              flex: 1,
              height: 60,
              width: 100,
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
            background
          >
            <CameraIcon color={colors.text} size={30} />
          </Button>

          <Button
            onPress={requestGalleryPermission}
            style={{
              flex: 1,
              height: 60,
              width: 100,
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

      {activeOverlay === "inbox" && <InboxMainScreen onClose={closeOverlay} isFocused={isFocused} setHideNav={setHideNav}/>}

      {activeOverlay === "grocery" && <GroceryMainScreen onClose={closeOverlay} />}

      {activeOverlay === "info" && <InfoMainScreen onClose={closeOverlay} />}

      {activeOverlay === "avatar" && (
        <EditAvatarScreen
          avatar={data?.profile?.avatar}
          onClose={closeOverlay}
          onConfirm={async (avatar) => {
            await updateProfile({avatar});
            closeOverlay();
          }}
        />
      )}

    </>
  );
}

// ----- empty / loading screen -----------------------------------------

function EmptyUserScreen({
  mode,
  onRetry,
}: {
  mode: "loading" | "empty";
  onRetry?: () => void;
}) {
  const { colors, textStyles } = useTheme();
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    if (mode !== "loading") return;

    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.9, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.45, duration: 700, useNativeDriver: true }),
      ])
    );

    anim.start();
    return () => anim.stop();
  }, [mode]);

  const bone = (width: number | `${number}%`, height: number, radius = 8) => (
    <Animated.View
      style={{
        width,
        height,
        borderRadius: radius,
        backgroundColor: colors.card,
        opacity,
      }}
    />
  );

  if (mode === "loading") {
    return (
      <View style={{ flex: 1, padding: 10, gap: 20, marginTop: 40 }}>
        {bone("100%", 60, 25)}
        <View style={{ gap: 10 }}>
          {bone("100%", 110, 20)}
          {bone("60%", 16, 6)}
          {bone("90%", 16, 6)}
        </View>
        {bone("100%", 145, 10)}
        <View style={{ flexDirection: "row", gap: 15 }}>
          {[1, 2, 3].map((c) => (
            <View key={c} style={{ gap: 8 }}>
              {bone(100, 40, 15)}
              {bone(100, 40, 15)}
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: 20,
      }}
    >
      <PersonIcon color={colors.secondaryText} size={48} />
      <Text className={textStyles.h3} style={{ textAlign: "center" }}>
        Couldn't load your profile
      </Text>
      <Text className={textStyles.caption} style={{ textAlign: "center", color: colors.secondaryText }}>
        Check your connection and try again.
      </Text>
      {onRetry && (
        <Button onPress={onRetry} background style={{ paddingHorizontal: 24, paddingVertical: 10, borderRadius: 999 }}>
          <Text className={textStyles.body}>Retry</Text>
        </Button>
      )}
    </View>
  );
}