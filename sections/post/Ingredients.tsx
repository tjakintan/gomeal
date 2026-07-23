import { View, Text, ScrollView, Image, Pressable, TouchableOpacity } from "react-native";
import { useRef, useState, useEffect, use } from "react";
import { useTheme } from "@/provider/ThemeProvider";
import { usePostIngredient } from "@/stores/usePost";
import { Input } from "@/components/InputComponent";
import { SearchIcon, XIcon, FullCartIcon, EmptyBoxIcon, NextIcon } from "@/icons/Icon";
import { _find_ingredient } from "@/api/post.api";
import { Button, IngredientQuantityButton, IngredientUnitDropDownButton } from "@/components/ButtonComponent";
import { SpinningLogoImage } from "@/utils/Logo";
import { PostSectionInfoProps } from "@/types";
import { _DEFAULT_ICON_WIDTH, _DEFAULT_ICON_HEIGHT } from "@/types/layout.types";
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useQuery, useMutation } from "@tanstack/react-query";
import { DEFAULT_INGREDIENT_SEARCH_CACHE_TIME } from "@/types/Time.types";
import { SectionHeader } from "@/components/SectionComponent";
import { Media } from "@/media/media";


const Ingredients: React.FC<PostSectionInfoProps> = ({
    isFocused,
    onCompleteChange,
}: PostSectionInfoProps) => {

    // Access Zustand store
    const {
        ingredients,
        addIngredient,
        updateIngredient,
        removeIngredient,
    } = usePostIngredient();

    // themes
    const { colors, textStyles } = useTheme();

    // states
    const [search, setSearch] = useState("");
    const [showSearchResults, setShowSearchResults] = useState(false);

    // API 
    const {data: results = [], isLoading, error} = useQuery({
        queryKey: ['searchIngredients', search],
        queryFn: () => _find_ingredient(search),
        enabled: search.trim().length >= 3,
        staleTime: DEFAULT_INGREDIENT_SEARCH_CACHE_TIME,
    });

    // Debounce search results
    useEffect(() => {
        const timer = setTimeout(() => {setSearch(search);}, 400);
        return () => clearTimeout(timer);
    }, [search]);

    // Render result section with result data 
    useEffect(() => {
        setShowSearchResults(true);
    }, [results])

    useEffect(() => {
        if (!isFocused) {
            setShowSearchResults(false);
            setSearch("");
        }
    }, [isFocused]);

    return (
        <View className="flex-1 flex-col p-2 gap-1 justify-start">

            <SectionHeader 
                title="Ingredients"
                subtitle="Search for an ingredient, click to add it."
                showDivider
            />
            
            {/* Search input for ingredient */}
            <View style={{maxHeight: 200, overflow: "hidden"}}>

                <Input
                    multiline={false}
                    value={search}
                    disabled={false}
                    leftIcon={isLoading ? <SpinningLogoImage size={30} /> : <SearchIcon color={colors.text} size={20}/>}
                    onIconPress={() => {}}
                    onSubmitEditing={() => setSearch(search)}
                    onChangeText={(value) => setSearch(value)}
                />
    
                {/* List of ingredient names after search to add */}
                {showSearchResults && (
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {results.map((result) => (
                            <TouchableOpacity key={result.name} activeOpacity={1}>
                                <Button
                                    style={{
                                        width: "100%",
                                        alignItems: "flex-start",
                                        padding: 5,
                                        borderRadius: 0,
                                        borderBottomWidth: 1,
                                        borderColor: colors.secondaryCard,
                                    }}
                                    onPress={async () => {
                                        addIngredient({
                                            id: result.id,
                                            name: result.name,
                                            category: result.category,
                                            source: result.source,
                                            media_url: result.media_url || null,
                                        });
                                        setShowSearchResults(false);
                                        setSearch("");
                                    }}
                                >
                                    <Text className={textStyles.bodyMedium}>
                                        {result.name}
                                    </Text>

                                    {result.category && (
                                        <Text className={textStyles.small + " text-gray-500"}>
                                        {result.category}
                                        </Text>
                                    )}
                                </Button>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                )}

            </View>

            {/* List of added ingredient(s) */}
            <View style={{flex: 1, overflow: "hidden", gap: 10}} className="">
                {ingredients.length == 0 ? (
                    <View className="flex-1 items-center justify-center">
                        <EmptyBoxIcon color={colors.text} size={70} />
                    </View>
                ) : (                    
                    <KeyboardAwareScrollView  
                        contentContainerStyle={{
                            flexGrow: 1,
                            padding: 10,
                            gap: 25,
                        }}
                        enableResetScrollToCoords={false} 
                        showsVerticalScrollIndicator={false}
                        extraScrollHeight={-130} 
                    >
                        {ingredients.map((ingredient, index) => (
                                <View
                                    key={index}
                                    style={{
                                        height: 125,
                                        borderRadius: 15,
                                    }}
                                    className="gap-1 flex-row items-center justify-between"
                                >

                                    {/* ingredient image */}
                                    <View style={{minWidth: 75}} className="h-full items-center justify-center">
                                        {ingredient.media_url ? (
                                            <Media
                                                uri={ingredient.media_url}
                                                mediaType="image"
                                                style={{ width: 70, height: 60 }}
                                                imageContentFit="cover"
                                            />
                                        ) : (
                                            <FullCartIcon color={colors.text} size={35} />
                                        )}
                                    </View>

                                    {/* ingredient content */}
                                    <View className="flex-1 p-1 justify-end h-full">

                                        {/* 1st row --text and remove button */}
                                        <View className="flex-1 flex-row items-start">
                                            <View className="flex-1 py-3">
                                                <Text className={textStyles.bodyMedium} numberOfLines={1} ellipsizeMode="tail">
                                                    {ingredient.name || ""}
                                                </Text>

                                                {ingredient.category && (
                                                    <Text className={textStyles.small} numberOfLines={1} ellipsizeMode="tail">
                                                        {ingredient.category}
                                                    </Text>
                                                )}
                                            </View>

                                            <Button
                                                onPress={() => removeIngredient(index)}
                                                style={{height: "auto", padding: 6, margin: 5, justifyContent: "flex-start"}}
                                                background={false}
                                            >
                                                <Text className={textStyles.caption} style={{color: colors.danger}}>
                                                    - remove 
                                                </Text>
                                            </Button>      
                                        </View>                            

                                        {/* ingredient quantity, unit */}
                                        <View className="flex-1 p-1 gap-3 flex-row items-center justify-center">
                                            
                                            <IngredientQuantityButton
                                                value={Number(ingredient.quantity) || 0}
                                                onChange={(val) => updateIngredient(index, "quantity", val)}
                                            />
    
                                            <IngredientUnitDropDownButton
                                                selectedUnit={ingredient.unit || " "}
                                                onSelectedUnit={(unit) => updateIngredient(index, "unit", unit)}
                                            />

                                        </View>

                                    </View>

                                </View>
                        ))}                    
                
                    </KeyboardAwareScrollView>
                )}
            </View>

        </View>
    )
}

export default Ingredients;