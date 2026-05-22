import React, { useRef, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, Animated, Easing, DimensionValue, StyleSheet } from "react-native";
import { useTheme } from "@/provider/ThemeProvider";
import { SectionHeader } from "@/components/SectionComponent";
import { Mood, useAvatar, useAvatarMood, DEFAULT_AVATAR, } from "@/dashboard/store/useAvatar";
import { Avatar, BadgeLevel } from "@/types/user.types";
import { useUser } from "@/stores/useUser";
import { SvgXml } from "react-native-svg";
import { Button } from "@/components/ButtonComponent";
import { ToggleButton } from "@/components/ButtonComponent";
import { BackIcon, EmptyIcon, NextIcon, PersonIcon } from "@/icons/Icon";
import { onBoardUserSectionProps } from "@/types/onBoard.types";
import {
  Badge_level_1,
  Badge_level_2,
  Badge_level_3,
  Badge_level_4,
  Badge_level_5,
  Badge_level_6,
} from "@/icons/badge_icon";
import Bread from "./bread";
import { formatBread } from "@/utils/time";

const OptionRow = ({
    label,
    options,
    selected,
    onSelect,
    isColor = false,
    withNone = false,
    noneSelected = false,
    onNone,
}: {
    label: string;
    options: readonly string[];
    selected: string | undefined;
    onSelect: (value: string) => void;
    isColor?: boolean;
    withNone?: boolean;
    noneSelected?: boolean;
    onNone?: () => void;
}) => {
    const { colors, textStyles } = useTheme();

    return (
        <>

            <TouchableOpacity activeOpacity={1}>

                <View className="p-5 gap-5">

                    <Text className={textStyles.caption}>{label}</Text>

                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>

                            <TouchableOpacity activeOpacity={1} style={{flexDirection: "row", gap: 10}}>

                                {withNone && (
                                    <Button
                                        onPress={onNone}
                                        style={{
                                            width: 60,
                                            height: 60,
                                            borderRadius: 999,
                                            borderWidth: noneSelected ? 3 : 1.5,
                                            borderColor: noneSelected ? colors.button : "transparent",
                                            alignItems: "center",
                                            justifyContent: "center",
                                        }}
                                    >
                                        <EmptyIcon size={50} color={colors.background}/>
                                    </Button>
                                )}

                                {options.map((opt, i) => {
                                    const isSelected = selected === opt && !noneSelected;
                                    return (
                                        <Button
                                            key={opt}
                                            onPress={() => onSelect(opt)}
                                            style={{
                                                width: 60,
                                                height: 60,
                                                borderRadius: 999,
                                                backgroundColor: isColor ? `#${opt}` : "transparent",
                                                borderWidth: isSelected ? 3 : 1.5,
                                                borderColor: isSelected ? colors.button : "transparent",
                                                alignItems: "center",
                                                justifyContent: "center",
                                            }}
                                        >
                                            {!isColor && (
                                                <Text style={{ color: isSelected ? colors.text : colors.secondaryText, fontSize: 12, fontWeight: "600" }}>
                                                    {i + 1}
                                                </Text>
                                            )}
                                        </Button>
                                    );
                                })}

                            </TouchableOpacity>

                        </ScrollView>

                </View>
            
            </TouchableOpacity>

        </>
    );
};

