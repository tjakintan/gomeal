import { useEffect, useMemo, useRef } from "react";
import { View, Animated, Text, Easing, useWindowDimensions } from "react-native";
import { useTheme } from "@/provider/ThemeProvider";

const AnimatedText = Animated.createAnimatedComponent(Text);

type Props = {
  text: string;
  className?: string;
  style?: any;
  burst?: boolean;
  onBurstEnd?: () => void;
};

export default function WobblyText({ text, className, style, burst = false, onBurstEnd }: Props) {
  const letters = useMemo(() => text.split(""), [text]);
  const { colors, textStyles } = useTheme();
  const { width: winW, height: winH } = useWindowDimensions();

  const containerRef = useRef<View>(null);
  const layouts = useRef<{ x: number; y: number; width: number; height: number }[]>([]);

  // idle wobble
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

  // burst values (separate layer so they don't collide with the wobble)
  const bursts = useRef(
    letters.map(() => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      r: new Animated.Value(0),
      s: new Animated.Value(1),
    }))
  ).current;

  useEffect(() => {
    const loops = anims.map(({ rotate, x, y, rotateTarget, xTarget, yTarget, duration }) =>
      Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(rotate, { toValue: rotateTarget, duration: duration / 2, useNativeDriver: true }),
            Animated.timing(rotate, { toValue: -rotateTarget, duration: duration / 2, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(x, { toValue: xTarget, duration: duration / 2, useNativeDriver: true }),
            Animated.timing(x, { toValue: -xTarget, duration: duration / 2, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(y, { toValue: yTarget, duration: duration / 2, useNativeDriver: true }),
            Animated.timing(y, { toValue: -yTarget, duration: duration / 2, useNativeDriver: true }),
          ]),
        ])
      )
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [anims]);

  useEffect(() => {
    if (!burst) return;
    let running: Animated.CompositeAnimation | null = null;

    containerRef.current?.measureInWindow((cx0, cy0) => {
      const sx = winW / 2;
      const sy = winH / 2;
      const reach = Math.hypot(winW, winH);

      const all = bursts.map((b, i) => {
        const l = layouts.current[i] ?? { x: 0, y: 0, width: 0, height: 0 };
        // letter center relative to SCREEN center
        const lx = cx0 + l.x + l.width / 2 - sx;
        const ly = cy0 + l.y + l.height / 2 - sy;
        const angle = Math.atan2(ly, lx) + (Math.random() - 0.5) * 0.4;
        const dist = reach * (0.8 + Math.random() * 0.5);
        const duration = 900 + Math.random() * 500;
        const delay = Math.random() * 200;
        const easing = Easing.in(Easing.back(2)); // tiny pull-back, then launch
        const spin = (Math.random() > 0.5 ? 1 : -1) * (180 + Math.random() * 360);

        const t = (v: Animated.Value, toValue: number) =>
          Animated.timing(v, { toValue, duration, delay, easing, useNativeDriver: true });

        return Animated.parallel([
          t(b.x, Math.cos(angle) * dist),
          t(b.y, Math.sin(angle) * dist),
          t(b.r, spin),
          t(b.s, 1.6),
        ]);
      });

      running = Animated.parallel(all);
      running.start(({ finished }) => finished && onBurstEnd?.());
    });

    return () => running?.stop();
  }, [burst]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View ref={containerRef} className="flex-row flex-wrap justify-center items-center">
      {letters.map((char, i) => (
        <Animated.View
          key={`${char}-${i}`}
          onLayout={(e) => (layouts.current[i] = e.nativeEvent.layout)}
          style={{
            transform: [
              { translateX: bursts[i].x },
              { translateY: bursts[i].y },
              { rotate: bursts[i].r.interpolate({ inputRange: [-720, 720], outputRange: ["-720deg", "720deg"] }) },
              { scale: bursts[i].s },
            ],
          }}
        >
          <AnimatedText
            className={className ?? textStyles.h2}
            style={[
              {
                padding: 1,
                color: colors.text,
                transform: [
                  { translateX: anims[i].x },
                  { translateY: anims[i].y },
                  { rotate: anims[i].rotate.interpolate({ inputRange: [-360, 360], outputRange: ["-360deg", "360deg"] }) },
                ],
              },
              style,
            ]}
          >
            {char}
          </AnimatedText>
        </Animated.View>
      ))}
    </View>
  );
}