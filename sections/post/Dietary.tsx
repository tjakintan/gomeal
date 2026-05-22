import { View, Text, ScrollView, Image, TouchableOpacity } from "react-native";
import { useState, useEffect } from "react";
import { useTheme } from "@/provider/ThemeProvider";
import { usePostDietary } from "@/stores/usePost";
import { ToggleButton } from "@/components/ButtonComponent";
import { Input } from "@/components/InputComponent";
import { PostSectionInfoProps } from "@/types";
import { dietaryDescriptions, dietaryIcons } from "@/types";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { SectionHeader } from "@/components/SectionComponent";

const diets = Object.keys(dietaryDescriptions) as (keyof typeof dietaryDescriptions)[];

const Dietary: React.FC<PostSectionInfoProps> = ({
    isFocused,
    onCompleteChange,
}) => {

    const { colors, textStyles } = useTheme();
    const { dietary, toggleDiet, setOther } = usePostDietary();
    
    return (
        <View className="flex-1 flex-col p-2 gap-1">

            <SectionHeader
                title="Dietary"
                subtitle="Check appropriate boxes."
                showDivider
            />
            
            <ScrollView
                showsVerticalScrollIndicator={false}
            >
                {diets.map((key, index) => {
                    const isOther = key === "other";
                    const active = !isOther && !!dietary[key as keyof typeof dietary];
                    const Icon = dietaryIcons[key];

                    return (    
                        <TouchableOpacity key={key} activeOpacity={1} style={{flex: 1, padding: 15, gap: 20 }}>   
                            <View
                                style={ {
                                    height: 90,
                                    borderRadius: 15,
                                }}
                                className="p-2"
                            >
                                <View className="flex-1 gap-1 flex-row justify-between items-center">
                                    <View className="flex-row gap-2 items-center">
                                        {Icon && <Icon size={28} color={colors.text} />}
                                        <Text className={textStyles.section}>{key.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}</Text>
                                    </View>
                                    <View style={{ flex: 1 }} className="items-end">
                                        {!isOther ? (
                                            <ToggleButton
                                                value={active}
                                                onChange={() => toggleDiet(key as any)}
                                            />
                                        ) : (
                                            <Input
                                                value={dietary.other ?? ""}
                                                onChangeText={setOther}
                                                style={{ textAlign: "right" }}
                                            />
                                        )}
                                    </View>
                                </View>
                                <View className="flex-row items-center">
                                    <Text className={textStyles.small}>{dietaryDescriptions[key]}</Text>
                                </View>
                            </View>
                        </TouchableOpacity>     
                    );
                })}
            </ScrollView>
        </View>
    );
};

export default Dietary;