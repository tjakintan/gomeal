import { useEffect, useState } from "react";
import { Text, StyleProp, TextStyle } from "react-native";
import { useTheme } from "@/provider/ThemeProvider";

type ScrambleResolveTextProps = {
  text: string;
  speed?: number;
  step?: number;
  style?: StyleProp<TextStyle>;
  className?: string;
};

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

export default function ScrambleResolveText({
  text,
  speed = 40,
  step = 0.33,
  style,
  className,
}: ScrambleResolveTextProps) {
  const { colors } = useTheme();
  const [displayText, setDisplayText] = useState(text);

  useEffect(() => {
    let iteration = 0;

    const interval = setInterval(() => {
      const scrambled = text
        .split("")
        .map((char, i) => {
          if (char === " ") return " ";
          if (i < iteration) return char;

          return CHARS[Math.floor(Math.random() * CHARS.length)];
        })
        .join("");

      setDisplayText(scrambled);

      iteration += step;

      if (iteration >= text.length) {
        setDisplayText(text);
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed, step]);

  return (
    <Text
      style={[{ color: colors.text }, style]}
      className={className}
      accessibilityLabel={text}
    >
      {displayText}
    </Text>
  );
}