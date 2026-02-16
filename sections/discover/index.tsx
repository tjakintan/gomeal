import { View, Text } from "react-native";
import { useTheme } from "@/provider/ThemeProvider";


export default function DiscoverScreen() {

  const { colors, textStyles } = useTheme();
  return (
    <View style={{backgroundColor: colors.background}} className="flex-1 items-center justify-center">
      <Text style={{color: colors.text}} className="text-lg font-semibold">discover</Text>
    </View>
  );
}
