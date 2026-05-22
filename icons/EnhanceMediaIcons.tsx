import Svg, { Path, G, Line, Circle, Rect, Ellipse, Defs, LinearGradient, RadialGradient, Stop} from "react-native-svg";
import { Image } from "react-native";
import { _DEFAULT_ICON_WIDTH, _DEFAULT_ICON_HEIGHT } from "@/types/layout.types";

const iconHeight = _DEFAULT_ICON_HEIGHT 
const iconWidth = _DEFAULT_ICON_WIDTH 

export const PepperIcon = ({color}: {color: string}) => {
    return (
        <Svg 
            width={iconWidth} height={iconWidth} 
            viewBox="0 0 128 128"
        >
            <Path fill="#DC0D28" d="m113.69 45.18l-11.26 4.32l-22.34 49.17l-36.13 24.59s24.87 2.06 44.2-11.07s29.09-30.22 32.29-44.11c3.19-13.89 1.69-18.02 1.69-18.02l-8.45-4.88z"/>
            <Path fill="#FF5117" d="M82.53 36.17s-7.13.94-10.89 13.51S69.95 72.2 61.5 83.09S45.36 98.11 31.85 95.48c-18.46-3.59-17.27-17.1-22.9-17.83c-4.32-.56-6.95 13.33-.38 24.4s19.33 19.71 33.22 21.02c13.89 1.31 38.1-6.57 51.62-27.41S108.62 60 109 50.62S96.42 36.35 96.42 36.35l-13.89-.18z"/>
            <Path fill="#FFCB88" d="M86.1 49.92c-3.1-2.39-7.04 1.27-8.59 7.04c-1.55 5.77-1.69 10.7-2.53 13.51s-3.1 6.76-.14 8.45c2.96 1.69 5.91-3.8 7.04-8.02s2.11-10 3.66-12.81s3-6.29.56-8.17zM72.77 82.53c-3.19-1.13-3.85 1.6-4.41 2.44s-1.6 2.91.19 4.04c1.99 1.26 3.57-.19 4.5-1.6c.94-1.41 1.54-4.24-.28-4.88z"/>
            <Path fill="#98B71E" d="M85.06 38.61c2.35 2.25-.94 4.5.75 5.82c1.99 1.55 7.6-1.6 12.2-.09s4.41 6.95 7.79 7.32c3.38.38 3.28-2.82 7.88-2.16c4.6.66 6.76 6.66 9.01 6.01s1.03-8.07-4.41-13.23c-4.34-4.11-7.23-4.97-7.51-6.95c-.28-1.97 1.78-11.07 2.44-15.58c.66-4.5.47-10.7-5.16-13.51c-5.63-2.82-10.42-.19-11.36 1.41c-1.14 1.93-.73 4.64 4.04 2.82c4.41-1.69 7.41 2.35 6.85 6.29s-3.57 9.57-5.35 11.83s-2.72 3.57-4.04 3.85c-1.31.28-5.63-.47-9.67-.28c-4.81.22-9.85 2.63-9.2 4.6s3.91.09 5.74 1.85z"/>
        </Svg>
    );
};

export const BurgerIcon = ({ color }: { color: string }) => {
    return (
        <Image 
            source={require("@/assets/post/dish_media_icons/burger.png")}
            style={{width: iconWidth, height: iconHeight}}
        />
    )
};

export const LeftArrow = ({ color }: { color: string }) => {
  return (
    <Svg width={iconWidth} height={iconHeight} viewBox="0 0 24 24">
      <Line
        x1="14"
        y1="6"
        x2="8"
        y2="12"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <Line
        x1="14"
        y1="18"
        x2="8"
        y2="12"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </Svg>
  );
};

export const RightArrow = ({ color }: { color: string }) => {
  return (
    <Svg width={iconWidth} height={iconHeight} viewBox="0 0 24 24">
      <Line
        x1="10"
        y1="6"
        x2="16"
        y2="12"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <Line
        x1="10"
        y1="18"
        x2="16"
        y2="12"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </Svg>
  );
};

export const PizzaIcon = ({ color }: { color: string }) => {
    return (
        <Image 
            source={require("@/assets/post/dish_media_icons/pizza.png")}
            style={{width: iconWidth, height: iconHeight}}
        />
    )
};

export const SushiIcon = ({ color }: { color: string }) => {
    return (
        <Image 
            source={require("@/assets/post/dish_media_icons/sushi.png")}
            style={{width: iconWidth, height: iconHeight}}
        />
    )
};

export const BreadIcon = ({ color }: { color: string }) => {
    return (
        <Image 
            source={require("@/assets/post/dish_media_icons/bread.png")}
            style={{width: iconWidth, height: iconHeight}}
        />
    )
};

export const TacoIcon = ({ color }: { color: string }) => {
    return (
        <Image 
            source={require("@/assets/post/dish_media_icons/taco.png")}
            style={{width: iconWidth, height: iconHeight}}
        />
    )
};

export const SaladIcon = ({ color }: { color: string }) => {
    return (
        <Image 
            source={require("@/assets/post/dish_media_icons/salad.png")}
            style={{width: iconWidth, height: iconHeight}}
        />
    )
};

export const IceCreamIcon = ({ color }: { color: string }) => {
    return (
        <Image 
            source={require("@/assets/post/dish_media_icons/ice-cream-cone.png")}
            style={{width: iconWidth, height: iconHeight}}
        />
    )
};

export const SteakIcon = ({ color }: { color: string }) => {
    return (
        <Image 
            source={require("@/assets/post/dish_media_icons/meat-on-bone.png")}
            style={{width: iconWidth, height: iconHeight}}
        />
    )
};

export const CookieIcon = ({ color }: { color: string }) => {
    return (
        <Image 
            source={require("@/assets/post/dish_media_icons/cookie.png")}
            style={{width: iconWidth, height: iconHeight}}
        />
    )
};