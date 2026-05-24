import FeedBar from "./feedBar";
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Dimensions,
  Modal,
  ScrollView,
} from "react-native";
import Reel from "./reel";
import { useTheme } from "@/provider/ThemeProvider";
import { useFeed } from "@/stores/useFeed";
import Tag, { EmptyTag } from "@/tags/Tag";
import { useReel } from "@/stores/useReel";
import { DietaryData, dietaryDescriptions, dietaryIcons } from "@/types";
import { filterFeedByFoodPreferences } from "../../utils/feedFilter";
import { useSettingsStore } from "@/stores/useSettings";
import { SpinningLogoImage } from "@/utils/Logo";

const { width, height } = Dimensions.get("window");

const skeletons = Array.from({ length: 6 });
const renderSkeletons = () => (
    <View className="flex-1 flex-row">
        <View
            style={{
                flex: 1,
                alignItems: "center",
                gap: 5,
            }}
        >
            {skeletons
                .filter((_, i) => i % 2 === 0)
                .map((_, i) => (
                    <EmptyTag key={`left-${i}`} delay={i * 120} />
                ))}
        </View>

        <View
            style={{
                flex: 1,
                alignItems: "center",
                gap: 5,
            }}
        >
            {skeletons
                .filter((_, i) => i % 2 !== 0)
                .map((_, i) => (
                    <EmptyTag key={`right-${i}`} delay={i * 120 + 60} />
                ))}
        </View>
    </View>
);

