import { View, Text, Pressable } from "react-native";
import { useSettingsStore } from "@/stores/useSettings";
import { useTheme } from "@/provider/ThemeProvider";
import { ACCENT_COLORS } from "@/types";
import { ToggleButton, SelectionPickerButton, Button } from "@/components/ButtonComponent";
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { SectionHeader } from "@/components/SectionComponent";
import { EmptyIcon } from "@/icons/Icon";

const AppSettings:React.FC = () => {

    const { colors, textStyles } = useTheme();
    const updateApp = useSettingsStore((state) => state.updateApp);
    const theme = useSettingsStore((state) => state.settings.app.theme);
    const accentColor = useSettingsStore((state) => state.settings.app.accentColor);
    const hapticsEnabled = useSettingsStore((state) => state.settings.app.hapticsEnabled);
    const themeOptions: ("light" | "dark" | "system")[] = ["light", "dark", "system"];
    
    return (
        <View style={{flex:1, width: "100%"}} className="rounded-[30px] gap-1 p-1 overflow-hidden">

            {/* edit theme */}
            <View className="flex-1 p-5 gap-2 overflow-hidden">

                <SectionHeader
                    title="Theme"
                    showDivider
                    titleClassName={textStyles.section}
                /> 

                <View className="flex-row gap-2">
                    <SelectionPickerButton
                        value={themeOptions.indexOf(theme)} 
                        onChange={(idx) => updateApp({ theme: themeOptions[idx] })}
                    >
                        <MaterialIcons name="light-mode" size={24} color="orange" />
                        <MaterialIcons name="dark-mode" size={24} color="black" />
                        <MaterialIcons name="settings-suggest" size={24} color="black" />
                    </SelectionPickerButton>
                </View>

                <Text className={textStyles.small}>
                    Choose how the app appears: light, dark, or automatically match your system settings.
                </Text>
            </View>

            {/* edit accent color */}
            <View className="flex-1 p-5 gap-2 overflow-hidden">

                <SectionHeader
                    title="Accent Color"
                    showDivider
                    titleClassName={textStyles.section}
                /> 

                <View className="flex-row flex-wrap gap-3 mt-3">
                    {Object.entries(ACCENT_COLORS).map(([name, value]) => {
                        const isActive = accentColor === name;
                        const isNone = name === "none";
                        return (
                            <Button
                                key={name}
                                onPress={() =>
                                    updateApp({
                                    accentColor: name as keyof typeof ACCENT_COLORS,
                                    })
                                }
                                style={{
                                    backgroundColor:  value,
                                    width: 40,
                                    height: 40,
                                    borderRadius: 999,
                                    borderWidth: isActive ? 3 : 0,
                                    borderColor: "white",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                {isNone && (
                                    <EmptyIcon size={25} color={colors.text} />
                                )}
                            </Button>
                        );
                    })}
                </View>
                <Text className={textStyles.small}>
                    Customize the color of the navigation circle to match your style.
                </Text>
            </View>

            {/* edit haptics */}
            <View className="flex-1 p-5 gap-2 overflow-hidden">

                <SectionHeader
                    title="Haptics"
                    showDivider
                    titleClassName={textStyles.section}
                />

                <View className="flex-row items-center mt-3">
                    <ToggleButton
                        value={hapticsEnabled}
                        onChange={(v) =>
                            updateApp({
                            hapticsEnabled: v,
                            })
                        }
                    />
                </View>
                
                <Text className={textStyles.small}>
                    Enable subtle vibration feedback when interacting with buttons and controls.
                </Text>
            </View>

        </View>
    )
}

export default AppSettings;