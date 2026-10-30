import { useVideoPlayer, VideoView, VideoContentFit } from "expo-video";
import { ArrowsInIcon, ArrowsOutIcon } from "@/icons/Icon";
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { PanResponder, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle, Animated } from "react-native";
import { useEvent, useEventListener } from "expo";
import { useTheme } from "@/provider/ThemeProvider";
import {
    VideoPlayIcon,
    VideoPauseIcon,
    VideoMuteIcon,
    VideoUnMuteIcon,
} from "@/icons/video_icon";
import { useSettingsStore } from "@/stores/useSettings";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ButtonComponent";
import { useBottomSheet } from "@/stores/useBottomSheet";
import { BlurView } from "expo-blur";
import { useReel, useReelChrome } from "@/stores/useReel";

export const REEL_CONTROLS_HEIGHT = 60;
export const SCRUB_ZONE_HEIGHT = 30;

const SPEEDS = [0.5, 1, 1.5, 2] as const;
const THUMB = 14;
const THUMB_ACTIVE = 20;

const formatSpeed = (rate: number) => `${rate}x`;

export const getReelReservedBottom = (inset: number) => inset + REEL_CONTROLS_HEIGHT;

export type ScrubState = { time: number; duration: number };

export interface MediaRef {
    resume: () => void;
    pause: () => void;
    isPlaying: () => boolean;
}

interface ReelMediaProps {
    uri: string;
    loop: boolean;
    style?: StyleProp<ViewStyle>;
    startMuted?: boolean;
    autoPlay?: boolean;
    iconSize?: number;
    duration?: number | null;
    onEnd?: () => boolean;
    /** Distance from the bottom of the media (pass safe-area inset). */
    bottomOffset?: number;
    videoContentFit?: VideoContentFit;
    onPress?: () => void;
    onLongPress?: () => void;
    onInteractionStart?: () => void;
    onInteractionEnd?: () => void;
    onScrub?: (state: ScrubState | null) => void;

    isLandscape?: boolean;
    landscapeSheetOpen?: boolean;
    onOrientationChange?: (landscape: boolean) => void;
    orientationLocked?: boolean;
}

const formatRemaining = (seconds: number) => {
    const s = Math.max(0, Math.ceil(seconds));
    const m = Math.floor(s / 60);
    return `-${m}:${String(s % 60).padStart(2, "0")}`;
};

