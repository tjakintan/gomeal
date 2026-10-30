import { View, Text, StyleSheet, RefreshControl, Animated, TouchableOpacity, useWindowDimensions } from "react-native";
import { useTheme } from "@/provider/ThemeProvider";
import { useProfile } from "@/stores/useProfile";
import { CalendarIcon, CheckIcon, EditIcon, EmptyIcon, GroceryIcon, InfoIcon, PencilIcon, PersonIcon, PersonSettingIcon, PictureIcon, SettingsIcon } from "@/icons/Icon";
import { Button } from "@/components/ButtonComponent";
import { Media } from "@/media/media";
import { useCallback, useEffect, useRef, useState } from "react";
import { SectionHeader } from "@/components/SectionComponent";
import Settings from "../settings";
import { InfoMainScreen } from "./account";
import { GroceryMainScreen } from "./grocery";
import { EditAvatarScreen } from "@/dashboard/Avatar";
import { uploadMediaToS3 } from "@/api/post.api";
import { Profile } from "./profile";
import ImageCropPicker from "react-native-image-crop-picker";
import { GradientHeader } from "@/components/GradientComponent";
import { ACCENT_COLORS, BOTTOM_INSETS } from "@/types";
import { Input } from "@/components/InputComponent";
import GomealGlassView from "@/components/GlassComponent";
import { formatMonthDayYear } from "@/utils/time";
import { capitalize, isWebsite, limitLength } from "@/utils/text";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useSlidingOverlay } from "@/stores/useSlideOverlay";
import { useBottomSheet } from "@/stores/useBottomSheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePermissions } from "@/provider/PermissionProvider";
import { useBanner } from "@/stores/useBanner";
import Gallery from "@/media/Gallery";
import * as MediaLibrary from "expo-media-library";
import { SheetContent } from "@/app/BottomSheet";
import { PHOTO_ONLY, useCameraRoll } from "@/media/store/useMedia";

const ProfileImagePicker = ({ onPicked }: { onPicked: (uri: string) => void }) => {
  
  const { assets, hasNextPage, loadingMore, loadMore, refresh } = useCameraRoll(PHOTO_ONLY, 60);

  return (
    <Gallery
      context="profile"
      cameraRollMedia={assets}
      loadingMore={loadingMore}
      hasNextPage={hasNextPage}
      onLoadMore={loadMore}
      onRefresh={refresh}
      onCameraCaptured={(uri, type) => { if (type === "image") onPicked(uri); }}
      onMediaSelected={(uri) => onPicked(uri)}
    />
  );
};

