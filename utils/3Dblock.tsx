import React from "react";
import Svg, { Rect, Path, Defs, LinearGradient, Stop } from "react-native-svg";

interface Block3DProps {
    width?: number;
    height?: number;
    depth?: number;
    color?: string;
    taperLeft?: number;  
    taperRight?: number;
}

const Block3D = ({ width = 100, height = 100, depth = 10, taperLeft = 20, taperRight = 20, color = "#4A5A8A" }: Block3DProps) => {

    const dark = shadeColor(color, -50);
    const top = shadeColor(color, +0);

    const topFace = `M${taperLeft},0 L${width - taperRight},0 L${width},${depth} L0,${depth} Z`;

    return (
        <Svg
            width={width}
            height={height + depth}
            viewBox={`0 0 ${width} ${height + depth}`}
        >
            <Defs>
                <LinearGradient id="front" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor={color} />
                    <Stop offset="100%" stopColor={dark} />
                </LinearGradient>
                <LinearGradient id="top" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor={top} />
                    <Stop offset="100%" stopColor={color} />
                </LinearGradient>
            </Defs>

            {/* Trapezoid top cap */}
            <Path d={topFace} fill={`url(#top)`} />

            {/* Front face */}
            <Rect x={0} y={depth} width={width} height={height} fill={`url(#front)`} />
        </Svg>
    );
};

function shadeColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

export default Block3D;
