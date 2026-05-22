import { useVideoPlayer, VideoView, AudioMixingMode, VideoContentFit } from 'expo-video';
import React, { useEffect, useRef, useState } from "react";
import { Image, ImageContentFit } from "expo-image";
import * as MediaLibrary from "expo-media-library";
import { Platform, Pressable, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { MediaType } from '@/types';
import { useEvent } from 'expo';
import { Button } from '@/components/ButtonComponent';
import { useTheme } from '@/provider/ThemeProvider';
import { VideoPlayIcon, VideoPauseIcon, VideoMuteIcon, VideoUnMuteIcon } from '@/icons/video_icon';
import { useSettingsStore } from '@/stores/useSettings';


type Videocontrols = "none" | "center" | "row" | "bottomRow";

interface FormatMediaProps {
    uri: string;
    mediaType: MediaType;
    iconSize?: number;
    startMuted?: boolean;
    style?: StyleProp<ViewStyle>;
    disableInteraction?: boolean;
    onPress?: () => void;
    onLongPress?: () => void;
    useSettingsAutoPlay?: boolean;
    muteControl?: Videocontrols;
    imageContentFit?: ImageContentFit;
    videoContentFit?: VideoContentFit;
    bottomControlOffset?: number;
}

export const Media: React.FC<FormatMediaProps> = ({
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
    imageContentFit = "cover",
    videoContentFit = "cover",
    bottomControlOffset = 10,
}) => {

    const { colors } = useTheme("dark");

    const autoPlaySetting = useSettingsStore(
        (state) => state.settings.feed.autoPlayVideos
    );

    const player = useVideoPlayer(mediaType === "video" ? uri : null, player => {
        player.loop = true;
        player.muted = startMuted;
        player.audioMixingMode = "mixWithOthers";
    });

    const [manuallyPaused, setManuallyPaused] = useState(false);
    const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });
    const mutedPayload = useEvent(player, 'mutedChange', { muted: player.muted});

    const isMuted = mutedPayload?.muted ?? player.muted;

    const handleVideoTap = () => {
        if (isPlaying && !disableInteraction) {
            player.pause();
            setManuallyPaused(true);
        } else {
            player.play();
            setManuallyPaused(false);
        }
        onPress?.()
    };

    const handleVideoMuteToggle = async () => {
        const newMuted = !player.muted;
        player.muted = newMuted;

        // -- muted -- don't play in background and ground silence
        if (newMuted) {
            player.audioMixingMode = "doNotMix"
        } 
        // -- non-muted -- play sound and enlarge sound over other
        else {
            player.audioMixingMode = "mixWithOthers"
        }
    };

    useEffect(() => {

        if (mediaType !== "video") return; 
        if (!player) return;

        if (autoPlaySetting && useSettingsAutoPlay) {
            player.play();
        } else {
            player.pause();
        }

    }, [mediaType, autoPlaySetting, useSettingsAutoPlay, player]);

    if (mediaType === "video") {
        return (
            <Pressable
                style={[style, { overflow: "hidden", backgroundColor: colors.background }]}
                onPress={handleVideoTap}
                onLongPress={onLongPress}
                accessible={false}
                accessibilityElementsHidden={false}
                importantForAccessibility="no-hide-descendants"
            >
                <View
                    style={{
                        position: "absolute",
                        top: 0, left: 0, right: 0, bottom: 0,
                    }}
                    accessible={false}
                    accessibilityElementsHidden={false}
                    importantForAccessibility="yes"
                    accessibilityLabel=""
                    accessibilityRole="none"
                />

                <VideoView
                    player={player}
                    style={StyleSheet.absoluteFillObject}
                    nativeControls={false}
                    contentFit={videoContentFit}
                    allowsPictureInPicture={false}
                    accessible={false}
                    importantForAccessibility="no-hide-descendants"
                    accessibilityElementsHidden={false}
                    showsTimecodes={false}
                />

                {manuallyPaused && muteControl === "center" && (
                    <>
                        <Pressable
                            onPress={handleVideoMuteToggle}
                            style={{
                                position: "absolute",
                                top: "35%",
                                left: "50%",
                                transform: [
                                    { translateX: -(iconSize / 4) },
                                    { translateY: -(iconSize / 4) }
                                ],
                                height: iconSize / 2,
                                width: iconSize / 2,
                            }}
                        >  
                            {isMuted ? (
                                <VideoUnMuteIcon color={colors.text} size={iconSize / 2} />
                            ) : (
                                <VideoMuteIcon color={colors.text} size={iconSize / 2} />
                            )}
                        </Pressable>
                        <Pressable
                            onPress={handleVideoTap}
                            style={{
                                position: "absolute",
                                top: "50%",
                                left: "50%",
                                transform: [
                                    { translateX: -(iconSize / 2) },
                                    { translateY: -(iconSize / 2) }
                                ],
                                height: iconSize,
                                width: iconSize,
                            }}
                        >
                            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                                {isPlaying ? (
                                    <VideoPlayIcon color={colors.text} size={iconSize} />
                                ) : (
                                    <VideoPauseIcon color={colors.text} size={iconSize} />
                                )}
                            </View>
                        </Pressable>
                    </>
                )}

                {muteControl === "row" && (
                    <View 
                        style={{
                            position: "absolute",
                            top: 1,
                            height: 30,
                            width: "100%",
                        }}
                        className='justify-center'
                    >
                            <Pressable
                                onPress={handleVideoMuteToggle}
                                style={{
                                    position: "absolute",
                                    right: 10,
                                }}
                            >  
                                {isMuted ? (
                                    <VideoUnMuteIcon color={colors.text} size={20} />
                                ) : (
                                    <VideoMuteIcon color={colors.text} size={20} />
                                )}
                            </Pressable>
                    </View>
                )}

                {muteControl === "bottomRow" && (
                    <View
                        style={{
                            position: "absolute",
                            bottom: bottomControlOffset,
                            left: 20,
                            right: 20,
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
                            {isMuted ? (
                                <VideoUnMuteIcon color={colors.text} size={iconSize} />
                            ) : (
                                <VideoMuteIcon color={colors.text} size={iconSize} />
                            )}
                        </Pressable>
                    </View>
                )}

            </Pressable>
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
};
