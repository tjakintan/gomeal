import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    View,
    Pressable,
    FlatList,
    Text,
    AppState,
    Linking,
} from "react-native";
import * as MediaLibrary from "expo-media-library";

import { CameraIcon } from "@/icons/Icon";
import { Media } from "@/media/media";
import { SpinningLogoImage } from "@/utils/Logo";
import { useTheme } from "@/provider/ThemeProvider";
import { useBanner } from "@/stores/useBanner";
import { MAX_RECORDING_S, MediaContext, POST_MAX_RECORDING_S } from "@/types/media.types";
import { Button } from "@/components/ButtonComponent";
import { useOverlay } from "@/stores/useOverlay";
import { usePermissions } from "@/provider/PermissionProvider";
import CameraScreen from "./Camera";

type GalleryItem =
    | {
        id: "__camera__";
        isCamera: true;
    }
    | (MediaLibrary.Asset & {
        isCamera: false;
    });

interface GalleryProps {
    cameraRollMedia: MediaLibrary.Asset[];
    loadingMore: boolean;
    hasNextPage: boolean;
    onLoadMore: () => void;
    onRefresh?: () => void;
    onMediaSelected?: (
        uri: string,
        type: "image" | "video",
        duration?: number | null
    ) => void;
    onCameraCaptured?: (
        uri: string,
        type: "image" | "video",
        duration?: number | null
    ) => void;
    dark?: boolean;
    multiSelect?: boolean;
    selectedIds?: string[];
    onToggleSelect?: (item: {
        id: string;
        uri: string;
        type: "image" | "video";
    }) => void;
    context: MediaContext;
}

