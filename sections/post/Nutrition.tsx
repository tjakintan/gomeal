import { View, Text, ScrollView, Image } from "react-native";
import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/provider/ThemeProvider";
import { NutritionServingsButton } from "@/components/ButtonComponent";
import { calculateNutrition } from "@/api/post.api";
import { usePostIngredient, usePostNutrition } from "@/stores/usePost";
import { ServingsIcon } from "@/icons/Icon";
import { NutritionData, PostSectionInfoProps, Unit, nutrients_label_icon } from "@/types";
import { SectionHeader } from "@/components/SectionComponent";

const Nutrition: React.FC<PostSectionInfoProps> = ({
    isFocused,
    onCompleteChange,
}) => {

    const { colors, textStyles } = useTheme();
    const { ingredients } = usePostIngredient();
    const { servings, setServings, getPercents, reset_nutrition } = usePostNutrition();

    const { data } = useQuery({
        queryKey: ['nutrition', JSON.stringify(ingredients)],
        queryFn: async () => {
            const results = await Promise.all(
                ingredients.map((ing) => calculateNutrition(ing.name, Number(ing.quantity), ing.unit as Unit))
            );
            return results.filter((n): n is NutritionData => n !== null && n.per_serving.calories > 0);
        },
        enabled: ingredients.length > 0 && ingredients.every(ing => ing.name && ing.quantity),
    });

    return (
        <View className="flex-1 flex-col p-2 gap-1 justify-start">

            <SectionHeader
                title="Nutrition"
                subtitle="Total Nutritional value."
                showDivider
            />

            <View style={{flex: 1}} className="flex-row p-1">
                <ScrollView 
                    contentContainerClassName="gap-1 p-1 items-center justify-between"
                    showsVerticalScrollIndicator={false}
                >

                    {nutrients_label_icon.map(({ key, label, icon: Icon, color }) => {
                        const percents = getPercents(data ?? []);
                        const percent = percents[key] ?? 0;

                        return (
                            <View key={key}className="w-full flex-row items-center gap-5 p-1">

                                <View style={{width: 40, height: 40, borderRadius: 5, backgroundColor: colors.background, borderColor: colors.secondaryCard, borderWidth: 1}} className="items-center justify-center">
                                    <Icon size={30} color={colors.text}/>
                                </View>

                                <View style={{flex: 1}} className="gap-2">

                                    <View className="flex-row justify-between">
                                        <Text className={textStyles.sectionText}>{label}:</Text>
                                        <Text className={textStyles.caption}>{percent.toFixed(0)}%</Text>
                                    </View>

                                    <View 
                                        style={{
                                            width: '100%',
                                            height: 10,
                                            backgroundColor: colors.secondaryCard,
                                            borderRadius: 5,
                                            overflow: 'hidden'
                                        }}
                                    >
                                        <View 
                                            style={{
                                                width: `${Math.round(percent)}%`,
                                                height: '100%',
                                                backgroundColor: color,
                                            }} 
                                        />
                                    </View>
                                </View>

                            </View>
                        );

                    })}

                </ScrollView>

                <View style={{width: 100}} className="p-1 gap-5 items-center justify-center flex-col">
                    <ServingsIcon />
                    <NutritionServingsButton value={servings} onChange={setServings} />
                </View>

            </View>

        </View>
    )
}

export default Nutrition;