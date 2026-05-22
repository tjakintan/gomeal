import { Input } from "@/components/InputComponent";
import { SectionHeader } from "@/components/SectionComponent";
import { SearchIcon } from "@/icons/Icon";
import { useTheme } from "@/provider/ThemeProvider";
import { useReel } from "@/stores/useReel";
import { SpinningLogoImage } from "@/utils/Logo";
import { useEffect, useState } from "react";
import { CopyIcon, SmsIcon, WhatsAppIcon, TwitterIcon, SnapchatIcon } from "@/icons/Icon";
import { StyleSheet, View, Linking, ScrollView, TouchableOpacity, Text } from "react-native";
import * as Clipboard from 'expo-clipboard';
import { Button } from "@/components/ButtonComponent";
import { useSearch } from "@/stores/useSearch";
import { AvatarRender } from "@/dashboard/Avatar";
import { useMessage } from "@/stores/useMessage";
import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { useAvatarMood } from "@/dashboard/store/useAvatar";

const FeedShare: React.FC<{post_id: number}> = ({ post_id }) => {

    const setMood = useAvatarMood((s) => s.setMood);
    const { sendMessage, sendingMessage, loadConversation} = useMessage();
    const { updateCounts } = useReel();
    const { users, loadUserSearch, loading } = useSearch();

    const { colors, textStyles } = useTheme("dark");
    const [search, setSearch] = useState("");

    const shareUrl = `https://app.gomeal.org/share/${post_id}`;
    const copyLink = async () => {
        await Clipboard.setStringAsync(shareUrl);
    };
    const shareSMS = async () => {
        const url = `sms:&body=${encodeURIComponent(shareUrl)}`;
        if (await Linking.canOpenURL(url)) {
            await Linking.openURL(url);
        }
    };
    const shareWhatsApp = async () => {
        const text = `Check this out on GoMeal: ${shareUrl}`;
        const encodedText = encodeURIComponent(text);

        const webUrl = `https://wa.me/?text=${encodedText}`;
        const appUrl = `whatsapp://send?text=${encodedText}`;

        try {
            const canOpenWhatsApp = await Linking.canOpenURL(appUrl);

            if (canOpenWhatsApp) {
                await Linking.openURL(appUrl);
                return;
            }

            await Linking.openURL(webUrl);
        } catch (error) {
            console.log("Could not open WhatsApp:", error);
            await Linking.openURL(webUrl);
        }
    };
    const shareTwitter = async () => {
        const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareUrl)}`;
        await Linking.openURL(url);
    };
    const shareToSnapchat = async () => {
        const url = `https://www.snapchat.com/share?link=${encodeURIComponent(shareUrl)}`;
        await Linking.openURL(url);
    };

    const shareActions = [
        {
            key: "copy",
            label: "Copy",
            color: undefined,
            icon: <CopyIcon size={28} />,
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
        <View style={{...StyleSheet.absoluteFillObject }}>

            <View style={{ paddingHorizontal: 10, }}>

                <SectionHeader
                    title="share"
                    titleStyle={{ color: colors.text}}
                />

                <View className="">
                    <Input
                        bottomSheet
                        multiline={false}
                        dark
                        placeholder="search"
                        value={search}
                        disabled={false}
                        onSubmitEditing={() => setSearch(search)}
                        onChangeText={(value) => setSearch(value)}
                    />  
                </View>

            </View>

            <>
                {loading || sendingMessage ? (
                    <View className="flex-1 items-center justify-center">
                        <SpinningLogoImage size={20} />
                    </View>
                ) : (
                    <ScrollView 
                        style={{ flexGrow: 0, paddingVertical: 10}}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                    >
                        <TouchableOpacity activeOpacity={1} style={{flexDirection: "row", alignItems: "center", gap: 20}}>

                            <View className="flex-row">
                                {users.map((user, index) => (
                                    <Button
                                        key={index}
                                        style={{
                                            width: 100,
                                            flexDirection: "column",
                                            alignItems: "center",
                                        }}
                                        onPress={async () => {
                                            const convo = await loadConversation(undefined, undefined, user.sub);
                                            if (!convo?.conversation?.id) return;
                                            await sendMessage(convo.conversation.id, shareUrl);
                                            updateCounts(post_id, "post_share", 1);
                                            setMood("cool", 3000);
                                        }}
                                    >
                                        <AvatarRender avatar={user?.avatar} background />
                                        <Text
                                            className={textStyles.caption}
                                            numberOfLines={1}
                                            ellipsizeMode="tail"
                                        >
                                            {user?.profile_name}
                                        </Text>
                                        <Text
                                            className={textStyles.small}
                                            numberOfLines={1}
                                            ellipsizeMode="tail"
                                        >
                                            {user?.firstName} {user?.lastName}
                                        </Text>
                                    </Button>
                                ))}
                            </View>
                            
                            <View style={{height: "80%", width: 1, backgroundColor: colors.text}}/>
                        
                            <View className="flex-row gap-5">
                                {shareActions.map((a) => (
                                    <View key={a.key} className="items-center gap-2">
                                        <Button
                                            style={{
                                                height: 60,
                                                width: 60,
                                                borderRadius: 999,
                                                backgroundColor: a.color ?? colors.background,
                                                justifyContent: "center",
                                                alignItems: "center"
                                            }}
                                            onPress={() => {
                                                a.onPress();
                                                updateCounts(post_id, "post_share", 1);
                                            }}
                                        >
                                            {a.icon}
                                        </Button>
                                        <Text className={textStyles.caption}>{a.label}</Text>
                                    </View>
                                ))} 
                            </View>

                        </TouchableOpacity>

                    </ScrollView>
                )}
            </>

        </View>
    )
};

export default FeedShare;