import { useState, useRef, useEffect } from "react";
import { useTheme } from "@/provider/ThemeProvider";
import { Button } from "@/components/ButtonComponent";
import { View, Text, Image, Dimensions, Animated, StyleSheet } from "react-native";
import { usePost } from "@/stores/usePost";
import {
    EditVideoIcon,
    AddStickerIcon,
    CheckIcon,
    UndoIcon,
    XIcon
} from "@/icons/Icon";
import ViewShot from "react-native-view-shot";
import { DraggableSticker, AddStickerPicker, Sticker, EditVideoLengthTen } from "./EnhanceMediaFunc";
import { MediaType } from "@/types";
import { Media } from "@/media/media";

const DishEnhanceMedia: React.FC<{ uri: string | null, mediaType: MediaType, onClose: () => void, onEnhanceDone: (enhancedUri: string) => void; }> = ({ uri, mediaType, onClose, onEnhanceDone }) => {
    
    const { colors, textStyles } = useTheme("dark");
    const viewShotRef = useRef<ViewShot>(null);

    const [stickers, setStickers] = useState<Sticker[]>([]);
    const [activeOption, setActiveOption] = useState<string | null>(null);
    const [bounds, setBounds] = useState<{ width: number; height: number }>();

    const removeMedia = () => {
        onClose();
    };

    const setEnhancedMedia = async () => {
        try {
            if (mediaType === "video") {
                if (!uri) return;
                onEnhanceDone(uri);
                onClose();
                return;
            }
            const capturedUri = await (viewShotRef.current as any).capture();
            if (!capturedUri) return;

            const fileUri = capturedUri.startsWith("file://") ? capturedUri : `file://${capturedUri}`;

            onEnhanceDone(fileUri);
            onClose();
            
        } catch (e) {
            console.log("Capture failed", e);
        }
    };

    const undoEnhancedFeature = () => {
        setStickers((prev) => prev.slice(0, -1));
    };

    const enhanceOptions = [
        {
            id: "sticker_func",
            func_name: "stickers",
            func_icon: AddStickerIcon,
            renderSection: () => (
                <AddStickerPicker
                    color={colors.text}
                    onSelect={(sticker) => {setStickers((prev) => [...prev, sticker])}}
                />
            ),
        },
        {
            id: "edit_video_length_10",
            func_name: "edit",
            func_icon: EditVideoIcon,
            renderSection: () => uri ? (
                <EditVideoLengthTen
                    uri={uri}
                    onDone={(newUri) => {
                    //
                    setActiveOption(null);
                }}
                />
            ) : null,
        }
    ];

    const selectedOption = enhanceOptions.find((opt) => opt.id === activeOption); 

    return (

            <View style={{ padding: 10, gap: 10, justifyContent: "center", alignItems: "center"}}>

                {/* remove and set media section */}
                <View className="w-full gap-5 flex-row items-center justify-start">

                    <Button onPress={removeMedia} background>
                        <XIcon color={colors.text} />
                    </Button>

                    {/*
                    <Button onPress={undoEnhancedFeature} background>
                        <UndoIcon color={colors.text} />
                    </Button>
                    */}
                        
                    <Button onPress={setEnhancedMedia} background>
                        <CheckIcon color={colors.text} />
                    </Button>

                </View>

                {/* image render section */}
                <View 
                    style={{
                        height: 250,
                        width: 350,
                        padding: 5,
                        borderWidth: 1,
                        borderStyle: "dashed",
                        borderColor: colors.text,
                    }} 
                >
                    <ViewShot
                        ref={viewShotRef}
                        options={{ format: "png", quality: 1 }}
                        style={{
                            flex: 1
                        }}
                    >
                        {/* IMAGE */}
                        {uri && (
                            <Media
                                uri={uri}
                                mediaType={mediaType}
                                style={{flex: 1, width: "100%"}}
                                disableInteraction
                                autoPlay
                            />
                        )}

                        {/* STICKER LAYER — inside ViewShot */}
                        <View 
                            style={{...StyleSheet.absoluteFillObject, overflow: "hidden"}} 
                            onLayout={(event) => {
                                const { width, height } = event.nativeEvent.layout;
                                setBounds({ width, height });
                            }}
                            pointerEvents="box-none"
                        >
                            {bounds && stickers.map((sticker, index) => (
                                <DraggableSticker
                                    key={index}
                                    sticker={sticker}
                                    color={colors.text}
                                    bounds={bounds}
                                />
                            ))}
                        </View>

                    </ViewShot>

                </View>

                {/* menu options to enhance media 
                <View className="w-full flex-col items-start justify-start">

                    {selectedOption && (
                        <View className="w-full">
                            {selectedOption.renderSection()}
                        </View>
                    )}

                    <View className="w-full gap-5 flex-row">
                        {enhanceOptions.map((option, index) => {
                            const Icon = option.func_icon;
                            const isDisabledIcon = option.id === "edit_video_length_10" ||mediaType === "video"
                            return (
                                <Animated.View
                                    key={index}
                                        style={{
                                            opacity: isDisabledIcon ? 0.4 : 1, 
                                            gap: 5,
                                        }}
                                    >
                                        <Button
                                            disabled={isDisabledIcon} 
                                            onPress={() => {
                                                if (!isDisabledIcon) {
                                                    setActiveOption((prev) =>
                                                        prev === option.id ? null : option.id
                                                    );
                                                }
                                            }}
                                            background
                                        >
                                            <Icon color={isDisabledIcon ? "#999" : colors.text} />
                                        </Button>

                                        <Text
                                            className={textStyles.caption}
                                            style={{ opacity: isDisabledIcon ? 0.5 : 1 }}
                                        >
                                            {option.func_name}
                                        </Text>
                                </Animated.View>
                            );
                        })}
                    </View>

                </View>
                */}

            </View>

    );
};

export default DishEnhanceMedia;
