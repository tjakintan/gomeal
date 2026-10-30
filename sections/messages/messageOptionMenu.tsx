import React, {
    forwardRef,
    useCallback,
    useEffect,
    useImperativeHandle,
    useRef,
    useState,
} from "react";

import {
    View,
    Text,
    ScrollView,
    Pressable,
    FlatList,
    StyleSheet,
    Animated,
} from "react-native";

import {
    useAudioPlayer,
    useAudioPlayerStatus,
    useAudioRecorder,
    useAudioRecorderState,
    RecordingPresets,
    setAudioModeAsync,
    AudioModule,
} from "expo-audio";

import { Button } from "@/components/ButtonComponent";

import * as MediaLibrary from "expo-media-library";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";

import Gallery from "@/media/Gallery";

import { useTheme } from "@/provider/ThemeProvider";
import { MessageType } from "@/types/messages.types";
import { GradientHeader } from "@/components/GradientComponent";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePendingMedia } from "@/media/store/usePendingMedia";

import { MemeIcon, GifIcon, SearchIcon, FileIcon, StopIcon } from "@/icons/Icon";
import { VideoPauseIcon, VideoPlayIcon } from "@/icons/video_icon";
import { Input } from "@/components/InputComponent";
import { Media } from "@/media/media";
import { getGiphyCategories, getMemes, getTrendingGifs, GiphyCategory, GiphyGif, Meme, MEME_CATEGORIES, MemeCategory, MemeCategoryItem, searchGifs, searchMemes } from "@/api/giphy.api";

import { BlurView } from "expo-blur";
import { useBanner } from "@/stores/useBanner";
import { BAR_COUNT, dbToLevel, flatBars, formatDuration, levelToHeight, padLive, resample, toWaveform, WAVEFORM } from "@/utils/audio";
import { MEDIA_KINDS, useCameraRoll } from "@/media/store/useMedia";


const MENU_HEIGHT = 50;

export type MessageFile = {
    uri: string;
    name: string;
    mimeType?: string;
    size?: number;
    durationMs?: number;
    waveform?: number[];
};

export type MessageComposerResult =
    | MessageType
    | MessageFile
    | {
        type: "image" | "video";
        uri: string;
    }[];


export type MessageComposerProps = {
    dark?: boolean;
    onDone: (
        result: MessageComposerResult,
        uri?: string
    ) => void | Promise<void>;
    onCancel?: () => void;
};


export type VoiceMessageComposerHandle = {
    cancel: () => Promise<void>;
};


export type VoiceMessageComposerProps = {
    dark?: boolean;
    autoStart?: boolean;

    onDone: (
        result: MessageComposerResult,
        uri?: string
    ) => void;
};


export const MediaMessageComposer = ({
    dark,
    onDone,
    onCancel,
}: MessageComposerProps) => {

    const { colors } = useTheme(dark ? "dark" : undefined);

    const [cameraRollCursor, setCameraRollCursor] = useState<string | undefined>(undefined);

    const { assets, hasNextPage, loadingMore, loadMore, refresh } = useCameraRoll(MEDIA_KINDS);

    const [selectedMedia, setSelectedMedia] = useState<{ id: string; uri: string; type: "image" | "video" }[]>([]);
    
    const pendingMedia = usePendingMedia((state) => state.pendingMedia); // NEW — live, not frozen
    const previousStagedUris = useRef<Set<string>>(new Set());

    // Camera capture is still a single, immediate item — separate from
    // gallery multi-tap. It goes straight to onDone as before.
    const addCameraCaptureToSelection = useCallback(
        (uri: string, type: "image" | "video") => {
            setSelectedMedia((current) => {
                const id = `camera_${Date.now()}_${current.length}`;
                const next = [...current, { id, uri, type }];

                onDone(
                    next.map(({ uri, type }) => ({ uri, type })) as any,
                    undefined
                );

                return next;
            });
        },
        [onDone]
    );

    // Every tap toggles the item in/out of selectedMedia, then immediately
    // reports the FULL current selection to onDone — no confirm step.
    const handleToggleSelect = useCallback(
        (item: { id: string; uri: string; type: "image" | "video" }) => {
            setSelectedMedia((current) => {
                const exists = current.some((m) => m.id === item.id);

                const next = exists
                    ? current.filter((m) => m.id !== item.id)
                    : [...current, item];

                onDone(
                    next.map(({ uri, type }) => ({ uri, type })) as any,
                    undefined
                );

                return next;
            });
        },
        [onDone]
    );

    useEffect(() => {
        const currentUris = new Set(pendingMedia.map((m) => m.uri)); 

        const removedElsewhere = selectedMedia.filter(
            (item) =>
                previousStagedUris.current.has(item.uri) &&
                !currentUris.has(item.uri)
        );

        if (removedElsewhere.length > 0) {
            setSelectedMedia((current) =>
                current.filter(
                    (item) => !removedElsewhere.some((r) => r.id === item.id)
                )
            );
        }

        previousStagedUris.current = currentUris;
    }, [pendingMedia]);


    return (
        <View style={{ flex: 1, width: "100%", backgroundColor: colors.background }}>
            <View style={{ flex: 1, width: "100%" }}>
                <Gallery
                    context="message"
                    cameraRollMedia={assets}
                    loadingMore={loadingMore}
                    hasNextPage={hasNextPage}
                    onLoadMore={loadMore}
                    onRefresh={refresh}
                    onCameraCaptured={(uri, type) => addCameraCaptureToSelection(uri, type)}
                    selectedIds={selectedMedia.map((m) => m.id)}
                    onToggleSelect={handleToggleSelect}
                    dark={dark}
                    multiSelect
                />
            </View>
        </View>
    );
};


