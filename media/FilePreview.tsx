import React from "react";

import {
    View,
    Text,
} from "react-native";

import {
    WebView,
} from "react-native-webview";

import {
    LinearGradient,
} from "expo-linear-gradient";

import {
    useSafeAreaInsets,
} from "react-native-safe-area-context";

import {
    useTheme,
} from "@/provider/ThemeProvider";

import {
    useOverlay,
} from "@/stores/useOverlay";

import {
    Button,
} from "@/components/ButtonComponent";

import {
    XIcon,
} from "@/icons/Icon";
import { GradientHeader } from "@/components/GradientComponent";


type FilePreviewProps = {
    uri: string;
    fileName?: string | null;
};


const FilePreview: React.FC<FilePreviewProps> = ({
    uri,
    fileName,
}) => {

    const insets =
        useSafeAreaInsets();

    const {
        colors,
    } = useTheme("dark");


    return (
        <View
            style={{
                flex: 1,
                backgroundColor:
                    colors.background,
            }}
        >

            {/* Header */}
            <GradientHeader
                height={120}
                baseColor={colors.button}
                fadeSteps={[1,1]}
                contentStyle={{
                    height: 120,
                    paddingTop:
                        insets.top,
                    paddingHorizontal: 10,
                    paddingBottom: 14,
                }}
            >

                <View
                    style={{
                        height: 54,
                        flexDirection: "row",
                        alignItems: "center",
                    }}
                >

                    {/* Close */}
                    <Button
                        onPress={() =>
                            useOverlay
                                .getState()
                                .closeOverlay()
                        }
                        clearBackground
                    >
                        <XIcon
                            color={colors.danger}
                            size={20}
                        />
                    </Button>


                    {/* File name */}
                    <View
                        style={{
                            flex: 1,
                            marginLeft: 8,
                            marginRight: 12,
                        }}
                    >
                        <Text
                            numberOfLines={1}
                            ellipsizeMode="middle"
                            style={{
                                color: colors.text,
                                fontSize: 16,
                                fontWeight: "600",
                            }}
                        >
                            {fileName || "File"}
                        </Text>
                    </View>

                </View>

            </GradientHeader>


            {/* File */}
            <View
                style={{
                    flex: 1,
                    backgroundColor:
                        colors.background,
                    paddingTop: 120
                }}
            >
                <WebView
                    source={{
                        uri,
                    }}
                    style={{
                        flex: 1,
                        backgroundColor:
                            colors.background,
                    }}
                    originWhitelist={[
                        "*",
                    ]}
                    startInLoadingState
                    allowsInlineMediaPlayback
                />
            </View>

        </View>
    );
};


export default FilePreview;