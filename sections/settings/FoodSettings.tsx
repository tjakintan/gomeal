import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useSettingsStore } from "@/stores/useSettings";
import { useTheme } from "@/provider/ThemeProvider";
import { CheckButton } from "@/components/ButtonComponent";
import { Input } from "@/components/InputComponent";
import { DietaryData, dietaryDescriptions, dietaryIcons } from "@/types";
import React from "react";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { SectionHeader } from "@/components/SectionComponent";

const diets = Object.keys(dietaryDescriptions) as Array<keyof DietaryData>;

const FoodSettings: React.FC = () => {
  
    const { colors, textStyles } = useTheme();

    const updateFood = useSettingsStore((state) => state.updateFood);
    const food = useSettingsStore((state) => state.settings.food);

    const updateDiet = (key: keyof DietaryData, value: boolean) => {
        updateFood({
            diets: {
                ...food.diets,
                [key]: value,
            },
        });
    };
    
    const updateCalories = (key: "min" | "max", value: string) => {
        const parsed = value.trim() === "" ? null : Number(value);

        updateFood({
            calorieRange: {
                ...food.calorieRange,
                [key]: Number.isNaN(parsed) ? null : parsed,
            },
        });
    };

    return (
        <KeyboardAwareScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
                width: "100%",
                gap: 4,
                padding: 4,
            }}
            extraScrollHeight={0}
        >

            {/* diets */}
            <View className="p-5 gap-3 overflow-hidden">

                <SectionHeader
                    title="Dietary"
                    showDivider
                    titleClassName={textStyles.section}
                />  

                <View className="gap-1">
                    {diets.map((key) => {
                        const checked = food.diets[key] === true;

                        return (
                        <TouchableOpacity
                            key={key}
                            activeOpacity={1}
                            style={{
                                minHeight: 55,
                                paddingVertical: 8,
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 12,
                            }}
                        >
                            <View className="flex-row items-center gap-2">
                                {dietaryIcons[key] ? (
                                    React.createElement(dietaryIcons[key], {
                                        size: 24,
                                        color: colors.text,
                                    })
                                ) : null}

                                <Text className={textStyles.body}>
                                    {key.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                                </Text>
                            </View>
                            
                            <CheckButton
                                value={checked}
                                onChange={(v) => updateDiet(key, v)}
                            />

                        </TouchableOpacity>
                        );
                    })}
                </View>

                <Text className={textStyles.small}>
                    Choose the dietary preferences used to personalize your recipe feed.
                </Text>

            </View>

            {/* calories */}
            <View className="p-5 gap-3 overflow-hidden">

                <SectionHeader
                    title="Calories"
                    showDivider
                    titleClassName={textStyles.section}
                /> 

                <View
                    style={{
                        flexDirection: "row",
                        justifyContent: "flex-start",
                        gap: 15,
                    }}
                >

                    <View>
                        <Text className={textStyles.caption}>
                            Min:
                        </Text>
                        <Input
                            value={
                                food.calorieRange.min == null
                                ? ""
                                : String(food.calorieRange.min)
                            }
                            onChangeText={(v) => updateCalories("min", v)}
                            keyboardType="number-pad"
                            placeholder="300"
                            multiline={false}
                            style={{ fontSize: 15 }}
                            containerStyle={{
                                width: 75,
                            }}
                            disabled={false}
                        />
                    </View>

                    <View>
                        <Text className={textStyles.caption}>
                            Max:
                        </Text>
                        <Input
                            value={
                                food.calorieRange.max == null
                                ? ""
                                : String(food.calorieRange.max)
                            }
                            onChangeText={(v) => updateCalories("max", v)}
                            keyboardType="number-pad"
                            placeholder="2500"
                            multiline={false}
                            style={{ fontSize: 15 }}
                            containerStyle={{
                                width: 75,
                            }}
                            disabled={false}
                        />
                    </View>

                </View>

                <Text className={textStyles.small}>
                    Set a calorie range for recipes shown in your feed.
                </Text>

            </View>

        </KeyboardAwareScrollView>
    );
};

export default FoodSettings;
