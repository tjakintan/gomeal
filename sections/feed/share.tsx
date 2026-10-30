import { API_BASE } from "@/config";
import { Input } from "@/components/InputComponent";
import { SectionHeader } from "@/components/SectionComponent";
import { MoreIcon, SearchIcon, ShareHeaderIcon } from "@/icons/Icon";
import { useTheme } from "@/provider/ThemeProvider";
import { useReel } from "@/stores/useReel";
import { SpinningLogoImage } from "@/utils/Logo";
import { useEffect, useRef, useState } from "react";
import { CopyIcon, SmsIcon, WhatsAppIcon, TwitterIcon, SnapchatIcon } from "@/icons/Icon";
import { View, Linking, ScrollView, Text, useWindowDimensions } from "react-native";
import * as Clipboard from 'expo-clipboard';
import { Button } from "@/components/ButtonComponent";
import { useSearch } from "@/stores/useSearch";
import { AvatarRender, DynamicAvatarRenderer } from "@/dashboard/Avatar";
import { useMessage } from "@/stores/useMessage";
import { Share } from "react-native";
import { useAvatarMood } from "@/stores/useAvatar";
import { useFeed } from "@/stores/useFeed";
import { capitalize, limitLength } from "@/utils/text";
import { useSlidingOverlay } from "@/stores/useSlideOverlay";
import MessageScreen from "../messages/messages";
import { useBottomSheet } from "@/stores/useBottomSheet";

import {
    Animated,
    Easing,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const FeedShare: React.FC<{post_id: number; dark?: boolean}> = ({ post_id, dark }) => {

    const sendMessage = useMessage((s) => s.sendMessage);
    const sendingMessage = useMessage((s) => s.sendingMessage);
    const loadConversation = useMessage((s) => s.loadConversation);

    const updatePostEverywhere = useFeed((s) => s.updatePostEverywhere);

    const openSlidingOverlay = useSlidingOverlay((s) => s.openSlidingOverlay);
    const closeSlidingOverlay = useSlidingOverlay((s) => s.closeSlidingOverlay);
    const closeBottomSheet = useBottomSheet((s) => s.closeBottomSheet);

    const insets = useSafeAreaInsets();
    const { height: screenHeight, width: screenWidth } = useWindowDimensions();
    const isLandscape = screenWidth > screenHeight;

    const users = useSearch((s) => s.users);
    const loadUserSearch = useSearch((s) => s.loadUserSearch);
    const loading = useSearch((s) => s.loading);

    const { colors, textStyles } = useTheme(dark ? "dark" : undefined);
    const [search, setSearch] = useState("");

    const incrementShareCount = () => {
        updatePostEverywhere(post_id, (post: any) => ({
            ...post,
            action_counts: {
                ...post.action_counts,
                post_share: (post.action_counts?.post_share ?? 0) + 1,
            },
        }));
    };

    const shareUrl = `${API_BASE}/share/${post_id}`;

    const copyLink = async (): Promise<boolean> => {
        await Clipboard.setStringAsync(shareUrl);
        return true;
    };

    const shareSMS = async (): Promise<boolean> => {
        const url = `sms:&body=${encodeURIComponent(shareUrl)}`;

        if (!(await Linking.canOpenURL(url))) {
            return false;
        }

        await Linking.openURL(url);
        return true;
    };

    const shareWhatsApp = async (): Promise<boolean> => {
        const text = `Check this out on GoMeal: ${shareUrl}`;
        const encodedText = encodeURIComponent(text);

        const appUrl = `whatsapp://send?text=${encodedText}`;
        const webUrl = `https://wa.me/?text=${encodedText}`;

        try {
            if (await Linking.canOpenURL(appUrl)) {
                await Linking.openURL(appUrl);
                return true;
            }

            await Linking.openURL(webUrl);
            return true;
        } catch (error) {
            console.log("Could not open WhatsApp:", error);
            return false;
        }
    };

    const shareTwitter = async (): Promise<boolean> => {
        const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareUrl)}`;

        try {
            await Linking.openURL(url);
            return true;
        } catch {
            return false;
        }
    };

    const shareToSnapchat = async (): Promise<boolean> => {
        const url = `https://www.snapchat.com/share?link=${encodeURIComponent(shareUrl)}`;

        try {
            await Linking.openURL(url);
            return true;
        } catch {
            return false;
        }
    };

    const shareMore = async (): Promise<boolean> => {
        try {
            const result = await Share.share({
                message: `Check this out on GoMeal: ${shareUrl}`,
                url: shareUrl,
                title: "Share GoMeal Post",
            });

            return result.action === Share.sharedAction;
        } catch (error) {
            console.error(error);
            return false;
        }
    };

    const shareActions = [
        {
            key: "more",
            label: "More",
            icon: <MoreIcon size={28} color={colors.text}/>,
            onPress: shareMore,
        },
        {
            key: "copy",
            label: "Copy",
            color: undefined,
            icon: <CopyIcon size={28} color={colors.text} />,
            onPress: copyLink,
        },
        {
            key: "sms",
            label: "SMS",
            color: "green",
            icon: <SmsIcon  size={28} />,
            onPress: shareSMS,
        },
        
        {
            key: "whatsapp",
            label: "WhatsApp",
            color: "green",
            icon: <WhatsAppIcon size={28} />,
            onPress: shareWhatsApp,
        },
        {
            key: "twitter",
            label: "Twitter",
            color: "black",
            icon: <TwitterIcon size={28} />,
            onPress: shareTwitter,
        },
        {
            key: "snapchat",
            label: "Snapchat",
            color: "yellow",
            icon: <SnapchatIcon  size={28} />,
            onPress: shareToSnapchat,
        },
    ];

    useEffect(() => {

        if (search.trim().length <  3) return
        const fetchUser = async () => await loadUserSearch(search);
        fetchUser();

    }, [search])

    return (
        <View style={{ paddingBottom: isLandscape ? 0 : insets.bottom }}>

            <View>

                <SectionHeader
                    title="share"
                    titleStyle={{ color: colors.text}}
                    titleClassName={textStyles.h3}
                    leftIcon={<ShareHeaderIcon color={colors.button} />}
                    dark={dark}
                />

                <View 
                    style={{
                        paddingHorizontal: 15,
                        paddingTop: 5,
                    }}
                >
                    <Input
                        bottomSheet
                        multiline={false}
                        dark={dark}
                        placeholder="search"
                        value={search}
                        disabled={false}
                        onSubmitEditing={() => setSearch(search)}
                        onChangeText={(value) => setSearch(value)}
                    />  
                </View>

            </View>

            <>
                {loading ? (
                    <EmptyShare dark={dark} />
                ) : (
                    <ScrollView
                        style={{ flexGrow: 0, paddingVertical: 10 }}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Users appear first */}
                        <ScrollView
                            horizontal
                            nestedScrollEnabled
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 5,
                            }}
                        >
                            {users.map((user, index) => (
                                <Button
                                    key={index}
                                    style={{
                                        width: 100,
                                        flexDirection: "column",
                                        alignItems: "center",
                                        opacity: sendingMessage ? 0.5 : 1
                                    }}
                                    onPress={async () => {
                                        const convo = await loadConversation(
                                            undefined,
                                            undefined,
                                            user.sub
                                        );

                                        if (!convo?.conversation?.id) return;

                                        await sendMessage(convo.conversation.id, shareUrl);

                                        if (!isLandscape) {
                                            openSlidingOverlay(
                                                <MessageScreen
                                                    onClose={() => closeSlidingOverlay()}
                                                    conversation_id={convo.conversation.id}
                                                    receiver_sub={convo.receiver_sub}
                                                />
                                            )
                                        }

                                        closeBottomSheet();

                                        incrementShareCount();

                                    }}
                                    disabled={sendingMessage}
                                >
                                    <DynamicAvatarRenderer
                                        avatar={user?.avatar}
                                        xp={user?.xp}
                                        badge={user?.badge}
                                        showBadge
                                        showProgress
                                        background
                                        size={25}
                                    />

                                    <Text
                                        className={textStyles.sectionText}
                                        numberOfLines={1}
                                        ellipsizeMode="tail"
                                    >
                                        @{limitLength(user?.profile_name ?? "", 25)}
                                    </Text>

                                    <Text
                                        className={textStyles.body}
                                        numberOfLines={1}
                                        ellipsizeMode="tail"
                                        style={{
                                            color: colors.secondaryText,
                                            opacity: 0.8,
                                            fontSize: 14,
                                        }}
                                    >
                                        {capitalize(limitLength(user?.firstName ?? "", 25))}{" "}
                                        {capitalize(limitLength(user?.lastName ?? "", 35))}
                                    </Text>
                                </Button>
                            ))}
                        </ScrollView>

                        {/* Share options appear underneath */}
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{
                                flexDirection: "row",
                                justifyContent: "flex-start",
                                alignItems: "center",
                                gap: 20,
                                paddingTop: 15,
                            }}
                        >
                            {shareActions.map((a) => (
                                <View key={a.key} className="items-center gap-2">
                                    <Button
                                        style={{
                                            height: 60,
                                            width: 60,
                                            borderRadius: 999,
                                            backgroundColor: a.color ?? colors.background,
                                            justifyContent: "center",
                                            alignItems: "center",
                                        }}
                                        onPress={async () => {
                                            const success = await a.onPress();

                                            if (success) {
                                                closeBottomSheet();
                                                incrementShareCount();
                                            }
                                        }}
                                    >
                                        {a.icon}
                                    </Button>
                                </View>
                            ))}
                        </ScrollView>
                    </ScrollView>
                )}
            </>

        </View>
    )
};