export const CreateAvatarScreen: React.FC<onBoardUserSectionProps> = ({ onNext, draft }) => {
    
    const initialSeed = draft?.profile_name || "default-seed";
    const { avatar, updateTrait, getSvg } = useAvatar(initialSeed);
    const { colors, textStyles } = useTheme();

    const buttonHeight = useRef(new Animated.Value(0)).current;

    useEffect(() => {

        Animated.timing(buttonHeight, {
            toValue: 60,
            useNativeDriver: false,
            duration: 300,
            easing: Easing.out(Easing.cubic)
        }).start();

    }, []);

    const handleSave = () => {
        onNext?.({ 
            avatar: {
                ...avatar  
            } 
        });
    };

    return (
        <View className="w-full h-full p-1 gap-1">

            <SectionHeader title="Avatar" subtitle="Edit your avatar traits, choose from a variety of options, how you want to be seen." />

            <View style={{ alignItems: "center" }} className="py-4">
                <SvgXml xml={getSvg().toString()} width={175} height={175} />
            </View>

            <View style={{
                flex: 1,
                backgroundColor: colors.secondaryCard,
                borderRadius: 25,
                elevation: 1,
                shadowColor:colors.text,
                shadowOpacity: 0.25,
                shadowRadius: 20,
                shadowOffset: { width: 1, height: 1}, 
                paddingHorizontal: 5,
                paddingVertical: 10,                  
            }}>

                <ScrollView 
                    showsVerticalScrollIndicator={false}
                >

                    <OptionRow
                        label="Hair"
                        options={DEFAULT_AVATAR.hair}
                        selected={avatar.hair}
                        withNone
                        noneSelected={avatar.hairProbability === 0}
                        onNone={() => updateTrait("hairProbability", 0)}
                        onSelect={(v) => { updateTrait("hair", v); updateTrait("hairProbability", 100); }}
                    />

                    <OptionRow
                        label="Hair Color"
                        options={DEFAULT_AVATAR.hairColor}
                        selected={avatar.hairColor}
                        onSelect={(v) => updateTrait("hairColor", v)}
                        isColor
                    />

                    <OptionRow
                        label="Beard"
                        options={DEFAULT_AVATAR.beard}
                        selected={avatar.beard}
                        withNone
                        noneSelected={avatar.beardProbability === 0}
                        onNone={() => updateTrait("beardProbability", 0)}
                        onSelect={(v) => { updateTrait("beard", v); updateTrait("beardProbability", 100); }}
                    />

                    <OptionRow label="Eyes" options={DEFAULT_AVATAR.eyes} selected={avatar.eyes} onSelect={(v) => updateTrait("eyes", v)} />
                    <OptionRow label="Mouth" options={DEFAULT_AVATAR.mouth} selected={avatar.mouth} onSelect={(v) => updateTrait("mouth", v)} />
                    <OptionRow label="Skin Color" options={DEFAULT_AVATAR.skinColor} selected={avatar.skinColor} onSelect={(v) => updateTrait("skinColor", v)} isColor />
                    <OptionRow label="Clothes" options={DEFAULT_AVATAR.clothes} selected={avatar.clothes} onSelect={(v) => updateTrait("clothes", v)} />
                    <OptionRow label="Clothes Color" options={DEFAULT_AVATAR.clothesColor} selected={avatar.clothesColor} onSelect={(v) => updateTrait("clothesColor", v)} isColor />
                
                </ScrollView>

            </View>

            <Animated.View style={{height: buttonHeight, width: "100%"}}>
                <Button 
                    style={{height: 50, alignSelf: "center", width: 200, flexDirection: "row", backgroundColor: colors.button, gap: 10, overflow: "hidden"}} 
                    onPress={handleSave} 
                    background
                >
                    <Text className={textStyles.bodyMedium}>Complete</Text> 
                </Button>
            </Animated.View>

        </View>
    );
};