const Feed: React.FC<{
    isFocused?: boolean; 
    setReelOpen?: (open: boolean) => void; 
    setShowProfile?: (open: boolean) => void;
    setShowCook?: (post_id: number) => void;
    setShowSearch: (open: boolean) => void;
}> = ({ isFocused, setReelOpen, setShowProfile, setShowCook, setShowSearch }) => {

    const { colors } = useTheme();

    const {
        posts,
        loadFeed,
        loadNextFeed,
        loadingFeed,
        loadingMoreFeed,
        hasMoreFeed,
        activeReelPost,
        setActiveProfile,
        setSelectedScope,
    } = useFeed();

    const { isVisible, open, close } = useReel();  
    
    const foodPreferences = useSettingsStore((state) => state.settings.food);
    const filteredPosts = filterFeedByFoodPreferences(posts, foodPreferences);
    
    const [dietaryOverlay, setDietaryOverlay] = useState<null | {
        x: number;
        y: number;
        width: number;
        height: number;
        data: any;
        column?: 'left' | 'right';
    }>(null);

    const [refreshingColumn, setRefreshingColumn] = useState<"left" | "right" | null>(null);

    const handleRefresh = async (column: "left" | "right") => {
        if (refreshingColumn) return;

        setRefreshingColumn(column);

        try {
            setSelectedScope(null);
            await loadFeed(undefined, null, true, true);
        } finally {
            setRefreshingColumn(null);
        }
    };

    const handleLoadMore = () => {
        if (!loadingMoreFeed && hasMoreFeed && filteredPosts.length > 0) {
            loadNextFeed();
        }
    };

    useEffect(() => {
        if (isFocused === false) {
            close(() => setReelOpen?.(false));
            return;
        }
    }, [isFocused]);

    return (
        <>

            <View style={{height: 75}}>
                <FeedBar onShowSection={setShowSearch}/>
            </View>
        
            <View
                style={{ 
                    flex: 1,
                    backgroundColor: colors.background,
                }}
                className="w-full flex-col"
            >

                {(loadingFeed && !filteredPosts?.length) ? (
                    renderSkeletons()
                ) : (                
                    <View className="flex-1 flex-row">

                        {/* Left column */}
                        <View className="flex-1">

                            {refreshingColumn === "left" && (
                                <View style={{ alignItems: "center" }}>
                                    <SpinningLogoImage size={30} />
                                </View>
                            )}

                            <FlatList
                                data={filteredPosts.filter((_, i) => i % 2 === 0)}
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={{ alignItems: "center" }}
                                onEndReached={handleLoadMore}
                                onEndReachedThreshold={0.7}
                                refreshControl={
                                    <RefreshControl
                                    refreshing={refreshingColumn === "left"}
                                    onRefresh={() => handleRefresh("left")}
                                    tintColor="transparent"
                                    colors={["transparent"]}
                                    />
                                }
                                ListFooterComponent={
                                    loadingMoreFeed ? <SpinningLogoImage size={30} /> : null
                                }
                                renderItem={({ item }) => (
                                    <TouchableOpacity activeOpacity={1}>
                                        <View style={{ paddingBottom: 75 }}>
                                            <Tag
                                                card={item}
                                                flipEnabled={true}
                                                onPressInfo={() => setShowCook?.(item.post_id)}
                                                onPressProfile={() => {
                                                    setActiveProfile(item.post_id);
                                                    setShowProfile?.(true);
                                                }}
                                                onPressMedia={() => {
                                                    open(item, () => setReelOpen?.(true));
                                                }}
                                                onDietaryPress={(info) => {
                                                    setDietaryOverlay({ ...info, column: "left" });
                                                }}
                                            />
                                        </View>
                                    </TouchableOpacity>
                                )}
                            />

                        </View>

                        {/* Right column */}
                        <View className="flex-1">

                            {refreshingColumn === "right" && (
                                <View style={{ alignItems: "center" }}>
                                    <SpinningLogoImage size={30} />
                                </View>
                            )}

                            <FlatList
                                data={filteredPosts.filter((_, i) => i % 2 !== 0)}
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={{ alignItems: "center" }}
                                onEndReached={handleLoadMore}
                                onEndReachedThreshold={0.7}
                                refreshControl={
                                    <RefreshControl
                                        refreshing={refreshingColumn === "right"}
                                        onRefresh={() => handleRefresh("right")}
                                        tintColor="transparent"
                                        colors={["transparent"]}
                                    />
                                }
                                ListFooterComponent={
                                    loadingMoreFeed ? <SpinningLogoImage size={30} /> : null
                                }
                                renderItem={({ item }) => (
                                    <TouchableOpacity activeOpacity={1}>
                                        <View style={{ paddingBottom: 75 }}>
                                            <Tag
                                                card={item}
                                                flipEnabled={true}
                                                onPressInfo={() => setShowCook?.(item.post_id)}
                                                onPressProfile={() => {
                                                    setActiveProfile(item.post_id);
                                                    setShowProfile?.(true);
                                                }}
                                                onPressMedia={() => {
                                                    open(item, () => setReelOpen?.(true));
                                                }}
                                                onDietaryPress={(info) => {
                                                    setDietaryOverlay({ ...info, column: "right" });
                                                }}
                                            />
                                        </View>
                                    </TouchableOpacity>
                                )}
                            />

                        </View>

                    </View>
                )}

                {dietaryOverlay && (
                    <Modal
                        visible={!!dietaryOverlay}
                        transparent
                        animationType="none"
                    >
                        <TouchableOpacity 
                            style={StyleSheet.absoluteFill} 
                            activeOpacity={1}
                            onPress={() => setDietaryOverlay(null)}
                        >
                            <View
                                style={{
                                    position: "absolute",
                                    left: dietaryOverlay.column === 'left' ? 5.5 : undefined,
                                    right: dietaryOverlay.column === 'right' ? 5.5 : undefined,
                                    bottom: height - dietaryOverlay.y + 35,
                                    borderRadius: 20,
                                    opacity: 0.7,
                                    overflow: "hidden",
                                    borderColor: colors.card,
                                    borderWidth: 2,
                                    width: 350,
                                    height: 50,
                                    elevation: 10,
                                    shadowColor: "#000",
                                    shadowOpacity: 0.2,
                                    shadowRadius: 8,
                                    shadowOffset: { width: 0, height: 2 },
                                }}
                            >
                                <TouchableOpacity
                                    activeOpacity={1}
                                    onPress={(e) => e.stopPropagation()}
                                    style={{ flex: 1, backgroundColor: colors.background }}
                                >
                                    <ScrollView
                                        contentContainerClassName="items-center justify-center"
                                        showsVerticalScrollIndicator={false}
                                    >
                                        <TouchableOpacity activeOpacity={1} style={{width: 300, padding: 10, gap: 10 }} className="items-center justify-center">
                                            {(Object.keys(dietaryIcons) as (keyof DietaryData)[])
                                                .filter((key) => dietaryOverlay.data.dietary?.[key] === true)
                                                .map((key) => {
                                                        const Icon = dietaryIcons[key]!;
                                                        return (
                                                            <View key={key} className="flex-row gap-5 ">
                                                                <Icon size={15} color={colors.text} />
                                                                <Text style={{ color: colors.text, fontSize: 12 }}>
                                                                    {dietaryDescriptions[key]}
                                                                </Text>
                                                            </View>
                                                        );
                                                })
                                            }
                                        </TouchableOpacity>
                                    </ScrollView>
                                </TouchableOpacity>
                            </View>
                        </TouchableOpacity>
                    </Modal>

                )}
                 
            </View>

            <View 
                style={[
                    StyleSheet.absoluteFill, 
                ]}
            >
                {activeReelPost && isVisible ? (
                    <Reel
                        initialPost={activeReelPost}
                        onBack={() => close(() => setReelOpen?.(false))}
                    />
                ) : null}
            </View>


        </>
    );

};

export default Feed;
