import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "@/provider/ThemeProvider";
import { useCart } from "@/stores/useCart";
import { Button } from "@/components/ButtonComponent";
import { useEffect, useState } from "react";
import { AddIcon, CheckIcon, FullCartIcon } from "@/icons/Icon";
import { Media } from "@/media/media";
import { SectionHeader } from "@/components/SectionComponent";
import { useCook } from "@/stores/useCook";
import { Ingredient } from "@/types";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { GroceryPickerScreen } from "../user/grocery";
import { ScrollView } from "react-native-gesture-handler";

export const IngredientScreen: React.FC<{ onDone?: () => void; dark: boolean }> = ({
    onDone,
    dark = false,
}) => {
    const { colors, textStyles } = useTheme(dark ? "dark" : undefined);
    const { CookIngredients } = useCook();

    const {
        loadingCart,
        loadIngredientStatus,
        isIngredientInAnyCart,
    } = useCart();

    const [showGroceryScreen, setShowGroceryScreen] = useState(false);
    const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);

    useEffect(() => {
        CookIngredients.forEach((ingredient) => {
            loadIngredientStatus(Number(ingredient.id));
        });
    }, [CookIngredients, loadIngredientStatus]);

    const openGroceryForIngredient = (ingredient: Ingredient) => {
        const ingredientId = Number(ingredient.id);

        if (isIngredientInAnyCart(ingredientId).in_cart) return;

        setSelectedIngredient(ingredient);
        setShowGroceryScreen(true);
    };

    return (
        <View
            style={{
                ...StyleSheet.absoluteFillObject,
                backgroundColor: colors.background,
            }}
        >
            <SectionHeader
                title="Ingredients"
                showBackground
                titleClassName={textStyles.bodyMedium}
                dark={dark}
                leftIcon={<FullCartIcon size={30} color={colors.button} />}
            />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                    gap: 12,
                    paddingHorizontal: 10,
                    paddingBottom: 15,
                }}
            >
                {CookIngredients.map((item, index) => {
                    const ingredientId = Number(item.id);
                    const { in_cart, quantity, unit } = isIngredientInAnyCart(ingredientId);

                    return (
                        <TouchableOpacity key={`${item.id ?? item.name}-${index}`} activeOpacity={1}>
                            <View
                                style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    height: 145,
                                    width: 280,
                                    gap: 5,
                                    borderWidth: 3,
                                    borderColor: colors.secondaryCard,
                                    borderRadius: 16,
                                    overflow: "hidden",
                                    backgroundColor: colors.card,
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
                                            style={{ width: 70, height: 60 }}
                                            imageContentFit="cover"
                                        />
                                    ) : (
                                        <FullCartIcon color={colors.text} size={28} />
                                    )}
                                </View>

                                <View style={{ gap: 10, height: 130, width: 155 }}>
                                    <View style={{ height: 78, padding: 5 }}>
                                        <Text
                                            className={textStyles.bodyMedium}
                                            numberOfLines={1}
                                            ellipsizeMode="tail"
                                            style={{ color: colors.text }}
                                        >
                                            {item.name}
                                        </Text>

                                        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
                                            <Text style={{ color: colors.secondaryText }} className={textStyles.body}>
                                                Qty:
                                            </Text>
                                            <Text
                                                className={textStyles.body}
                                                numberOfLines={1}
                                                ellipsizeMode="tail"
                                                style={{ color: colors.button }}
                                            >
                                                {item.quantity}
                                            </Text>
                                            <Text className={textStyles.small} style={{ color: colors.secondaryText, fontWeight: "500" }}>
                                                {item.unit}
                                            </Text>
                                        </View>

                                        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
                                            <Text style={{ color: colors.secondaryText }} className={textStyles.body}>
                                                In list:
                                            </Text>
                                            {in_cart && quantity ? (
                                                <>
                                                    <Text style={{ color: colors.button }} className={textStyles.body}>
                                                        {quantity}
                                                    </Text>
                                                    <Text className={textStyles.small} style={{ color: colors.secondaryText, fontWeight: "500" }}>
                                                        {unit ?? ""}
                                                    </Text>
                                                </>
                                            ) : (
                                                <Text style={{ color: colors.danger }} className={textStyles.body}>
                                                    No
                                                </Text>
                                            )}
                                        </View>

                                        {!!item.category && (
                                            <Text
                                                className={textStyles.small}
                                                numberOfLines={1}
                                                ellipsizeMode="tail"
                                                style={{ color: colors.secondaryText }}
                                            >
                                                {item.category}
                                            </Text>
                                        )}
                                    </View>

                                    <View
                                        style={{
                                            height: 45,
                                            flexDirection: "row",
                                            justifyContent: "flex-end",
                                            alignItems: "center",
                                            paddingTop: 8,
                                            borderTopWidth: 1,
                                            borderColor: colors.text,
                                        }}
                                    >
                                        <Button
                                            style={{
                                                height: 30,
                                                width: 50,
                                                backgroundColor: in_cart ? colors.button : colors.danger,
                                                alignItems: "center",
                                                justifyContent: "center",
                                                opacity: in_cart ? 0.7 : 1,
                                            }}
                                            disabled={in_cart || loadingCart}
                                            background
                                            onPress={() => openGroceryForIngredient(item)}
                                        >
                                            {in_cart ? (
                                                <CheckIcon color={colors.background} size={15} />
                                            ) : (
                                                <AddIcon color={colors.background} size={15} />
                                            )}
                                        </Button>
                                    </View>
                                </View>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            {showGroceryScreen && selectedIngredient && (
                <View
                    style={{
                        ...StyleSheet.absoluteFillObject,
                        backgroundColor: colors.background,
                    }}
                >
                    <GroceryPickerScreen
                        ingredient={selectedIngredient}
                        onIngredientAdded={(ingredientId) => {
                            loadIngredientStatus(ingredientId);
                        }}
                        onClose={() => {
                            setSelectedIngredient(null);
                            setShowGroceryScreen(false);
                        }}
                        dark={dark}
                    />
                </View>
            )}
        </View>
    );
};
