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
import { AddIcon, BackIcon, EmptyImageIcon, SearchIcon, XIcon, WalmartIcon, InstaCartIcon, AmazonIcon, TargetIcon, WeisIcon, KrogerIcon, CostcoIcon, CheckIcon, GroceryIcon, DisclaimerIcon, DeleteIcon } from "@/icons/Icon";
import { Media } from "@/media/media";
import { useTheme } from "@/provider/ThemeProvider";
import { useCart } from "@/stores/useCart";
import { ACCENT_COLORS } from "@/types";
import { Cart, CartIngredient, Retailer } from "@/types/cart.types";
import { DEFAULT_INGREDIENT_SEARCH_CACHE_TIME } from "@/types/Time.types";
import { SpinningLogoImage } from "@/utils/Logo";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, Linking } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSlidingOverlay } from "@/stores/useSlideOverlay";
import Disclaimer from "@/components/DisclaimerComponent";
import { usePostHog } from "posthog-react-native";


const MENU_HEIGHT = 75;
const MENU_SEARCH_HEIGHT = 135;


export const GroceryMainScreen: React.FC<{
    cart_id?: number;
    onClose: () => void;
    dark?: boolean;
}> = ({
    cart_id,
    onClose,
    dark,
}) => {

    const posthog = usePostHog();
    const insets = useSafeAreaInsets();
    const { colors, textStyles } = useTheme(dark ? "dark" : undefined);

    const openSlidingOverlay = useSlidingOverlay(
        (s) => s.openSlidingOverlay
    );

    const closeSlidingOverlay = useSlidingOverlay(
        (s) => s.closeSlidingOverlay
    );

    const [name, setName] = useState("");
    const [activeCartId, setActiveCartId] = useState<number | null>(null);
    const [showCreateCartSection, setShowCreateCartSection] = useState(false);

    const carts = useCart((state) => state.carts);
    const loadCarts = useCart((state) => state.loadCarts);
    const createCart = useCart((state) => state.createCart);
    const clearActiveCart = useCart((state) => state.clearActiveCart);
    const deleteCart = useCart((state) => state.deleteCart);
    const loadingCart = useCart((state) => state.loadingCart);

    const openedFromPropRef = useRef(false);

    const wasLoading = useRef(false);

    const openCart = (id: number) => {
        setActiveCartId(id);
        if (showCreateCartSection) setShowCreateCartSection(false);

        openSlidingOverlay(
            <GroceryActiveCartScreen
                cart_id={id}
                dark={dark}
                onBack={() => {
                    closeSlidingOverlay();
                    setActiveCartId(null);
                }}
            />
        );
    };

    useEffect(() => {
        if (loadingCart) wasLoading.current = true;
        else if (wasLoading.current) {
            wasLoading.current = false;
            setActiveCartId(null);
        }
    }, [loadingCart]);

    useEffect(() => {
        loadCarts();
    }, [loadCarts]);

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
                    alignItems: "center",
                    flexDirection: "row",
                    paddingHorizontal: 5,
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
                    showDivider
                    dark={dark}
                    subtitle="Swipe right to delete a list"
                    titleClassName={textStyles.h3}
                    leftIcon={<GroceryIcon color={colors.button} size={30}/>}
                />
            </GradientHeader>

            <View style={{ flex: 1, paddingTop: MENU_HEIGHT }}>

                <ScrollView 
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{
                        paddingTop: MENU_HEIGHT,
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
                                            posthog.capture("[Grocery] => cart_created");

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
                            <Swipeable
                                key={cart.id ? String(cart.id) : `cart-${index}`}
                                friction={2}
                                rightThreshold={40}
                                overshootLeft={false}
                                renderLeftActions={(progress, dragX) => (
                                    <View
                                        style={{
                                            justifyContent: "center",
                                            alignItems: "flex-end",
                                            padding: 10,
                                        }}
                                    >
                                        <Button
                                            onPress={async () => {
                                                await deleteCart(cart.id);
                                            }}
                                            clearBackground
                                        >
                                            <DeleteIcon color={colors.danger} />
                                        </Button>
                                    </View>
                                )}
                            >
                                <Button
                                    disabled={loadingCart}
                                    onPress={() => openCart(cart.id)}
                                    style={{
                                        width: "100%",
                                        height: 75,
                                        borderRadius: 20,
                                        borderWidth: 2,
                                        backgroundColor: colors.card,
                                        borderColor: isActive
                                            ? colors.secondaryText
                                            : colors.secondaryCard,
                                        justifyContent: "flex-start",
                                        alignItems: "flex-end",
                                        flexDirection: "row",
                                        paddingHorizontal: 16,
                                        gap: 5,
                                    }}
                                >
                                    <Text
                                        className={textStyles.h3}
                                        style={{ color: colors.text }}
                                    >
                                        {cart.name}
                                    </Text>

                                    {cart.num_ingredients > 0 && (
                                        <Text
                                            className={textStyles.small}
                                            style={{ color: colors.secondaryText }}
                                        >
                                            {cart.num_ingredients} ings
                                        </Text>
                                    )}
                                </Button>
                            </Swipeable>
                        );
                    })}

                </ScrollView>

            </View>

        </View>
    );
};