const EmptyShare: React.FC<{ dark?: boolean }> = ({ dark }) => {
    const { colors } = useTheme(dark ? "dark" : undefined);

    const glow = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(glow, {
                    toValue: 1,
                    duration: 900,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: false,
                }),
                Animated.timing(glow, {
                    toValue: 0,
                    duration: 900,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: false,
                }),
            ])
        );

        animation.start();

        return () => animation.stop();
    }, [glow]);

    const backgroundColor = glow.interpolate({
        inputRange: [0, 1],
        outputRange: [
            colors.secondaryText + "12",
            colors.secondaryText + "38",
        ],
    });

    const Skeleton = ({
        width,
        height,
        radius = 5,
    }: {
        width: number;
        height: number;
        radius?: number;
    }) => (
        <Animated.View
            style={{
                width,
                height,
                borderRadius: radius,
                backgroundColor,
            }}
        />
    );

    return (
        <View style={{ paddingVertical: 15, gap: 25 }}>
            
            <ScrollView
                horizontal
                scrollEnabled={false}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 5,
                }}
            >
                {Array.from({ length: 5 }).map((_, index) => (
                    <View
                        key={`user-${index}`}
                        style={{
                            width: 100,
                            alignItems: "center",
                            gap: 7,
                        }}
                    >
                        <Skeleton width={50} height={50} radius={25} />
                        <Skeleton width={65} height={10} />
                        <Skeleton width={45} height={8} />
                    </View>
                ))}
            </ScrollView>

        </View>
    );
};


export default FeedShare;