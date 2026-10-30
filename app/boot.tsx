import React, { useEffect } from "react";
import { View, useWindowDimensions } from "react-native";
import LottieView from "lottie-react-native";

import { useTheme } from "@/provider/ThemeProvider";
import WobblyText from "@/hooks/WobblyText";

type BootScreenProps = {
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
};

const COMP_SIZE = 2000;      // Lottie comp is 2000x2000
const PERSON_BOTTOM = 1700;  // bottom of the body layer in comp coords
const GAP = 12;              // breathing room under the feet, tweak this

const MIN_WOBBLE_MS = 250;

const BootScreen: React.FC<BootScreenProps> = ({ loading = true }) => {
  const { width, height } = useWindowDimensions();
  const { colors, textStyles } = useTheme();

  // Lottie "contain": comp scales to the smaller screen side and is centered
  const side = Math.min(width, height);
  const scale = side / COMP_SIZE;
  const personBottomY = (height - side) / 2 + PERSON_BOTTOM * scale;

  const [animTime, setAnimTime] = React.useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimTime(true), MIN_WOBBLE_MS);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <LottieView
        source={require("@/assets/lottie/FoodChoice.json")}
        autoPlay
        loop
        resizeMode="contain"
        style={{ position: "absolute", width, height }}
      />

      <View
        pointerEvents="none"
        style={{ position: "absolute", top: personBottomY + GAP, left: 0, right: 0, alignItems: "center" }}
      >
        <WobblyText
          text="Gomeal"
          className={textStyles.h1}
          style={{ color: colors.button, fontSize: 50, lineHeight: 64, paddingVertical: 4 }}
          burst={animTime}
        />
      </View>
    </View>
  );
};

export default BootScreen;