import React from "react";

import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from "react-native";

import {
    HighProteinIcon,
    SoupIcon,
    AppetizerIcon,
    DessertIcon,
    FiveSecondsIcon,
    BreakfastIcon,
    LunchIcon,
    DinnerIcon,
    VegetarianIcon,
    VeganIcon,
    LowCarbIcon,
    HealthyIcon,
    MealPrepIcon,
    ComfortFoodIcon,
    FamilyFriendlyIcon,
    BudgetIcon,
    HighFiberIcon,
} from "@/icons/feed_bar_icons";

import { useTheme } from "@/provider/ThemeProvider";
import { Button } from "@/components/ButtonComponent";
import { useFeed } from "@/stores/useFeed";
import { FeedScopeType } from "@/types/feed.types";
import { GradientHeader } from "@/components/GradientComponent";
import { ACCENT_COLORS } from "@/types";
import { usePostHog } from "posthog-react-native";

type FeedItem = {
    key: FeedScopeType;
    label: string;
    onPress: () => void;
    icon: React.ReactNode;
};

const FeedBar: React.FC = () => {

    const posthog = usePostHog();
    const { colors, textStyles } = useTheme();
    const { selectedScope, setSelectedScope, loadFeed } = useFeed();

    const handleScopePress = async (scope: FeedScopeType) => {
        const nextScope: FeedScopeType | null = selectedScope === scope ? null : scope;
        posthog.capture("[Feed] => scope_selected", { scope: nextScope });
        setSelectedScope(nextScope);
        await loadFeed(undefined, nextScope, false, true);
    };

    const feedItems: FeedItem[] = [
        {
            key: "high_protein",
            label: "Protein",
            onPress: () => handleScopePress("high_protein"),
            icon: <HighProteinIcon size={40} />,
        },
        {
            key: "soup",
            label: "Soup",
            onPress: () => handleScopePress("soup"),
            icon: <SoupIcon size={40} />,
        },
        {
            key: "appetizer",
            label: "Snack",
            onPress: () => handleScopePress("appetizer"),
            icon: <AppetizerIcon size={40} />,
        },
        {
            key: "dessert",
            label: "Dessert",
            onPress: () => handleScopePress("dessert"),
            icon: <DessertIcon size={40} />,
        },
        {
            key: "quick",
            label: "Quick",
            onPress: () => handleScopePress("quick"),
            icon: <FiveSecondsIcon size={40} color={colors.text} />,
        },
        {
            key: "breakfast",
            label: "Breakfast",
            onPress: () => handleScopePress("breakfast"),
            icon: <BreakfastIcon size={40} />,
        },
        {
            key: "lunch",
            label: "Lunch",
            onPress: () => handleScopePress("lunch"),
            icon: <LunchIcon size={40} />,
        },
        {
            key: "dinner",
            label: "Dinner",
            onPress: () => handleScopePress("dinner"),
            icon: <DinnerIcon size={40} />,
        },
        {
            key: "vegetarian",
            label: "Vegetarian",
            onPress: () => handleScopePress("vegetarian"),
            icon: <VegetarianIcon size={40} />,
        },
        {
            key: "vegan",
            label: "Vegan",
            onPress: () => handleScopePress("vegan"),
            icon: <VeganIcon size={40} />,
        },
        {
            key: "low_carb",
            label: "Low Carb",
            onPress: () => handleScopePress("low_carb"),
            icon: <LowCarbIcon size={40} />,
        },
        {
            key: "healthy",
            label: "Healthy",
            onPress: () => handleScopePress("healthy"),
            icon: <HealthyIcon size={40} />,
        },
        {
            key: "meal_prep",
            label: "Meal Prep",
            onPress: () => handleScopePress("meal_prep"),
            icon: <MealPrepIcon size={40} />,
        },
        {
            key: "comfort_food",
            label: "Comfort",
            onPress: () => handleScopePress("comfort_food"),
            icon: <ComfortFoodIcon size={40} />,
        },
        {
            key: "family_friendly",
            label: "Family",
            onPress: () => handleScopePress("family_friendly"),
            icon: <FamilyFriendlyIcon size={40} />,
        },
        {
            key: "budget",
            label: "Budget",
            onPress: () => handleScopePress("budget"),
            icon: <BudgetIcon size={40} />,
        },
        {
            key: "high_fiber",
            label: "Fiber",
            onPress: () => handleScopePress("high_fiber"),
            icon: <HighFiberIcon size={40} />,
        },
    ];

    return (
        <GradientHeader
            baseColor={colors.background}
            contentStyle={{
                flex: 1,
                flexDirection: "row",
                justifyContent: "center"
            }}
        >
        
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{
                    flex: 1,
                    width: "100%",
                }}
                contentContainerStyle={{
                    paddingVertical: 5,
                    paddingHorizontal: 10,
                    alignItems: "flex-start",
                    gap: 5,
                }}
            >
                {feedItems.map((item) => {
                    const isActive = selectedScope === item.key;

                    return (
                        <TouchableOpacity
                            key={item.key}
                            activeOpacity={0.7}
                            style={{
                                overflow: "hidden",
                                alignItems: "center",
                                flexDirection: "column",
                            }}
                        >
                            <Button
                                onPress={item.onPress}
                                style={{
                                    alignItems: "center",
                                    justifyContent: "center",
                                    height: 60,
                                    width: 60,
                                    borderRadius: 50,
                                    backgroundColor: isActive ? ACCENT_COLORS.purple : "transparent",
                                }}
                            >
                                <View
                                    style={{
                                        transform: [{ rotate: isActive ? "30deg" : "0deg" }],
                                    }}
                                >
                                    {item.icon}
                                </View>
                            </Button>

                            <Text
                                numberOfLines={1}
                                className={textStyles.body}
                                style={{
                                color: colors.buttonSecondary,
                                fontSize: 10,
                                lineHeight: 12,
                                textAlign: "center",
                                }}
                            >
                                {item.label}
                            </Text>

                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

        </GradientHeader>
    );
};

export default FeedBar