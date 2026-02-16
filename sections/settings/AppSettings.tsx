import { View, Text, Pressable, useColorScheme } from "react-native";
import { useSettingsStore } from "@/stores/useSettings";
import { useTheme } from "@/provider/ThemeProvider";
import { NAV_COLORS } from "@/types";
const AppSettings:React.FC = () => {

    const { colors, textStyles } = useTheme();
    const updateApp = useSettingsStore((state) => state.updateApp);
    const theme = useSettingsStore((state) => state.settings.app.theme);
    const navCirclePosition = useSettingsStore((state) => state.settings.app.navCirclePosition);
    const navCircleColor = useSettingsStore((state) => state.settings.app.navCircleColor);
    const hapticsEnabled = useSettingsStore((state) => state.settings.app.hapticsEnabled);
    
    return (
        <View style={{flex:1, width: "100%", backgroundColor:colors.secondaryCard}} className="rounded-[30px] gap-1 p-1 overflow-hidden">

            {/* edit theme */}
            <View className="flex-1 p-5 gap-2 overflow-hidden">
                <Text className={`${textStyles.section}`}>Theme</Text>
                <View className="flex-row gap-2">

                    {["light", "dark", "system"].map((mode) => {

                        const isActive = theme === mode;
                        return (
                            <Pressable
                                key={mode}
                                onPress={() =>
                                    updateApp({
                                        theme: mode as "light" | "dark" | "system",
                                    })
                                }
                                className={`p-3 rounded-full ${
                                    isActive ? "bg-blue-500" : "bg-gray-300"
                                }`}
                            >
                                <Text className="text-white">{mode}</Text>
                            </Pressable>
                        )
                    })}

                </View>
                <Text className={textStyles.small}>
                    Choose how the app appears: light, dark, or automatically match your system settings.
                </Text>
            </View>

            {/* edit navigation circle color */}
            <View className="flex-1 p-5 gap-2 overflow-hidden">
                <Text className={textStyles.section}>Navigation Circle Color</Text>
                <View className="flex-row flex-wrap gap-3 mt-3">

                    {Object.entries(NAV_COLORS).map(([name, value]) => {

                        const isActive = navCircleColor === name;

                        return (
                            <Pressable
                            key={name}
                            onPress={() =>
                                updateApp({
                                navCircleColor: name as keyof typeof NAV_COLORS,
                                })
                            }
                            style={{
                                backgroundColor: value,
                                width: 40,
                                height: 40,
                                borderRadius: 999,
                                borderWidth: isActive ? 3 : 0,
                                borderColor: colors.text,
                            }}
                            />
                        );
                    })}

                </View>
                <Text className={textStyles.small}>
                    Choose where the floating navigation circle appears on the screen.
                </Text>
            </View>

            {/* edit navigation circle position */}
            <View className={`flex-1 p-5 gap-2 overflow-hidden`}>
                <Text className={textStyles.section}>Navigation Circle Position</Text>
                <View className="flex-row gap-2">

                    {["TL", "TR", "BL", "BR"].map((pos) => {

                        const isActive = navCirclePosition === pos;
                        return (
                            <Pressable
                                key={pos}
                                onPress={() =>
                                    updateApp({
                                        navCirclePosition: pos as "TL" | "TR" | "BL" | "BR",
                                    })
                                }
                                className={`p-3 rounded-full ${
                                    isActive ? "bg-blue-500" : "bg-gray-300"
                                }`}
                            >
                                <Text className="text-white">{pos}</Text>
                        </Pressable>
                        )
                    })}
                    
                </View>
                <Text className={textStyles.small}>
                    Customize the color of the navigation circle to match your style.
                </Text>
            </View>

            {/* edit haptics */}
            <View className="flex-1 p-5 gap-2 overflow-hidden">
                <Text className={textStyles.section}>Haptics</Text>
                <View className="flex-row gap-2 mt-3">

                    {[
                        { label: "On", value: true },
                        { label: "Off", value: false },
                    ].map((option) => {

                        const isActive = hapticsEnabled === option.value;

                        return (
                            <Pressable
                                key={option.label}
                                onPress={() =>
                                    updateApp({
                                    hapticsEnabled: option.value,
                                    })
                                }
                                className={`px-4 py-3 rounded-full ${
                                    isActive ? "bg-blue-500" : "bg-gray-300"
                                }`}
                            >
                                <Text className="text-white">{option.label}</Text>
                            </Pressable>
                        );
                    })}

                </View>
                <Text className={textStyles.small}>
                    Enable subtle vibration feedback when interacting with buttons and controls.
                </Text>
            </View>

        </View>
    )
}

export default AppSettings;