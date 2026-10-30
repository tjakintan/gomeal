import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useSettingsStore } from "@/stores/useSettings";
import { useTheme } from "@/provider/ThemeProvider";
import { Button, ToggleButton } from "@/components/ButtonComponent";
import { SectionHeader } from "@/components/SectionComponent";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { update_notification_settings } from "@/notifications/notification.socket";
import { Settings } from "@/types";
import { ScrollView } from "react-native-gesture-handler";

const reminderOptions: { label: string; value: string }[] = [
    { label: "Breakfast", value: "08:00" },
    { label: "Lunch", value: "12:00" },
    { label: "Dinner", value: "18:00" },
];

const NotificationSettings: React.FC = () => {
    const { colors, textStyles } = useTheme();

    const updateNotifications = useSettingsStore(
        (state) => state.updateNotifications
    );

    const likes = useSettingsStore(
        (state) => state.settings.notifications.likes
    );

    const messages = useSettingsStore(
        (state) => state.settings.notifications.messages
    );

    const cook = useSettingsStore(
        (state) => state.settings.notifications.cook
    );

    const stars = useSettingsStore(
        (state) => state.settings.notifications.stars ?? true
    );

    const cookingReminderTime = useSettingsStore(
        (state) => state.settings.notifications.cookingReminderTime
    );

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const reminderEnabled = cookingReminderTime !== null;

    const handleUpdateNotifications = async (
        updates: Partial<Settings["notifications"]>
    ) => {
        updateNotifications(updates);
        await update_notification_settings(updates);
    };

    return (
        <TouchableOpacity
            activeOpacity={1}
            style={{
                width: "100%",
                gap: 5,
            }}
        >
            {/* Likes */}
            <View style={{ gap: 5, overflow: "hidden" }}>
                <SectionHeader
                    title="Likes"
                    subtitle="Get notified when someone likes your recipes."
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
                        Recipe likes
                    </Text>

                    <ToggleButton
                        value={likes}
                        onChange={(value) =>
                            handleUpdateNotifications({ likes: value })
                        }
                    />
                </View>
            </View>

            {/* Messages */}
            <View style={{ gap: 5, overflow: "hidden" }}>
                <SectionHeader
                    title="Messages"
                    subtitle="Get notified when someone messages you."
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
                        Direct messages
                    </Text>

                    <ToggleButton
                        value={messages}
                        onChange={(value) =>
                            handleUpdateNotifications({ messages: value })
                        }
                    />
                </View>
            </View>

            {/* Cooks */}
            <View style={{ gap: 5, overflow: "hidden" }}>
                <SectionHeader
                    title="Cooks"
                    subtitle="Get notified when someone cooks your recipes."
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
                        Recipe cooks
                    </Text>

                    <ToggleButton
                        value={cook}
                        onChange={(value) =>
                            handleUpdateNotifications({ cook: value })
                        }
                    />
                </View>
            </View>

            {/* Stars */}
            <View style={{ gap: 5, overflow: "hidden" }}>
                <SectionHeader
                    title="Stars"
                    subtitle="Get notified when someone stars your recipes."
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
                        Recipe stars
                    </Text>

                    <ToggleButton
                        value={stars}
                        onChange={(value) =>
                            handleUpdateNotifications({ stars: value })
                        }
                    />
                </View>
            </View>

            {/* Cooking Reminder */}
            <View style={{ gap: 5, overflow: "hidden" }}>
                <SectionHeader
                    title="Reminder"
                    subtitle="Choose when you want a daily reminder to start cooking."
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
                        Daily cooking reminder
                    </Text>

                    <ToggleButton
                        value={reminderEnabled}
                        onChange={(value) =>
                            handleUpdateNotifications(
                                value
                                    ? {
                                        cookingReminderTime: "08:00",
                                        timezone,
                                    }
                                    : {
                                        cookingReminderTime: null,
                                    }
                            )
                        }
                    />
                </View>

                {reminderEnabled && (
                    <View
                        style={{
                            width: 341,
                            alignSelf: "center",
                            padding: 5,
                            borderRadius: 24,
                            backgroundColor: colors.card,
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 5
                        }}
                    >
                        {reminderOptions.map((option, index) => {
                            const isActive =
                                cookingReminderTime === option.value;

                            return (
                                <React.Fragment key={option.label}>
                                    {index > 0 && (
                                        <View
                                            style={{
                                                width: 1,
                                                height: 30,
                                                backgroundColor: colors.text + "30",
                                            }}
                                        />
                                    )}

                                    <Button
                                        onPress={() =>
                                            handleUpdateNotifications({
                                                cookingReminderTime: option.value,
                                                timezone,
                                            })
                                        }
                                        style={{
                                            width: 103,
                                            minHeight: 42,
                                            flexGrow: 1,
                                            flexShrink: 0,
                                            paddingHorizontal: 4,
                                            backgroundColor: isActive
                                                ? colors.button
                                                : "transparent",
                                            borderColor: "transparent",
                                            borderWidth: 1,
                                            borderRadius: 18,
                                            flexDirection: "row",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            gap: 4,
                                        }}
                                    >
                                        <MaterialIcons
                                            name="notifications-active"
                                            size={18}
                                            color={isActive ? "white" : colors.text}
                                        />

                                        <Text
                                            numberOfLines={1}
                                            adjustsFontSizeToFit
                                            minimumFontScale={0.75}
                                            style={{
                                                color: isActive
                                                    ? "white"
                                                    : colors.text,
                                                fontSize: 12,
                                                flexShrink: 1,
                                            }}
                                        >
                                            {option.label}
                                        </Text>
                                    </Button>
                                </React.Fragment>
                            );
                        })}
                    </View>
                )}
            </View>

        </TouchableOpacity>
    );
};

export default NotificationSettings;
