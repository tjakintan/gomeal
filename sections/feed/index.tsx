import { View, Text } from "react-native";
import { useTheme } from "@/provider/ThemeProvider";


export default function FeedScreen() {

  const { colors, textStyles } = useTheme();
  return (
    <View style={{backgroundColor: colors.background}} className="flex-1 items-center justify-center">
      <Text style={{color: colors.text}} className={textStyles.display}>feed</Text>
    </View>
  );
}
