import { View, Text, Pressable } from "react-native";
import { useSettingsStore } from "@/stores/useSettings";
import { useTheme } from "@/provider/ThemeProvider";
import { ACCENT_COLORS } from "@/types";
import { ToggleButton } from "@/components/ButtonComponent";
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { SectionHeader } from "@/components/SectionComponent";

const FeedSettings: React.FC = () => {
  const { colors, textStyles } = useTheme();
  const updateFeed = useSettingsStore((state) => state.updateFeed);
  const autoPlayVideos = useSettingsStore((state) => state.settings.feed.autoPlayVideos);
  const allowFeedColors = useSettingsStore((state) => state.settings.feed.allowFeedColors);

  return (
    <View style={{ flex: 1, width: "100%" }} className="rounded-[30px] gap-1 p-1 overflow-hidden">
      {/* edit auto play */}
      <View className="flex-1 p-5 gap-2 overflow-hidden">
        <SectionHeader
          title="Auto-play"
          showDivider
          titleClassName={textStyles.section}
        />
        <View className="flex-row items-center mt-3">
          <ToggleButton
            value={autoPlayVideos}
            onChange={(v) => updateFeed({ autoPlayVideos: v })}
          />
        </View>
        <Text className={textStyles.small}>
          Enable automatic playback of videos when they come into view.
        </Text>
      </View>

      {/* edit feed colors */}
      <View className="flex-1 p-5 gap-2 overflow-hidden">
        <SectionHeader
          title="Feed Colors"
          showDivider
          titleClassName={textStyles.section}
        />
        <View className="flex-row items-center mt-3">
          <ToggleButton
            value={allowFeedColors}
            onChange={(v) => updateFeed({ allowFeedColors: v })}
          />
        </View>
        <Text className={textStyles.small}>
          Allow accent colors to be shown throughout your feed.
        </Text>
      </View>
    </View>
  );
}

export default FeedSettings;