export const EditAvatarScreen: React.FC<{
  onClose: () => void;
  avatar?: Avatar;
  onConfirm?: (avatar: Avatar) => void;
}> = ({ onClose, avatar, onConfirm }) => {
    const { colors, textStyles } = useTheme();
    const userAvatar = useUser((state) => state.user?.avatar);

    const resolvedAvatar = avatar ?? userAvatar;
    const { avatar: editAvatar, setAvatar, updateTrait, getSvg } = useAvatar(
        resolvedAvatar?.seed ?? "default-seed"
    );

    useEffect(() => {
        if (resolvedAvatar) {
        setAvatar(resolvedAvatar);
        }
    }, [resolvedAvatar]);

    const handleConfirm = () => {
        onConfirm?.({
            ...editAvatar,
        });

        onClose?.();
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
                <Button onPress={onClose} background>
                    <BackIcon color={colors.text} />
                </Button>

                <SectionHeader
                    title="Edit Avatar"
                    showBackground
                    titleClassName={textStyles.h3}
                    leftIcon={<PersonIcon size={30} color={colors.button} />}
                />

            </View>

            <View style={{ alignItems: "center" }}>
                <SvgXml xml={getSvg().toString()} width={175} height={175} />
            </View>

            <View
                style={{
                    flex: 1,
                    backgroundColor: colors.secondaryCard,
                    borderRadius: 25,
                    elevation: 1,
                    shadowColor: colors.text,
                    shadowOpacity: 0.25,
                    shadowRadius: 20,
                    shadowOffset: { width: 1, height: 1 },
                    paddingHorizontal: 5,
                    paddingVertical: 10,
                }}
            >
                <ScrollView showsVerticalScrollIndicator={false}>

                    <OptionRow
                        label="Hair"
                        options={DEFAULT_AVATAR.hair}
                        selected={editAvatar.hair}
                        withNone
                        noneSelected={editAvatar.hairProbability === 0}
                        onNone={() => updateTrait("hairProbability", 0)}
                        onSelect={(v) => {
                            updateTrait("hair", v);
                            updateTrait("hairProbability", 100);
                        }}
                    />

                    <OptionRow
                        label="Hair Color"
                        options={DEFAULT_AVATAR.hairColor}
                        selected={editAvatar.hairColor}
                        onSelect={(v) => updateTrait("hairColor", v)}
                        isColor
                    />

                    <OptionRow
                        label="Beard"
                        options={DEFAULT_AVATAR.beard}
                        selected={editAvatar.beard}
                        withNone
                        noneSelected={editAvatar.beardProbability === 0}
                        onNone={() => updateTrait("beardProbability", 0)}
                        onSelect={(v) => {
                        updateTrait("beard", v);
                        updateTrait("beardProbability", 100);
                        }}
                    />

                    <OptionRow
                        label="Eyes"
                        options={DEFAULT_AVATAR.eyes}
                        selected={editAvatar.eyes}
                        onSelect={(v) => updateTrait("eyes", v)}
                    />

                    <OptionRow
                        label="Mouth"
                        options={DEFAULT_AVATAR.mouth}
                        selected={editAvatar.mouth}
                        onSelect={(v) => updateTrait("mouth", v)}
                    />

                    <OptionRow
                        label="Skin Color"
                        options={DEFAULT_AVATAR.skinColor}
                        selected={editAvatar.skinColor}
                        onSelect={(v) => updateTrait("skinColor", v)}
                        isColor
                    />

                    <OptionRow
                        label="Clothes"
                        options={DEFAULT_AVATAR.clothes}
                        selected={editAvatar.clothes}
                        onSelect={(v) => updateTrait("clothes", v)}
                    />

                    <OptionRow
                        label="Clothes Color"
                        options={DEFAULT_AVATAR.clothesColor}
                        selected={editAvatar.clothesColor}
                        onSelect={(v) => updateTrait("clothesColor", v)}
                        isColor
                    />
                </ScrollView>
            </View>

            <View style={{ height: 60, width: "100%", alignItems: "center", marginTop: 5 }}>
                <Button
                    style={{
                        height: "100%",
                        width: 300,
                        flexDirection: "row",
                        backgroundColor: colors.button,
                        gap: 10,
                        overflow: "hidden",
                    }}
                    onPress={handleConfirm}
                    background
                >
                    <Text className={textStyles.bodyMedium}>Confirm</Text>
                </Button>
            </View>

        </View>
    );
};


export const BadgeRender: React.FC<{ badge?: BadgeLevel; size?: number;}> = ({ badge, size = 40 }) => {

    const userBadge = useUser((s) => s.user?.badge);
    const resolved = badge ?? userBadge;

    const BADGE_MAP: Record<BadgeLevel, React.FC<{ size?: number }>> = {
        1: Badge_level_1,
        2: Badge_level_2,
        3: Badge_level_3,
        4: Badge_level_4,
        5: Badge_level_5,
        6: Badge_level_6,
    };

    if (!resolved) return null;

    const BadgeComponent = BADGE_MAP[resolved];
    if (!BadgeComponent) return null;

    return <BadgeComponent size={size} />;
};

export const AvatarRender: React.FC<{
    avatar?: Avatar;
    badge?: BadgeLevel;
    size?: number;
    showBadge?: boolean;
    background?: boolean;
    dark?: boolean;
}> = ({ avatar, size = 40, badge, showBadge, background = false, dark = false, }) => {

    const { colors, textStyles } = useTheme(dark ? "dark" : undefined);
    const userAvatar = useUser((s) => s.user?.avatar);
    const userBadge = useUser((s) => s.user?.badge);

    const resolved = avatar ?? userAvatar;
    const resolvedBadge = badge ?? userBadge;

    const { getSvg, setAvatar } = useAvatar(resolved?.seed ?? "default");

    useEffect(() => {
        if (resolved) setAvatar(resolved);
    }, [resolved]);

    if (!resolved) return null;

    const inner = (
        <>
            <SvgXml xml={getSvg().toString()} width={size} height={size} />
            {showBadge && resolvedBadge && (
                <View style={{ position: "absolute", top: 0, right: 0 }}>
                    <BadgeRender badge={resolvedBadge} size={size * 0.35} />
                </View>
            )}
        </>
    );

    if (!background) return inner;

    return (
        <View style={{
            height: size * 1.5,
            width: size * 1.5,
            borderRadius: 999,
            borderWidth: 2,
            borderColor: colors.card,
            backgroundColor: colors.secondaryCard,
            justifyContent: "center",
            alignItems: "center",
        }}>
            {inner}
        </View>
    );
};

