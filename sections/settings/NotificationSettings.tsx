import { View, Text } from "react-native";
import { useSettingsStore } from "@/stores/useSettings";
import { useTheme } from "@/provider/ThemeProvider";
import { Button, ToggleButton } from "@/components/ButtonComponent";
import { SectionHeader } from "@/components/SectionComponent";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { update_notification_settings } from "@/notifications/notification.socket";
import { Settings } from "@/types";
import { useEffect } from "react";

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

    const likes = useSettingsStore((state) => state.settings.notifications.likes);
    const messages = useSettingsStore(
        (state) => state.settings.notifications.messages
    );
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const cookingReminderTime = useSettingsStore(
        (state) => state.settings.notifications.cookingReminderTime
    );

    const reminderEnabled = cookingReminderTime !== null;

    const handleUpdateNotifications = async (
        updates: Partial<Settings["notifications"]>
    ) => {
        updateNotifications(updates);
        await update_notification_settings(updates);
    };

    return (
        <View
            style={{ flex: 1, width: "100%" }}
            className="rounded-[30px] gap-1 p-1 overflow-hidden"
        >
            <View className="flex-1 p-5 gap-2 overflow-hidden">
                <SectionHeader
                    title="Likes"
                    showDivider
                    titleClassName={textStyles.section}
                />

                <View className="flex-row items-center mt-3">
                    <ToggleButton
                        value={likes}
                        onChange={(v) =>
                            handleUpdateNotifications({
                                likes: v,
                            })
                        }
                    />
                </View>

                <Text className={textStyles.small}>
                    Get notified when someone likes your recipes.
                </Text>
            </View>

            <View className="flex-1 p-5 gap-2 overflow-hidden">
                <SectionHeader
                    title="Messages"
                    showDivider
                    titleClassName={textStyles.section}
                />

                <View className="flex-row items-center mt-3">
                    <ToggleButton
                        value={messages}
                        onChange={(v) =>
                            handleUpdateNotifications({
                                messages: v,
                            })
                        }
                    />
                </View>

                <Text className={textStyles.small}>
                    Get notified when someone messages you.
                </Text>
            </View>

            <View className="flex-1 p-5 gap-2 overflow-hidden">

                <SectionHeader
                    title="Reminder"
                    showDivider
                    titleClassName={textStyles.section}
                />

                <View className="flex-row items-center mt-3">
                    <ToggleButton
                        value={reminderEnabled}
                        onChange={(v) =>
                            handleUpdateNotifications(
                                v
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
                            paddingVertical: 5,
                            borderRadius: 12,
                            backgroundColor: colors.card,
                            alignItems: "center",
                            justifyContent: "center",
                            flexDirection: "row",
                        }}                                   
                    >
                        {reminderOptions.map((option) => {
                            const isActive = cookingReminderTime === option.value;

                            return (
                                <Button
                                    key={option.label}
                                    onPress={() =>
                                        handleUpdateNotifications({
                                            cookingReminderTime: option.value,
                                            timezone,
                                        })
                                    }
                                    style={{
                                        backgroundColor: isActive
                                            ? colors.button
                                            : "transparent",
                                        borderColor: isActive
                                            ? colors.button
                                            : "transparent",
                                        borderWidth: 1,
                                        borderRadius: 12,
                                        minHeight: 40,
                                        paddingHorizontal: 14,
                                        alignItems: "center",
                                        justifyContent: "center",
                                    }}
                                    className="flex-row gap-2"
                                >
                                    <MaterialIcons
                                        name="notifications-active"
                                        size={18}
                                        color={isActive ? "white" : colors.text}
                                    />

                                    <Text
                                        className={textStyles.small}
                                        style={{
                                            color: isActive ? "white" : colors.text,
                                        }}
                                    >
                                        {option.label}
                                    </Text>
                                </Button>
                            );
                        })}
                    </View>
                )}

                <Text className={textStyles.small}>
                    Choose when you want a daily reminder to start cooking.
                </Text>
            </View>
        </View>
    );
};

export default NotificationSettings;
