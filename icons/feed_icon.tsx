import Svg, { Path } from "react-native-svg";
import { _DEFAULT_ICON_WIDTH, _DEFAULT_ICON_HEIGHT } from "@/types/layout.types";
import LottieView from "lottie-react-native";
import { useEffect, useRef, useState } from "react";

const iconHeight = _DEFAULT_ICON_HEIGHT;
const iconWidth = _DEFAULT_ICON_WIDTH;

type BaseIconProps = {
  size?: number;
  color?: string;
  fillColor?: string;
};

type FeedLoveIconProps = BaseIconProps & {
  liked?: boolean;
  animationKey?: number;
};

type FeedStarIconProps = BaseIconProps & {
  size?: number;
  starred?: boolean;
};

export const FeedLoveIcon: React.FC<FeedLoveIconProps> = ({
  color = "#000",
  fillColor = "red",
  size = iconWidth,
  liked = false,
  animationKey = 0,
}) => {
  const lottieRef = useRef<LottieView>(null);
  const [showAnimation, setShowAnimation] = useState(false);

  useEffect(() => {
    if (animationKey > 0) {
      setShowAnimation(true);
      requestAnimationFrame(() => {
        lottieRef.current?.reset();
        lottieRef.current?.play();
      });
    }
  }, [animationKey]);

  if (showAnimation) {
    return (
      <LottieView
        ref={lottieRef}
        source={require("@/assets/lottie/like.json")}
        autoPlay={false}
        loop={false}
        onAnimationFinish={() => setShowAnimation(false)}
        style={{
          width: size,
          height: size,
          transform: [{ scale: 3 }],
        }}
      />
    );
  }

  if (liked) {
    return (
      <Svg width={size} height={size} viewBox="0 0 14 14">
        <Path
          fill={fillColor}
          stroke={fillColor}
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7 3.183C3.98-.522.792 2.111.75 4.949C.75 9.173 5.805 12.64 7 12.64s6.25-3.468 6.25-7.692C13.208 2.11 10.02-.522 7 3.183"
        />
      </Svg>
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 14 14">
      <Path
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7 3.183C3.98-.522.792 2.111.75 4.949C.75 9.173 5.805 12.64 7 12.64s6.25-3.468 6.25-7.692C13.208 2.11 10.02-.522 7 3.183"
      />
    </Svg>
  );
};

export const FeedStarIcon: React.FC<FeedStarIconProps> = ({
  size = iconHeight,
  color = "#000",
  fillColor = "gold",
  starred = false,
}) => {
  const lottieRef = useRef<LottieView>(null);
  const [showAnimation, setShowAnimation] = useState(false);
  const prevStarred = useRef(starred);

  useEffect(() => {
    if (prevStarred.current !== starred) {
      prevStarred.current = starred;
      if (starred) {
        setShowAnimation(true);
        requestAnimationFrame(() => {
          lottieRef.current?.reset();
          lottieRef.current?.play();
        });
      }
    }
  }, [starred]);

  if (showAnimation) {
    return (
      <LottieView
        ref={lottieRef}
        source={require("@/assets/lottie/Star.json")}
        autoPlay={false}
        loop={false}
        onAnimationFinish={() => setShowAnimation(false)}
        style={{
          width: size,
          height: size,
          transform: [{ scale: 3 }],
        }}
      />
    );
  }

  if (starred) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path
          fill={fillColor}
          stroke={fillColor}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M10.704 4.325a1.5 1.5 0 0 1 2.592 0l1.818 3.12a1.5 1.5 0 0 0 .978.712l3.53.764a1.5 1.5 0 0 1 .8 2.465l-2.405 2.693a1.5 1.5 0 0 0-.374 1.15l.363 3.593a1.5 1.5 0 0 1-2.097 1.524l-3.304-1.456a1.5 1.5 0 0 0-1.21 0l-3.304 1.456a1.5 1.5 0 0 1-2.097-1.524l.363-3.593a1.5 1.5 0 0 0-.373-1.15l-2.406-2.693a1.5 1.5 0 0 1 .8-2.465l3.53-.764a1.5 1.5 0 0 0 .979-.711z"
        />
      </Svg>
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M10.704 4.325a1.5 1.5 0 0 1 2.592 0l1.818 3.12a1.5 1.5 0 0 0 .978.712l3.53.764a1.5 1.5 0 0 1 .8 2.465l-2.405 2.693a1.5 1.5 0 0 0-.374 1.15l.363 3.593a1.5 1.5 0 0 1-2.097 1.524l-3.304-1.456a1.5 1.5 0 0 0-1.21 0l-3.304 1.456a1.5 1.5 0 0 1-2.097-1.524l.363-3.593a1.5 1.5 0 0 0-.373-1.15l-2.406-2.693a1.5 1.5 0 0 1 .8-2.465l3.53-.764a1.5 1.5 0 0 0 .979-.711z"
      />
    </Svg>
  );
};