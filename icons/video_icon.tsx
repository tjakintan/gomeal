import Svg, { Path } from "react-native-svg";
import { _DEFAULT_ICON_WIDTH, _DEFAULT_ICON_HEIGHT } from "@/types/layout.types";

const iconHeight = _DEFAULT_ICON_HEIGHT;
const iconWidth = _DEFAULT_ICON_WIDTH;

export const VideoPlayIcon = ({
    color = "#000000",
    size = iconWidth,
}: {
    color?: string;
    size?: number;
}) => {
    return (
        <Svg
            width={size}
            height={size}
            viewBox="0 0 256 256"
            fill="none"
        >
            <Path
                fill={color}
                d="M240,128a15.74,15.74,0,0,1-7.6,13.51L88.32,229.65a16,16,0,0,1-16.2.3A15.86,15.86,0,0,1,64,216.13V39.87a15.86,15.86,0,0,1,8.12-13.82,16,16,0,0,1,16.2.3L232.4,114.49A15.74,15.74,0,0,1,240,128Z"
            />
        </Svg>
    );
};

export const VideoPauseIcon = ({
    color = "#000000",
    size = iconWidth,
}: {
    color?: string;
    size?: number;
}) => {
    return (
        <Svg
            width={size}
            height={size}
            viewBox="0 0 256 256"
            fill="none"
        >
            <Path
                fill={color}
                d="M216,48V208a16,16,0,0,1-16,16H160a16,16,0,0,1-16-16V48a16,16,0,0,1,16-16h40A16,16,0,0,1,216,48ZM96,32H56A16,16,0,0,0,40,48V208a16,16,0,0,0,16,16H96a16,16,0,0,0,16-16V48A16,16,0,0,0,96,32Z"
            />
        </Svg>
    );
};

export const VideoUnMuteIcon = ({
    color = "#000000",
    size = iconWidth,
}: {
    color?: string;
    size?: number;
}) => {
    return (
        <Svg
            width={size}
            height={size}
            viewBox="0 0 256 256"
            fill="none"
        >
            <Path
                fill={color}
                d="M168,32V224a8,8,0,0,1-12.91,6.31L85.25,176H40a16,16,0,0,1-16-16V96A16,16,0,0,1,40,80H85.25l69.84-54.31A8,8,0,0,1,168,32Zm32,64a8,8,0,0,0-8,8v48a8,8,0,0,0,16,0V104A8,8,0,0,0,200,96Zm32-16a8,8,0,0,0-8,8v80a8,8,0,0,0,16,0V88A8,8,0,0,0,232,80Z"
            />
        </Svg>
    );
};

export const VideoMuteIcon = ({
    color = "#000000",
    size = iconWidth,
}: {
    color?: string;
    size?: number;
}) => {
    return (
        <Svg
            width={size}
            height={size}
            viewBox="0 0 256 256"
            fill="none"
        >
            <Path
                fill={color}
                d="M221.92,210.62a8,8,0,1,1-11.84,10.76L168,175.09v48.6a8.29,8.29,0,0,1-3.91,7.18,8,8,0,0,1-9-.56L85.25,176H40a16,16,0,0,1-16-16V96A16,16,0,0,1,40,80H81.55L50.08,45.38A8,8,0,0,1,61.92,34.62ZM200.53,160a8.17,8.17,0,0,0,7.47-8.25V104.27A8.17,8.17,0,0,0,200.53,96a8,8,0,0,0-8.53,8v48A8,8,0,0,0,200.53,160ZM161,119.87a4,4,0,0,0,7-2.7V32.24a8.25,8.25,0,0,0-2.88-6.39,8,8,0,0,0-10-.16L111.83,59.33a4,4,0,0,0-.5,5.85ZM231.47,80A8.17,8.17,0,0,0,224,88.27v79.46a8.17,8.17,0,0,0,7.47,8.25,8,8,0,0,0,8.53-8V88A8,8,0,0,0,231.47,80Z"
            />
        </Svg>
    );
};