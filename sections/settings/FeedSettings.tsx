import { View, Text } from "react-native";
import React from "react";
import { useSettingsStore } from "@/stores/useSettings";
import { useTheme } from "@/provider/ThemeProvider";
import { ToggleButton } from "@/components/ButtonComponent";
import { SectionHeader } from "@/components/SectionComponent";

const FeedSettings: React.FC = () => {
    const { textStyles } = useTheme();

    const updateFeed = useSettingsStore((state) => state.updateFeed);
    const autoPlayVideos = useSettingsStore(
        (state) => state.settings.feed.autoPlayVideos
    );
    const allowFeedColors = useSettingsStore(
        (state) => state.settings.feed.allowFeedColors
    );

    return (
        <View
            style={{
                flex: 1,
                width: "100%",
                gap: 20,
            }}
        >
            {/* Auto-play */}
            <View style={{ gap: 12, overflow: "hidden" }}>
                <SectionHeader
                    title="Auto-play"
                    subtitle="Enable automatic playback of videos when they come into view."
                    showDivider
                    titleClassName={textStyles.section}
                />

                <View style={{ paddingHorizontal: 10 }}>
                    <View
                        style={{
                            minHeight: 55,
                            paddingVertical: 8,
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 12,
                        }}
                    >
                        <Text className={textStyles.body}>
                            Auto-play videos
                        </Text>

                        <ToggleButton
                            value={autoPlayVideos}
                            onChange={(value) =>
                                updateFeed({ autoPlayVideos: value })
                            }
                        />
                    </View>
                </View>
            </View>

            {/* Feed colors */}
            <View style={{ gap: 12, overflow: "hidden" }}>
                <SectionHeader
                    title="Feed Colors"
                    subtitle="Allow accent colors to appear throughout your feed."
                    showDivider
                    titleClassName={textStyles.section}
                />

                <View style={{ paddingHorizontal: 10 }}>
                    <View
                        style={{
                            minHeight: 55,
                            paddingVertical: 8,
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 12,
                        }}
                    >
                        <Text className={textStyles.body}>
                            Allow feed colors
                        </Text>

                        <ToggleButton
                            value={allowFeedColors}
                            onChange={(value) =>
                                updateFeed({ allowFeedColors: value })
                            }
                        />
                    </View>
                </View>
            </View>
        </View>
    );
};

export default FeedSettings;

