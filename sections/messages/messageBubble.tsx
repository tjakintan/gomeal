import React, { useState } from "react";
import { View } from "react-native";
import Svg, { Path } from "react-native-svg";

type MessageBubbleProps = {
    children?: React.ReactNode;
    isMe: boolean;
    backgroundColor: string;
    maxWidth: number;
    reply?: boolean;
};

export const MessageBubble = ({
    children,
    isMe,
    backgroundColor,
    maxWidth,
    reply,
}: MessageBubbleProps) => {

    return (
        <View style={{ alignSelf: isMe ? "flex-end" : "flex-start" }}>
            <View
                style={{
                    backgroundColor,
                    borderRadius: 20,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    maxWidth,
                }}
            >
                {children}
            </View>
            <Svg
                width={17}
                height={14}
                viewBox="0 0 22 18"
                style={{
                    position: "absolute",
                    bottom: -2,
                    ...(isMe ? { right: -4 } : { left: -4 }),
                }}
            >
                {isMe ? (
                    <Path
                        d="M0 0 C3 3 6 6 9 9 C12 12 15 14 19 16 C13 16 5 14 0 9 Z"
                        fill={backgroundColor}
                    />
                ) : (
                    <Path
                        d="M22 0 C19 3 16 6 13 9 C10 12 7 14 3 16 C9 16 17 14 22 9 Z"
                        fill={backgroundColor}
                    />
                )}
            </Svg>
        </View>
    );
};

export const ReplyBar = ({ color }: { color: string }) => (
    <View
        style={{
            width: 3,
            borderRadius: 2,
            backgroundColor: color,
            alignSelf: "stretch",
        }}
    />
);
