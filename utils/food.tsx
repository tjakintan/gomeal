import React from "react";
import { View, Text } from "react-native";
import { useTheme } from "@/provider/ThemeProvider";
import { DietaryData, DishInfoData, NutritionData, dietaryDescriptions, dietaryIcons, difficultyColors, nutrients_label_icon } from "@/types";
import { usePostNutrition } from "@/stores/usePost";
import { capitalize } from "./text";

type Props = {
    nutrition: NutritionData[];
    dark?: boolean;
};

export const NutritionRender: React.FC<Props> = ({
    nutrition,
    dark
}) => {
    const { colors, textStyles } = useTheme(dark ? "dark" : undefined);
    const { getPercents } = usePostNutrition();

    const perServing = nutrition?.[0];

    const percents = getPercents(
        perServing?.per_serving?.calories > 0
            ? [
                  {
                      per_serving: perServing.per_serving,
                      servings: 1,
                  },
              ]
            : []
    );

    if (!perServing) return null;

    return (
        <View
            style={{
                gap: 15,
            }}
        >
            <View
                style={{
                    borderRadius: 20,
                    borderWidth: 2,
                    borderColor: colors.secondaryCard,
                    overflow: "hidden",
                    backgroundColor: colors.background,
                }}
            >
                <View
                    style={{
                        padding: 15,
                        alignItems: "center",
                        borderBottomWidth: 1,
                        borderBottomColor: colors.secondaryCard,
                    }}
                >
                    <Text
                        style={{
                            fontSize: 36,
                            fontWeight: "700",
                            color: colors.text,
                        }}
                    >
                        {Math.round(
                            perServing.per_serving.calories ?? 0
                        )}
                    </Text>

                    <Text
                        className={textStyles.caption}
                        style={{
                            color: colors.secondaryText,
                        }}
                    >
                        Calories Per Serving
                    </Text>
                </View>

                <View
                    style={{
                        padding: 15,
                        gap: 14,
                    }}
                >
                    {nutrients_label_icon.map(
                        ({
                            key,
                            label,
                            icon: Icon,
                            color,
                        }) => {
                            const percent =
                                percents[key] ?? 0;

                            return (
                                <View
                                    key={key}
                                    style={{
                                        gap: 6,
                                    }}
                                >
                                    <View
                                        style={{
                                            flexDirection:
                                                "row",
                                            alignItems:
                                                "center",
                                            gap: 10,
                                        }}
                                    >
                                        <View
                                            style={{
                                                width: 34,
                                                height: 34,
                                                borderRadius: 10,
                                                borderWidth: 1,
                                                borderColor:
                                                    colors.secondaryCard,
                                                justifyContent:
                                                    "center",
                                                alignItems:
                                                    "center",
                                            }}
                                        >
                                            <Icon
                                                size={20}
                                                color={
                                                    colors.text
                                                }
                                            />
                                        </View>

                                        <Text
                                            className={
                                                textStyles.bodyMedium
                                            }
                                            style={{
                                                flex: 1,
                                                color: colors.text,
                                            }}
                                        >
                                            {label}
                                        </Text>

                                        <View
                                            style={{
                                                paddingHorizontal: 10,
                                                paddingVertical: 4,
                                                borderRadius: 999,
                                                backgroundColor:
                                                    color,
                                            }}
                                        >
                                            <Text
                                                style={{
                                                    fontSize: 11,
                                                    fontWeight:
                                                        "700",
                                                    color: "white",
                                                }}
                                            >
                                                {percent.toFixed(
                                                    0
                                                )}
                                                %
                                            </Text>
                                        </View>
                                    </View>

                                    <View
                                        style={{
                                            height: 8,
                                            borderRadius: 999,
                                            backgroundColor:
                                                colors.secondaryCard,
                                            overflow:
                                                "hidden",
                                        }}
                                    >
                                        <View
                                            style={{
                                                width: `${Math.min(
                                                    percent,
                                                    100
                                                )}%`,
                                                height:
                                                    "100%",
                                                backgroundColor:
                                                    color,
                                            }}
                                        />
                                    </View>
                                </View>
                            );
                        }
                    )}
                </View>
            </View>
        </View>
    );
};

