import React, { useRef, useEffect, useState } from "react";
import { View, Text, Image, StyleSheet, ViewStyle, StyleProp, Animated, ScrollView, Pressable, Dimensions } from "react-native";
import { Button } from "@/components/ButtonComponent";
import { useTheme } from "@/provider/ThemeProvider";
import { usePost, usePostNutrition } from "@/stores/usePost";
import {  difficultyColors } from "@/types/styles.types";
import { DietaryData, dietaryDescriptions } from "@/types/food.types";
import FlipCard from 'react-native-flip-card'
import ScrambleResolveText from "@/hooks/ScrambleResolveText";
import { _DEFAULT_ICON_WIDTH, _DEFAULT_ICON_HEIGHT } from "@/types/layout.types";
import {
    VegetarianIcon, VeganIcon, GlutenFreeIcon,
    DairyFreeIcon, NutFreeIcon, KetoIcon,
    HalalIcon, PescatarianIcon, KosherIcon, VegetablesIcon,
    MoreIcon
} from "@/icons/Icon";
import { NutritionData, nutrients_label_icon } from "@/types";
import { FeedCard, MinimumFeedCard } from "@/types/feed.types";
import { AvatarRender } from "@/dashboard/Avatar";
import { Media } from "@/media/media";

const tagRadius = 20;
const iconHeight = _DEFAULT_ICON_HEIGHT + 15
const iconWidth = _DEFAULT_ICON_WIDTH + 15

type Props = {
    card: FeedCard; 
    minCard?: MinimumFeedCard;
    onPressProfile?: () => void;
    onPressMedia?: () => void;
    onPressInfo?: () => void;
    onDietaryPress?: (info: {
        x: number;
        y: number;
        width: number;
        height: number;
        data: any;
    }) => void;
    style?: StyleProp<ViewStyle>;
    flipEnabled?: boolean;
};

