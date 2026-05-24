import { Button } from "@/components/ButtonComponent";
import { get_leaderboard, LeaderboardEntry, useLeaderboardListener } from "@/api/leaderboard.socket";
import { BackIcon, MessageIcon } from "@/icons/Icon";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "@/provider/ThemeProvider";
import { FlatList, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from "react-native";
import LeaderboardPodium from "../../utils/3Dblock";
import { SpinningLogoImage } from "@/utils/Logo";
import { AvatarRender, LevelRender, BreadRender, BadgeRender } from "@/dashboard/Avatar";
import BottomSheet, { BottomSheetFlatList, BottomSheetView } from "@gorhom/bottom-sheet";
import { useUser } from "@/stores/useUser";
import { BadgeLevel } from "@/types";


export default function Leaderboard() {

    const { user } = useUser();
    const { colors, textStyles } = useTheme();

    const MAX_LEVEL = 200;
    const MAX_XP = MAX_LEVEL * 100;
    const progress = Math.min((user?.xp ?? 0) / MAX_XP, 1);
    const BADGE_LEVELS = [
        { level: 1,   xp: 100,   badge: 1 as BadgeLevel },
        { level: 20,  xp: 2000,  badge: 2 as BadgeLevel },
        { level: 40,  xp: 4000,  badge: 3 as BadgeLevel },
        { level: 70,  xp: 7000,  badge: 4 as BadgeLevel },
        { level: 120, xp: 12000, badge: 5 as BadgeLevel },
        { level: 200, xp: 20000, badge: 6 as BadgeLevel },
    ];

    const sheetRef = useRef<BottomSheet>(null);
    const snapPoints = useMemo(() => [140, 140 +  325], []);

    const [rankings, setRankings] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            setLoading(true);
            const data = await get_leaderboard(10, 0);
            if (data) setRankings(data);
            setLoading(false);
        };
        fetch();
    }, []);

    useLeaderboardListener(setRankings);

    const top3 = rankings.slice(0, 3); 
    const rest = rankings.slice(3);   

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>

            <View style={{height: 125, paddingHorizontal: 25, gap: 8}} className="justify-center">

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
                            style={{
                                position: "absolute",
                                left: `${(lvlXp / MAX_XP) * 100}%`,
                                transform: [{ translateX: -8 }],
                                opacity: 0.5,
                            }}
                        >
                            {lvl}
                        </Text>
                    ))}
                </View>

            </View>

            <View style={{ height: 300, gap: 1, flexDirection: "row", paddingHorizontal: 10 }} className="w-full justify-center">

                <View style={{ justifyContent: "flex-end" }} className="items-center gap-2">
                     
                    <AvatarRender avatar={top3[1]?.avatar} badge={top3[1]?.badge} showBadge background/>

                    <Text className={textStyles.bodyMedium} numberOfLines={1} ellipsizeMode="tail" style={{ textAlign: "center", width: 120 }}>{top3[1]?.profile_name}</Text>
                    <LevelRender xp={top3[1]?.xp} level={top3[1]?.level}/>
                    <BreadRender bread={top3[1]?.bread} />
                    
                    <View>
                        <LeaderboardPodium width={120} height={75} depth={24} color={colors.card} taperRight={0} taperLeft={25} />
                        <Text className={textStyles.h1} style={{ position: "absolute", alignSelf: "center", top: 40, opacity: 0.5 }}>2</Text>
                    </View>

                </View>

                <View style={{ justifyContent: "flex-end" }} className="items-center gap-2">
                    
                    <AvatarRender avatar={top3[0]?.avatar} badge={top3[0]?.badge} showBadge background/>

                    <Text className={textStyles.bodyMedium} numberOfLines={1} ellipsizeMode="tail" style={{ textAlign: "center", fontWeight: "bold", width: 120 }}>{top3[0]?.profile_name}</Text>
                    <LevelRender xp={top3[0]?.xp} level={top3[0]?.level}/>
                    <BreadRender bread={top3[0]?.bread} />

                    <View>
                        <LeaderboardPodium width={120} height={125} depth={24} color={colors.card} taperRight={20} taperLeft={20} />
                        <Text className={textStyles.h1} style={{ position: "absolute", alignSelf: "center", top: 30, opacity: 0.5 }}>1</Text>
                    </View>

                </View>

                <View style={{ justifyContent: "flex-end" }} className="items-center gap-2">

                    <AvatarRender avatar={top3[2]?.avatar} badge={top3[2]?.badge} showBadge background/>

                    <Text className={textStyles.bodyMedium} numberOfLines={1} ellipsizeMode="tail" style={{ textAlign: "center", width: 120 }}>{top3[2]?.profile_name}</Text>
                    <LevelRender xp={top3[2]?.xp} level={top3[2]?.level}/>
                    <BreadRender bread={top3[2]?.bread} />

                    <View>
                        <LeaderboardPodium width={120} height={50} depth={24} color={colors.card} taperRight={25} taperLeft={0} />
                        <Text className={textStyles.h1} style={{ position: "absolute", alignSelf: "center", top: 30, opacity: 0.5 }}>3</Text>
                    </View>

                </View>

            </View>

            <BottomSheet
                index={0}
                ref={sheetRef}
                snapPoints={snapPoints}
                enablePanDownToClose={false}
                enableOverDrag={false}
                animateOnMount={false}
                bottomInset={125}
                enableDynamicSizing={false}
                onChange={(index) => {
                    if (index < 0) sheetRef.current?.snapToIndex(0);
                }}
                containerStyle={{justifyContent: "center", alignItems: "center",}}
                backgroundStyle={{ 
                    backgroundColor: colors.background, 
                    borderRadius: 35,
                    shadowColor: colors.text,
                    shadowOpacity: 0.15,
                    shadowRadius: 10,
                    shadowOffset: { width: 0, height: 4 },
                    elevation: 5,
                }}
                handleIndicatorStyle={{ backgroundColor: colors.secondaryCard, width: 45, height: 7 }}
            >
                <BottomSheetView 
                    style={{ 
                        position: "absolute",
                        bottom: 0,
                        left: 5,
                        right: 5,
                        alignSelf: "center",
                    }}
                >
                    {loading ? (
                        <View className="flex-1 items-center justify-center">
                            <SpinningLogoImage size={30} />
                        </View>
                    ) : (
                        <BottomSheetFlatList
                            data={rest as LeaderboardEntry[]}
                            keyExtractor={(item: LeaderboardEntry, index: number) => `${item.rank}-${index}`}
                            renderItem={({ item }: { item: LeaderboardEntry }) => (

                                <View 
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
                                        <Text numberOfLines={1}  style={{opacity: 0.5}} className={textStyles.h1}>{item.rank}</Text>
                                        <AvatarRender avatar={item.avatar} badge={item.badge} showBadge background/>
                                    </View>

                                    <View style={{flex: 1, paddingHorizontal: 10, paddingVertical: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end"}}>                                   
                                        <LevelRender xp={item.xp} level={item.level} width={50}/>
                                        <Text numberOfLines={1} ellipsizeMode="tail" className={textStyles.bodyMedium}>{item.profile_name}</Text>
                                        <BreadRender bread={item.bread} size={50}/>     
                                    </View>

                                </View>

                            )}
                        />
                    )}
                </BottomSheetView>
            </BottomSheet>

        </View>
    );
};