type DietaryProps = {
    dietary: DietaryData | DietaryData[];
    dark?: boolean;
};

export const DietaryRender: React.FC<DietaryProps> = ({ dietary, dark }) => {
    const { colors, textStyles } = useTheme(dark ? "dark" : undefined);

    const data = Array.isArray(dietary) ? dietary[0] : dietary;

    if (!data) return null;

    const activeKeys = (
        Object.keys(dietaryDescriptions) as (keyof typeof dietaryDescriptions)[]
    ).filter((key) => key !== "other" && !!data[key]);

    const otherText = data.other?.trim();

    if (!activeKeys.length && !otherText) return null;

    return (
        <View style={{ gap: 15 }}>
            <View
                style={{
                    borderRadius: 20,
                    borderWidth: 2,
                    borderColor: colors.secondaryCard,
                    overflow: "hidden",
                    backgroundColor: colors.background,
                }}
            >
                {!!activeKeys.length && (
                    <View style={{ padding: 15, gap: 14 }}>
                        {activeKeys.map((key) => {
                            const Icon = dietaryIcons[key];
                            const label = key
                                .split("_")
                                .map(capitalize)
                                .join(" ");
                            const description = dietaryDescriptions[key];

                            return (
                                <View
                                    key={key}
                                    style={{
                                        flexDirection: "row",
                                        alignItems: "center",
                                        gap: 10,
                                    }}
                                >
                                    <View
                                        style={{
                                            width: 34,
                                            height: 34,
                                            borderRadius: 10,
                                            borderWidth: 1,
                                            borderColor: colors.secondaryCard,
                                            justifyContent: "center",
                                            alignItems: "center",
                                        }}
                                    >
                                        {Icon ? (
                                            <Icon size={20} color={colors.text} />
                                        ) : null}
                                    </View>

                                    <View style={{ flex: 1, gap: 2 }}>
                                        <Text
                                            className={textStyles.bodyMedium}
                                            style={{ color: colors.text }}
                                        >
                                            {label}
                                        </Text>
                                        <Text
                                            className={textStyles.body}
                                            style={{ color: colors.secondaryText }}
                                        >
                                            {description}
                                        </Text>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}

                {!!otherText && (
                    <View
                        style={{
                            padding: 15,
                            borderTopWidth: activeKeys.length ? 1 : 0,
                            borderTopColor: colors.secondaryCard,
                            gap: 4,
                        }}
                    >
                        <Text
                            className={textStyles.bodyMedium}
                            style={{ color: colors.text }}
                        >
                            Other
                        </Text>
                        <Text
                            className={textStyles.caption}
                            style={{ color: colors.secondaryText }}
                        >
                            {otherText}
                        </Text>
                    </View>
                )}
            </View>
        </View>
    );
};

export const DifficultyRender: React.FC<{
    difficulty: DishInfoData["dish_difficulty"];
    dark?: boolean;
}> = ({ difficulty, dark }) => {
    const { colors, textStyles } = useTheme(dark ? "dark" : undefined);

    if (!difficulty) return null;

    return (
        <View style={{ gap: 15 }}>
            <View
                style={{
                    borderRadius: 20,
                    borderWidth: 2,
                    borderColor: colors.secondaryCard,
                    overflow: "hidden",
                    backgroundColor: colors.background,
                }}
            >
                <View
                    style={{
                        padding: 20,
                        alignItems: "center",
                        gap: 10,
                    }}
                >
                    <View
                        style={{
                            width: 24,
                            height: 24,
                            borderRadius: 12,
                            backgroundColor: difficultyColors[difficulty],
                        }}
                    />

                    <Text
                        style={{
                            fontSize: 28,
                            fontWeight: "700",
                            color: colors.text,
                        }}
                    >
                        {difficulty}
                    </Text>
                </View>
            </View>
        </View>
    );
};