import {
    useState,
    useRef,
    useEffect,
    useCallback,
} from "react";

import {
    View,
    AppState,
    AppStateStatus,
} from "react-native";

import { useTheme } from "@/provider/ThemeProvider";
import { usePost } from "@/stores/usePost";

import { PostSectionInfoProps } from "@/types";
import { Media } from "@/media/media";

import { SectionHeader } from "@/components/SectionComponent";
import Gallery from "@/media/Gallery";

import { ImageMediaType } from "@/types/media.types";
import { MEDIA_KINDS, useCameraRoll } from "@/media/store/useMedia";

const DishMedia: React.FC<PostSectionInfoProps> = ({
    isFocused,
    onMediaSelected,
    mediaSource,
    stepIndex,
}) => {
    const { colors } = useTheme("dark");

    const appState = useRef<AppStateStatus>(
        AppState.currentState
    );

    const info = usePost((state) => state.info);
    const setMedia = usePost((state) => state.setMedia);

    const { assets: cameraRollMedia, hasNextPage, loadingMore, loadMore, refresh } = useCameraRoll(MEDIA_KINDS);

    const handleMediaSelected = useCallback(
        (
            selectedUri: string,
            selectedType: ImageMediaType,
            selectedDuration?: number | null
        ) => {

            /* STEP IMAGE: unchanged */
            if (mediaSource === "step_image" && stepIndex != null) {
                onMediaSelected?.(selectedUri, "step_image", stepIndex);
                return;
            }

            /* MAIN POST MEDIA */
            if (mediaSource === "post_main") {
                setMedia(
                    selectedUri,
                    selectedType,
                    selectedType === "video" ? (selectedDuration ?? null) : null
                );
                return;
            }

            console.warn("[DishMedia] Unknown media source:", mediaSource);
        },
        [mediaSource, stepIndex, onMediaSelected, setMedia]
    );

    return (
        <View
            style={{
                flex: 1,
                backgroundColor:
                    colors.background,
            }}
        >
            {mediaSource === "step_image" &&
                stepIndex != null && (
                    <SectionHeader
                        title={`Step ${
                            stepIndex + 1
                        }`}
                        dark
                    />
                )}

            <View
                style={{
                    flex: 1,
                    width: "100%",
                    alignItems: "center"
                }}
            >
                {/* PREVIEW */}
                <View
                    style={{
                        height: "50%",
                        width: "80%",
                        padding: 10,
                    }}
                >
                    <View
                        style={{
                            flex: 1,
                            width: "100%",
                            padding: 5,
                            borderColor:
                                colors.text,
                            borderStyle:
                                "dashed",
                            borderWidth: 1,
                            justifyContent:
                                "center",
                            alignItems:
                                "center",
                            overflow:
                                "hidden",
                        }}
                    >
                        {info.dish_media_url ? (
                            <Media
                                uri={
                                    info.dish_media_url
                                }
                                mediaType={
                                    info.dish_media_type ??
                                    "image"
                                }
                                style={{
                                    width: "100%",
                                    height: "100%",
                                }}
                                disableInteraction
                                muteControl="none"
                            />
                        ) : cameraRollMedia.length >
                          0 ? (
                            <Media
                                uri={
                                    cameraRollMedia[0]
                                        .uri
                                }
                                mediaType={
                                    cameraRollMedia[0]
                                        .mediaType ===
                                    "video"
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
                        ) : null}
                    </View>
                </View>

                {/* GALLERY */}
                <View
                    style={{
                        flex: 1,
                        width: "100%",
                    }}
                >
                    <Gallery
                        context="post"
                        cameraRollMedia={cameraRollMedia}
                        loadingMore={loadingMore}
                        hasNextPage={hasNextPage}
                        onLoadMore={loadMore}
                        onRefresh={refresh}
                        onCameraCaptured={handleMediaSelected}
                        onMediaSelected={handleMediaSelected}
                        dark
                    />
                </View>
            </View>
        </View>
    );
};

export default DishMedia;