export default function UserScreen({
  isFocused,
}: {
  isFocused?: boolean;
}) {

  const banner = useBanner();
  const insets = useSafeAreaInsets();
  const { colors, textStyles } = useTheme();

  const { requestPermissions } = usePermissions();

  const { height: screenHeight } = useWindowDimensions();

  const data = useProfile((s) => s.data);
  const updateProfile = useProfile((s) => s.updateProfile);
  const loadProfile = useProfile((s) => s.loadProfile);
  const refreshPosts = useProfile((s) => s.refreshPosts);

  const [bio, setBio] = useState(data?.profile?.bio ?? "");
  const [website, setWebsite] = useState(data?.profile?.website ?? "");
  const [editingBio, setEditingBio] = useState(false);
  const [editingWebsite, setEditingWebsite] = useState(false);
  const [websiteError, setWebsiteError] = useState("");
  const [uploadingProfileImage, setUploadingProfileImage] = useState(false);

  // ----- loading / empty state -----------------------------------------
  const [initialLoading, setInitialLoading] = useState(true);
  const [pullRefreshing, setPullRefreshing] = useState(false);
  
  // ----- overlays -----------------------------------------
  const openSlidingOverlay = useSlidingOverlay(
      (state) => state.openSlidingOverlay
  );

  const closeSlidingOverlay = useSlidingOverlay(
      (state) => state.closeSlidingOverlay
  );

  const openBottomSheet = useBottomSheet(
      (state) => state.openBottomSheet
  );

  const closeBottomSheet = useBottomSheet(
      (state) => state.closeBottomSheet
  );

  const openSlideOverlay = (content: React.ReactNode) => {
      openSlidingOverlay(content);
  };

  // ----- update pfp, bio, website -----------------------------------------
  const saveProfileImage = async (uri: string) => {
    setUploadingProfileImage(true);

    try {

      const s3Url = await uploadMediaToS3(
        uri,
        "image",
        "profile_image"
      );

      if (!s3Url) {
        banner.error("Couldn't upload your profile image. Try again.");
        return;
      }

      await updateProfile({
        profile_img_url: s3Url,
      });
      banner.success("Profile image updated successfully");
    } catch (err) {
      banner.error("Couldn't update your profile image. Try again.");
    } finally {
      setUploadingProfileImage(false);
    }
  };

  const saveBio = async () => {
    setEditingBio(false);

    try {
      await updateProfile({
        bio: bio.trim(),
      });

      banner.success("Bio updated successfully");
    } catch (err) {
      banner.error("Couldn't update your bio. Try again.");
    }
  };

  const saveWebsite = async () => {
    const trimmed = website.trim();

    if (trimmed && !isWebsite(trimmed)) {
      setWebsiteError("Invalid");
      banner.error("Please enter a valid website URL.");
      return;
    }

    setWebsiteError("");
    setEditingWebsite(false);

    try {
      await updateProfile({
        website: trimmed,
      });

      banner.success("Website updated successfully");
    } catch (err) {
      banner.error("Couldn't update your website. Try again.");
    }
  };

  const saveTagColor = async (name: string) => {
    try {
      await updateProfile({
        tag_color: name,
      });

      banner.success(
        name === "none"
          ? "Tag color removed"
          : "Tag color updated successfully"
      );
    } catch (err) {
      banner.error("Couldn't update your tag color. Try again.");
    }
  };

  // ----- camera and gallery -----------------------------------------
  const handlePicked = async (uri: string) => {
    closeBottomSheet();
    try {
      const cropped = await ImageCropPicker.openCropper({
        path: uri,
        width: 1280,
        height: 720,
        mediaType: "photo",
      });
      await saveProfileImage(cropped.path);
    } catch (err: any) {
      if (err?.code === "E_PICKER_CANCELLED") return;
      console.error("[Profile] Crop error:", err);
    }
  };

  const openMediaSheet = () => {
    requestPermissions({
      permissions: ["mediaLibrary"],
      title: "Allow GoMeal to access your photos",
      description: "Photo Library access lets you choose a profile picture. You can change this access later in Settings.",
      deniedDescription: "Photo Library access has been disabled. Enable Photos access for GoMeal in Settings to choose a profile picture.",
      onGranted: () => {
        const first = 350;
        const second = screenHeight - insets.top - 60;

        openBottomSheet(
          <SheetContent>
            <ProfileImagePicker
              onPicked={handlePicked}
            />
          </SheetContent>,
          [first, second],
          0,
          0.5,
          false
        );
      },
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

  useEffect(() => {
    if (!isFocused) {
      closeBottomSheet()
    }
  }, [isFocused]);

  // ----- render -----------------------------------------
  return (
    <View style={{...StyleSheet.absoluteFillObject, backgroundColor: colors.background}}>

      <View
        style={{
          position: "absolute",
          height: 65,
          width: "100%",
          alignItems: "flex-end",
          paddingHorizontal: 10,
          zIndex: 11
        }}
      >

        <GradientHeader
          height={70}
          baseColor={colors.background}
          contentStyle={{
            paddingTop: 10,
            flexDirection: "row",
            gap: 10,
            alignItems: "flex-start",
            justifyContent: "flex-end",
            paddingHorizontal: 10,
          }}
        >

          <View className="items-center gap-1">
            <Button
              onPress={() =>
                openSlideOverlay(
                  <EditAvatarScreen
                    avatar={data?.profile?.avatar}
                    onClose={() => closeSlidingOverlay()}
                    onConfirm={async (avatar) => {
                      await updateProfile({ avatar });
                      closeSlidingOverlay();
                    }}
                  />
                )
              }
              clearBackground
            >
              <PersonIcon color={colors.text} size={23} />
            </Button>
            <Text className={textStyles.small} style={{ color: colors.secondaryText }}>Avatar</Text>
          </View>

          <View className="items-center gap-1">
            <Button
              onPress={() =>
                openSlideOverlay(
                  <GroceryMainScreen
                    onClose={() => closeSlidingOverlay()}
                  />
                )
              }
              clearBackground
            >
              <GroceryIcon color={colors.text} size={25} />
            </Button>
            <Text className={textStyles.small} style={{ color: colors.secondaryText }}>Grocery</Text>
          </View>

          <View className="items-center gap-1">
            <Button
              onPress={() =>
                openSlideOverlay(
                  <InfoMainScreen
                    onClose={() => closeSlidingOverlay()}
                  />
                )
              }
              clearBackground
            >
              <PersonSettingIcon color={colors.text} size={22} />
            </Button>
            <Text className={textStyles.small} style={{ color: colors.secondaryText }}>Account</Text>
          </View>

          <View className="items-center gap-1">
            <Button
              onPress={() =>
                openSlideOverlay(
                  <Settings
                    onClose={() => closeSlidingOverlay()}
                    isFocused={isFocused}
                  />
                )
              }
              clearBackground
            >
              <SettingsIcon color={colors.text} size={25} />
            </Button>
            <Text className={textStyles.small} style={{ color: colors.secondaryText }}>Settings</Text>
          </View>
          
        </GradientHeader>

      </View>

      {initialLoading ? ( 
        <EmptyUserScreen 
          mode="loading" 
        /> 
      ) : !data?.profile ? ( 
        <EmptyUserScreen 
          mode="empty"
          onRetry={async () => { 
            setInitialLoading(true); 
            try { 
              await loadProfile(); 
            } catch (err) { 
              console.error("Failed to load profile:", err); 
            } finally { 
              setInitialLoading(false); 
            } 
          }} 
        /> 
      ) : (
        <KeyboardAwareScrollView 
          showsVerticalScrollIndicator={false}
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
          <TouchableOpacity
            activeOpacity={1}
          >

            <View 
              style={{ 
                width: "100%",
                marginTop: 60,
              }}
            >

              <SectionHeader 
                  title="Picture" 
                  titleClassName={textStyles.section}
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
                  onPress={openMediaSheet}
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
                    titleClassName={textStyles.section}
                    subtitle="Tap the `pencil` to edit the info shown in the banner of your profile"
                    showDivider
                    leftIcon={<InfoIcon size={25} color={colors.text} />}
                />
              </GradientHeader>

              <View
                style={{
                  padding: 10,
                }}
              >
                <View
                  style={{
                    gap: 20,
                    borderRadius: 20,
                    backgroundColor: colors.card,
                    paddingTop: 90,
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
                        className={textStyles.body}
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
                        className={textStyles.body}
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
                        className={textStyles.body}
                        style={{
                          marginBottom: 6,
                          color: colors.secondaryText ?? colors.text,
                        }}
                      >
                        Heart color
                      </Text>

                      <View className="flex-row flex-wrap gap-3">
                        {Object.entries(ACCENT_COLORS).map(([name, value]) => {
                          const isActive = data?.profile?.tag_color === name;
                          const isNone = name === "none";

                          return (
                            <Button
                              key={name}
                              onPress={() => saveTagColor(name)}
                              style={{
                                backgroundColor: value,
                                width: 36,
                                height: 36,
                                borderRadius: 999,
                                borderWidth: isActive ? 3 : 0,
                                borderColor: colors.background,
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

          </TouchableOpacity>

        </KeyboardAwareScrollView>
      )}

    </View>
  );
}


function EmptyUserScreen({
  mode,
  onRetry,
}: {
  mode: "loading" | "empty";
  onRetry?: () => void;
}) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.9,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.45,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [opacity, mode]);

  const bone = (
    width: number | `${number}%`,
    height: number,
    radius = 8
  ) => (
    <Animated.View
      style={{
        width,
        height,
        borderRadius: radius,
        backgroundColor: colors.secondaryCard,
        opacity,
      }}
    />
  );

  return (
    <View
      style={{
        flex: 1,
        width: "100%",
        justifyContent: "flex-start",
        paddingTop: 55,
        paddingHorizontal: 10,
        gap: 20,
        marginTop: 40,
      }}
    >
      {/* Profile banner */}
      {bone("100%", 60, 25)}

      {/* Profile information */}
      <View style={{ width: "100%", gap: 10 }}>
        {bone("100%", 110, 20)}
        {bone("60%", 16, 6)}
        {bone("90%", 16, 6)}
      </View>

      {/* Profile image */}
      {bone("100%", 145, 10)}

      {/* Tag color placeholders */}
      <View
        style={{
          width: "100%",
          flexDirection: "row",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        {[1, 2, 3].map((item) => (
          <View
            key={item}
            style={{
              flex: 1,
              gap: 8,
            }}
          >
            {bone("100%", 40, 15)}
            {bone("100%", 40, 15)}
          </View>
        ))}
      </View>
    </View>
  );
}
