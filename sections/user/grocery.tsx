import { _find_ingredient } from "@/api/post.api";
import {
    Button,
    CheckButton,
    IngredientQuantityButton,
    IngredientUnitDropDownButton,
} from "@/components/ButtonComponent";
import { GradientHeader } from "@/components/GradientComponent";
import { Input } from "@/components/InputComponent";
import { SectionHeader } from "@/components/SectionComponent";
import { AddIcon, BackIcon, EmptyImageIcon, SearchIcon, XIcon, WalmartIcon, InstaCartIcon, AmazonIcon, TargetIcon, WeisIcon, KrogerIcon, CostcoIcon, CheckIcon, GroceryIcon } from "@/icons/Icon";
import { Media } from "@/media/media";
import { useTheme } from "@/provider/ThemeProvider";
import { useCart } from "@/stores/useCart";
import { DASHBOARD_HEIGHT } from "@/tags/ReelTag";
import { ACCENT_COLORS, Ingredient } from "@/types";
import { Cart, Retailer } from "@/types/cart.types";
import { DEFAULT_INGREDIENT_SEARCH_CACHE_TIME } from "@/types/Time.types";
import { SpinningLogoImage } from "@/utils/Logo";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View, Linking } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";


const MENU_HEIGHT = 65;
const MENU_SEARCH_HEIGHT = 100;
export const GroceryMainScreen: React.FC<{
    cart_id?: number;
    onClose: () => void;
}> = ({ cart_id, onClose }) => {

    const insets = useSafeAreaInsets();
    const { colors, textStyles } = useTheme();

    const [name, setName] = useState("");
    const [activeCartId, setActiveCartId] = useState<number | string | null>(cart_id ?? null);
    const [showCreateCartSection, setShowCreateCartSection] = useState(false);

    const [ingredientSearch, setIngredientSearch] = useState("");
    const [debouncedIngredientSearch, setDebouncedIngredientSearch] = useState("");
    const [showIngredientResults, setShowIngredientResults] = useState(false);

    const [editingItemId, setEditingItemId] = useState<number | string | null>(null);
    const [draftQuantities, setDraftQuantities] = useState<Record<string, number>>({});
    const [draftUnits, setDraftUnits] = useState<Record<string, string | null>>({});

    const {
        carts,
        activeCart,
        loadCarts,
        removeFromCart,
        insertIntoCart,
        setActiveCart,
        createCart,
        clearActiveCart,
        updateCartItemQuantityUnit,
        deleteCart,
        loadingCart,
    } = useCart();

    const {
        data: ingredientResults = [],
        isLoading: searchingIngredients,
    } = useQuery({
        queryKey: ["searchIngredients", debouncedIngredientSearch],
        queryFn: () => _find_ingredient(debouncedIngredientSearch),
        enabled: activeCart != null && debouncedIngredientSearch.length >= 3,
        staleTime: DEFAULT_INGREDIENT_SEARCH_CACHE_TIME,
    });

    const updateCartItemQuantityUnitFromRow = async (
        itemId: number | string,
        ingredientId: number | undefined,
        quantity: number,
        unit: string | null,
    ) => {
        if (!activeCart || ingredientId == null) return;

        const nextQuantity = Number(quantity) || 1;
        const nextUnit = unit ?? null;

        setDraftQuantities((prev) => ({
            ...prev,
            [String(itemId)]: nextQuantity,
        }));

        setDraftUnits((prev) => ({
            ...prev,
            [String(itemId)]: nextUnit,
        }));

        await updateCartItemQuantityUnit(
            Number(ingredientId),
            activeCart.id,
            nextQuantity,
            nextUnit,
        );
    };

    const buildGroceryQuery = (item: any) => {
        return item?.ingredient?.name?.trim().toLowerCase() ?? "";
    };

    const openRetailer = async (
        provider: Retailer,
        item: any,
    ) => {
        const query = encodeURIComponent(buildGroceryQuery(item));

        if (!query) return;

        const urls: Record<Retailer, string> = {
            instacart: `https://www.instacart.com/store/s?k=${query}`,
            walmart: `https://www.walmart.com/search?q=${query}`,
            amazon: `https://www.amazon.com/s?k=${query}&i=amazonfresh`,
            target: `https://www.target.com/s?searchTerm=${query}`,
            weis: `https://www.weismarkets.com/shop/?query=${query}`,
            kroger: `https://www.kroger.com/search?query=${query}&searchType=default_search`,
            costco: `https://www.costco.com/CatalogSearch?keyword=${query}`,
        };

        await Linking.openURL(urls[provider]);
    };

    useEffect(() => {
        loadCarts();

        if (cart_id) {
            setActiveCart(cart_id);
        }
    }, [cart_id, loadCarts, setActiveCart]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedIngredientSearch(ingredientSearch.trim());
        }, 400);

        return () => clearTimeout(timer);
    }, [ingredientSearch]);

    useEffect(() => {
        setShowIngredientResults(debouncedIngredientSearch.length >= 3);
    }, [debouncedIngredientSearch]);

    if (activeCart) {
        return (
            <View
                style={{
                    ...StyleSheet.absoluteFillObject,
                    backgroundColor: colors.background,
                }}
            >
                <View style={{ flex: 1, paddingTop: insets.top }}>

                    <GradientHeader
                        height={MENU_SEARCH_HEIGHT}
                        style={{
                            paddingTop: insets.top
                        }}
                        contentStyle={{
                            height: MENU_SEARCH_HEIGHT,
                        }}
                        baseColor={colors.background}
                    >

                        <View
                            style={{
                                height: 65,
                                paddingHorizontal: 20,
                                alignItems: "center",
                                flexDirection: "row",
                            }}
                        >
                            <Button onPress={() => clearActiveCart()} clearBackground>
                                <BackIcon color={colors.text} />
                            </Button>

                            <SectionHeader
                                title={activeCart.name}
                                titleClassName={textStyles.h3}
                                showBackground
                            />
                        </View>

                        <View style={{ paddingHorizontal: 10, paddingBottom: 8, maxHeight: 150 }}>

                            <Input
                                multiline={false}
                                value={ingredientSearch}
                                disabled={false}
                                leftIcon={
                                    searchingIngredients ? (
                                        <SpinningLogoImage size={30} />
                                    ) : (
                                        <SearchIcon color={colors.text} size={20}/>
                                    )
                                }
                                placeholder="Search ingredient"
                                onIconPress={() => {}}
                                onChangeText={(value) => {
                                    setIngredientSearch(value);
                                    setShowIngredientResults(value.trim().length >= 3);
                                }}
                                onSubmitEditing={() => {
                                    setDebouncedIngredientSearch(ingredientSearch.trim());
                                }}
                            />

                            {showIngredientResults && ingredientResults.length > 0 && (

                                <View
                                    style={{
                                        height: 100,
                                        overflow: "hidden",
                                        marginTop: 10,
                                        borderRadius: 15,
                                        backgroundColor: colors.card
                                    }}
                                >

                                    <ScrollView showsVerticalScrollIndicator>

                                        <TouchableOpacity  activeOpacity={1}>

                                            {ingredientResults.map((ingredient) => (
                                                
                                                <Button
                                                    key={ingredient.id ?? ingredient.name}
                                                    style={{
                                                        width: "100%",
                                                        alignItems: "flex-start",
                                                        padding: 8,
                                                        borderRadius: 0,
                                                    }}
                                                    onPress={async () => {
                                                        const ingredientId = Number(ingredient.id);
                                                        if (!Number.isFinite(ingredientId)) return;

                                                        await insertIntoCart(
                                                            ingredientId,
                                                            activeCart.id,
                                                            1,
                                                            null,
                                                        );

                                                        setIngredientSearch("");
                                                        setDebouncedIngredientSearch("");
                                                        setShowIngredientResults(false);
                                                        await setActiveCart(activeCart.id);
                                                        await loadCarts();
                                                    }}
                                                >
                                                    <Text className={textStyles.body}>
                                                        {ingredient.name}
                                                    </Text>

                                                    {ingredient.category && (
                                                        <Text className={textStyles.small} style={{ color: colors.secondaryText }}>
                                                            {ingredient.category}
                                                        </Text>
                                                    )}
                                                </Button>
                                                
                                            ))}

                                        </TouchableOpacity>

                                    </ScrollView>

                                </View>
                            )}
                            
                        </View>

                    </GradientHeader>

                    <View style={{ flex: 1, overflow: "hidden",  }}>
                        {!activeCart.items?.length ? (
                            <View className="flex-1 items-center justify-center">
                                <Text className={textStyles.caption} style={{ color: colors.secondaryText }}>
                                    No ingredients yet...
                                </Text>
                            </View>
                        ) : (
                            <KeyboardAwareScrollView
                                showsVerticalScrollIndicator={false}
                            >
                                <TouchableOpacity 
                                    activeOpacity={1}
                                    style={{
                                        gap: 45,
                                        paddingTop: showIngredientResults ? MENU_SEARCH_HEIGHT + 120 : MENU_SEARCH_HEIGHT + 10,
                                        paddingBottom: insets.bottom                                       
                                    }}
                                >

                                    {activeCart.items.map((item) => {
                                        const ingredientId = item.ingredient?.id;

                                        return (
                                            <View
                                                key={item.id}
                                                style={{
                                                    width: "100%",
                                                    gap: 10,
                                                }}
                                            >
                                                <View
                                                    style={{
                                                        width: "100%",
                                                        flexDirection: "row",
                                                        alignItems: "center",
                                                        gap: 10,
                                                        paddingHorizontal: 5
                                                    }}
                                                >
                                                    <View
                                                        style={{
                                                            flex: 1,
                                                            height: 75,
                                                            gap: 10,
                                                            borderColor: colors.secondaryCard,
                                                            borderBottomWidth: 2,
                                                            overflow: "hidden",
                                                            flexDirection: "row",
                                                            alignItems: "center",
                                                        }}
                                                    >
                                                        <View
                                                            style={{
                                                                minWidth: 75,
                                                                alignItems: "center",
                                                                justifyContent: "center",
                                                            }}
                                                        >
                                                            {item.ingredient?.media_url ? (
                                                                <Media
                                                                    uri={item.ingredient.media_url}
                                                                    mediaType="image"
                                                                    style={{ width: "100%", height: "100%" }}
                                                                    imageContentFit="cover"
                                                                />
                                                            ) : (
                                                                <EmptyImageIcon color={colors.text} size={35} />
                                                            )}
                                                        </View>

                                                        <View 
                                                            style={{ 
                                                                flex: 1, 
                                                                height: "100%",
                                                                flexDirection: "row",
                                                                justifyContent: "space-between",
                                                                alignItems: "center",
                                                            }} 
                                                        >
                                                            <View
                                                                style={{
                                                                    flex: 1,
                                                                    height: "100%",
                                                                    justifyContent: "center",
                                                                }}
                                                            >
                                                                {editingItemId === item.id ? (
                                                                    <View
                                                                        style={{
                                                                            flexDirection: "row",
                                                                            alignItems: "center",
                                                                            gap: 8,
                                                                        }}
                                                                    >
                                                                        <IngredientQuantityButton
                                                                            value={draftQuantities[String(item.id)] ?? Number(item.quantity) ?? 1}
                                                                            onChange={(quantity) => {
                                                                                updateCartItemQuantityUnitFromRow(
                                                                                    item.id,
                                                                                    Number(item.ingredient?.id),
                                                                                    Number(quantity),
                                                                                    draftUnits[String(item.id)] ?? item.unit ?? null,
                                                                                );
                                                                            }}
                                                                        />

                                                                        <IngredientUnitDropDownButton
                                                                            selectedUnit={draftUnits[String(item.id)] ?? item.unit ?? " "}
                                                                            onSelectedUnit={(unit) => {
                                                                                updateCartItemQuantityUnitFromRow(
                                                                                    item.id,
                                                                                    Number(item.ingredient?.id),
                                                                                    draftQuantities[String(item.id)] ?? Number(item.quantity) ?? 1,
                                                                                    unit,
                                                                                );
                                                                            }}
                                                                        />
                                                                    </View>
                                                                ) : (
                                                                    <>
                                                                        <Text
                                                                            className={textStyles.body}
                                                                            numberOfLines={1}
                                                                            ellipsizeMode="tail"
                                                                            style={{ color: colors.text }}
                                                                        >
                                                                            {item.ingredient?.name}
                                                                        </Text>

                                                                        <Text
                                                                            className={textStyles.caption}
                                                                            numberOfLines={1}
                                                                            ellipsizeMode="tail"
                                                                            style={{ color: colors.secondaryText }}
                                                                        >
                                                                            {`$${item.price?.toFixed(2) ?? "N/A"}`}
                                                                        </Text>
                                                                    </>
                                                                )}
                                                            </View>

                                                            {editingItemId === item.id ? (
                                                                <Button
                                                                    onPress={() => {
                                                                        setEditingItemId(null);

                                                                        setDraftQuantities((prev) => {
                                                                            const next = { ...prev };
                                                                            delete next[String(item.id)];
                                                                            return next;
                                                                        });

                                                                        setDraftUnits((prev) => {
                                                                            const next = { ...prev };
                                                                            delete next[String(item.id)];
                                                                            return next;
                                                                        });
                                                                    }}
                                                                    clearBackground
                                                                >
                                                                    <XIcon color={colors.danger} size={25} />
                                                                </Button>
                                                            ) : (
                                                                <Button
                                                                    onPress={() => {
                                                                        setEditingItemId(item.id);

                                                                        setDraftQuantities((prev) => ({
                                                                            ...prev,
                                                                            [String(item.id)]: Number(item.quantity) || 1,
                                                                        }));

                                                                        setDraftUnits((prev) => ({
                                                                            ...prev,
                                                                            [String(item.id)]: item.unit ?? null,
                                                                        }));
                                                                    }}
                                                                    style={{
                                                                        height: 50,
                                                                        width: 60,
                                                                        borderRadius: 15,
                                                                        justifyContent: "center",
                                                                        alignItems: "center",
                                                                        borderWidth: 2,
                                                                        borderColor: colors.secondaryCard,
                                                                        flexDirection: "row",
                                                                        gap: 2,
                                                                    }}
                                                                    background={false}
                                                                >
                                                                    <Text
                                                                        className={textStyles.caption}
                                                                        numberOfLines={1}
                                                                        ellipsizeMode="tail"
                                                                    >
                                                                        {item.quantity}
                                                                    </Text>

                                                                    {item.quantity && (
                                                                        <Text
                                                                            className={textStyles.caption}
                                                                            numberOfLines={1}
                                                                            ellipsizeMode="tail"
                                                                        >
                                                                            {item.unit}
                                                                        </Text>
                                                                    )}
                                                                </Button>
                                                            )}

                                                        </View>

                                                    </View>

                                                    {/**/}
                                                    <CheckButton
                                                        defaultValue={false}
                                                        size={40}
                                                        onChange={async (checked) => {
                                                            if (!checked || ingredientId == null) return;
                                                            await removeFromCart(Number(ingredientId), activeCart.id);
                                                        }}
                                                    />

                                                </View>

                                                <ScrollView
                                                    horizontal
                                                    showsHorizontalScrollIndicator={false}
                                                    contentContainerStyle={{
                                                        flexDirection: "row",
                                                        alignItems: "center",
                                                        gap: 15,
                                                        paddingHorizontal: 10,
                                                    }}
                                                >
                                                    <Button
                                                        style={{
                                                            width: 50,
                                                            height: 50,
                                                            borderRadius: 999,
                                                            borderWidth: 1,
                                                            borderColor: colors.secondaryCard,
                                                            backgroundColor: "white",
                                                            justifyContent: "center",
                                                            alignItems: "center",
                                                        }}
                                                        onPress={() => openRetailer("walmart", item)}
                                                    >
                                                        <WalmartIcon size={40} />
                                                    </Button>

                                                    <Button
                                                        style={{
                                                            width: 50,
                                                            height: 50,
                                                            borderRadius: 999,
                                                            borderWidth: 1,
                                                            borderColor: colors.secondaryCard,
                                                            backgroundColor: "white",
                                                            justifyContent: "center",
                                                            alignItems: "center",
                                                        }}
                                                        onPress={() => openRetailer("instacart", item)}
                                                    >
                                                        <InstaCartIcon size={40} />
                                                    </Button>

                                                    <Button
                                                        style={{
                                                            width: 50,
                                                            height: 50,
                                                            borderRadius: 999,
                                                            borderWidth: 1,
                                                            borderColor: colors.secondaryCard,
                                                            backgroundColor: "white",
                                                            justifyContent: "center",
                                                            alignItems: "center",
                                                        }}
                                                        onPress={() => openRetailer("amazon", item)}
                                                    >
                                                        <AmazonIcon size={40} />
                                                    </Button>

                                                    <Button
                                                        style={{
                                                            width: 50,
                                                            height: 50,
                                                            borderRadius: 999,
                                                            borderWidth: 1,
                                                            borderColor: colors.secondaryCard,
                                                            backgroundColor: "white",
                                                            justifyContent: "center",
                                                            alignItems: "center",
                                                        }}
                                                        onPress={() => openRetailer("target", item)}
                                                    >
                                                        <TargetIcon size={30} />
                                                    </Button>

                                                    <Button
                                                        style={{
                                                            width: 50,
                                                            height: 50,
                                                            borderRadius: 999,
                                                            borderWidth: 1,
                                                            borderColor: colors.secondaryCard,
                                                            backgroundColor: "white",
                                                            justifyContent: "center",
                                                            alignItems: "center",
                                                        }}
                                                        onPress={() => openRetailer("weis", item)}
                                                    >
                                                        <WeisIcon size={30} />
                                                    </Button>

                                                    <Button
                                                        style={{
                                                            width: 50,
                                                            height: 50,
                                                            borderRadius: 999,
                                                            borderWidth: 1,
                                                            borderColor: colors.secondaryCard,
                                                            backgroundColor: "white",
                                                            justifyContent: "center",
                                                            alignItems: "center",
                                                        }}
                                                        onPress={() => openRetailer("kroger", item)}
                                                    >
                                                        <KrogerIcon size={40} />
                                                    </Button>

                                                    <Button
                                                        style={{
                                                            width: 50,
                                                            height: 50,
                                                            borderRadius: 999,
                                                            borderWidth: 1,
                                                            borderColor: colors.secondaryCard,
                                                            backgroundColor: "white",
                                                            justifyContent: "center",
                                                            alignItems: "center",
                                                        }}
                                                        onPress={() => openRetailer("costco", item)}
                                                    >
                                                        <CostcoIcon size={40} />
                                                    </Button>
                                                    
                                                </ScrollView>

                                            </View>
                                        );
                                    })}
                                </TouchableOpacity>

                            </KeyboardAwareScrollView>
                        )}
                    </View>

                </View>

            </View>
        );
    }

    return (
        <View
            style={{
                ...StyleSheet.absoluteFillObject,
                backgroundColor: colors.background,
            }}
        >
            <GradientHeader
                height={MENU_HEIGHT}
                baseColor={colors.background}
                style={{
                    marginTop: insets.top,
                }}
                contentStyle={{
                    height: MENU_HEIGHT,
                    paddingHorizontal: 20,
                    alignItems: "center",
                    flexDirection: "row",
                }}
            >
                <Button
                    onPress={() => {
                        onClose?.();
                        clearActiveCart();
                    }}
                    clearBackground
                >
                    <BackIcon color={colors.text} />
                </Button>

                <SectionHeader
                    title="Grocery List"
                    showBackground
                    titleClassName={textStyles.h3}
                    leftIcon={<GroceryIcon color={colors.button} size={30}/>}
                />
            </GradientHeader>

            <View style={{ flex: 1, paddingTop: MENU_HEIGHT}}>

                <ScrollView 
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{
                        paddingTop: MENU_HEIGHT,
                        paddingHorizontal: 10,
                        gap: 5
                    }}    
                >
                    <View>

                        {showCreateCartSection ? (
                            <View
                                style={{
                                    width: "100%",
                                    height: 135,
                                    borderRadius: 20,
                                    borderWidth: 2,
                                    paddingVertical: 5,
                                    paddingHorizontal: 15,
                                    backgroundColor: colors.card,
                                    borderColor: colors.secondaryCard,
                                    justifyContent: "center",
                                    position: "relative",
                                }}
                            >
                                <View style={{ flex: 1, flexDirection: "column" }} className="w-full">
                                    <Text
                                        className={textStyles.bodyMedium}
                                        style={{ color: colors.text }}
                                    >
                                        Name:
                                    </Text>

                                    <Input
                                        value={name}
                                        autoFocus
                                        onChangeText={setName}
                                    />
                                </View>

                                <View
                                    style={{
                                        position: "absolute",
                                        bottom: 10,
                                        right: 10,
                                        flexDirection: "row",
                                        gap: 10,
                                    }}
                                >

                                    <Button
                                        onPress={() => setShowCreateCartSection(false)}
                                        style={{
                                            right: 25,
                                            width: 75,
                                            flexDirection: "row",
                                            backgroundColor: colors.danger
                                        }}
                                        background
                                    >
                                        <XIcon color={colors.text} size={25} />
                                    </Button>

                                    <Button
                                        onPress={async () => {
                                            const trimmedName = name.trim();
                                            if (trimmedName.length < 3) return;

                                            await createCart(trimmedName);
                                            setName("");
                                            setShowCreateCartSection(false);
                                            await loadCarts();
                                        }}
                                        style={{
                                            right: 25,
                                            width: 75,
                                            flexDirection: "row",
                                            backgroundColor: ACCENT_COLORS.teal,
                                        }}
                                        disabled={!name.trim()}
                                        background
                                    >
                                        <CheckIcon color={colors.text} size={30} />
                                    </Button>

                                </View>

                            </View>
                        ) : (
                            <Button
                                onPress={() => setShowCreateCartSection(true)}
                                style={{
                                    width: "100%",
                                    height: 75,
                                    borderRadius: 20,
                                    borderWidth: 2,
                                    overflow: "hidden",
                                    backgroundColor: colors.card,
                                    borderColor: colors.secondaryCard,
                                    justifyContent: "center",
                                }}
                            >
                                <AddIcon size={25} color={colors.text} />
                            </Button>
                        )}

                    </View>

                    {carts.map((cart: Cart, index) => {
                        const isActive = activeCartId === cart.id;

                        return (

                            <Button
                                key={cart.id ? String(cart.id) : `cart-${index}`}
                                disabled={loadingCart}
                                onPress={async () => {
                                    if (showCreateCartSection) setShowCreateCartSection(false)
                                    setActiveCartId(cart.id);
                                    await setActiveCart(cart.id);
                                }}
                                onLongPress={() => deleteCart(cart.id)}
                                style={{
                                    width: "100%",
                                    height: 75,
                                    borderRadius: 20,
                                    borderWidth: 2,
                                    backgroundColor: colors.card,
                                    borderColor: isActive ? colors.secondaryText : colors.secondaryCard,
                                    justifyContent: "flex-start",
                                    alignItems: "flex-end",
                                    flexDirection: "row",
                                    paddingHorizontal: 16,
                                    gap: 5,
                                }}
                            >
                                <Text className={textStyles.h3} style={{ color: colors.text }}>
                                    {cart.name}
                                </Text>

                                {cart.num_ingredients > 0 && (
                                    <Text className={textStyles.small} style={{ color: colors.secondaryText }}>
                                        {cart.num_ingredients} ings
                                    </Text>
                                )}
                            </Button>

                        );
                    })}

                </ScrollView>

            </View>

        </View>
    );
};

