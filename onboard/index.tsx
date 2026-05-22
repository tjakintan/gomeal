import { SafeAreaView } from "react-native-safe-area-context";
import { useRef, useState, useEffect } from "react";
import { View, Animated, Dimensions } from "react-native";
import { Button } from "@/components/ButtonComponent";
import { useTheme } from "@/provider/ThemeProvider";
import Permissions from "@/provider/PermissionsProvider";
import { Camera } from "expo-camera";
import * as MediaLibrary from "expo-media-library";
import WelcomeScreen from "./Authenticate";
import { XIcon } from "@/icons/Icon";

const OnBoardScreen: React.FC = () => {

    const { colors } = useTheme();

    const [showPermissionScreen, setShowPermissionScreen] = useState(false);

    const { height } = Dimensions.get("window");

    const permissionTranslateY = useRef(
        new Animated.Value(height)
    ).current;

    const permissionOpacity = useRef(
        new Animated.Value(0)
    ).current;

    const openPermission = () => {
        setShowPermissionScreen(true);

        permissionTranslateY.setValue(height);
        permissionOpacity.setValue(0);

        Animated.parallel([
            Animated.timing(permissionTranslateY, {
                toValue: 0,
                duration: 400,
                useNativeDriver: true,
            }),
            Animated.timing(permissionOpacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const closePermission = () => {
        Animated.parallel([
            Animated.timing(permissionTranslateY, {
                toValue: height,
                duration: 350,
                useNativeDriver: true,
            }),
            Animated.timing(permissionOpacity, {
                toValue: 0,
                duration: 250,
                useNativeDriver: true,
            }),
        ]).start(() => {
            setShowPermissionScreen(false);
        });
    };

    const checkRequiredPermissions = async () => {
        const camera = await Camera.getCameraPermissionsAsync();
        const mic = await Camera.getMicrophonePermissionsAsync();
        const media = await MediaLibrary.getPermissionsAsync();

        const allGranted =
            camera.status === "granted" &&
            mic.status === "granted" &&
            media.status === "granted";

        if (!allGranted) {
            openPermission();
        }
    };

    useEffect(() => {
        checkRequiredPermissions();
    }, []);

    return (
        <View className="w-full h-full">

            <WelcomeScreen />

            {showPermissionScreen && (
                <Animated.View
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: colors.background,
                        transform: [{ translateY: permissionTranslateY }],
                        opacity: permissionOpacity,
                        zIndex: 200,
                    }}
                >
                    <SafeAreaView style={{ flex: 1 }}>
                        <Permissions onGranted={closePermission} onClose={closePermission}/>
                    </SafeAreaView>
                </Animated.View>
            )}
        </View>
    );
};

export default OnBoardScreen;