const Tag: React.FC<Props> = ({ card,onPressProfile, onPressMedia, onDietaryPress, onPressInfo, style, flipEnabled }) => {

    const { info, dietary, nutrition, num_ingredients, profile_name, level, avatar, action_counts } = card;

    // zustand
    const { colors, textStyles } = useTheme();
    const { getPercents, servings } = usePostNutrition();

    // refs
    const pulseAnim = useRef(new Animated.Value(1)).current;

    // states
    const [isFlipped, setIsFlipped] = useState(false);

    // Render dietary icons 
    type IconComponent = React.FC<{ size?: number; color?: string }>;

    const buttonRef = useRef<View>(null);

    const dietaryIcons: Partial<Record<keyof DietaryData, IconComponent>> = {
        vegetarian:  VegetarianIcon,
        vegan:       VeganIcon,
        gluten_free: GlutenFreeIcon,
        dairy_free:  DairyFreeIcon,
        nut_free:    NutFreeIcon,
        keto:        KetoIcon,
        halal:       HalalIcon,
        pescatarian: PescatarianIcon,
        kosher:      KosherIcon,
    };

    const activeDiets = (Object.keys(dietaryIcons) as (keyof DietaryData)[]).filter(
        (key) => dietary[key] === true
    );

    // get nutritional values
    const perServing = nutrition?.[0] ?? null;

    const percents = getPercents(
        perServing?.per_serving?.calories > 0
            ? [{ per_serving: perServing.per_serving, servings: 1 }]
            : []
    );
    
    return (
        <View style={{ width: 195}} className="flex-col items-center justify-center">

            <Button 
                onPress={onPressProfile} 
                style={{
                    height: 40, 
                    paddingVertical: 0,
                    alignItems: "flex-end", 
                    paddingHorizontal: 10
                }} className="w-full flex-row gap-2">

                {avatar && (
                    <View 
                        style={{
                            height: 40,
                            width: 40, 
                            borderColor: colors.text,
                            overflow: "hidden" ,                   
                        }}
                        className="items-center justify-end"
                    >
                        <AvatarRender avatar={avatar} size={30} />
                    </View>
                )}

                {profile_name && (
                    <Text style={{ maxWidth: 100 }} className={textStyles.caption} numberOfLines={1} ellipsizeMode="tail">
                        {profile_name}
                    </Text>
                )}

            </Button>

            <View style={{ height: 285}} className="w-full">

                <FlipCard 
                    flip={isFlipped} 
                    flipHorizontal={true} 
                    flipVertical={false} 
                    friction={10} 
                >

                    {/* front */}
                    <Button
                        style={[
                            {
                                height: 285, width: 195, gap: 10, borderWidth: 2,
                                borderColor: colors.secondaryCard,
                                borderRadius: 15,
                                backgroundColor: colors.card,
                                overflow: "hidden",
                                justifyContent: "center"
                            }, style,
                        ]}
                        onLongPress={()=>{if (flipEnabled) setIsFlipped(prev => !prev)}}
                    >
                        <Media
                            uri={info.dish_media_url}
                            mediaType={info.dish_media_type ?? "image"}
                            style={StyleSheet.absoluteFillObject}
                            onPress={onPressMedia}
                            disableInteraction
                            onLongPress={() => { if (flipEnabled) setIsFlipped(prev => !prev) }}
                            //useSettingsAutoPlay={false}
                            iconSize={30}
                            muteControl="row"
                        />

                        <View 
                            style={{
                                position: "absolute",
                                opacity: 0.9,
                                bottom: 5,
                                width: 180,
                                alignSelf: "center",
                            }}
                        >
                            <Pressable
                                style={{
                                    borderRadius:tagRadius,
                                    height: 70,
                                    paddingHorizontal: 10,
                                    alignSelf: "center",
                                    backgroundColor: colors.background,
                                    overflow: "hidden",
                                }}
                                className="w-full"
                                onPress={onPressInfo}
                                onLongPress={()=>{if (flipEnabled) setIsFlipped(prev => !prev)}}
                            >

                                <View style={{height: 30}} className="flex-row gap-2">

                                    {/* dif */}
                                    <View className="justify-center">
                                        {info.dish_difficulty ? (
                                            <>
                                                {(["Hard", "Medium", "Easy"] as const).map((level) =>
                                                    info.dish_difficulty === level ? (
                                                        <View
                                                            key={level}
                                                            style={{
                                                                width: 14,
                                                                height: 14,
                                                                borderRadius: 7,
                                                                backgroundColor: difficultyColors[level],
                                                            }}
                                                        />
                                                    ) : null
                                                )}
                                            </>
                                        ) : (
                                            <View 
                                                style={{
                                                    width: 20,
                                                    height: 20,
                                                    borderRadius: 999,
                                                    backgroundColor: colors.card,
                                                }}
                                            />
                                        )}

                                    </View>
                                    
                                    {/* name */}
                                    <View className="flex-1 p-1 justify-center">
                                        {info.dish_name ? (
                                            <Text className={textStyles.caption} numberOfLines={1} ellipsizeMode="tail">
                                                {info.dish_name}
                                            </Text>
                                        ) : (
                                            <Text className={` font-thin ${textStyles.body}`} numberOfLines={1} ellipsizeMode="tail">
                                                Name
                                            </Text>
                                        )}

                                    </View>

                                </View>

                                <View 
                                    className="flex-1 flex-row justify-start items-center gap-1 p-1"
                                    style={{height: 40}} 
                                >    

                                    {/* Active dietary icons */}

                                    {activeDiets.length > 0 && (
                                        <View
                                            onStartShouldSetResponder={() => true}
                                            onTouchEnd={(e) => {
                                                e.stopPropagation();
                                                buttonRef.current?.measure((x, y, width, height, pageX, pageY) => {
                                                onDietaryPress?.({
                                                    x: pageX,
                                                    y: pageY,
                                                    width,
                                                    height,
                                                    data: card,
                                                });
                                                });
                                            }}
                                        >
                                            <Button
                                                ref={buttonRef}
                                                style={{
                                                    height: 30,
                                                    width: 30,
                                                    overflow: "hidden",
                                                    alignItems: "center",
                                                    justifyContent: "center"
                                                }}
                                                background
                                                onPress={() => {
                                                    buttonRef.current?.measure((x, y, width, height, pageX, pageY) => {
                                                        onDietaryPress?.({
                                                            x: pageX,
                                                            y: pageY,
                                                            width,
                                                            height,
                                                            data: card,
                                                        });
                                                    });
                                                }}
                                            >
                                                {activeDiets.length > 1 ? (
                                                    <MoreIcon color={colors.text} size={15} />
                                                ) : (
                                                    activeDiets.map((key) => {
                                                        const Icon = dietaryIcons[key]!;
                                                        return (
                                                            <Icon key={key} size={15} color={colors.text} />
                                                        );
                                                    })
                                                )}
                                            </Button>
                                        </View>
                                    )}
                                    

                                    {/* ingredient count */}
                                    <View className="p-2 flex-row gap-1 items-end">
                                        <Text className={textStyles.h3} style={{ color: colors.text }}>
                                            {num_ingredients} 
                                        </Text>
                                        <Text className={textStyles.small}>
                                            ing{num_ingredients !== 1 ? "s" : ""}
                                        </Text>
                                    </View>

                                </View>

                            </Pressable>
                        </View>

                    </Button>

                    {/* back */}
                    <Button
                        style={[
                            {
                                height: 285, width: 195, gap: 10, borderWidth: 2, padding: 0,
                                borderColor: colors.secondaryCard,
                                borderRadius: 15,
                                backgroundColor: colors.card,
                                overflow: "hidden",
                                justifyContent: "center"
                            }, style,
                        ]}
                        onLongPress={() => flipEnabled && setIsFlipped(prev => !prev)}
                    >

                        <ScrollView 
                            contentContainerClassName="gap-5 p-2 items-center justify-between"
                            showsVerticalScrollIndicator={false}
                        >
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', }}>

                            {nutrients_label_icon.map(({ key, label, icon: Icon, color }) => {
                                const percent = percents[key] ?? 0;
        
                                return (
                                    <View key={key}  style={{ width: '50%', gap: 3, paddingVertical: 7 }} className="flex-row items-center">
        
                                        <View style={{width: 40, height: 40, borderRadius: 5, borderColor: colors.secondaryCard, borderWidth: 1}} className="items-center justify-center">
                                            <Icon size={30} color={colors.text}/>
                                        </View>
        
                                        <View className="gap-2 flex-row">

                                            <View 
                                                style={{
                                                    width: 10,
                                                    height: 40,
                                                    backgroundColor: colors.secondaryCard,
                                                    borderRadius: 5,
                                                    overflow: 'hidden',
                                                    justifyContent: 'flex-end',
                                                }}
                                            >
                                                <View 
                                                    style={{
                                                        width: "100%",
                                                        height: `${percent}%`,
                                                        backgroundColor: color,
                                                    }} 
                                                />
                                            </View>
                                                
                                            <View className="flex-row justify-between items-end">
                                                <Text className={textStyles.caption}>{percent.toFixed(0)}%</Text>
                                            </View>
        
                                        </View>
        
                                    </View>
                                );
        
                            })}
                        </View>
        
                        </ScrollView>

                    </Button>

                </FlipCard>

            </View>

        </View>
    );
};

