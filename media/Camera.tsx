import React, {
    useCallback,
    useRef,
    useEffect,
    useState,
} from "react";

import {
    View,
    StyleSheet,
    Text,
    Pressable,
} from "react-native";

import {
    Camera,
    usePhotoOutput,
    useVideoOutput,
    CommonResolutions,
} from "react-native-vision-camera";

import { useTheme } from "@/provider/ThemeProvider";

import {
    FlashlightEnabledIcon,
    FlashlightNotEnabledIcon,
    XIcon,
    FlipIcon,
} from "@/icons/Icon";

import * as FileSystem from "expo-file-system/legacy";
import { Buffer } from "buffer";

import { Button } from "@/components/ButtonComponent";
import { formatRecordingTime } from "@/utils/time";
import { useCamera } from "@/provider/CameraProvider";
import { ImageMediaType, MediaContext, MAX_RECORDING_S } from "@/types/media.types";


interface CameraScreenProps {
    onClose?: () => void;
    onPhotoCaptured?: (uri: string, type: ImageMediaType, duration?: number | null) => void;
    dark?: boolean;
    context: MediaContext;
}

const CameraScreen: React.FC<CameraScreenProps> = ({
    onClose,
    onPhotoCaptured,
    dark = true,
    context,
}) => {

    const maxSeconds = MAX_RECORDING_S[context];
    const maxMs = maxSeconds * 1000;

    const { colors } = useTheme(
        "dark"
    );

    const [cameraPosition, setCameraPosition] =
        useState<"back" | "front">("back");

    const {
        backDevice,
        frontDevice,
    } = useCamera();

    const device =
        cameraPosition === "back"
            ? backDevice
            : frontDevice;

    const photoOutput = usePhotoOutput({
        targetResolution: CommonResolutions.VGA_16_9,
        containerFormat: "jpeg",
    });

    const videoOutput = useVideoOutput({
        targetResolution: CommonResolutions.VGA_16_9,
        enableAudio: true,
        fileType: "mp4",
    });

    const [cameraReady, setCameraReady] =
        useState(false);

    const [torchEnabled, setTorchEnabled] =
        useState(false);

    const [capturing, setCapturing] =
        useState(false);

    const cameraRef =
        useRef<React.ElementRef<typeof Camera>>(null);

    const [recording, setRecording] =
        useState(false);

    const recorderRef = useRef<Awaited<
        ReturnType<typeof videoOutput.createRecorder>
    > | null>(null);

    const recordingStartedAtRef =
        useRef<number | null>(null);

    const maxRecordingTimeoutRef =
        useRef<ReturnType<typeof setTimeout> | null>(null);

    const recordingStartedRef =
        useRef(false);

    const pressTimerRef =
        useRef<ReturnType<typeof setTimeout> | null>(null);

    const [recordingDuration, setRecordingDuration] =
        useState(0);

    const recordingTimerRef =
        useRef<ReturnType<typeof setInterval> | null>(null);


    const startRecordingTimer = useCallback(() => {
        if (recordingTimerRef.current) {
            clearInterval(
                recordingTimerRef.current
            );
        }

        setRecordingDuration(0);

        recordingTimerRef.current =
            setInterval(() => {
                setRecordingDuration(
                    (current) => current + 1
                );
            }, 1000);
    }, []);


    const stopRecordingTimer = useCallback(() => {
        if (recordingTimerRef.current) {
            clearInterval(recordingTimerRef.current);
            recordingTimerRef.current = null;
        }

        if (maxRecordingTimeoutRef.current) {
            clearTimeout(maxRecordingTimeoutRef.current);
            maxRecordingTimeoutRef.current = null;
        }

        setRecordingDuration(0);
    }, []);


    const flipCamera = useCallback(() => {
        if (
            capturing ||
            recording
        ) {
            return;
        }

        setCameraReady(false);

        setTorchEnabled(false);

        setCameraPosition((current) =>
            current === "back"
                ? "front"
                : "back"
        );
    }, [
        capturing,
        recording,
    ]);


    const capturePhoto = useCallback(async () => {
        if (
            !cameraReady ||
            capturing ||
            !device
        ) {
            return;
        }

        setCapturing(true);

        try {
            const photo =
                await photoOutput.capturePhoto(
                    {
                        enableShutterSound: true,
                        flashMode: "off",
                    },
                    {}
                );

            const arrayBuffer =
                await photo.getFileDataAsync();

            const base64 =
                Buffer
                    .from(arrayBuffer)
                    .toString("base64");

            const fileUri =
                `${FileSystem.cacheDirectory}gomeal_${Date.now()}.jpg`;

            await FileSystem.writeAsStringAsync(
                fileUri,
                base64,
                {
                    encoding:
                        FileSystem.EncodingType.Base64,
                }
            );

            photo.dispose();

            onPhotoCaptured?.(
                fileUri,
                "image"
            );

            onClose?.();

        } catch (error) {
            console.error(
                "[CameraScreen] Failed to capture photo:",
                error
            );
        } finally {
            setCapturing(false);
        }
    }, [
        cameraReady,
        capturing,
        device,
        photoOutput,
        onPhotoCaptured,
        onClose,
    ]);


    const startRecording = useCallback(async () => {
        if (
            !cameraReady ||
            capturing ||
            recording ||
            !device
        ) {
            return;
        }

        try {
            const recorder =
                await videoOutput.createRecorder({});

            recorderRef.current = recorder;

            await recorder.startRecording(
                (filePath) => {
                    const startedAt = recordingStartedAtRef.current;
                    const duration = startedAt ? (Date.now() - startedAt) / 1000 : null;
                    recordingStartedAtRef.current = null;

                    stopRecordingTimer();
                    recorderRef.current = null;
                    recordingStartedRef.current = false;
                    setRecording(false);

                    onPhotoCaptured?.(filePath, "video", duration);
                    onClose?.();
                },
                (error) => {
                    console.error(
                        "[CameraScreen] Video recording failed:",
                        error
                    );

                    recordingStartedAtRef.current = null;

                    stopRecordingTimer();

                    recorderRef.current = null;
                    recordingStartedRef.current = false;
                    setRecording(false);
                }
            );

            /*
            * Only mark the recording as active after
            * startRecording() succeeds.
            */
            recordingStartedRef.current = true;

            recordingStartedAtRef.current = Date.now();

            maxRecordingTimeoutRef.current = setTimeout(() => {
                recorderRef.current?.stopRecording().catch((error) => {
                    console.error("[CameraScreen] Auto-stop failed:", error);
                    stopRecordingTimer();
                    recorderRef.current = null;
                    recordingStartedRef.current = false;
                    recordingStartedAtRef.current = null;
                    setRecording(false);
                });
            }, maxMs);

            setRecording(true);

            startRecordingTimer();

        } catch (error) {
            console.error(
                "[CameraScreen] Failed to start recording:",
                error
            );

            stopRecordingTimer();

            recorderRef.current = null;
            recordingStartedRef.current = false;
            setRecording(false);
        }
    }, [
        cameraReady,
        capturing,
        recording,
        device,
        videoOutput,
        onPhotoCaptured,
        onClose,
        startRecordingTimer,
        stopRecordingTimer,
        maxMs
    ]);


    const stopRecording = useCallback(async () => {
        if (
            !recordingStartedRef.current ||
            !recorderRef.current
        ) {
            return;
        }

        try {
            await recorderRef.current.stopRecording();

        } catch (error) {
            console.error(
                "[CameraScreen] Failed to stop recording:",
                error
            );

            stopRecordingTimer();

            recorderRef.current = null;
            recordingStartedRef.current = false;
            setRecording(false);
        }
    }, [
        stopRecordingTimer,
    ]);


    const handlePressIn = useCallback(() => {
        if (
            !cameraReady ||
            capturing ||
            recording ||
            !(maxSeconds > 0)
        ) {
            return;
        }

        pressTimerRef.current =
            setTimeout(() => {
                startRecording();
            }, 250);
    }, [
        cameraReady,
        capturing,
        recording,
        startRecording,
    ]);


    const handlePressOut = useCallback(() => {
        if (pressTimerRef.current) {
            clearTimeout(
                pressTimerRef.current
            );

            pressTimerRef.current = null;
        }

        if (recordingStartedRef.current) {
            stopRecording();
            return;
        }

        capturePhoto();
    }, [
        capturePhoto,
        stopRecording,
    ]);


    useEffect(() => {
        return () => {
            if (pressTimerRef.current) {
                clearTimeout(
                    pressTimerRef.current
                );

                pressTimerRef.current = null;
            }

            if (recordingTimerRef.current) {
                clearInterval(
                    recordingTimerRef.current
                );

                recordingTimerRef.current = null;
            }

            if (maxRecordingTimeoutRef.current) {
                clearTimeout(maxRecordingTimeoutRef.current);
                maxRecordingTimeoutRef.current = null;
            }
        };
    }, []);


    if (!device) {
        return (
            <View
                style={[
                    StyleSheet.absoluteFillObject,
                    {
                        backgroundColor:
                            colors.background,
                        alignItems: "center",
                        justifyContent: "center",
                    },
                ]}
            >
                <Text
                    style={{
                        color: colors.text,
                    }}
                >
                    Camera unavailable
                </Text>
            </View>
        );
    }


    return (
        <View
            style={[
                StyleSheet.absoluteFillObject,
                {
                    backgroundColor:
                        colors.background,
                },
            ]}
        >

            {/* CAMERA */}
            <View
                style={{
                    flex: 1,
                    paddingBottom: 85,
                }}
            >
                <Camera
                    ref={cameraRef}
                    style={{
                        flex: 1,
                        borderRadius: 30,
                        overflow: "hidden"
                    }}
                    device={device}
                    isActive
                    torchMode={
                        torchEnabled
                            ? "on"
                            : "off"
                    }
                    outputs={[
                        photoOutput,
                        videoOutput,
                    ]}
                    onConfigured={() =>
                        setCameraReady(true)
                    }
                />
            </View>


            {/* TOP CONTROLS */}
            <View
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    paddingTop: 55,
                    paddingHorizontal: 20,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                }}
            >

                <Button
                    onPress={onClose}
                    clearBackground
                >
                    <XIcon
                        color={colors.danger}
                        size={26}
                    />
                </Button>

                <Button
                    onPress={flipCamera}
                    disabled={
                        capturing ||
                        recording
                    }
                    clearBackground
                >
                    <FlipIcon
                        color="#FFFFFF"
                        size={28}
                    />
                </Button>

                <Button
                    onPress={() =>
                        setTorchEnabled(
                            (current) =>
                                !current
                        )
                    }
                    clearBackground
                    disabled={
                        cameraPosition === "front"
                    }
                >
                    {torchEnabled ? (
                        <FlashlightNotEnabledIcon
                            color="#FFFFFF"
                            size={24}
                        />
                    ) : (
                        <FlashlightEnabledIcon
                            color="#FFFFFF"
                            size={24}
                        />
                    )}
                </Button>

            </View>

            {/* RECORDING TIMER */}
            {recording && (
                <View
                    style={{
                        position: "absolute",
                        top: 115,
                        left: 0,
                        right: 0,
                        alignItems: "center",
                    }}
                >
                    <View
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            backgroundColor: "#eb1d1d",
                            borderRadius: 10,
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                        }}
                    >
                        <View
                            style={{
                                width: 7,
                                height: 7,
                                borderRadius: 999,
                                backgroundColor: "#FFFFFF",
                                marginRight: 7,
                            }}
                        />

                        <Text
                            style={{
                                color: "#FFFFFF",
                                fontSize: 14,
                                fontWeight: "600",
                                fontVariant: ["tabular-nums"],
                            }}
                        >
                            {formatRecordingTime(recordingDuration)} / {formatRecordingTime(maxSeconds)}
                        </Text>
                    </View>
                </View>
            )}

            {/* BOTTOM CONTROLS */}
            <View
                style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: 45,
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                {/* CAMERA BUTTON */}
                <Pressable
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                    disabled={
                        !cameraReady ||
                        capturing
                    }
                    style={{
                        width: 78,
                        height: 78,
                        borderRadius: 999,
                        borderWidth: 5,
                        borderColor: "#FFFFFF",
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: cameraReady
                            ? 1
                            : 0.5,
                    }}
                >
                    <View
                        style={{
                            width: recording ? 54 : 64,
                            height: recording ? 54 : 64,
                            borderRadius: 999,
                            backgroundColor: recording ? "#eb1d1d" : "#FFFFFF",
                        }}
                    />
                </Pressable>
            </View>

        </View>
    );
};


export default CameraScreen;