export const GroceryActiveCartScreen: React.FC<{
    cart_id: number;
    onBack: () => void;
    dark?: boolean;
}> = ({
    cart_id,
    onBack,
    dark,
}) => {

    const posthog = usePostHog();
    const insets = useSafeAreaInsets();
    const { colors, textStyles } = useTheme(dark ? "dark" : undefined);

    const [ingredientSearch, setIngredientSearch] = useState("");
    const [debouncedIngredientSearch, setDebouncedIngredientSearch] = useState("");
    const [showIngredientResults, setShowIngredientResults] = useState(false);

    const [editingItemId, setEditingItemId] = useState<number | string | null>(null);
    const [draftQuantities, setDraftQuantities] = useState<Record<string, number>>({});
    const [draftUnits, setDraftUnits] = useState<Record<string, string | null>>({});

    const activeCart = useCart((state) => state.activeCart);
    const loadCarts = useCart((state) => state.loadCarts);
    const removeFromCart = useCart((state) => state.removeFromCart);
    const insertIngredientsIntoCart = useCart((state) => state.insertIngredientsIntoCart);
    const setActiveCart = useCart((state) => state.setActiveCart);
    const updateCartItemQuantityUnit = useCart(
        (state) => state.updateCartItemQuantityUnit
    );

    const {
        data: ingredientResults = [],
        isLoading: searchingIngredients,
    } = useQuery({
        queryKey: ["searchIngredients", debouncedIngredientSearch],
        queryFn: () => _find_ingredient(debouncedIngredientSearch),
        enabled:
            activeCart != null &&
            debouncedIngredientSearch.length >= 3,
        staleTime: DEFAULT_INGREDIENT_SEARCH_CACHE_TIME,
    });

    useEffect(() => {
        setActiveCart(cart_id);
    }, [cart_id, setActiveCart]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedIngredientSearch(
                ingredientSearch.trim()
            );
        }, 400);

        return () => clearTimeout(timer);
    }, [ingredientSearch]);

    useEffect(() => {
        setShowIngredientResults(
            debouncedIngredientSearch.length >= 3
        );
    }, [debouncedIngredientSearch]);

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
        const query = encodeURIComponent(
            buildGroceryQuery(item)
        );

        if (!query) return;

        posthog.capture("[Grocery] => retailer_opened", { retailer: provider, ingredient_id: item.ingredient?.id, ingredient_name: item?.ingredient?.name })

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

    if (!activeCart) {
        return null;
    }

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
                        marginTop: insets.top
                    }}
                    contentStyle={{
                        height: MENU_SEARCH_HEIGHT,
                    }}
                    baseColor={colors.background}
                >

                    <View
                        style={{
                            alignItems: "flex-start",
                            flexDirection: "row",
                            paddingHorizontal: 5,
                        }}
                    >
                        <Button style={{ alignSelf: "center"}} onPress={onBack} clearBackground>
                            <BackIcon color={colors.text} />
                        </Button>

                        <SectionHeader
                            title={activeCart.name}
                            subtitle="To ensure accurate prices, please set the proper quantity and unit"
                            showDivider
                            titleClassName={textStyles.h3}
                            dark={dark}
                            showBackground
                        />
                        
                    </View>

                    <View style={{ paddingHorizontal: 10, paddingBottom: 8, maxHeight: 150 }}>

                        <Input
                            multiline={false}
                            value={ingredientSearch}
                            disabled={false}
                            dark={dark}
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
                                    maxHeight: 100,
                                    overflow: "hidden",
                                    marginTop: 10,
                                    padding: 5,
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

                                                    await insertIngredientsIntoCart(
                                                        {
                                                            ingredient_id: ingredientId,
                                                            quantity: 1,
                                                            unit: null,
                                                        },
                                                        activeCart.id,
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
                    {activeCart.items && (
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
                                                                        dark={dark}
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
                                                                        dark={dark}
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
                                                    dark={dark}
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
                                <Disclaimer
                                    dark={dark}
                                    title="DISCLAIMER"
                                    message="Prices are estimates based on USDA food data and average food prices. Actual prices may vary by retailer, location, brand, package size, promotions, and availability. GoMeal does not guarantee the accuracy or availability of listed prices. Always verify the final price with the retailer before purchasing."
                                />
                            </TouchableOpacity>

                        </KeyboardAwareScrollView>
                    )}
                </View>

            </View>
        </View>
    );
};


