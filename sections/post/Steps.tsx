import { View, Text, ScrollView, Pressable, Image, TouchableOpacity } from "react-native";
import { useRef, useState, useEffect } from "react";
import { useTheme } from "@/provider/ThemeProvider";
import { usePostSteps } from "@/stores/usePost";
import { Button } from "@/components/ButtonComponent";
import { EmptyBoxIcon, AddStepIcon, GalleryIcon, CameraIcon, TimerIcon } from "@/icons/Icon";
import { Input } from "@/components/InputComponent";
import { PostSectionInfoProps } from "@/types";
import { useTimer, formatTimer } from "@/stores/useTimer";
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Media } from "@/media/media";
import { SectionHeader } from "@/components/SectionComponent";

const Steps: React.FC<PostSectionInfoProps> = ({
    isFocused,
    onMediaSelected,
    stepIndex,
    onCompleteChange,
}: PostSectionInfoProps) => {

    const {
        steps,
        addStep,
        updateStep,
        removeStep,
        clearSteps,
    } = usePostSteps();

    const { openTimer } = useTimer();

    const { colors, textStyles } = useTheme();

    return (

        <>
        
            <View className="flex-1 p-2 flex-col justify-start">

                <SectionHeader
                    title="Steps"
                    subtitle="Click the empty box to start."
                    showDivider
                />

                {/* Steps list */}
                <View style={{flex: 1, margin: 1}} className="justify-end">

                    {steps.length == 0 ? (
                        <View className="flex-1 items-center justify-center">
                            <Button onPress={() => {addStep()}}>
                                <EmptyBoxIcon color={colors.text} size={70} />
                            </Button>
                        </View>
                    ) : (
                        <KeyboardAwareScrollView  
                            contentContainerStyle={{ paddingHorizontal: 10, }}
                            enableResetScrollToCoords={false}  
                            showsVerticalScrollIndicator={false}
                            extraScrollHeight={-70} 
                        >
                            {[...steps].reverse().map((step, reverse_index) => {

                                const index = steps.length - 1 - reverse_index;

                                return (
                                    <TouchableOpacity key={step.id} activeOpacity={1} style={{gap: 10}}>
                                        <View
                                            style={{
                                                minHeight: 150,
                                                borderRadius: 15,
                                            }}
                                            className="items-center"
                                        >

                                            {/* Input Row */}
                                            <View className="flex-1 flex-row items-center">

                                                {/* Step number */}
                                                <Text className={`mx-3 ${textStyles.h1}`} >
                                                    {step.step_number}
                                                </Text>

                                                {/* Description input */}
                                                <View style={{flex: 1}} className="">
                                                    <Input
                                                        value={step.description}
                                                        onChangeText={(val) => updateStep(index, "description", val)}
                                                        placeholder={step.step_number === 1 ? "What did you do first ?" : ""}
                                                        placeholderTextColor={colors.buttonSecondary}
                                                        multiline={false}
                                                    />
                                                </View>

                                            </View>

                                            {/* Function Row */}
                                            <View className="flex-row px-5 items-center">

                                                {/* add step */}
                                                <View className="justify-center">
                                                    {index === steps.length - 1 && steps.length < 10 && (
                                                        <Button
                                                            onPress={() => addStep()}
                                                            style={{height: "auto", width: 85}}
                                                            background
                                                        >
                                                            <Text className={textStyles.bodyMedium}>
                                                                + add step
                                                            </Text>
                                                        </Button>
                                                    )}
                                                </View>

                                                {/* step addition functions */}
                                                <View style={{flex: 1}} className="">

                                                    <ScrollView
                                                        horizontal
                                                        showsHorizontalScrollIndicator={false}
                                                        contentContainerStyle={{padding: 15}}
                                                        contentContainerClassName="gap-3 justify-center items-center flex-row"
                                                    >

                                                        {/* timer*/}
                                                        <View className="">

                                                            {step.timer ? (
                                                                <Button
                                                                    onPress={() => openTimer(step.timer, index)}
                                                                    onLongPress={() => { updateStep(index, "timer", null);}}
                                                                    delayLongPress={400}
                                                                    style={{height: "auto"}}
                                                                    background={false}
                                                                >
                                                                    <Text className={textStyles.h3}>{formatTimer(step.timer)}</Text>
                                                                </Button>
                                                            ) : (
                                                                <Button onPress={() => openTimer(null, index)}>
                                                                    <TimerIcon color={colors.text} />
                                                                </Button>
                                                            )}

                                                        </View>

                                                        {/* image */}
                                                        <View className="">

                                                            {step.image_url ? (
                                                                <Button 
                                                                    onPress={() => onMediaSelected?.("", "step_image", index)}
                                                                    onLongPress={() => updateStep(index, "image_url", "")}
                                                                    delayLongPress={400}
                                                                >
                                                                    <Media
                                                                        uri={step.image_url}
                                                                        mediaType="image"
                                                                        style={{ width: 40, height: 40, borderRadius: 8 }}
                                                                    />
                                                                </Button>                                                
                                                            ) : (
                                                                <Button
                                                                    onPress={() => onMediaSelected?.("", "step_image", index)}
                                                                >
                                                                    <CameraIcon color={colors.text} />
                                                                </Button>
                                                            )}

                                                        </View>

                                                    </ScrollView>

                                                </View>

                                                {/* remove step */}
                                                <View className="justify-center">
                                                    <Button
                                                        onPress={() => removeStep(index)}
                                                        style={{height: "auto"}}
                                                        background={false}
                                                    >
                                                        <Text className={textStyles.caption} style={{color: colors.danger}}>
                                                            - remove 
                                                        </Text>
                                                    </Button>
                                                </View>

                                            </View>

                                        </View>
                                    </TouchableOpacity>
                                )
                            })}
                        </KeyboardAwareScrollView>
                    )}

                </View>

            </View>

        </>
    );
};

export default Steps;