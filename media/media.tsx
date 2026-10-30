import { useVideoPlayer, VideoView, AudioMixingMode, VideoContentFit } from 'expo-video';
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Image, ImageContentFit } from "expo-image";
import * as MediaLibrary from "expo-media-library";
import { Platform, Pressable, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { useEvent } from 'expo';
import { Button } from '@/components/ButtonComponent';
import { useTheme } from '@/provider/ThemeProvider';
import { VideoPlayIcon, VideoPauseIcon, VideoMuteIcon, VideoUnMuteIcon } from '@/icons/video_icon';
import { useSettingsStore } from '@/stores/useSettings';
import { BlurView } from 'expo-blur';
import { ImageMediaType } from '@/types/media.types';
import Animated, { SharedValue, useAnimatedStyle } from 'react-native-reanimated';

type Videocontrols = "none" | "center" | "row" | "bottomRow" | "bottomRowTogether";
type BottomRowTogetherPosition = "left" | "right";

export interface MediaRef {
    resume: () => void;
    pause: () => void;
    isPlaying: () => boolean;
}

interface FormatMediaProps {
    uri: string;
    mediaType: ImageMediaType;
    iconSize?: number;
    startMuted?: boolean;
    style?: StyleProp<ViewStyle>;
    disableInteraction?: boolean;
    onPress?: () => void;
    onLongPress?: () => void;
    useSettingsAutoPlay?: boolean;
    bottomRowTogetherPosition?: BottomRowTogetherPosition;
    bottomRowTogetherGap?: number;
    muteControl?: Videocontrols;
    imageContentFit?: ImageContentFit;
    videoContentFit?: VideoContentFit;
    bottomControlOffset?: number;
    onInteractionStart?: () => void;
    onInteractionEnd?: () => void;
    autoPlay?: boolean;
    controlOpacity?: SharedValue<number>;
    onMuteChange?: (muted: boolean) => void;
}

export const Media = forwardRef<MediaRef, FormatMediaProps>(({
    uri,
    mediaType,
    style,
    iconSize = 25,
    startMuted = true,
    disableInteraction = false,
    onPress,
    onLongPress,
    useSettingsAutoPlay = true,
    muteControl = "none",
    bottomRowTogetherPosition = "right",
    bottomRowTogetherGap = 12,
    imageContentFit = "cover",
    videoContentFit = "cover",
    bottomControlOffset = 10,
    onInteractionStart,
    onInteractionEnd,
    onMuteChange,
    autoPlay,
    controlOpacity,
}, ref) => {

    const { colors } = useTheme("dark");

    const autoPlaySetting = useSettingsStore(
        (state) => state.settings.feed.autoPlayVideos
    );

    const player = useVideoPlayer(
        mediaType === "video" ? uri : null,
        player => {
            player.loop = true;
            player.muted = startMuted;

            player.audioMixingMode = startMuted
                ? "mixWithOthers"
                : "doNotMix";
        }
    );

    const [manuallyPaused, setManuallyPaused] = useState(false);
    const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });
    const mutedPayload = useEvent(player, 'mutedChange', { muted: player.muted});

    const isMuted = mutedPayload?.muted ?? player.muted;

    const handleResume = () => {
        player.play();
        setManuallyPaused(false);
    };

    const handlePause = () => {
        player.pause();
        setManuallyPaused(true);
    };

    useImperativeHandle(ref, () => ({
        resume: handleResume,
        pause: handlePause,
        isPlaying: () => isPlaying,
    }), [isPlaying, player]);

    const handleVideoTap = () => {
        if (isPlaying && !disableInteraction) {
            handlePause();
        } else {
            handleResume();
        }
    };

    const handleVideoMuteToggle = () => {
        const newMuted = !player.muted;
        player.muted = newMuted;
        player.audioMixingMode = newMuted ? "mixWithOthers" : "doNotMix";
        onMuteChange?.(newMuted);
    };

    const controlsAnimatedStyle = useAnimatedStyle(() => ({
        opacity: controlOpacity?.value ?? 1,
        transform: [
            {
                translateY: (1 - (controlOpacity?.value ?? 1)) * 12,
            },
        ],
    }));


    useEffect(() => {
        if (mediaType !== "video") return;

        player.muted = startMuted;

        player.audioMixingMode = startMuted
            ? "mixWithOthers"
            : "doNotMix";
    }, [player, mediaType, startMuted]);


    useEffect(() => {
        if (mediaType !== "video") return;
        if (!player) return;

        // explicit autoPlay overrides everything
        if (autoPlay === true) {
            player.play();
            return;
        }
        if (autoPlay === false) {
            player.pause();
            return;
        }

        // fall back to settings
        if (autoPlaySetting && useSettingsAutoPlay) {
            player.play();
        } else {
            player.pause();
        }

    }, [mediaType, autoPlaySetting, useSettingsAutoPlay, player, autoPlay]);

    if (mediaType === "video") {

        return (

            <View
                style={[style, { overflow: "hidden", backgroundColor: colors.background }]}
                accessible={false}
                importantForAccessibility="no-hide-descendants"
                pointerEvents='box-none'
            >

                <VideoView
                    player={player}
                    style={StyleSheet.absoluteFillObject}
                    nativeControls={false}
                    contentFit={videoContentFit}
                    allowsPictureInPicture={false}
                    accessible={false}
                    importantForAccessibility="no-hide-descendants"
                    accessibilityElementsHidden={true}
                    showsTimecodes={false}
                    focusable={false}
                    allowsVideoFrameAnalysis={false}
                />
            

                <View
                    style={{ ...StyleSheet.absoluteFillObject, zIndex: 10 }}
                    pointerEvents="box-none"
                >

                    {muteControl === "center" && manuallyPaused && (                      
                        <View
                            style={{
                                position: "absolute",
                                top: "45%",
                                left: "50%",
                                transform: [
                                    { translateX: -(iconSize / 2) },
                                    { translateY: -(iconSize) },   
                                ],
                                alignItems: "center",
                                gap: 30,
                            }}
                        >
                            <Pressable
                                onPress={handleVideoMuteToggle}
                                style={{
                                    height: iconSize,
                                    width: iconSize,
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                <BlurView
                                    intensity={40}
                                    tint="dark"
                                    style={{
                                        position: "absolute",
                                        height: iconSize - 5,
                                        width: iconSize - 5,
                                        borderRadius: 999,
                                        overflow: "hidden",
                                    }}
                                />

                                {!isMuted ? (
                                    <VideoUnMuteIcon color={colors.text} size={iconSize / 3} />
                                ) : (
                                    <VideoMuteIcon color={colors.text} size={iconSize / 3} />
                                )}
                            </Pressable>

                            <Pressable
                                onPress={handleVideoTap}
                                style={{
                                    height: iconSize,
                                    width: iconSize,
                                    alignItems: "center",
                                    justifyContent: "center",
                                    opacity: manuallyPaused ? 1 : 0,  
                                    pointerEvents: manuallyPaused ? "auto" : "none",
                                }}
                            >
                                <BlurView
                                    intensity={40}
                                    tint="dark"
                                    style={{
                                        position: "absolute",
                                        height: iconSize + 15,
                                        width: iconSize + 15,
                                        borderRadius: 999,
                                        overflow: "hidden",
                                    }}
                                />
                                <VideoPauseIcon color={colors.text} size={iconSize * 2 / 3} />
                            </Pressable>
                        </View>
                    )}

                    {muteControl === "row" && (
                        <View
                            style={{
                                position: "absolute",
                                top: 10,
                                left: 10,
                                right: 10,
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "space-between",
                            }}
                        >

                            {/* PLAY / PAUSE */}
                            <Pressable
                                onPress={handleVideoTap}
                                style={{
                                    height: iconSize,
                                    width: iconSize,
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                <BlurView
                                    intensity={40}
                                    tint="dark"
                                    style={{
                                        position: "absolute",
                                        height: iconSize + 15,
                                        width: iconSize + 15,
                                        borderRadius: 999,
                                        overflow: "hidden",
                                    }}
                                />
                                {isPlaying ? (
                                    <VideoPauseIcon color={colors.text} size={iconSize} />
                                ) : (
                                    <VideoPlayIcon color={colors.text} size={iconSize} />
                                )}
                            </Pressable>

                            {/* MUTE */}
                            <Pressable
                                onPress={handleVideoMuteToggle}
                                style={{
                                    height: iconSize,
                                    width: iconSize,
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                <BlurView
                                    intensity={40}
                                    tint="dark"
                                    style={{
                                        position: "absolute",
                                        height: iconSize + 15,
                                        width: iconSize + 15,
                                        borderRadius: 999,
                                        overflow: "hidden",
                                    }}
                                />
                                {!isMuted ? (
                                    <VideoUnMuteIcon
                                        color={colors.text}
                                        size={iconSize}
                                    />
                                ) : (
                                    <VideoMuteIcon
                                        color={colors.text}
                                        size={iconSize}
                                    />
                                )}
                            </Pressable>

                        </View>
                    )}

                    {muteControl === "bottomRow" && (
                        <View
                            style={{
                                position: "absolute",
                                bottom: bottomControlOffset,
                                left: 10,
                                right: 10,
                                height: iconSize,
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "space-between",
                            }}
                            pointerEvents="box-none"
                        >
                            <Pressable
                                onPress={handleVideoTap}
                                style={{
                                    height: iconSize,
                                    width: iconSize,
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                <BlurView
                                    intensity={40}
                                    tint="dark"
                                    style={{
                                        position: "absolute",
                                        height: iconSize + 15,
                                        width: iconSize + 15,
                                        borderRadius: 999,
                                        overflow: "hidden",
                                    }}
                                />
                                {isPlaying ? (
                                    <VideoPauseIcon color={colors.text} size={iconSize} />
                                ) : (
                                    <VideoPlayIcon color={colors.text} size={iconSize} />
                                )}
                            </Pressable>

                            <Pressable
                                onPress={handleVideoMuteToggle}
                                style={{
                                    height: iconSize,
                                    width: iconSize,
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                <BlurView
                                    intensity={40}
                                    tint="dark"
                                    style={{
                                        position: "absolute",
                                        height: iconSize + 15,
                                        width: iconSize + 15,
                                        borderRadius: 999,
                                        overflow: "hidden",
                                    }}
                                />
                                {!isMuted ? (
                                    <VideoUnMuteIcon color={colors.text} size={iconSize} />
                                ) : (
                                    <VideoMuteIcon color={colors.text} size={iconSize} />
                                )}
                            </Pressable>
                        </View>
                    )}

                    {muteControl === "bottomRowTogether" && (
                        <Animated.View
                            pointerEvents="box-none"
                            style={[
                                {
                                    position: "absolute",
                                    bottom: bottomControlOffset,
                                    [bottomRowTogetherPosition]: 10,
                                    flexDirection: "row",
                                    alignItems: "center",
                                    gap: bottomRowTogetherGap,
                                },
                                controlsAnimatedStyle,
                            ]}
                        >
                            {/* PLAY / PAUSE */}
                            <Pressable
                                onPress={handleVideoTap}
                                style={{
                                    height: iconSize + 15,
                                    width: iconSize + 15,
                                    alignItems: "center",
                                    justifyContent: "center",
                                    borderRadius: 999,
                                    overflow: "hidden",
                                }}
                            >
                                <BlurView
                                    intensity={40}
                                    tint="dark"
                                    style={StyleSheet.absoluteFillObject}
                                />

                                {isPlaying ? (
                                    <VideoPauseIcon color={colors.text} size={iconSize} />
                                ) : (
                                    <VideoPlayIcon color={colors.text} size={iconSize} />
                                )}
                            </Pressable>

                            {/* MUTE / UNMUTE */}
                            <Pressable
                                onPress={handleVideoMuteToggle}
                                style={{
                                    height: iconSize + 15,
                                    width: iconSize + 15,
                                    alignItems: "center",
                                    justifyContent: "center",
                                    borderRadius: 999,
                                    overflow: "hidden",
                                }}
                            >
                                <BlurView
                                    intensity={40}
                                    tint="dark"
                                    style={StyleSheet.absoluteFillObject}
                                />

                                {isMuted ? (
                                    <VideoMuteIcon color={colors.text} size={iconSize} />
                                ) : (
                                    <VideoUnMuteIcon color={colors.text} size={iconSize} />
                                )}
                            </Pressable>
                        </Animated.View>
                    )}

                </View>

                <Pressable
                    style={StyleSheet.absoluteFillObject}
                    onPress={() => {
                        if (
                            muteControl !== "bottomRow" &&
                            muteControl !== "bottomRowTogether"
                        ) {
                            handleVideoTap();
                        }
                        onPress?.();
                    }}
                    onLongPress={() => {
                        onLongPress?.();
                    }}
                    onPressIn={onInteractionStart}
                    onPressOut={onInteractionEnd}
                />
                
            </View>
        );
    }

    return (
        <Pressable 
            style={[style, { overflow: "hidden"}]} 
            onPress={onPress} 
            onLongPress={onLongPress}
        >
            <Image
                source={{ uri: mediaType === "image" ? uri : undefined }}
                style={StyleSheet.absoluteFillObject}
                contentFit={imageContentFit}
                accessible={false}
            />
        </Pressable>
    );
});
