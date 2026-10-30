import React from "react";
import { View, Text } from "react-native";
import { useSettingsStore } from "@/stores/useSettings";
import { useTheme } from "@/provider/ThemeProvider";
import { ACCENT_COLORS } from "@/types";
import {
    ToggleButton,
    SelectionPickerButton,
    Button,
} from "@/components/ButtonComponent";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SectionHeader } from "@/components/SectionComponent";
import { EmptyIcon } from "@/icons/Icon";

const AppSettings: React.FC = () => {
    const { colors, textStyles } = useTheme();

    const updateApp = useSettingsStore((state) => state.updateApp);
    const theme = useSettingsStore((state) => state.settings.app.theme);
    const accentColor = useSettingsStore(
        (state) => state.settings.app.accentColor
    );
    const hapticsEnabled = useSettingsStore(
        (state) => state.settings.app.hapticsEnabled
    );

    const themeOptions: ("light" | "dark" | "system")[] = [
        "light",
        "dark",
        "system",
    ];

    return (
        <View
            style={{
                flex: 1,
                width: "100%",
                gap: 20,
            }}
        >
            {/* Theme */}
            <View style={{ gap: 12, overflow: "hidden" }}>
                <SectionHeader
                    title="Theme"
                    subtitle="Choose how the app appears: light, dark, or automatically match your system settings."
                    showDivider
                    titleClassName={textStyles.section}
                />

                <View
                    style={{
                        paddingHorizontal: 10,
                        paddingVertical: 8,
                    }}
                >
                    <SelectionPickerButton
                        value={themeOptions.indexOf(theme)}
                        onChange={(idx) =>
                            updateApp({ theme: themeOptions[idx] })
                        }
                    >
                        <MaterialIcons
                            name="light-mode"
                            size={24}
                            color="orange"
                        />
                        <MaterialIcons
                            name="dark-mode"
                            size={24}
                            color="black"
                        />
                        <MaterialIcons
                            name="settings-suggest"
                            size={24}
                            color="black"
                        />
                    </SelectionPickerButton>
                </View>
            </View>

            {/* Accent Color */}
            <View style={{ gap: 12, overflow: "hidden" }}>
                <SectionHeader
                    title="Accent Color"
                    subtitle="Customize the accent color of the avatar, menu options, and buttons to match your style."
                    showDivider
                    titleClassName={textStyles.section}
                />

                <View
                    style={{
                        flexDirection: "row",
                        flexWrap: "wrap",
                        gap: 12,
                        paddingHorizontal: 10,
                        paddingVertical: 8,
                    }}
                >
                    {Object.entries(ACCENT_COLORS).map(([name, value]) => {
                        const isActive = accentColor === name;
                        const isNone = name === "none";

                        return (
                            <Button
                                key={name}
                                onPress={() =>
                                    updateApp({
                                        accentColor:
                                            name as keyof typeof ACCENT_COLORS,
                                    })
                                }
                                style={{
                                    backgroundColor: value,
                                    width: 40,
                                    height: 40,
                                    borderRadius: 999,
                                    borderWidth: isActive ? 3 : 0,
                                    borderColor: colors.secondaryCard,
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                {isNone && (
                                    <EmptyIcon
                                        size={25}
                                        color={colors.text}
                                    />
                                )}
                            </Button>
                        );
                    })}
                </View>
            </View>

            {/* Haptics */}
            <View style={{ gap: 12, overflow: "hidden" }}>
                <SectionHeader
                    title="Haptics"
                    subtitle="Enable subtle vibration feedback when interacting with buttons and controls."
                    showDivider
                    titleClassName={textStyles.section}
                />

                <View
                    style={{
                        minHeight: 55,
                        paddingHorizontal: 10,
                        paddingVertical: 8,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                    }}
                >
                    <Text className={textStyles.body}>
                        Haptic feedback
                    </Text>

                    <ToggleButton
                        value={hapticsEnabled}
                        onChange={(value) =>
                            updateApp({ hapticsEnabled: value })
                        }
                    />
                </View>
            </View>
        </View>
    );
};

export default AppSettings;
