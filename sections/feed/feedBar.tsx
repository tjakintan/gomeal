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
} from "@/icons/feed_bar_icons";
import { useTheme } from "@/provider/ThemeProvider";
import { SearchIcon } from "@/icons/Icon";
import { Button } from "@/components/ButtonComponent";
import { useFeed } from "@/stores/useFeed";
import { FeedScopeType } from "@/types/feed.types";
import { GradientHeader } from "@/components/GradientComponent";
import { ACCENT_COLORS } from "@/types";

type FeedItem = {
    key: FeedScopeType;
    label: string;
    onPress: () => void;
    icon: React.ReactNode;
};

const FeedBar: React.FC<{ setASectionOpen?: (section: "search", open: boolean) => void }> = ({ setASectionOpen }) => {

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
            <View>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{
                        width: "100%",
                        paddingVertical: 5,
                        paddingHorizontal: 10,
                        alignItems: "flex-start",
                        justifyContent: "flex-start",
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
            </View>


        </GradientHeader>
    );
};

export default FeedBar