export const GroceryPickerScreen: React.FC<{
    ingredients: CartIngredient[];
    onIngredientsAdded?: (ingredientIds: number[]) => void;
    onClose: () => void;
    dark?: boolean;
}> = ({
    ingredients,
    onIngredientsAdded,
    onClose,
    dark,
}) => {

    const insets = useSafeAreaInsets();
    const { colors, textStyles } = useTheme(dark ? "dark" : undefined);
    const [selectedCartId, setSelectedCartId] = useState<number | null>(null);

    const carts = useCart((state) => state.carts);
    const loadCarts = useCart((state) => state.loadCarts);
    const insertIngredientsIntoCart = useCart((state) => state.insertIngredientsIntoCart);
    const loadingCart = useCart((state) => state.loadingCart);

    // overlays
    const openSlidingOverlay = useSlidingOverlay((s) => s.openSlidingOverlay);
    const closeSlidingOverlay = useSlidingOverlay((s) => s.closeSlidingOverlay);

    useEffect(() => {
        loadCarts();
    }, [loadCarts]);

    const addToCart = async (cartId: number) => {
        if (loadingCart) return;

        setSelectedCartId(cartId);

        try {
            const cartIngredients = ingredients
                .map((ingredient) => ({
                    ingredient_id: Number(ingredient.id),
                    quantity: Number(ingredient.quantity) || 1,
                    unit: ingredient.unit ?? null,
                }))
                .filter((ingredient) =>
                    Number.isFinite(ingredient.ingredient_id)
                );

            const results = await insertIngredientsIntoCart(
                cartIngredients,
                cartId,
            );

            onIngredientsAdded?.(
                results.map(
                    (result) => result.ingredient_id
                )
            );

            openSlidingOverlay(
                <GroceryActiveCartScreen
                    cart_id={cartId}
                    dark={dark}
                    onBack={() => {
                        closeSlidingOverlay();
                    }}
                />
            );

            
        } catch (error) {
            console.error("Failed to add ingredients to cart:", error);
        }
    };

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
                <Button onPress={onClose} clearBackground>
                    <BackIcon color={colors.text} />
                </Button>

                <SectionHeader
                    title="Choose List"
                    titleClassName={textStyles.h3}
                    dark={dark}
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
                    {carts && carts.map((cart: Cart, index) => {
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
        </View>
    );
};