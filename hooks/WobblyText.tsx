import { useEffect, useMemo, useRef } from "react";
import { View, Animated, Text } from "react-native";
import { useTheme } from "@/provider/ThemeProvider";

const AnimatedText = Animated.createAnimatedComponent(Text);

export default function WobblyText({
  text,
  className,
  style,
}: {
  text: string;
  className?: string;
  style?: any;
}) {
  const letters = useMemo(() => text.split(""), [text]);
  const { colors, textStyles } = useTheme();

  const anims = useRef(
    letters.map(() => ({
      rotate: new Animated.Value(0),
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      rotateTarget: Math.random() * 4 - 2,
      xTarget: Math.random() * 2 - 1,
      yTarget: Math.random() * 2 - 1,
      duration: 2000 + Math.random() * 2000,
    }))
  ).current;

  useEffect(() => {
    const loops = anims.map(({ rotate, x, y, rotateTarget, xTarget, yTarget, duration }) =>
      Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(rotate, {
              toValue: rotateTarget,
              duration: duration / 2,
              useNativeDriver: true,
            }),
            Animated.timing(rotate, {
              toValue: -rotateTarget,
              duration: duration / 2,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(x, {
              toValue: xTarget,
              duration: duration / 2,
              useNativeDriver: true,
            }),
            Animated.timing(x, {
              toValue: -xTarget,
              duration: duration / 2,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(y, {
              toValue: yTarget,
              duration: duration / 2,
              useNativeDriver: true,
            }),
            Animated.timing(y, {
              toValue: -yTarget,
              duration: duration / 2,
              useNativeDriver: true,
            }),
          ]),
        ])
      )
    );

    loops.forEach((loop) => loop.start());

    return () => {
      loops.forEach((loop) => loop.stop());
    };
  }, [anims]);

  return (
    <View className="flex-row flex-wrap justify-center items-center">
      {letters.map((char, i) => (
        <AnimatedText
          key={`${char}-${i}`}
          className={className ?? textStyles.h2}
          style={[
            {
              padding: 1,
              color: colors.text,
              transform: [
                { translateX: anims[i].x },
                { translateY: anims[i].y },
                {
                  rotate: anims[i].rotate.interpolate({
                    inputRange: [-360, 360],
                    outputRange: ["-360deg", "360deg"],
                  }),
                },
              ],
            },
            style,
          ]}
        >
          {char}
        </AnimatedText>
      ))}
    </View>
  );
}
