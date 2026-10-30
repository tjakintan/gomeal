import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "@/provider/ThemeProvider";
import { useCart } from "@/stores/useCart";
import { Button } from "@/components/ButtonComponent";
import { useEffect } from "react";
import { AddIcon, CheckIcon, FullCartIcon } from "@/icons/Icon";
import { Media } from "@/media/media";
import { SectionHeader } from "@/components/SectionComponent";
import { useCook } from "@/stores/useCook";
import { ACCENT_COLORS, Ingredient } from "@/types";
import { GroceryPickerScreen } from "../user/grocery";
import { ScrollView } from "react-native-gesture-handler";
import { useSlidingOverlay } from "@/stores/useSlideOverlay";
import { usePostHog } from "posthog-react-native";

export const IngredientScreen: React.FC<{
    post_id: number;
    onDone?: () => void;
    dark: boolean;
}> = ({
    post_id,
    onDone,
    dark = false,
}) => {

    const posthog = usePostHog();

    const { colors, textStyles } = useTheme(dark ? "dark" : undefined);

    const CookIngredients = useCook(
        (state) => state.CookIngredients
    );

    const loadingCart = useCart(
        (state) => state.loadingCart
    );

    const ingredientStatusById = useCart(
        (state) => state.ingredientStatusById
    );

    const loadIngredientStatus = useCart(
        (state) => state.loadIngredientStatus
    );

    const openSlidingOverlay = useSlidingOverlay(
        (s) => s.openSlidingOverlay
    );

    const closeSlidingOverlay = useSlidingOverlay(
        (s) => s.closeSlidingOverlay
    );

    useEffect(() => {
        CookIngredients.forEach((ingredient) => {
            loadIngredientStatus(Number(ingredient.id));
        });
    }, [CookIngredients, loadIngredientStatus]);

    const openGroceryForIngredient = (
        ingredient: Ingredient
    ) => {
        const ingredientId = Number(ingredient.id);

        posthog.capture("[Cook] => ingredient_added_to_grocery", { post_id, ingredient_id: ingredientId });

        openSlidingOverlay(
            <GroceryPickerScreen
                ingredients={[
                    {
                        id: ingredientId,
                        name: ingredient.name,
                        quantity:
                            Number(ingredient.quantity) || 1,
                        unit: ingredient.unit ?? null,
                    },
                ]}
                onIngredientsAdded={(ingredientIds) => {
                    ingredientIds.forEach((id) => {
                        loadIngredientStatus(id);
                    });
                }}
                onClose={() => {
                    closeSlidingOverlay();
                }}
                dark={dark}
            />
        );
    };

    return (
        <View
            style={{
                flex: 1,
                backgroundColor: colors.background,
            }}
        >
            <SectionHeader
                title="Ingredients"
                showBackground
                titleClassName={textStyles.bodyMedium}
                dark={dark}
                leftIcon={
                    <FullCartIcon
                        size={30}
                        color={colors.button}
                    />
                }
            />

            <ScrollView
                style={{ flex: 1 }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                    gap: 12,
                    paddingHorizontal: 10,
                    paddingBottom: 15,
                }}
            >
                {CookIngredients.map((item, index) => {
                    const ingredientId = Number(item.id);

                    const status =
                        ingredientStatusById[ingredientId];

                    const inCart = Boolean(
                        status?.in_cart
                    );

                    const cartQuantity =
                        status?.quantity ?? null;

                    const cartUnit =
                        status?.unit ?? null;

                    return (
                        <TouchableOpacity
                            key={`${item.id ?? item.name}-${index}`}
                            activeOpacity={1}
                        >
                            <View
                                style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    height: 145,
                                    width: 280,
                                    gap: 5,
                                    borderRadius: 16,
                                    overflow: "hidden",
                                }}
                            >
                                <View
                                    style={{
                                        width: 100,
                                        height: "100%",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        overflow: "hidden",
                                    }}
                                >
                                    {item.media_url ? (
                                        <Media
                                            uri={item.media_url}
                                            mediaType="image"
                                            style={{
                                                width: 70,
                                                height: 60,
                                            }}
                                            imageContentFit="cover"
                                        />
                                    ) : (
                                        <FullCartIcon
                                            color={colors.text}
                                            size={28}
                                        />
                                    )}
                                </View>

                                <View
                                    style={{
                                        height: 130,
                                        width: 155,
                                    }}
                                >
                                    <View
                                        style={{
                                            height: 78,
                                            padding: 5,
                                        }}
                                    >
                                        <Text
                                            className={
                                                textStyles.bodyMedium
                                            }
                                            numberOfLines={1}
                                            ellipsizeMode="tail"
                                            style={{
                                                color: colors.text,
                                            }}
                                        >
                                            {item.name}
                                        </Text>

                                        <View
                                            style={{
                                                flexDirection: "row",
                                                alignItems: "baseline",
                                                gap: 4,
                                            }}
                                        >
                                            <Text
                                                style={{
                                                    color: colors.secondaryText,
                                                }}
                                                className={
                                                    textStyles.body
                                                }
                                            >
                                                Qty:
                                            </Text>

                                            <Text
                                                className={
                                                    textStyles.body
                                                }
                                                numberOfLines={1}
                                                ellipsizeMode="tail"
                                                style={{
                                                    color: colors.button,
                                                }}
                                            >
                                                {item.quantity}
                                            </Text>

                                            <Text
                                                className={
                                                    textStyles.small
                                                }
                                                style={{
                                                    color: colors.secondaryText,
                                                    fontWeight: "500",
                                                }}
                                            >
                                                {item.unit}
                                            </Text>
                                        </View>

                                        <View
                                            style={{
                                                flexDirection: "row",
                                                alignItems: "baseline",
                                                gap: 4,
                                            }}
                                        >
                                            <Text
                                                style={{
                                                    color: colors.secondaryText,
                                                }}
                                                className={
                                                    textStyles.body
                                                }
                                            >
                                                In list:
                                            </Text>

                                            {inCart ? (
                                                <>
                                                    <Text
                                                        style={{
                                                            color: colors.button,
                                                        }}
                                                        className={
                                                            textStyles.body
                                                        }
                                                    >
                                                        {cartQuantity ?? 1}
                                                    </Text>

                                                    <Text
                                                        className={
                                                            textStyles.small
                                                        }
                                                        style={{
                                                            color: colors.secondaryText,
                                                            fontWeight:
                                                                "500",
                                                        }}
                                                    >
                                                        {cartUnit ?? ""}
                                                    </Text>
                                                </>
                                            ) : (
                                                <Text
                                                    style={{
                                                        color: colors.danger,
                                                    }}
                                                    className={
                                                        textStyles.body
                                                    }
                                                >
                                                    No
                                                </Text>
                                            )}
                                        </View>

                                        {!!item.category && (
                                            <Text
                                                className={
                                                    textStyles.small
                                                }
                                                numberOfLines={1}
                                                ellipsizeMode="tail"
                                                style={{
                                                    color: colors.secondaryText,
                                                }}
                                            >
                                                {item.category}
                                            </Text>
                                        )}
                                    </View>

                                    <View
                                        style={{
                                            height: 45,
                                            flexDirection: "row",
                                            justifyContent:
                                                "flex-end",
                                            alignItems: "center",
                                            paddingTop: 8,
                                            borderTopWidth: 1,
                                            borderColor:
                                                colors.text,
                                        }}
                                    >
                                        <Button
                                            style={{
                                                height: 30,
                                                width: 50,
                                                backgroundColor:
                                                    inCart
                                                        ? ACCENT_COLORS.teal
                                                        : colors.danger,
                                                alignItems:
                                                    "center",
                                                justifyContent:
                                                    "center",
                                                opacity: inCart
                                                    ? 0.7
                                                    : 1,
                                            }}
                                            disabled={
                                                inCart ||
                                                loadingCart
                                            }
                                            background
                                            onPress={() =>
                                                openGroceryForIngredient(
                                                    item
                                                )
                                            }
                                        >
                                            {inCart ? (
                                                <CheckIcon
                                                    color={
                                                        colors.background
                                                    }
                                                    size={25}
                                                />
                                            ) : (
                                                <AddIcon
                                                    color={
                                                        colors.background
                                                    }
                                                    size={15}
                                                />
                                            )}
                                        </Button>
                                    </View>
                                </View>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
};