export const EmptyTag: React.FC<{ delay?: number }> = ({ delay = 0 }) => {
    const { colors } = useTheme();
    const opacity = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        const anim = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, { toValue: 0.3, duration: 700, delay, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 1,   duration: 700,         useNativeDriver: true }),
            ])
        );
        anim.start();
        return () => anim.stop();
    }, []);

    const bone = (w: number | `${number}%` | "auto", h: number, radius = 8, extra?: object) => (
        <Animated.View
            style={{
                width: w, height: h,
                borderRadius: radius,
                backgroundColor: colors.card,
                opacity,
                ...extra,
            }}
        />
    );

    return (
        <View style={{ width: 195, height: 325 }}>

            <View style={{ height: 40, flexDirection: "row", alignItems: "flex-end", gap: 8, paddingHorizontal: 20, paddingBottom: 4 }}>
                {bone(30, 30, 999)}
                {bone("60%", 12, 6)}
            </View>

            <View style={{ height: 285, paddingHorizontal: 5, gap: 5 }}>

                {bone("100%", 185, 16)}

                <Animated.View
                    style={{
                        height: 75, borderRadius: 16,
                        backgroundColor: colors.card,
                        opacity,
                        paddingHorizontal: 14, paddingVertical: 10,
                        justifyContent: "space-between",
                    }}
                >

                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        {bone(14, 14, 999)}
                        {bone("60%", 12, 6)}
                    </View>

                    <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 6 }}>
                        {bone(36, 18, 6)}
                        {bone(50, 32, 999)}
                    </View>

                </Animated.View>

            </View>
        </View>
    );
};

export default Tag;