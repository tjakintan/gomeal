import Svg, { Path, G, Line, Circle, Rect, Ellipse, Defs, LinearGradient, RadialGradient, Stop, Polyline} from "react-native-svg";
import { Image } from "react-native";
import { _DEFAULT_ICON_WIDTH, _DEFAULT_ICON_HEIGHT } from "@/types/layout.types";

const iconHeight = _DEFAULT_ICON_HEIGHT
const iconWidth = _DEFAULT_ICON_WIDTH

export const VideoPlayIcon = ({ color, size = iconWidth }: { color?: string; size?: number }) => {
    return (
        <Svg width={size} height={size} viewBox="0 0 128 128">
            <Path fill="#F77E00" d="M116.46 3.96h-104c-4.42 0-8 3.58-8 8v104c0 4.42 3.58 8 8 8h104c4.42 0 8-3.58 8-8v-104c0-4.42-3.58-8-8-8z" />
            <Path fill="#FF9800" d="M110.16 3.96h-98.2a7.555 7.555 0 0 0-7.5 7.5v97.9c-.01 4.14 3.34 7.49 7.48 7.5h98.12c4.14.01 7.49-3.34 7.5-7.48V11.46c.09-4.05-3.13-7.41-7.18-7.5h-.22z" />
            <Path fill="#FFBD52" d="M40.16 12.86c0-2.3-1.6-3-10.8-2.7c-7.7.3-11.5 1.2-13.8 4s-2.9 8.5-3 15.3c0 4.8 0 9.3 2.5 9.3c3.4 0 3.4-7.9 6.2-12.3c5.4-8.7 18.9-10.6 18.9-13.6z" opacity=".75" />
            <Path fill="#FAFAFA" d="M43.7 62.21v-25.7a2.258 2.258 0 0 1 3.4-2l43.5 25.7c1.13.72 1.47 2.22.75 3.35c-.19.3-.45.55-.75.75l-43.5 25.6c-1.08.63-2.46.27-3.09-.81c-.21-.36-.32-.77-.31-1.19v-25.7z" />
        </Svg>
    );
};

export const VideoPauseIcon = ({ color, size = iconWidth }: { color?: string; size?: number }) => {
    return (
        <Svg width={size} height={size} viewBox="0 0 128 128">
            <Path fill="#F77E00" d="M116.46 3.96h-104c-4.42 0-8 3.58-8 8v104c0 4.42 3.58 8 8 8h104c4.42 0 8-3.58 8-8v-104c0-4.42-3.58-8-8-8z" />
            <Path fill="#FF9800" d="M110.16 3.96h-98.2a7.555 7.555 0 0 0-7.5 7.5v97.9c-.01 4.14 3.34 7.49 7.48 7.5h98.12c4.14.01 7.49-3.34 7.5-7.48V11.46c.09-4.05-3.13-7.41-7.18-7.5h-.22z" />
            <Path fill="#FFBD52" d="M40.16 12.86c0-2.3-1.6-3-10.8-2.7c-7.7.3-11.5 1.2-13.8 4s-2.9 8.5-3 15.3c0 4.8 0 9.3 2.5 9.3c3.4 0 3.4-7.9 6.2-12.3c5.4-8.7 18.9-10.6 18.9-13.6z" opacity=".75" />
            <Path fill="#FAFAFA" d="M54.46 91.96h-12c-1.1 0-2-.9-2-2v-52c0-1.1.9-2 2-2h12c1.1 0 2 .9 2 2v52a2 2 0 0 1-2 2zm32 0h-12c-1.1 0-2-.9-2-2v-52c0-1.1.9-2 2-2h12c1.1 0 2 .9 2 2v52a2 2 0 0 1-2 2z" />
        </Svg>
    );
};

export const VideoUnMuteIcon = ({ color, size = iconWidth }: { color?: string; size?: number }) => {
    return (
        <Svg width={size} height={size} viewBox="0 0 128 128">
            {/* Background */}
            <Path fill="#F77E00" d="M116.46 3.96h-104c-4.42 0-8 3.58-8 8v104c0 4.42 3.58 8 8 8h104c4.42 0 8-3.58 8-8v-104c0-4.42-3.58-8-8-8z" />
            <Path fill="#FF9800" d="M110.16 3.96h-98.2a7.555 7.555 0 0 0-7.5 7.5v97.9c-.01 4.14 3.34 7.49 7.48 7.5h98.12c4.14.01 7.49-3.34 7.5-7.48V11.46c.09-4.05-3.13-7.41-7.18-7.5h-.22z" />
            <Path fill="#FFBD52" d="M40.16 12.86c0-2.3-1.6-3-10.8-2.7c-7.7.3-11.5 1.2-13.8 4s-2.9 8.5-3 15.3c0 4.8 0 9.3 2.5 9.3c3.4 0 3.4-7.9 6.2-12.3c5.4-8.7 18.9-10.6 18.9-13.6z" opacity=".75" />

            {/* Speaker */}
            <Path
                fill="#FAFAFA"
                d="M45 54 L55 54 L68 44 L68 84 L55 74 L45 74 Z"
            />

            {/* Mute X */}
            <Line x1="74" y1="54" x2="90" y2="74" stroke="#FAFAFA" strokeWidth="6" strokeLinecap="round" />
            <Line x1="90" y1="54" x2="74" y2="74" stroke="#FAFAFA" strokeWidth="6" strokeLinecap="round" />
        </Svg>
    );
};

export const VideoMuteIcon = ({ color, size = iconWidth }: { color?: string; size?: number }) => {
    return (
        <Svg width={size} height={size} viewBox="0 0 128 128">
            {/* Background */}
            <Path fill="#F77E00" d="M116.46 3.96h-104c-4.42 0-8 3.58-8 8v104c0 4.42 3.58 8 8 8h104c4.42 0 8-3.58 8-8v-104c0-4.42-3.58-8-8-8z" />
            <Path fill="#FF9800" d="M110.16 3.96h-98.2a7.555 7.555 0 0 0-7.5 7.5v97.9c-.01 4.14 3.34 7.49 7.48 7.5h98.12c4.14.01 7.49-3.34 7.5-7.48V11.46c.09-4.05-3.13-7.41-7.18-7.5h-.22z" />
            <Path fill="#FFBD52" d="M40.16 12.86c0-2.3-1.6-3-10.8-2.7c-7.7.3-11.5 1.2-13.8 4s-2.9 8.5-3 15.3c0 4.8 0 9.3 2.5 9.3c3.4 0 3.4-7.9 6.2-12.3c5.4-8.7 18.9-10.6 18.9-13.6z" opacity=".75" />

            {/* Speaker */}
            <Path
                fill="#FAFAFA"
                d="M45 54 L55 54 L68 44 L68 84 L55 74 L45 74 Z"
            />

            {/* Sound waves */}
            <Path
                d="M74 58 Q82 64 74 70"
                stroke="#FAFAFA"
                strokeWidth="4"
                fill="none"
                strokeLinecap="round"
            />
            <Path
                d="M80 52 Q92 64 80 76"
                stroke="#FAFAFA"
                strokeWidth="4"
                fill="none"
                strokeLinecap="round"
            />
        </Svg>
    );
};