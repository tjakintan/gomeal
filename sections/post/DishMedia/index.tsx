import { useState, useRef, useEffect } from "react";
import { useTheme } from "@/provider/ThemeProvider";
import Svg, { Path, Line } from "react-native-svg";
import { Button } from "@/components/ButtonComponent";
import { View, Text, FlatList, Image, Pressable, StyleSheet, Linking } from "react-native";
import { MediaType, PostSectionInfoProps } from "@/types";
import * as ImagePicker from "expo-image-picker";
import { usePost } from "@/stores/usePost";
import GomealGlassView from "@/components/GlassComponent";
import { _DEFAULT_ICON_WIDTH, _DEFAULT_ICON_HEIGHT } from "@/types/layout.types";
import { CameraIcon, GalleryIcon, XIcon } from "@/icons/Icon";
import DishEnhanceMedia from "@/sections/post/DishMedia/EnhanceMedia";
import * as MediaLibrary from "expo-media-library";
import { SectionHeader } from "@/components/SectionComponent";
import { Media } from "@/media/media";
import { Camera } from "expo-camera";
import { SpinningLogoImage } from "@/utils/Logo";
import { useOverlay } from "@/stores/useOverlay";
import PermissionContent from "@/components/PermissionComponent";



const DishMedia: React.FC<PostSectionInfoProps> = ({
  isFocused,
  onMediaSelected,
  mediaSource,
  stepIndex,
  onEnhanceMediaOpen,
  onCompleteChange,
}) => {

    const { colors } = useTheme("dark");
    const { openOverlay, closeOverlay} = useOverlay();

    const { info, setMedia, } = usePost();
    const [uri, setUri] = useState<{ uri: string; type: MediaType } | null>(null);

    type AssetWithLocalUri = MediaLibrary.Asset & { localUri: string };
    const [cameraRollMedia, setCameraRollMedia] = useState<AssetWithLocalUri[]>([]);

    const fetchLastThree = async () => {
        const permission = await MediaLibrary.getPermissionsAsync();

        if (permission.status !== "granted") {
            setCameraRollMedia([]);
            return;
        }

        try {
            const mediaResult = await MediaLibrary.getAssetsAsync({
                first: 3,
                sortBy: [MediaLibrary.SortBy.creationTime],
                mediaType: ["photo", "video"],
            });

            const assetsWithLocalUri = await Promise.all(
                mediaResult.assets.reverse().map(async (asset) => {
                    const info = await MediaLibrary.getAssetInfoAsync(asset);

                    return {
                        ...asset,
                        localUri: info.localUri || asset.uri,
                    };
                })
            );

            setCameraRollMedia(assetsWithLocalUri);
        } catch (err) {
            console.log("Error fetching media:", err);
        }
    };

    //----- camera ----------------------------
    const requestCameraPermission = async () => {
    const cameraPermission = await ImagePicker.getCameraPermissionsAsync();
    const microphonePermission = await Camera.getMicrophonePermissionsAsync();

    if (cameraPermission.granted && microphonePermission.granted) {
        await openCamera();
        return;
    }

    openOverlay({
        custom: (
        <PermissionContent
            title="Allow GoMeal to access your camera & microphone"
            description={
            cameraPermission.canAskAgain && microphonePermission.canAskAgain
                ? "Camera access lets you take meal photos and record cooking videos. Microphone access lets your videos include audio. You can change these permissions later in Settings."
                : "Camera and/or microphone access has been disabled. Please enable Camera and Microphone access for GoMeal in Settings."
            }
            continueText={
            cameraPermission.canAskAgain && microphonePermission.canAskAgain
                ? "Continue"
                : "Open Settings"
            }
            onContinue={async () => {
            if (
                cameraPermission.canAskAgain &&
                microphonePermission.canAskAgain
            ) {
                const cameraResult =
                await ImagePicker.requestCameraPermissionsAsync();

                const microphoneResult =
                await Camera.requestMicrophonePermissionsAsync();

                if (
                !cameraResult.granted ||
                !microphoneResult.granted
                ) {
                return;
                }

                closeOverlay();
                await openCamera();
            } else {
                closeOverlay();
                Linking.openSettings();
            }
            }}
        />
        ),
    });
    };

    const openCamera = async () => {

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: mediaSource === "step_image"
                ? ["images"]
                : ["images", "videos"],
            allowsEditing: true,
            videoMaxDuration: 30,
            quality: 1,
        });

        if (!result.canceled) {
            setUri({
                uri: result.assets[0].uri,
                type: result.assets[0].type === "video" ? "video" : "image",
            });

            fetchLastThree()
        }
    };

    //----- gallery ----------------------------
    const requestGalleryPermission = async () => {

        const permission = await ImagePicker.getMediaLibraryPermissionsAsync();

        if (permission.granted) {
            await openGallery();
            return;
        }

        openOverlay({
            custom: (
                <PermissionContent
                    title="Allow GoMeal to access your photos"
                    description={
                        permission.canAskAgain
                            ? "Photo Library access lets you choose meal photos and cooking videos to share. You can change this access later in Settings."
                            : "Photo Library access has been disabled. Enable Photos access for GoMeal in Settings to choose meal photos and cooking videos."
                    }
                    continueText={
                        permission.canAskAgain ? "Continue" : "Open Settings"
                    }
                    onContinue={async () => {

                        if (permission.canAskAgain) {

                            const result = await ImagePicker.requestMediaLibraryPermissionsAsync();

                            if (!result.granted) return;
                            await openGallery();
                        } else {
                            Linking.openSettings();
                        }
                        closeOverlay();
                    }}
                />
            ),
        });
    };

    const openGallery = async () => {

        await fetchLastThree();

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: mediaSource === "step_image"
                ? ["images"]
                : ["images", "videos"],
            allowsEditing: true,
            videoMaxDuration: 30,
            quality: 1,
        });

        if (!result.canceled) {
            setUri({
                uri: result.assets[0].uri,
                type: result.assets[0].type === "video" ? "video" : "image",
            });
        }
    };

    useEffect(() => {
        fetchLastThree();
    }, []);

    useEffect(() => {
        if (isFocused) {
            fetchLastThree();
        }
    }, [isFocused]);

    useEffect(() => {
        if (uri) {
            onEnhanceMediaOpen?.(true);
        } else {
            onEnhanceMediaOpen?.(false);
        }
    }, [uri, onEnhanceMediaOpen]);

    return (
        <View style={{ backgroundColor: colors.background }} className="flex-1 p-3 flex-col">

            {mediaSource === "step_image" && (stepIndex != null) && (
                <SectionHeader
                    title={`Step ${stepIndex + 1}`}
                />
            )}

            <View style={{flex: 1, padding: 10}}>
                {uri ? (
                    <DishEnhanceMedia 
                        uri={uri.uri} 
                        onClose={() => {setUri(null)}}
                        mediaType={uri.type}
                        onEnhanceDone={(e_uri) => {
                            if (mediaSource === "step_image" && stepIndex != null) {
                                onMediaSelected?.(e_uri, mediaSource ?? "post_main", stepIndex);
                            }
                            if (mediaSource === "post_main") {
                                setMedia(e_uri, uri.type);
                                console.log("Selected media URI:", e_uri);
                            }
                        }}
                    />
                ) : (
                    <View style={{flex: 1}} className="w-full flex-col justify-center p-1 gap-1">

                        <Button 
                            style={{
                                height: 250, 
                                borderRadius: 0, 
                                padding: 5, 
                                borderColor: colors.text, 
                                borderStyle: "dashed", 
                                borderWidth: 1, 
                                justifyContent:"center"
                            }} 
                            onPress={requestCameraPermission}
                        >
                            {info.dish_media_url && (
                                <Media
                                    uri={info.dish_media_url}
                                    mediaType={info.dish_media_type ?? "image"}
                                    style={{flex: 1,  width: "100%", height: 200}}
                                    disableInteraction
                                    muteControl="row"
                                />
                            )}

                            <View
                                style={{
                                    position: "absolute",
                                    height: 60,
                                    width: 60,
                                    borderRadius: 999,
                                    overflow: "hidden",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                <View
                                    style={{
                                    ...StyleSheet.absoluteFillObject,
                                    backgroundColor: colors.background,
                                    opacity: 0.25,
                                    }}
                                />

                                <CameraIcon color={colors.text} size={35} />
                            </View>   

                        </Button>

                        <View style={{height: 100}} className="w-full p-1 gap-1 flex-row items-center justify-center">
                            {cameraRollMedia.map((pic) => (
                                <Pressable
                                    key={pic.id}
                                    style={{    
                                        width: 90,
                                        height: 90,
                                        aspectRatio: 1, 
                                    }}
                                    onPress={async () => {

                                        if (pic.mediaType === "video") {

                                            const assetInfo = await MediaLibrary.getAssetInfoAsync(pic.id);

                                            if (assetInfo.duration && assetInfo.duration > 30) {
                                                return;
                                            }
                                        }

                                        setUri({
                                            uri: pic.localUri,
                                            type: pic.mediaType === "video" ? "video" : "image"
                                        });
                                    }}
                                >
                                    <View pointerEvents="none" style={{ flex: 1 }}>
                                        <Media
                                            uri={pic.uri}
                                            mediaType={pic.mediaType === "video" ? "video" : "image"}
                                            style={{ width: "100%", height: "100%", borderRadius: 10 }}
                                            disableInteraction
                                            muteControl="none"
                                        />
                                    </View>
                                </Pressable>
                            ))}

                            <Button onPress={requestGalleryPermission} style={{height: 90, width: 90, borderRadius: 0, paddingLeft: 5}}>
                                <GalleryIcon color={colors.text} size={35}/>
                            </Button>
                            
                        </View>

                    </View>
                )}


            </View>

        </View>
    )
}


export default DishMedia;