export const LevelRender: React.FC<{ xp: number; level?: number; width?: DimensionValue}> = ({ xp, level = 0, width = '50%' }) => {

    const { colors, textStyles } = useTheme();
    const progress = xp % 100;

    return (
        <View style={{ width, gap: 8, flexDirection: "row" }}>
            <View className="flex-row justify-center">
                <Text style={{color: colors.button}} className={textStyles.caption}>{level}</Text>
            </View>
            <View style={{ width, height: 10, backgroundColor: colors.card, borderRadius: 5, overflow: 'hidden'}}>
                <View style={{ width: `${progress}%`, height: '100%', backgroundColor: colors.button }} />
            </View>
        </View>
    );
};

export const BreadRender: React.FC<{ bread: number; dark?: boolean; size?: DimensionValue }> = ({ bread, dark, size }) => {

    const { colors, textStyles } = useTheme(dark ? "dark" : undefined);

    return (
        <View style={{
            gap: 3,
            overflow: "hidden",
            flexDirection: "row",
        }}
            className="px-2 pt-3 items-end justify-start"
        >
            <Bread size={22} />
            <Text className={textStyles.h3}>{formatBread(bread)}</Text>
        </View>
    );
};

export const DynamicAvatarRenderer: React.FC<{ size?: number; showBadge?: boolean }> = ({ size = 20, showBadge = false }) => {

    const mood = useAvatarMood((s) => s.mood);
    const userAvatar = useUser((s) => s.user?.avatar);
    const userBadge = useUser((s) => s.user?.badge);

    const { getSvg, setAvatar } = useAvatar(userAvatar?.seed ?? "default");
    const opacity = useRef(new Animated.Value(1)).current;

    const MOOD_TRAITS: Record<Mood, Partial<Avatar>> = {
        idle: {
            eyes: "happy",
            mouth: "smile",
        },
        cooking: {
            eyes: "wide",
            mouth: "smile",
        },
        celebrating: {
            eyes: "wink",
            mouth: "laugh",
        },
        sad: {
            eyes: "humble",
            mouth: "sad",
        },
        happy: {
            eyes: "happy",
            mouth: "smile",
        },
        excited: {
            eyes: "wide",
            mouth: "laugh",
        },
        angry: {
            eyes: "bow",
            mouth: "angry",
        },
        sleepy: {
            eyes: "humble",
            mouth: "sad",
        },
        confused: {
            eyes: "wide",
            mouth: "agape",
        },
        shy: {
            eyes: "humble",
            mouth: "smile",
        },
        focused: {
            eyes: "bow",
            mouth: "smile",
        },
        surprised: {
            eyes: "wide",
            mouth: "agape",
        },
        love: {
            eyes: "wink",
            mouth: "smile",
        },
        sick: {
            eyes: "humble",
            mouth: "agape",
        },
        cool: {
            eyes: "happy",
            mouth: "laugh",
            clothes: "openJacket",
        },
    };

    useEffect(() => {
        if (!userAvatar) return;

        Animated.timing(opacity, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
            easing: Easing.out(Easing.ease),
        }).start(() => {
            setAvatar({ ...userAvatar, ...MOOD_TRAITS[mood] });

            Animated.timing(opacity, {
                toValue: 1,
                duration: 250,
                useNativeDriver: true,
                easing: Easing.in(Easing.ease),
            }).start();
        });
    }, [userAvatar, mood]);

    if (!userAvatar) return null;

    return (
        <>
            <Animated.View style={{ opacity, width: size, height: size }}>
                <SvgXml xml={getSvg().toString()} width={size} height={size} />
            </Animated.View>

            {showBadge && userBadge && (
                <View style={{ position: "absolute", top: 0, right: -5 }}>
                    <BadgeRender badge={userBadge} size={size * 0.35} />
                </View>
            )}
        </>
    );
};
