import { useState, useRef, useEffect } from "react";
import { useTheme } from "@/provider/ThemeProvider";
import Svg, { Path, Line } from "react-native-svg";
import { Button } from "@/components/ButtonComponent";
import { View, Text, Image, Dimensions, Animated, ScrollView, TouchableOpacity } from "react-native";
import { PostSectionInfoProps } from "@/types";
import * as ImagePicker from "expo-image-picker";
import { usePost } from "@/stores/usePost";
import GomealGlassView from "@/components/GlassComponent";
import { _DEFAULT_ICON_WIDTH, _DEFAULT_ICON_HEIGHT } from "@/types/layout.types";
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Reanimated, { useSharedValue, useAnimatedStyle, runOnJS, SharedValue} from 'react-native-reanimated';
import { 
    PepperIcon, 
    BurgerIcon, 
    PizzaIcon, 
    SushiIcon, 
    TacoIcon, 
    SaladIcon, 
    IceCreamIcon, 
    SteakIcon, 
    CookieIcon, 
} from "@/icons/EnhanceMediaIcons";
import { SpinningLogoImage } from "@/utils/Logo";

export type Sticker = {
    id: string;
    Component: React.ComponentType<{ color: string }>;
};

export const DraggableSticker: React.FC<{ sticker: Sticker; color: string; bounds: { width: number; height: number } }> = ({ bounds, sticker, color }) => {
    const x = useSharedValue(60);
    const y = useSharedValue(60);
    const offsetX = useSharedValue(60);
    const offsetY = useSharedValue(60);

    const scale = useSharedValue(1.8);
    const savedScale = useSharedValue(1.8);

    const gesture = Gesture.Pan()
        .manualActivation(true)
        .onTouchesMove((_e, state) => {
            state.activate();
        })
        .onStart(() => {
            offsetX.value = x.value;
            offsetY.value = y.value;
        })
        .onChange((e) => {
      const newX = offsetX.value + e.translationX;
      const newY = offsetY.value + e.translationY;

      x.value = Math.max(0, Math.min(newX, bounds.width - 50)); 
      y.value = Math.max(0, Math.min(newY, bounds.height - 50));
        });

    const pinchGesture = Gesture.Pinch()
        .onStart(() => {
            savedScale.value = scale.value;
        })
        .onUpdate((e) => {
            console.log("PINCH SCALE:", e.scale);
            scale.value = savedScale.value * e.scale;
        });

    const animStyle = useAnimatedStyle(() => ({
        position: 'absolute' as const,
        transform: [
            { translateX: x.value },
            { translateY: y.value },
            { scale: scale.value },
        ],
    }));

    const Icon = sticker.Component;
    const composedGesture = Gesture.Simultaneous(gesture, pinchGesture);
    
    return (
        <GestureDetector gesture={gesture}>
            <Reanimated.View style={animStyle}> 
                <Icon color={color} />
            </Reanimated.View>
        </GestureDetector>
    );
};


export const AddStickerPicker: React.FC<{color: string,  onSelect: (sticker: Sticker) => void; }> = ({ color, onSelect }) => {
    
    const { colors } = useTheme();
    
    return (
        <TouchableOpacity activeOpacity={1}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                    flexDirection: "row",
                    gap: 5,
                    paddingHorizontal: 8,
                    alignItems: "center",
                }}
            >
                {[
                    { id: "pepper", Component: PepperIcon },
                    { id: "burger", Component: BurgerIcon },
                    { id: "pizza", Component: PizzaIcon },
                    { id: "sushi", Component: SushiIcon },
                    { id: "taco", Component: TacoIcon },
                    { id: "salad", Component: SaladIcon },
                    { id: "iceCream", Component: IceCreamIcon },
                    { id: "steak", Component: SteakIcon },
                    { id: "cookie", Component: CookieIcon },
                ].map((sticker) => {
                    const StickerComponent = sticker.Component;
                    return (
                        <Button
                            key={sticker.id}
                            onPress={() => onSelect(sticker)}
                            style={{
                                width: 60,
                                height: 60,
                                borderRadius: 999,
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                            background={false}
                        >
                            <StickerComponent color={color} />
                        </Button>
                    );
                })}
            </ScrollView>
        </TouchableOpacity>
    );
};

export const EditVideoLengthTen: React.FC<{ uri: string; onDone: (newUri: string) => void }> = ({ uri, onDone }) =>{

    return (
        <View className="bg-orange-300 p-5">
            
        </View>
    );

};