const Gallery: React.FC<GalleryProps> = ({
    cameraRollMedia,
    loadingMore,
    hasNextPage,
    onLoadMore,
    onMediaSelected,
    onCameraCaptured,
    onRefresh,
    multiSelect = false,
    dark = false,
    selectedIds = [],
    onToggleSelect,
    context,
}) => {

    const banner = useBanner();

    const { colors, textStyles } = useTheme(dark ? "dark" : undefined);

    const [limited, setLimited] = useState(false);

    const onRefreshRef = useRef(onRefresh);
    onRefreshRef.current = onRefresh;

    const openOverlay = useOverlay((s) => s.openOverlay);
    const closeOverlay = useOverlay((s) => s.closeOverlay);
    const { requestPermissions } = usePermissions();

    const maxSeconds = MAX_RECORDING_S[context];

    const onCapturedRef = useRef(onCameraCaptured);

    onCapturedRef.current = onCameraCaptured;

    const galleryData = useMemo<GalleryItem[]>(() => {
        const seen = new Set<string>();
        const items: GalleryItem[] = [{ id: "__camera__", isCamera: true }];

        for (const asset of cameraRollMedia) {
            if (seen.has(asset.id)) continue;
            seen.add(asset.id);
            items.push({ ...asset, isCamera: false as const });
        }

        return items;
    }, [cameraRollMedia]);

    const openCamera = useCallback(() => {
        requestPermissions({
            permissions: ["camera", "microphone"],
            title: "Allow GoMeal to access your camera",
            description:
                "Camera access lets you take photos and record videos. Microphone access lets your videos include audio. You can change this later in Settings.",
            deniedDescription:
                "Camera or microphone access has been disabled. Enable them for GoMeal in Settings.",
            onGranted: () => {
                openOverlay(
                    { showX: false },
                    <CameraScreen
                        dark={dark}
                        context={context}
                        onClose={() => closeOverlay()}
                        onPhotoCaptured={(uri, type, duration) => {
                            closeOverlay();
                            onCapturedRef.current?.(uri, type, duration);
                        }}
                    />
                );
            },
        });
    }, [dark, openOverlay, closeOverlay, requestPermissions]);

    const checkAccess = useCallback(async () => {
        const perm = await MediaLibrary.getPermissionsAsync();
        setLimited(perm.accessPrivileges === "limited");
    }, []);

    const addMore = async () => {
        try {
            await MediaLibrary.presentPermissionsPickerAsync();
        } finally {
            checkAccess();
            onRefreshRef.current?.();
        }
    };

    useEffect(() => {
        checkAccess();

        const librarySub = MediaLibrary.addListener(() => {
            checkAccess();
            onRefreshRef.current?.();
        });

        const appSub = AppState.addEventListener("change", (state) => {
            if (state === "active") {
                checkAccess();
                onRefreshRef.current?.();
            }
        });

        return () => {
            librarySub.remove();
            appSub.remove();
        };
    }, [checkAccess]);

    return (
        <View style={{ flex: 1 }}>
            {limited && (
                <View
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                        marginHorizontal: 10,
                        marginBottom: 8,
                        padding: 12,
                        borderRadius: 16,
                        backgroundColor: colors.secondaryCard,
                    }}
                >
                    <View style={{ flex: 1 }}>
                        <Text
                            className={textStyles.body}
                            style={{ color: colors.text, fontSize: 13 }}
                        >
                            You've limited access to selected photos.{" "}
                            <Text
                                style={{ color: colors.button }}
                                onPress={() => Linking.openSettings()}
                            >
                                Settings
                            </Text>
                        </Text>
                    </View>

                    <Button
                        onPress={addMore}
                        style={{
                            paddingHorizontal: 16,
                            height: 36,
                            borderRadius: 999,
                            backgroundColor: colors.button,
                        }}
                    >
                        <Text className={textStyles.body} style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
                            Add more
                        </Text>
                    </Button>
                </View>
            )}

            <FlatList<GalleryItem>
                data={galleryData}
                keyExtractor={(item) => item.id}
                numColumns={4}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                    paddingBottom: 20,
                }}
                columnWrapperStyle={{
                    gap: 0,
                }}
                onEndReached={
                    hasNextPage
                        ? onLoadMore
                        : undefined
                }
                onEndReachedThreshold={0.5}
                renderItem={({ item }) => {
                    /*
                    * CAMERA
                    */
                    if (item.isCamera) {
                        return (
                            <Pressable
                                style={{
                                    flex: 1,
                                    aspectRatio: 1,
                                    marginBottom: 0,
                                    maxWidth: "25%",
                                }}
                                onPress={openCamera}
                            >
                                <View
                                    style={{
                                        flex: 1,
                                        borderWidth: 0,
                                        borderColor: colors.text,
                                        alignItems: "center",
                                        justifyContent: "center",
                                        backgroundColor: colors.background,
                                    }}
                                >
                                    <CameraIcon
                                        color={colors.text}
                                        size={32}
                                    />
                                </View>
                            </Pressable>
                        );
                    }

                    /*
                    * MEDIA
                    */
                    const selectionIndex =
                        selectedIds.indexOf(item.id);

                    const isSelected =
                        multiSelect && selectionIndex !== -1;

                    return (
                        <Pressable
                            style={{
                                flex: 1,
                                aspectRatio: 1,
                                marginBottom: 0,
                                maxWidth: "25%",
                            }}
                            onPress={async () => {
                                const assetInfo = await MediaLibrary.getAssetInfoAsync(item.id);

                                if (!assetInfo.localUri) {
                                    return;
                                }

                                const mediaType = item.mediaType === "video" ? "video" : "image";
                                const duration = mediaType === "video" ? (assetInfo.duration ?? null) : null;

                                if (duration && duration > maxSeconds) {
                                    banner.error(
                                        `Video longer than ${Math.round(maxSeconds / 60)} minutes, please choose a shorter video.`
                                    );
                                    return;
                                }
                                
                                const localUri = assetInfo.localUri.split("#")[0];

                                if (multiSelect) {
                                    onToggleSelect?.({ id: item.id, uri: localUri, type: mediaType });
                                    return;
                                }

                                onMediaSelected?.(localUri, mediaType, duration);
                            }}
                        >
                            <View
                                pointerEvents="none"
                                style={{
                                    flex: 1,
                                    overflow: "hidden",
                                }}
                            >
                                <Media
                                    uri={item.uri}
                                    mediaType={
                                        item.mediaType === "video"
                                            ? "video"
                                            : "image"
                                    }
                                    style={{
                                        width: "100%",
                                        height: "100%",
                                    }}
                                    disableInteraction
                                    muteControl="none"
                                />
                            </View>

                            {isSelected && (
                                <View
                                    style={{
                                        position: "absolute",
                                        bottom: 4,
                                        right: 4,
                                        width: 24,
                                        height: 24,
                                        borderRadius: 12,
                                        backgroundColor: colors.button,
                                        alignItems: "center",
                                        justifyContent: "center",
                                    }}
                                >
                                    <Text
                                        style={{
                                            color: "#FFFFFF",
                                            fontSize: 13,
                                            fontWeight: "700",
                                        }}
                                    >
                                        {selectionIndex + 1}
                                    </Text>
                                </View>
                            )}
                        </Pressable>
                    );
                }}
                ListFooterComponent={
                    loadingMore ? (
                        <View
                            style={{
                                paddingVertical: 20,
                                alignItems: "center",
                            }}
                        >
                            <SpinningLogoImage size={22} />
                        </View>
                    ) : null
                }
            />
        </View>
    );
};

export default Gallery;