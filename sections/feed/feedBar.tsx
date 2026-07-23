import React, { useState } from "react";
import {
  View,
  Text,
  Animated,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import {
  HighProteinIcon,
  SoupIcon,
  AppetizerIcon,
  DessertIcon,
  FiveSecondsIcon,
} from "@/icons/feed_bar_icons";
import { useTheme } from "@/provider/ThemeProvider";
import { useReel } from "@/stores/useReel";
import { SearchIcon } from "@/icons/Icon";
import { Button } from "@/components/ButtonComponent";
import { useFeed } from "@/stores/useFeed";
import { FeedScopeType } from "@/types/feed.types";
import { GradientHeader } from "@/components/GradientComponent";

type FeedItem = {
    key: FeedScopeType;
    label: string;
    onPress: () => void;
    icon: React.ReactNode;
};

const FeedBar: React.FC<{onShowSection: (open: boolean) => void}> = ({ onShowSection }) => {

    const { colors, textStyles } = useTheme();
    const { selectedScope, setSelectedScope, loadFeed } = useFeed();

    const handleScopePress = async (scope: FeedScopeType) => {
        const nextScope: FeedScopeType | null = selectedScope === scope ? null : scope;
        setSelectedScope(nextScope);
        await loadFeed(undefined, nextScope, false, true);
    };

    const feedItems: FeedItem[] = [
        {
            key: "high_protein",
            label: "Protein",
            onPress: () => handleScopePress("high_protein"),
            icon: <HighProteinIcon size={30} />,
        },
        {
            key: "soup",
            label: "Soup",
            onPress: () => handleScopePress("soup"),
            icon: <SoupIcon size={30} />,
        },
        {
            key: "appetizer",
            label: "Snack",
            onPress: () => handleScopePress("appetizer"),
            icon: <AppetizerIcon size={30} />,
        },
        {
            key: "dessert",
            label: "Dessert",
            onPress: () => handleScopePress("dessert"),
            icon: <DessertIcon size={30} />,
        },
        {
            key: "quick",
            label: "Quick",
            onPress: () => handleScopePress("quick"),
            icon: <FiveSecondsIcon size={30} color={colors.text} />, 
        },
    ];

    const handleSearchPress = () => {
        onShowSection?.(true)
    };

    return (
        <GradientHeader
            baseColor={colors.background}
            contentStyle={{
                flex: 1,
                flexDirection: "row",
                justifyContent: "center"
            }}
        >
            <View>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{
                        alignItems: "center",
                        gap: 5,
                        paddingRight: 4,
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
                                        height: 50,
                                        width: 50,
                                        borderRadius: 50,
                                        borderWidth: isActive ? 2 : 0,
                                        borderColor: isActive ? colors.secondaryCard : colors.card,
                                    }}
                                >
                                    {item.icon}
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
            </View>

            <View>
                <View className="flex-1 w-full pb-3 justify-center">
                    <Button
                        style={{
                            width: 50,
                            height: 50,
                            alignSelf: "center",
                        }}
                        onPress={handleSearchPress}
                        clearBackground
                    >
                        <SearchIcon color={colors.text} size={20} />
                    </Button>
                </View>
            </View>
        </GradientHeader>
    );
};

export default FeedBar