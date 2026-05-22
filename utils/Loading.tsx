import React from "react";
import { View, Text } from "react-native";
import { SpinningLogoImage } from "./Logo";
import { useTheme } from "@/provider/ThemeProvider";

const Loading: React.FC<{text?: string; size?: number}> = ({ text = "Loading...",size = 120, }) => {
    const { textStyles } = useTheme();
    return (
        <View className="flex-1 items-center justify-center">

            <SpinningLogoImage size={size} />

            {text && (

                <Text className={textStyles.sectionText}>

                    {text}

                </Text>
                
            )}

        </View>
    );
};

export default Loading;