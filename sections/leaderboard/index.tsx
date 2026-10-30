import { Button } from "@/components/ButtonComponent";
import { get_leaderboard, LeaderboardEntry, useLeaderboardListener } from "@/api/leaderboard.socket";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "@/provider/ThemeProvider";
import { Animated, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import LeaderboardPodium from "../../utils/3Dblock";
import { AvatarRender, LevelRender, BreadRender, BadgeRender } from "@/dashboard/Avatar";
import { useUser } from "@/stores/useUser";
import { BadgeLevel, BOTTOM_INSETS, BOTTOM_SNAP_POINTS } from "@/types";
import { useFeed } from "@/stores/useFeed";
import FeedProfile from "../feed/feedProfile";
import { useSlidingOverlay } from "@/stores/useSlideOverlay";

const BADGE_LEVELS: { level: number; xp: number; badge: BadgeLevel }[] = [
    { level: 1,   xp: 100,   badge: 1 },
    { level: 20,  xp: 2000,  badge: 2 },
    { level: 40,  xp: 4000,  badge: 3 },
    { level: 70,  xp: 7000,  badge: 4 },
    { level: 120, xp: 12000, badge: 5 },
    { level: 200, xp: 20000, badge: 6 },
];

const PodiumSpot: React.FC<{
    entry?: LeaderboardEntry;
    rank: 1 | 2 | 3;
    colors: any;
    textStyles: any;
    onPress: () => void;
}> = ({ entry, rank, colors, textStyles, onPress }) => {
    const dims = {
        1: { width: 120, height: 125, depth: 24, taperLeft: 20, taperRight: 20, top: 30 },
        2: { width: 120, height: 75,  depth: 24, taperLeft: 25, taperRight: 0,  top: 40 },
        3: { width: 120, height: 50,  depth: 24, taperLeft: 0,  taperRight: 25, top: 30 },
    }[rank];

    return (
        <View style={{ justifyContent: "flex-end" }} className="items-center gap-2">
            <Button onPress={onPress}>
                <AvatarRender avatar={entry?.avatar} badge={entry?.badge} showBadge background />
            </Button>
            <Text
                className={textStyles.bodyMedium}
                numberOfLines={1}
                ellipsizeMode="tail"
                style={{ textAlign: "center", width: 120, fontWeight: rank === 1 ? "bold" : "normal" }}
            >
                {entry?.profile_name}
            </Text>
            <LevelRender xp={entry?.xp ?? 0} level={entry?.level} />
            <BreadRender bread={entry?.bread ?? 0} />
            <View>
                <LeaderboardPodium
                    width={dims.width}
                    height={dims.height}
                    depth={dims.depth}
                    color={colors.card}
                    taperLeft={dims.taperLeft}
                    taperRight={dims.taperRight}
                />
                <Text className={textStyles.h1} style={{ position: "absolute", alignSelf: "center", top: dims.top, opacity: 0.5 }}>
                    {rank}
                </Text>
            </View>
        </View>
    );
};

const Leaderboard: React.FC<{ isFocused?: boolean }> = ({ isFocused }) => {
    const { user } = useUser();
    const { colors, textStyles } = useTheme();
    const { setActiveProfile, clearActiveProfile } = useFeed();

    const MAX_LEVEL = 200;
    const MAX_XP = MAX_LEVEL * 100;
    const progress = Math.min((user?.xp ?? 0) / MAX_XP, 1);

    const { openSlidingOverlay, closeSlidingOverlay } = useSlidingOverlay();

    const [rankings, setRankings] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const top3 = rankings.slice(0, 3);
    const rest = rankings.slice(3);

    useEffect(() => {
        if (isFocused) {
            closeSlidingOverlay();
        }
    }, [isFocused]);

    const isOpeningProfileRef = useRef(false);
    const openProfile = async (sub?: string) => {
        if (isOpeningProfileRef.current) return;
        isOpeningProfileRef.current = true;

        try {
            await setActiveProfile(undefined, sub);

            openSlidingOverlay(
                <FeedProfile
                    onClose={() => {
                        closeSlidingOverlay();
                        clearActiveProfile();
                    }}
                />
            );
        } finally {
            isOpeningProfileRef.current = false;
        }
    };

    const PAGE_SIZE = 20;
    const [cursor, setCursor] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    const refreshLeaderboard = useCallback(async () => {
        const page = await get_leaderboard(PAGE_SIZE, 0);

        if (!page) return;

        setRankings(page.rankings);
        setCursor(page.nextCursor);
        setHasMore(page.hasMore);

    }, []);

    const handleRefresh = useCallback(async () => {
        if (refreshing) return;

        setRefreshing(true);

        try {
            await refreshLeaderboard();
        } finally {
            setRefreshing(false);
        }
    }, [refreshing, refreshLeaderboard]);

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            await refreshLeaderboard();
            setLoading(false);
        };
        init();
    }, [refreshLeaderboard]);

    useLeaderboardListener(refreshLeaderboard);

    const loadMore = async () => {
        if (loadingMore || !hasMore || refreshing) return;
        setLoadingMore(true);
        const page = await get_leaderboard(PAGE_SIZE, cursor);
        if (page) {
            setRankings((prev) => [...prev, ...page.rankings]);
            setCursor(page.nextCursor);
            setHasMore(page.hasMore);
        }
        setLoadingMore(false);
    };

    const ListHeader = useMemo(() => (
        
        <TouchableOpacity activeOpacity={1}>

            <View style={{ height: 125, marginHorizontal: 10, paddingHorizontal: 25, gap: 8 }} className="justify-center">

                <View style={{ flexDirection: "row", position: "relative", height: 40 }}>
                    {user && BADGE_LEVELS.map(({ xp: lvlXp, badge }) => (
                        <View
                            key={badge}
                            style={{
                                position: "absolute",
                                left: `${(lvlXp / MAX_XP) * 100}%`,
                                transform: [{ translateX: -16 }],
                                alignItems: "center",
                                opacity: user.badge >= badge ? 1 : 0.3,
                            }}
                        >
                            <View style={{
                                width: 32,
                                height: 32,
                                borderRadius: 999,
                                backgroundColor: colors.background,
                                borderWidth: user.badge >= badge ? 2 : 1,
                                borderColor: user.badge >= badge ? colors.button : colors.secondaryCard,
                                justifyContent: "center",
                                alignItems: "center",
                            }}>
                                <BadgeRender badge={badge} size={15} />
                            </View>
                        </View>
                    ))}
                </View>

                <View style={{ height: 8, backgroundColor: colors.card, borderRadius: 99, overflow: "hidden" }}>
                    <View style={{ width: `${progress * 100}%`, height: "100%", backgroundColor: colors.button, borderRadius: 99 }} />
                </View>

                <View style={{ flexDirection: "row", position: "relative", height: 16 }}>
                    {BADGE_LEVELS.map(({ level: lvl, xp: lvlXp }) => (
                        <Text
                            key={lvl}
                            className={textStyles.caption}
                            style={{ position: "absolute", left: `${(lvlXp / MAX_XP) * 100}%`, transform: [{ translateX: -8 }], opacity: 0.5 }}
                        >
                            {lvl}
                        </Text>
                    ))}
                </View>

            </View>

            <TouchableOpacity activeOpacity={1} style={{ height: 300, gap: 1, flexDirection: "row", paddingHorizontal: 10 }} className="w-full justify-center">
                <PodiumSpot entry={top3[1]} rank={2} colors={colors} textStyles={textStyles} onPress={() => openProfile(top3[1]?.sub)} />
                <PodiumSpot entry={top3[0]} rank={1} colors={colors} textStyles={textStyles} onPress={() => openProfile(top3[0]?.sub)} />
                <PodiumSpot entry={top3[2]} rank={3} colors={colors} textStyles={textStyles} onPress={() => openProfile(top3[2]?.sub)} />
            </TouchableOpacity>

        </TouchableOpacity>
    
    ), [user, progress, top3, colors, textStyles]);

    if (loading) {
        return (
            <EmptyLeaderboard />
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: colors.background}}>
            
            <FlatList
                data={rest}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor={"transparent"}
                        colors={["transparent"]}
                    />
                }
                nestedScrollEnabled
                bounces
                alwaysBounceVertical
                onEndReached={loadMore}
                onEndReachedThreshold={0.5}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={ListHeader}
                contentContainerStyle={{ paddingBottom: BOTTOM_INSETS  }}
                keyExtractor={(item) => item.sub}
                renderItem={({ item }) => (
                    <TouchableOpacity 
                        activeOpacity={1} 
                        style={{
                            height: 100,
                            flexDirection: "row",
                            justifyContent: "space-between",
                            marginVertical: 5,
                            marginHorizontal: 10,
                            padding: 10,
                            borderBottomWidth: 1,
                            borderBottomColor: colors.background,
                        }}
                    >
                        <View style={{ width: 100, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                            <Text numberOfLines={1} style={{ opacity: 0.5 }} className={textStyles.h1}>{item.rank}</Text>
                            <Button onPress={() => openProfile(item.sub)}>
                                <AvatarRender avatar={item.avatar} badge={item.badge} showBadge background />
                            </Button>
                        </View>

                        <View style={{ flex: 1, paddingHorizontal: 10, paddingVertical: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
                            <LevelRender xp={item.xp} level={item.level} width={50} />
                            <Text numberOfLines={1} ellipsizeMode="tail" className={textStyles.bodyMedium}>{item.profile_name}</Text>
                            <BreadRender bread={item.bread} size={50} />
                        </View>
                    </TouchableOpacity>
                )}
            />

        </View>
    );
};

const EmptyLeaderboard = () => {
    const { colors } = useTheme();

    const opacity = useRef(new Animated.Value(0.45)).current;

    useEffect(() => {
        const anim = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: 0.9,
                    duration: 700,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0.45,
                    duration: 700,
                    useNativeDriver: true,
                }),
            ])
        );

        anim.start();

        return () => anim.stop();
    }, []);

    const bone = (
        width: number | `${number}%`,
        height: number,
        radius = 8
    ) => (
        <Animated.View
            style={{
                width,
                height,
                borderRadius: radius,
                backgroundColor: colors.card,
                opacity,
            }}
        />
    );

    return (
        <View
            style={{
                flex: 1,
                backgroundColor: colors.background,
            }}
        >
            {/* XP Progress */}
            <View
                style={{
                    height: 125,
                    marginHorizontal: 10,
                    paddingHorizontal: 25,
                    justifyContent: "center",
                    gap: 12,
                }}
            >
                {/* badges */}
                <View
                    style={{
                        height: 40,
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                    }}
                >
                    {[1,2,3,4,5,6].map((i)=>(
                        <View key={i}>
                            {bone(32,32,999)}
                        </View>
                    ))}
                </View>


                {/* progress bar */}
                {bone("100%",8,99)}


                {/* levels */}
                <View
                    style={{
                        flexDirection:"row",
                        justifyContent:"space-between",
                    }}
                >
                    {[1,2,3,4,5,6].map(i=>(
                        <View key={i}>
                            {bone(15,10)}
                        </View>
                    ))}
                </View>
            </View>


            {/* Podium */}
            <View
                style={{
                    height:300,
                    flexDirection:"row",
                    justifyContent:"center",
                    alignItems:"flex-end",
                    gap:10,
                }}
            >

                {[75,125,50].map((height,index)=>(
                    <View
                        key={index}
                        style={{
                            alignItems:"center",
                            justifyContent:"flex-end",
                            gap:10,
                        }}
                    >

                        {bone(55,55,999)}
                        {bone(70,12)}
                        {bone(45,10)}

                        {bone(120,height,10)}

                    </View>
                ))}

            </View>


            {/* Leaderboard rows */}
            <View
                style={{
                    flex:1,
                    paddingHorizontal:10,
                }}
            >
                {Array.from({length:6}).map((_,index)=>(
                    <View
                        key={index}
                        style={{
                            height:100,
                            marginVertical:5,
                            padding:10,
                            flexDirection:"row",
                            alignItems:"center",
                            gap:15,
                        }}
                    >

                        {bone(30,20)}
                        {bone(50,50,999)}

                        <View
                            style={{
                                flex:1,
                                gap:8,
                            }}
                        >
                            {bone("60%",12)}
                            {bone("35%",10)}
                        </View>

                        {bone(45,45,999)}

                    </View>
                ))}
            </View>
        </View>
    );
};

export default Leaderboard;