import React, {
    useState,
} from "react";

import {
    FlatList,
    Image,
    ImageSourcePropType,
    View,
    useWindowDimensions,
} from "react-native";

import {
    useSafeAreaInsets,
} from "react-native-safe-area-context";

import {
    Media,
} from "./media";

import {
    XIcon,
} from "@/icons/Icon";

import {
    useTheme,
} from "@/provider/ThemeProvider";

import {
    useOverlay,
} from "@/stores/useOverlay";

import {
    Button,
} from "@/components/ButtonComponent";
import { BlurView } from "expo-blur";
import { ZoomView } from "./ZoomView";


export type PreviewMedia = {
    uri: string | ImageSourcePropType;

    mediaType:
        | "image"
        | "video";
};

type MediaPreviewOverlayProps = {
    media: PreviewMedia[];

    initialIndex?: number;

    dark?: boolean;
};


const MediaPreview: React.FC<
    MediaPreviewOverlayProps
> = ({
    media,
    initialIndex = 0,
    dark,
}) => {

    const [zoomed, setZoomed] = useState(false);

    const insets =
        useSafeAreaInsets();

    const {
        width,
        height,
    } = useWindowDimensions();

    const {
        colors,
    } = useTheme(
        dark
            ? "dark"
            : undefined
    );


    const [activeIndex, setActiveIndex] =
        useState(
            Math.min(
                initialIndex,
                Math.max(
                    media.length - 1,
                    0
                )
            )
        );

    if (!media.length) {
        return null;
    }


    return (
        <View
            style={{
                flex: 1,
                backgroundColor: "black",
            }}
        >

            <FlatList
                data={media}

                horizontal

                pagingEnabled

                showsHorizontalScrollIndicator={
                    false
                }

                initialScrollIndex={
                    activeIndex
                }

                keyExtractor={(
                    item,
                    index
                ) =>
                    `${item.uri}-${index}`
                }

                getItemLayout={(
                    _data,
                    index
                ) => ({
                    length: width,
                    offset:
                        width *
                        index,
                    index,
                })}

                onMomentumScrollEnd={(
                    event
                ) => {

                    const index =
                        Math.round(
                            event
                                .nativeEvent
                                .contentOffset
                                .x / width
                        );

                    setActiveIndex(
                        index
                    );
                }}

                renderItem={({ item, index }) => {

                    const isVideo = item.mediaType === "video";

                    const content = (
                        <>
                            {item.mediaType === "image" && typeof item.uri !== "string" ? (
                                <Image
                                    source={item.uri}
                                    resizeMode="none"
                                    style={{
                                        position: "absolute",
                                        top: 0,
                                        right: 0,
                                        bottom: 0,
                                        left: 0,
                                    }}
                                />
                            ) : (
                                <Media
                                    uri={item.uri as string}
                                    mediaType={item.mediaType}
                                    style={{
                                        position: "absolute",
                                        top: 0,
                                        right: 0,
                                        bottom: 0,
                                        left: 0,
                                    }}
                                    imageContentFit="contain"
                                    videoContentFit="contain"
                                    autoPlay={
                                        isVideo &&
                                        index === activeIndex
                                    }
                                    muteControl="center"
                                    iconSize={50}
                                    useSettingsAutoPlay={false}
                                />
                            )}
                        </>
                    )

                    return (
                        <View
                            style={{
                                width,
                                height,
                                justifyContent: "center",
                                alignItems: "center",
                            }}
                        >
                            {item.mediaType === "image" ? (
                                <ZoomView width={width} height={height} onZoomChange={setZoomed}>
                                    {content}
                                </ZoomView>
                            ) : (
                                content
                            )}
                        </View>
                    );
                }}
            />


            {/* Page dots */}
            {media.length > 1 && (
                <View
                    style={{
                        position: "absolute",
                        bottom: Math.max(
                            insets.bottom + 20,
                            30
                        ),
                        left: 0,
                        right: 0,
                        alignItems: "center",
                    }}
                >
                    <BlurView
                        intensity={70}
                        tint="dark"
                        style={{
                            borderRadius: 20,
                            paddingHorizontal: 10,
                            paddingVertical: 7,
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 6,
                            overflow: "hidden",
                        }}
                    >
                        {(() => {

                            const maxDots = 3;

                            /*
                            * Show every dot when there
                            * are only 3 or fewer.
                            */
                            if (media.length <= maxDots) {
                                return media.map(
                                    (_, index) => (
                                        <View
                                            key={index}
                                            style={{
                                                width:
                                                    index ===
                                                    activeIndex
                                                        ? 8
                                                        : 6,
                                                height:
                                                    index ===
                                                    activeIndex
                                                        ? 8
                                                        : 6,
                                                borderRadius:
                                                    10,
                                                backgroundColor:
                                                    index ===
                                                    activeIndex
                                                        ? "white"
                                                        : "rgba(255,255,255,0.45)",
                                            }}
                                        />
                                    )
                                );
                            }


                            /*
                            * Keep exactly 3 dots visible.
                            *
                            * The active dot stays in the
                            * middle whenever possible.
                            */
                            let startIndex =
                                activeIndex - 1;

                            if (startIndex < 0) {
                                startIndex = 0;
                            }

                            if (
                                startIndex >
                                media.length - maxDots
                            ) {
                                startIndex =
                                    media.length -
                                    maxDots;
                            }


                            return Array.from(
                                {
                                    length: maxDots,
                                },
                                (_, dotIndex) => {

                                    const mediaIndex =
                                        startIndex +
                                        dotIndex;

                                    const isActive =
                                        mediaIndex ===
                                        activeIndex;

                                    return (
                                        <View
                                            key={
                                                mediaIndex
                                            }
                                            style={{
                                                width:
                                                    isActive
                                                        ? 8
                                                        : 6,
                                                height:
                                                    isActive
                                                        ? 8
                                                        : 6,
                                                borderRadius:
                                                    10,
                                                backgroundColor:
                                                    isActive
                                                        ? "white"
                                                        : "rgba(255,255,255,0.45)",
                                            }}
                                        />
                                    );
                                }
                            );

                        })()}
                    </BlurView>
                </View>
            )}


            {/* Close */}
            <View
                style={{
                    position:
                        "absolute",
                    top:
                        insets.top,
                    left: 15,
                }}
            >
                <Button
                    onPress={() =>
                        useOverlay
                            .getState()
                            .closeOverlay()
                    }
                    clearBackground
                >
                    <XIcon
                        color={
                            colors.danger
                        }
                        size={20}
                    />
                </Button>
            </View>

        </View>
    );
};


export default MediaPreview;