export const GroceryPickerScreen: React.FC<{
    ingredient: Ingredient;
    onIngredientAdded?: (ingredientId: number) => void;
    onClose: () => void;
    dark?: boolean;
}> = ({ ingredient, onIngredientAdded, onClose, dark }) => {

    //console.log("GroceryPickerScreen ingredient", ingredient);

    const { colors, textStyles } = useTheme(dark ? "dark" : undefined);
    const [selectedCartId, setSelectedCartId] = useState<number | null>(null);

    const {
        carts,
        loadCarts,
        insertIntoCart,
        loadingCart,
    } = useCart();

    useEffect(() => {
        loadCarts();
    }, [loadCarts]);

    const addToCart = async (cartId: number) => {
        if (loadingCart) return;

        console.log("Adding ingredient to cart", { carts });

        const ingredientId = Number(ingredient.id);
        if (!Number.isFinite(ingredientId)) return;
        setSelectedCartId(cartId);

        console.log("Inserting ingredient into cart", { ingredientId, cartId, quantity: ingredient.quantity, unit: ingredient.unit });

        await insertIntoCart(
            ingredientId, 
            cartId,
            Number(ingredient.quantity),
            ingredient.unit ?? null,
        );

        onIngredientAdded?.(ingredientId);
        onClose();
    };

    return (
        <View
            style={{
                ...StyleSheet.absoluteFillObject,
                backgroundColor: colors.background,
            }}
        >
            <View
                style={{
                    height: 65,
                    paddingHorizontal: 20,
                    alignItems: "center",
                    flexDirection: "row",
                }}
            >
                <Button onPress={onClose} clearBackground>
                    <XIcon color={colors.text} />
                </Button>

                <SectionHeader
                    title="Choose List"
                    titleClassName={textStyles.h3}
                    dark={dark}
                />
            </View>

            <ScrollView
                style={{ flex: 1 }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                    gap: 5,
                    padding: 10,
                }}
            >
                {carts.length === 0 ? (
                    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 40, gap: 8 }}>
                        <Text className={textStyles.h3} style={{ color: colors.secondaryText }}>No lists yet</Text>
                        <Text className={textStyles.small} style={{ color: colors.secondaryText }}>Create a grocery list to get started</Text>
                    </View>
                ) : carts.map((cart: Cart, index) => {
                    const isSelected = selectedCartId === cart.id;
                    return (
                        <Button
                            key={cart.id ? String(cart.id) : `cart-${index}`}
                            disabled={loadingCart}
                            onPress={() => addToCart(cart.id)}
                            style={{
                                width: "100%",
                                height: 75,
                                borderRadius: 20,
                                borderWidth: 2,
                                backgroundColor: colors.card,
                                borderColor: isSelected ? colors.secondaryText : colors.secondaryCard,
                                justifyContent: "flex-start",
                                alignItems: "flex-end",
                                flexDirection: "row",
                                paddingHorizontal: 16,
                                gap: 5,
                                opacity: loadingCart && !isSelected ? 0.6 : 1,
                            }}
                        >
                            <Text className={textStyles.h3} style={{ color: colors.text }}>
                                {cart.name}
                            </Text>
                            {cart.num_ingredients > 0 && (
                                <Text className={textStyles.small} style={{ color: colors.secondaryText }}>
                                    {cart.num_ingredients} ings
                                </Text>
                            )}
                        </Button>
                    );
                })}
            </ScrollView>
        </View>
    );
};