const StickerSkeleton = ({
    paddingBottom,
}: {
    paddingBottom: number;
}) => {
    const { colors } = useTheme();

    const opacity = useRef(new Animated.Value(0.45)).current;

    useEffect(() => {
        const anim = Animated.loop(
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

        anim.start();

        return () => anim.stop();
    }, [opacity]);

    return (
        <View
            style={{
                flex: 1,
                paddingHorizontal: 8,
                paddingTop: 100,
                paddingBottom,
                overflow: "hidden",
            }}
        >
            {Array.from({ length: 6 }).map((_, row) => (
                <View key={row} style={{ flexDirection: "row" }}>
                    {[0, 1, 2].map((col) => (
                        <View
                            key={col}
                            style={{
                                width: "33.333%",
                                aspectRatio: 1,
                                padding: 2,
                            }}
                        >
                            <Animated.View
                                style={{
                                    flex: 1,
                                    borderRadius: 6,
                                    backgroundColor: colors.card,
                                    opacity,
                                }}
                            />
                        </View>
                    ))}
                </View>
            ))}
        </View>
    );
};


export const StickerMessageComposer = ({
    dark,
    onDone,
}: MessageComposerProps) => {

    const { colors, textStyles } = useTheme(
        dark ? "dark" : undefined
    );

    const [sending, setSending] = useState(false);

    const mountedRef = useRef(true);

    const insets = useSafeAreaInsets();

    const [active, setActive] =
        useState<"meme" | "gif">("gif");

    const [search, setSearch] =
        useState("");

    const [loading, setLoading] =
        useState(false);

    const [giphyCategories, setGiphyCategories] =
        useState<GiphyCategory[]>([]);

    const [memeCategories] = useState<MemeCategoryItem[]>(
        MEME_CATEGORIES
    );

    const [gifResults, setGifResults] =
        useState<GiphyGif[]>([]);

    const [memeResults, setMemeResults] =
        useState<Meme[]>([]);

    const [selectedGiphyCategory, setSelectedGiphyCategory] =
        useState<GiphyCategory | null>(null);

    const [selectedMemeCategory, setSelectedMemeCategory] =
        useState<MemeCategory | null>(null);


    /*
     * Load GIF categories.
     */
    useEffect(() => {

        if (active !== "gif") {
            return;
        }

        const loadCategories = async () => {

            try {

                const response =
                    await getGiphyCategories();

                setGiphyCategories(
                    response.data
                );

            } catch (error) {

                console.error(
                    "Failed to load GIPHY categories:",
                    error
                );
            }
        };

        loadCategories();

    }, [active]);


    /*
     * Load initial GIFs.
     */
    useEffect(() => {
        if (active !== "gif") return;

        let cancelled = false;

        const loadGifs = async () => {
            setLoading(true);

            try {
                const query = search.trim() || selectedGiphyCategory?.name;

                const response = query
                    ? await searchGifs({ query, limit: 30 })
                    : await getTrendingGifs({ limit: 30 });

                if (!cancelled) setGifResults(response.data);
            } catch (error) {
                console.error("Failed to load GIFs:", error);
                if (!cancelled) setGifResults([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        // Only debounce typing, not category taps
        const timeout = setTimeout(loadGifs, search.trim() ? 300 : 0);

        return () => {
            cancelled = true;
            clearTimeout(timeout);
        };
    }, [active, search, selectedGiphyCategory]);


    /*
     * Load memes.
     */
    useEffect(() => {
        if (active !== "meme") return;

        let cancelled = false;

        const loadMemes = async () => {
            setLoading(true);
            try {
                const response = search.trim()
                    ? await searchMemes(search.trim())
                    : await getMemes({
                        page: 1,
                        limit: 30,
                        category: selectedMemeCategory ?? undefined,
                    });

                if (!cancelled) setMemeResults(response.templates);
            } catch (error) {
                console.error("Failed to load memes:", error);
                if (!cancelled) setMemeResults([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        const timeout = setTimeout(loadMemes, search.trim() ? 300 : 0);

        return () => {
            cancelled = true;
            clearTimeout(timeout);
        };
    }, [active, search, selectedMemeCategory]);


    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    const handleSendSticker = useCallback(async (uri: string) => {
        if (sending) return;
        setSending(true);
        try {
            await onDone("gif", uri);
        } finally {
            if (mountedRef.current) setSending(false);
        }
    }, [onDone, sending]);

    const handleGiphyCategoryPress = (category: GiphyCategory) => {
        setSelectedGiphyCategory((prev) =>
            prev?.name_encoded === category.name_encoded ? null : category
        );
    };


    const handleMemeCategoryPress = (category: MemeCategory) => {
        setSelectedMemeCategory((prev) =>
            prev === category ? null : category
        );
    };

    const renderGif = ({ item }: { item: GiphyGif }) => {
        const uri = item.images.fixed_width?.url ?? item.images.original.url;

        return (
            <View style={{ width: "33.333%", aspectRatio: 1, padding: 2 }}>
                <Media
                    uri={uri}
                    mediaType="image"
                    onPress={() => handleSendSticker(uri)}
                    style={{ width: "100%", height: "100%", borderRadius: 6 }}
                    imageContentFit="cover"
                />
            </View>
        );
    };


    const renderMeme = ({
        item,
    }: {
        item: Meme;
    }) => {

        return (
            <View
                style={{
                    width: "33.333%",
                    aspectRatio: 1,
                    padding: 2,
                }}
            >
                <Media
                    uri={item.url}
                    mediaType="image"
                    onPress={() => handleSendSticker(item.url)} 
                    style={{
                        width: "100%",
                        height: "100%",
                        borderRadius: 6,
                    }}
                    imageContentFit="cover"
                />
            </View>
        );
    };


    useEffect(() => {
        if (search.trim()) {
            setSelectedGiphyCategory(null);
            setSelectedMemeCategory(null);
        }
    }, [search]);


    return (
        <View
            style={{
                flex: 1,
                width: "100%",
            }}
        >

            <GradientHeader
                baseColor={colors.background}
                height={100}
                direction="top"
                zIndex={20}
                contentStyle={{
                    height: 100,
                }}
            >
                {/* Search */}
                <View
                    style={{
                        paddingHorizontal: 10,
                        paddingTop: 10,
                    }}
                >
                    <Input
                        value={search}
                        onChangeText={setSearch}
                        placeholder={
                            active === "gif"
                                ? "Search GIPHY"
                                : "Search Memes"
                        }
                        leftIcon={
                            <SearchIcon
                                color={colors.text}
                                size={25}
                            />
                        }
                    />
                </View>

                {/* Categories */}
                {!search.trim() && (
                    <View
                        style={{
                            marginTop: 10,
                        }}
                    >

                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{
                                paddingHorizontal: 10,
                                gap: 8,
                            }}
                        >

                            {active === "gif"
                                ? (
                                    giphyCategories.map(
                                        (category) => (
                                            <Pressable
                                                key={category.name_encoded}
                                                onPress={() =>
                                                    handleGiphyCategoryPress(
                                                        category
                                                    )
                                                }
                                                style={{
                                                    paddingHorizontal: 14,
                                                    paddingVertical: 10,
                                                    borderRadius: 20,
                                                    backgroundColor:
                                                        selectedGiphyCategory?.name_encoded === category.name_encoded
                                                            ? colors.button
                                                            : colors.secondaryCard,
                                                }}
                                            >
                                                <Text
                                                    className={textStyles.body}
                                                    style={{
                                                        color:
                                                            selectedGiphyCategory?.name_encoded === category.name_encoded
                                                                ? "#fff"
                                                                : colors.text,
                                                        fontSize: 13,
                                                    }}
                                                >
                                                    {category.name}
                                                </Text>
                                            </Pressable>
                                        )
                                    )
                                )
                                : (
                                    memeCategories.map(
                                        (category) => (
                                            <Pressable
                                                key={
                                                    category.slug
                                                }
                                                onPress={() =>
                                                    handleMemeCategoryPress(
                                                        category.slug
                                                    )
                                                }
                                                style={{
                                                    paddingHorizontal: 14,
                                                    paddingVertical: 10,
                                                    borderRadius: 20,
                                                    backgroundColor:
                                                        selectedMemeCategory ===
                                                        category.slug
                                                            ? colors.button
                                                            : colors.secondaryCard,
                                                }}
                                            >
                                                <Text
                                                    className={
                                                        textStyles.body
                                                    }
                                                    style={{
                                                        color:
                                                            selectedMemeCategory ===
                                                            category.slug
                                                                ? "#fff"
                                                                : colors.text,
                                                        fontSize: 13,
                                                    }}
                                                >
                                                    {category.name}
                                                </Text>
                                            </Pressable>
                                        )
                                    )
                                )}

                        </ScrollView>

                    </View>
                )}

            </GradientHeader>


            {/* Results */}
            <View
                style={{
                    flex: 1,
                    marginTop: 10,
                }}
            >

                {loading || sending ? (
                    <StickerSkeleton
                        paddingBottom={MENU_HEIGHT + insets.bottom + 20}
                    />
                ) : active === "gif" ? (

                    <FlatList
                        data={gifResults}
                        keyExtractor={(item) =>
                            item.id
                        }
                        renderItem={renderGif}
                        numColumns={3}
                        showsVerticalScrollIndicator={
                            false
                        }
                        contentContainerStyle={{
                            paddingHorizontal: 8,
                            paddingTop: 100,
                            paddingBottom:
                                MENU_HEIGHT +
                                insets.bottom +
                                20,
                        }}
                    />

                ) : (

                    <FlatList
                        data={memeResults}
                        keyExtractor={(item) =>
                            item.id
                        }
                        renderItem={renderMeme}
                        numColumns={3}
                        showsVerticalScrollIndicator={
                            false
                        }
                        contentContainerStyle={{
                            paddingHorizontal: 8,
                            paddingTop: 100,
                            paddingBottom:
                                MENU_HEIGHT +
                                insets.bottom +
                                20,
                        }}
                    />

                )}

            </View>


            {/* Bottom Toggle */}
            <View
                style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: MENU_HEIGHT + insets.bottom - 5,
                    overflow: "hidden",
                    borderTopWidth: 1,
                    borderColor: colors.secondaryCard,
                }}
            >
                <BlurView
                    intensity={60}
                    tint={dark ? "dark" : "light"}
                    style={{
                        ...StyleSheet.absoluteFillObject,
                    }}
                />

                <View
                    style={{
                        flex: 1,
                        flexDirection: "row",
                        justifyContent: "space-between",
                        gap: 5,
                        paddingBottom: insets.bottom - 5,
                        backgroundColor: dark
                            ? "rgba(0,0,0,0.35)"
                            : "rgba(255,255,255,0.35)",
                    }}
                >
                    <View
                        style={{
                            flex: 1,
                        }}
                    >
                        <Button
                            onPress={() => {
                                setActive("meme");
                                setSearch("");
                                setSelectedMemeCategory(null);
                            }}
                        >
                            <MemeIcon
                                color={colors.button}
                                size={30}
                            />
                        </Button>
                    </View>

                    <View
                        style={{
                            height: "80%",
                            alignSelf: "flex-end",
                            width: 1,
                            backgroundColor: colors.secondaryCard
                        }}
                    />

                    <View
                        style={{
                            flex: 1,
                        }}
                    >
                        <Button
                            onPress={() => {
                                setActive("gif");
                                setSearch("");
                                setSelectedGiphyCategory(null);
                            }}
                        >
                            <GifIcon
                                color={colors.button}
                                size={30}
                            />
                        </Button>
                    </View>
                </View>
            </View>
        </View>
    );
};


export const FileMessageComposer = ({
    dark,
    onDone,
}: MessageComposerProps) => {

    const { colors, textStyles } = useTheme(
        dark ? "dark" : undefined
    );

    const banner = useBanner();

    const pickFile = async () => {
        try {
            const result =
                await DocumentPicker.getDocumentAsync({
                    type: "application/pdf",
                    multiple: false,
                    copyToCacheDirectory: true,
                });

            if (result.canceled) {
                return;
            }

            const file =
                result.assets[0];

            const MAX_FILE_SIZE =
                10 * 1024 * 1024;

            /*
            * Validate MIME type.
            */
            if (
                file.mimeType &&
                file.mimeType !== "application/pdf"
            ) {
                banner.error(
                    "Only PDF files are supported."
                );

                return;
            }

            /*
            * Validate extension as an additional check.
            */
            if (
                !file.name
                    .toLowerCase()
                    .endsWith(".pdf")
            ) {
                banner.error(
                    "Only PDF files are supported."
                );

                return;
            }

            /*
            * Validate size.
            */
            if (
                file.size !== undefined &&
                file.size > MAX_FILE_SIZE
            ) {
                banner.error(
                    "File is too large. Please select a PDF smaller than 10 MB."
                );

                return;
            }

            onDone({
                uri: file.uri,
                name: file.name,
                mimeType: "application/pdf",
                size: file.size,
            });

        } catch (error) {

            console.error(
                "[FileMessageComposer] Failed to pick file:",
                error
            );
        }
    };

    return (
        <View
            style={{
                flex: 1,
                padding: 10,
            }}
        >
            <Text
                className={textStyles.body}
                style={{
                    alignSelf: "center",
                    padding: 10
                }}
            >
                Select a file less than 10MB
            </Text>

            <Button
                onPress={pickFile}
                style={{
                    width: "100%",
                    height: 95,
                    borderRadius: 20,
                    borderWidth: 2,
                    paddingHorizontal: 16,
                    borderColor: colors.secondaryCard,
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexDirection: "row",
                }}
            >
                <View
                    style={{
                        width: 50,
                        height: 50,
                        borderRadius: 999,
                        backgroundColor: "#E3F2FF",
                        justifyContent: "center",
                        alignItems: "center",
                    }}
                >
                    <FileIcon
                        color="#2487E8"
                        size={28}
                    />
                </View>

                <View
                    style={{
                        flex: 1,
                        marginLeft: 12,
                    }}
                >
                    <Text
                        className={textStyles.section}
                        style={{
                            color: colors.text,
                        }}
                    >
                        Choose from files
                    </Text>

                    <Text
                        className={textStyles.small}
                        numberOfLines={1}
                        style={{
                            color: colors.secondaryText,
                        }}
                    >
                        Select a file from your device
                    </Text>
                </View>
            </Button>
        </View>
    );
};


export const VoiceMessageComposer = forwardRef<
    VoiceMessageComposerHandle,
    VoiceMessageComposerProps
>(({ dark, autoStart = false, onDone }, ref) => {

    const { colors } = useTheme(dark ? "dark" : undefined);

    const recorder = useAudioRecorder({
        ...RecordingPresets.HIGH_QUALITY,
        isMeteringEnabled: true,
    });

    const recorderState = useAudioRecorderState(recorder, 100);

    const durationRef = useRef(0);
    durationRef.current = recorderState.durationMillis;

    const [recordedUri, setRecordedUri] = useState<string | null>(null);
    const player = useAudioPlayer(recordedUri);
    const playerStatus = useAudioPlayerStatus(player);

    const isRecording = recorderState.isRecording;
    const isPlaying = playerStatus.playing;

    const startedRef = useRef(false);
    const cancelledRef = useRef(false);
    const recordingRef = useRef(false);
    const playerRef = useRef(player);
    playerRef.current = player;

    // Waveform
    const samplesRef = useRef<number[]>([]);
    const [bars, setBars] = useState<number[]>(flatBars);

    const setPlaybackMode = () =>
        setAudioModeAsync({
            playsInSilentMode: true,
            allowsRecording: false,
        }).catch(() => {});

    /* ---------- Start ---------- */
    const startRecording = useCallback(async () => {
        try {
            await setAudioModeAsync({
                playsInSilentMode: true,
                allowsRecording: true,
            });
            await recorder.prepareToRecordAsync();

            if (cancelledRef.current) return;

            recorder.record();
            recordingRef.current = true;
        } catch (error) {
            console.error("Failed to start voice recording:", error);
        }
    }, [recorder]);

    useEffect(() => {
        if (!autoStart || startedRef.current) return;
        startedRef.current = true;
        startRecording();
    }, [autoStart, startRecording]);

    /* ---------- Sample mic level while recording ---------- */
    useEffect(() => {
        if (!isRecording) return;

        const level = dbToLevel(recorderState.metering ?? -160);
        samplesRef.current.push(level);
        setBars(padLive(samplesRef.current));
    }, [isRecording, recorderState.durationMillis]);

    /* ---------- Stop (keep the recording) ---------- */
    const stopRecording = useCallback(async () => {
        try {
            const durationMs = durationRef.current;   // grab before stop

            await recorder.stop();
            recordingRef.current = false;
            setBars(resample(samplesRef.current));
            await setPlaybackMode();

            const uri = recorder.uri;
            if (!uri) return;

            setRecordedUri(uri);
            onDone({
                uri,
                name: `voice-${Date.now()}.m4a`,
                mimeType: "audio/mp4",
                durationMs,
                waveform: toWaveform(samplesRef.current),
            });
        } catch (error) {
            console.error("Failed to stop voice recording:", error);
        }
    }, [recorder, onDone]);

    /* ---------- Cancel (stop + delete), called by parent ---------- */
    useImperativeHandle(
        ref,
        () => ({
            cancel: async () => {
                cancelledRef.current = true;

                try { playerRef.current.pause(); } catch {}

                try {
                    if (recordingRef.current) {
                        await recorder.stop();
                        recordingRef.current = false;
                    }
                } catch {}

                const uri = recorder.uri ?? recordedUri;
                if (uri) {
                    await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
                }

                await setPlaybackMode();
                samplesRef.current = [];
                setBars(flatBars());
                setRecordedUri(null);
            },
        }),
        [recorder, recordedUri]
    );

    /* ---------- Safety net ---------- */
    useEffect(() => {
        return () => {
            cancelledRef.current = true;
            try { playerRef.current.pause(); } catch {}
            if (recordingRef.current) {
                recordingRef.current = false;
                try { recorder.stop().catch(() => {}); } catch {}
            }
        };
    }, [recorder]);

    /* ---------- Playback ---------- */
    const togglePlayback = useCallback(() => {
        if (!recordedUri || !playerStatus.isLoaded) return;

        if (playerStatus.playing) {
            player.pause();
            return;
        }

        if (
            playerStatus.duration > 0 &&
            playerStatus.currentTime >= playerStatus.duration
        ) {
            player.seekTo(0);
        }
        player.play();
    }, [recordedUri, player, playerStatus]);

    const handleMainPress = useCallback(() => {
        if (isRecording) {
            stopRecording();
            return;
        }
        togglePlayback();
    }, [isRecording, stopRecording, togglePlayback]);

    /* ---------- Display ---------- */
    const recordingSeconds = Math.floor(recorderState.durationMillis / 1000);
    const previewSeconds = Math.floor(playerStatus.duration || recordingSeconds);
    const playbackSeconds = Math.floor(playerStatus.currentTime || 0);

    const displayedTime = isRecording
        ? recordingSeconds
        : isPlaying
            ? playbackSeconds
            : previewSeconds;

    const progress =
        playerStatus.duration > 0
            ? playerStatus.currentTime / playerStatus.duration
            : 0;

    return (
        <View
            style={{
                flex: 1,
                height: 46,
                borderRadius: 25,
                backgroundColor: colors.secondaryCard,
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 8,
            }}
        >
            <Button
                onPress={handleMainPress}
                disabled={!isRecording && !recordedUri}
                clearBackground
                style={{
                    width: 35,
                    height: 35,
                    padding: 0,
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                {isRecording ? (
                    <StopIcon color={colors.danger} size={20} />
                ) : isPlaying ? (
                    <VideoPauseIcon color={colors.button} size={20} />
                ) : (
                    <VideoPlayIcon color={colors.button} size={20} />
                )}
            </Button>

            {/* WAVEFORM */}
            <View
                style={{
                    flex: 1,
                    height: 30,
                    marginHorizontal: 5,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    overflow: "hidden",
                }}
            >
                {bars.map((level, i) => {
                    const played = !!recordedUri && i / BAR_COUNT <= progress;
                    return (
                        <View
                            key={i}
                            style={{
                                width: 2,
                                height: levelToHeight(level),
                                borderRadius: 2,
                                backgroundColor: played ? colors.button : colors.text,
                                opacity: played ? 0.9 : 0.35,
                            }}
                        />
                    );
                })}
            </View>

            <Text style={{ color: colors.text, fontSize: 15, minWidth: 34, textAlign: "right" }}>
                {formatDuration(displayedTime)}
            </Text>
        </View>
    );
});