export const ReelMedia = forwardRef<MediaRef, ReelMediaProps>(({
    uri,
    loop,
    style,
    startMuted = true,
    autoPlay,
    iconSize = 22,
    bottomOffset = 0,
    duration: knownDuration,
    videoContentFit = "cover",
    onEnd,
    onPress,
    onLongPress,
    onInteractionStart,
    onInteractionEnd,
    onScrub,
    isLandscape = false,
    onOrientationChange,
    orientationLocked = false,
    landscapeSheetOpen = false,
}, ref) => {

    const chrome = useReelChrome();

    const { colors } = useTheme("dark");

    const insets = useSafeAreaInsets();

    const isBottomSheetOpen = useBottomSheet((s) => s.isOpen);
    const wasPlayingBeforeSheet = useRef(false);

    const autoPlaySetting = useSettingsStore(
        (s) => s.settings.feed.autoPlayVideos
    );

    const player = useVideoPlayer(uri, (p) => {
        p.loop = loop;
        p.muted = startMuted;
        p.audioMixingMode = startMuted ? "mixWithOthers" : "doNotMix";
        p.timeUpdateEventInterval = 0.25;
        p.preservesPitch = true;
    });

    const sourceLoad = useEvent(player, "sourceLoad");
    
    const [area, setArea] = useState({ w: 0, h: 0 });
    const videoSize = sourceLoad?.availableVideoTracks?.[0]?.size;

    const { isPlaying } = useEvent(player, "playingChange", {
        isPlaying: player.playing,
    });
    const mutedPayload = useEvent(player, "mutedChange", {
        muted: player.muted,
    });
    const ratePayload = useEvent(player, "playbackRateChange", {
        playbackRate: player.playbackRate,
    });

    const playbackRate = ratePayload?.playbackRate ?? player.playbackRate;

    const cycleSpeed = () => {
        const i = SPEEDS.indexOf(player.playbackRate as (typeof SPEEDS)[number]);
        player.playbackRate = SPEEDS[(i + 1) % SPEEDS.length];
    };
    
    const [scrubProgress, setScrubProgress] = useState<number | null>(null);
    const scrubbing = scrubProgress !== null;

    const playerRef = useRef(player);
    playerRef.current = player;
    const onScrubRef = useRef(onScrub);
    onScrubRef.current = onScrub;
    const durationRef = useRef(0);
    const trackWidth = useRef(0);
    const startX = useRef(0);
    const wasPlaying = useRef(false);

    const scrubTo = (x: number) => {
        const w = trackWidth.current;
        const d = durationRef.current;
        if (!w || !d) return;

        const p = Math.min(1, Math.max(0, x / w));
        setScrubProgress(p);
        playerRef.current.currentTime = p * d;
        onScrubRef.current?.({ time: p * d, duration: d });
    };

    const endScrub = () => {
        setScrubProgress(null);
        if (wasPlaying.current) playerRef.current.play();
        onScrubRef.current?.(null);
    };

    const scrubResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderTerminationRequest: () => false, 
            onPanResponderGrant: (e) => {
                wasPlaying.current = playerRef.current.playing;
                playerRef.current.pause();
                startX.current = e.nativeEvent.locationX; 
                scrubTo(startX.current);
            },
            onPanResponderMove: (_, g) => scrubTo(startX.current + g.dx),
            onPanResponderRelease: endScrub,
            onPanResponderTerminate: endScrub,
        })
    ).current;

    const timePayload = useEvent(player, "timeUpdate");

    const isMuted = mutedPayload?.muted ?? player.muted;
    const currentTime = timePayload?.currentTime ?? 0;
    const videoDuration = player.duration || sourceLoad?.duration || knownDuration || 0;
    durationRef.current = videoDuration;

    const progress = videoDuration > 0
        ? Math.min(1, currentTime / videoDuration)
        : 0;

    const shownProgress = scrubProgress ?? (videoDuration > 0 ? Math.min(1, currentTime / videoDuration) : 0);

    const shownTime = scrubProgress !== null ? scrubProgress * videoDuration : currentTime;

    const remaining = videoDuration > 0 ? videoDuration - shownTime : 0;

    const handleResume = () => player.play();
    const handlePause = () => player.pause();

    const togglePlay = () => (
        player.playing ? handlePause() : handleResume()
    );

    const toggleMute = () => {
        const next = !player.muted;
        player.muted = next;
        player.audioMixingMode = next ? "mixWithOthers" : "doNotMix";
    };

    useEventListener(player, "playToEnd", () => {
        if (loop) return;
        const handled = onEnd?.();
        if (!handled) {
            player.currentTime = 0;
            player.play();
        }
    })

    useImperativeHandle(ref, () => ({
        resume: handleResume,
        pause: handlePause,
        isPlaying: () => player.playing,
    }), [player]);

    useEffect(() => {
        player.muted = startMuted;
        player.audioMixingMode = startMuted
            ? "mixWithOthers"
            : "doNotMix";
    }, [player, startMuted]);

    useEffect(() => {
        if (autoPlay === false) {
            player.pause();
            player.currentTime = 0;
            return;
        }
        if (autoPlay === true || autoPlaySetting) {
            player.play();
        } else {
            player.pause();
        }
    }, [autoPlay, autoPlaySetting, player]);

    useEffect(() => {
        if (isBottomSheetOpen) {
            wasPlayingBeforeSheet.current = player.playing;

            if (player.playing) {
                player.pause();
            }

            return;
        }

        if (wasPlayingBeforeSheet.current) {
            player.play();
        }

        wasPlayingBeforeSheet.current = false;
    }, [isBottomSheetOpen, player]);

    useEffect(() => {
        if (autoPlay === false) return;          
        if (isLandscape) {
            useReel.setState({ videoRect: null });
            return;
        }
        if (!videoSize?.width || !videoSize?.height || !area.w) return;

        const h = Math.min(area.h, area.w * (videoSize.height / videoSize.width));
        useReel.setState({ videoRect: { top: (area.h - h) / 2, height: h } });
    }, [autoPlay, isLandscape, videoSize?.width, videoSize?.height, area.w, area.h]);

    return (
        <View
            style={[
                style,
                {
                    overflow: "hidden",
                    backgroundColor: "transparent",
                },
            ]}
            accessible={false}
            importantForAccessibility="no-hide-descendants"
            accessibilityElementsHidden={true}
            focusable={false}
            pointerEvents="box-none"
        >
            <View
                onLayout={(e) => setArea({
                    w: e.nativeEvent.layout.width,
                    h: e.nativeEvent.layout.height,
                })}
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: landscapeSheetOpen ? 0 : (bottomOffset + REEL_CONTROLS_HEIGHT),
                    overflow: "hidden",
                }}
            >
                <VideoView
                    player={player}
                    style={{
                        ...StyleSheet.absoluteFillObject,
                        backgroundColor: "transparent",
                    }}
                    nativeControls={false}
                    contentFit={videoContentFit}
                    allowsPictureInPicture={false}
                    accessible={false}
                    importantForAccessibility="no-hide-descendants"
                    accessibilityElementsHidden={true}
                    focusable={false}
                    allowsVideoFrameAnalysis={false}
                />

                <Pressable
                    style={StyleSheet.absoluteFillObject}
                    onPress={() => {
                        //togglePlay();
                        onPress?.();
                    }}
                    onLongPress={onLongPress}
                    onPressIn={onInteractionStart}
                    onPressOut={onInteractionEnd}
                />
            </View>

            {/* Bottom controls */}
            <Animated.View
                pointerEvents="box-none"
                style={[StyleSheet.absoluteFillObject, { opacity: chrome }]}
            >

                {landscapeSheetOpen ? (
                    <View
                        pointerEvents="box-none"
                        style={{
                            position: "absolute",
                            left: 0,
                            right: 0,
                            bottom: bottomOffset,
                            height: REEL_CONTROLS_HEIGHT,
                            paddingHorizontal: 10,
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "flex-end",
                            gap: 10
                        }}
                    >
                        {/* PLAY / PAUSE */}
                        <Pressable
                            onPress={togglePlay}
                            hitSlop={12}
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
                            onPress={toggleMute}
                            hitSlop={12}
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
                    </View>
                ) : (
                    <View
                        pointerEvents="box-none"
                        style={{
                            position: "absolute",
                            left: isLandscape ? Math.max(insets.left, 16) : 0,
                            right: isLandscape ? Math.max(insets.right, 16) : 0,
                            bottom: bottomOffset,
                            height: REEL_CONTROLS_HEIGHT,
                            paddingHorizontal: 40,
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                        }}
                    >
                        {/* Scrub zone: tall invisible hit area centered on the bar's top edge */}
                        <View
                            {...scrubResponder.panHandlers}
                            onLayout={(e) => { trackWidth.current = e.nativeEvent.layout.width; }}
                            style={{
                                position: "absolute",
                                left: 0,
                                right: 0,
                                bottom: REEL_CONTROLS_HEIGHT - (SCRUB_ZONE_HEIGHT / 2) - (scrubbing ? 5 : 3) + 2,
                                //backgroundColor: "red",
                                height: SCRUB_ZONE_HEIGHT,
                                justifyContent: "center",
                            }}
                        >
                            <View
                                pointerEvents="none"
                                style={{
                                    height: scrubbing ? 5 : 3,
                                    backgroundColor: colors.secondaryCard,
                                }}
                            >
                                <View
                                    style={{
                                        height: "100%",
                                        width: `${shownProgress * 100}%`,
                                        borderRadius: 3,
                                        backgroundColor: colors.text,
                                    }}
                                />
                            </View>

                        </View>

                        <View
                            pointerEvents="box-none"
                            style={{
                                marginTop: 10,
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 12,
                            }}
                        >
                            <Button onPress={togglePlay} hitSlop={12} style={{ padding: 0 }}>
                                {isPlaying ? (
                                    <VideoPauseIcon
                                        color={colors.text}
                                        size={iconSize}
                                    />
                                ) : (
                                    <VideoPlayIcon
                                        color={colors.text}
                                        size={iconSize}
                                    />
                                )}
                            </Button>

                            {videoDuration > 0 && (
                                <Text
                                    pointerEvents="none"
                                    style={{
                                        color: colors.text,
                                        opacity: 0.7,
                                        fontSize: 14,
                                        fontVariant: ["tabular-nums"],
                                    }}
                                >
                                    {formatRemaining(remaining)}
                                </Text>
                            )}
                        </View>

                        <View 
                            style={{ 
                                marginTop: 10,
                                flexDirection: "row", 
                                alignItems: "center", 
                                gap: 18 
                            }}
                        >

                            <Button onPress={cycleSpeed} hitSlop={12} style={{ padding: 0 }}>
                                <Text
                                    style={{
                                        color: colors.text,
                                        fontSize: 16,
                                        fontWeight: "700",
                                        fontVariant: ["tabular-nums"],
                                        minWidth: 32,
                                        textAlign: "center",
                                    }}
                                >
                                    {formatSpeed(playbackRate)}
                                </Text>
                            </Button>

                            <Button
                                onPress={() => onOrientationChange?.(!isLandscape)}
                                disabled={orientationLocked}
                                hitSlop={12}
                                style={{ opacity: orientationLocked ? 0.35 : 1, padding: 0 }}
                            >
                                {isLandscape ? (
                                    <ArrowsInIcon color={colors.text} size={iconSize} />
                                ) : (
                                    <ArrowsOutIcon color={colors.text} size={iconSize} />
                                )}
                            </Button>

                            <Button onPress={toggleMute} hitSlop={12} style={{ padding: 0 }}>
                                {isMuted ? (
                                    <VideoMuteIcon color={colors.text} size={iconSize} />
                                ) : (
                                    <VideoUnMuteIcon color={colors.text} size={iconSize} />
                                )}
                            </Button>

                        </View>

                    </View>
                )}

            </Animated.View>

        </View>
    );
});

ReelMedia.displayName = "ReelMedia";