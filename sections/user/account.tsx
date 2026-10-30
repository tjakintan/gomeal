import { Button } from "@/components/ButtonComponent";
import { DobInput, Input } from "@/components/InputComponent";
import { SectionHeader } from "@/components/SectionComponent";
import { AvatarRender } from "@/dashboard/Avatar";
import { BackIcon, CheckIcon, EditIcon, PersonSettingIcon, PersonXIcon } from "@/icons/Icon";
import { useTheme } from "@/provider/ThemeProvider";
import { useFeed } from "@/stores/useFeed";
import { useBlockUser } from "@/stores/useReport";
import { useUser } from "@/stores/useUser";
import { useEffect, useRef, useState } from "react";
import { Animated, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { getDobParts, isValidDob } from "@/utils/time";
import { useProfile } from "@/stores/useProfile";
import { UpdateUserProfile } from "@/types/profile.types";
import { SpinningLogoImage } from "@/utils/Logo";
import { ACCENT_COLORS, BOTTOM_INSETS } from "@/types";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GradientHeader } from "@/components/GradientComponent";
import { usePostHog } from "posthog-react-native";
import { useBanner } from "@/stores/useBanner";
import { useSlidingOverlay } from "@/stores/useSlideOverlay";

const MENU_HEIGHT = 65;


export const InfoMainScreen: React.FC<{ onClose: () => void }> = ({ onClose }) => {

    const insets = useSafeAreaInsets();
    const { colors, textStyles } = useTheme();

    const { openSlidingOverlay, closeSlidingOverlay } = useSlidingOverlay();

    const handleOpenBlock = () => {
        openSlidingOverlay(
            <BlockSection onClose={closeSlidingOverlay} />,
        );
    };

    const handleOpenUpdate = () => {
        openSlidingOverlay(
            <UpdateSection onClose={closeSlidingOverlay} />,
        );
    };

    return (
        <View
            style={{
                ...StyleSheet.absoluteFillObject,
                backgroundColor: colors.background,
                paddingTop: insets.top,
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
                <Button onPress={() => onClose?.()} clearBackground>
                    <BackIcon color={colors.text} />
                </Button>

                <SectionHeader
                    title="Account"
                    showBackground
                    titleClassName={textStyles.h3}
                    leftIcon={<PersonSettingIcon color={colors.button} size={30} />}
                />

            </View>

            <View
                style={{
                    flex: 1,
                    gap: 10,
                    padding: 10,
                }}
            >
                <Button
                    onPress={handleOpenUpdate}
                    style={{
                        width: "100%",
                        height: 95,
                        borderRadius: 20,
                        paddingHorizontal: 16,
                        justifyContent: "center",
                        alignItems: "flex-start",
                    }}
                >
                    <View
                        style={{
                            width: "100%",
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 12,
                        }}
                    >
                        <View style={{ flex: 1 }}>
                            <Text
                                className={textStyles.section}
                                style={{ color: colors.text }}
                            >
                                Update
                            </Text>

                            <Text
                                className={textStyles.small}
                                numberOfLines={1}
                                style={{ color: colors.secondaryText }}
                            >
                                Change your name, profile name and preferences
                            </Text>
                        </View>

                        <EditIcon color={colors.text} />
                    </View>
                </Button>

                <Button
                    onPress={handleOpenBlock}
                    style={{
                        width: "100%",
                        height: 95,
                        borderRadius: 20,
                        paddingHorizontal: 16,
                        justifyContent: "center",
                        alignItems: "flex-start",
                    }}
                >
                    <View
                        style={{
                            width: "100%",
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 12,
                        }}
                    >
                        <View style={{ flex: 1 }}>
                            <Text
                                className={textStyles.section}
                                style={{ color: colors.text }}
                            >
                                Blocked
                            </Text>

                            <Text
                                className={textStyles.small}
                                numberOfLines={1}
                                style={{ color: colors.secondaryText }}
                            >
                                Hidden users, muted content, and restrictions
                            </Text>
                        </View>

                        <PersonXIcon color={colors.text} />
                    </View>
                </Button>
            </View>

        </View>
    );

};


const BlockSection: React.FC<{ onClose: () => void }> = ({ onClose }) => {

    const banner = useBanner();
    const posthog = usePostHog();
    const insets = useSafeAreaInsets();
    const { colors, textStyles } = useTheme();

    const {
        blockedUsers,
        loadingBlockedUsers,
        getBlockedUsers,
        removeBlockedUser,
    } = useBlockUser();

    const loadFeed = useFeed((state) => state.loadFeed);
    const loadReel = useFeed((state) => state.loadReel);
    const selectedScope = useFeed((state) => state.selectedScope);

    useEffect(() => {
        getBlockedUsers();
    }, [getBlockedUsers]);

    return (
        <View
            style={{
                ...StyleSheet.absoluteFillObject,
                backgroundColor: colors.background,
            }}
        >
            <GradientHeader
                height={MENU_HEIGHT + 50}
                baseColor={colors.background}
                style={{
                    paddingTop: insets.top
                }}
                contentStyle={{
                    height: MENU_HEIGHT + 50,
                    paddingHorizontal: 20,
                    alignItems: "center",
                    flexDirection: "row",
                }}
            >
                <Button onPress={() => onClose?.()} clearBackground>
                    <BackIcon color={colors.text} />
                </Button>

                <SectionHeader
                    title="Blocked users"
                    subtitle="Removing a blocked user will allow them to interact with you once more."
                    showBackground
                    showDivider
                    titleClassName={textStyles.h3}
                    leftIcon={<PersonXIcon size={30} color={colors.button} />}
                />

            </GradientHeader>

            <View style={{ flex: 1, padding: 10, paddingTop: MENU_HEIGHT + 50 + insets.top }}>
                {loadingBlockedUsers ? (
                    <EmptyBlockSection />
                ) : !blockedUsers.length ? (
                    <View style={{ paddingBottom: BOTTOM_INSETS}} className="flex-1 items-center justify-center">
                        <Text
                            className={textStyles.caption}
                        >
                            None yet 
                        </Text>
                    </View>
                ) : (
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{
                            gap: 10,
                            paddingBottom: BOTTOM_INSETS
                        }}
                    >
                        {blockedUsers.map((user) => (
                            <View
                                key={user.sub}
                                style={{
                                    width: "100%",
                                    height: 85,
                                    borderRadius: 20,
                                    borderWidth: 2,
                                    paddingHorizontal: 14,
                                    backgroundColor: colors.card,
                                    borderColor: colors.secondaryCard,
                                    flexDirection: "row",
                                    alignItems: "center",
                                    gap: 12,
                                }}
                            >
                                <AvatarRender avatar={user?.avatar} size={30}/>

                                <View style={{ flex: 1 }}>
                                    <Text
                                        className={textStyles.sectionText}
                                        numberOfLines={1}
                                        style={{ color: colors.text }}
                                    >
                                        {user.profile_name}
                                    </Text>

                                    <Text
                                        className={textStyles.small}
                                        numberOfLines={1}
                                        style={{ color: colors.secondaryText }}
                                    >
                                        {[user.firstName, user.lastName].filter(Boolean).join(" ")}
                                    </Text>
                                </View>

                                <Button
                                    onPress={async () => {
                                        await removeBlockedUser(user.sub);
                                        posthog.capture("[Trust] => user_unblocked", { target_sub: user.sub });
                                        banner.success(`@${user.profile_name} has been unblocked.`)
                                        await Promise.all([
                                            loadFeed(undefined, selectedScope, false, true),
                                            loadReel(undefined, selectedScope, false, true),
                                        ]);
                                    }}
                                    style={{
                                        width: 75,
                                        backgroundColor: colors.danger,
                                    }}
                                    background
                                >
                                    <Text className={textStyles.body} style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
                                        Unblock
                                    </Text>
                                </Button>
                            </View>
                        ))}
                    </ScrollView>
                )}
            </View>
        </View>
    );
};

const UpdateSection: React.FC<{ onClose: () => void }> = ({ onClose }) => {

    const insets = useSafeAreaInsets();
    const { user } = useUser();
    const { loading, updateProfile } = useProfile();
    const { colors, textStyles } = useTheme();
    
    const [dobError, setDobError] = useState("");
    const [formError, setFormError] = useState("");
    const normalize = (value?: string | null) => (value ?? "").trim();

    const [dob, setDob] = useState("");
    const [profile_name, setProfileName] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");

    const isEmpty =
        !normalize(profile_name) &&
        !normalize(firstName) &&
        !normalize(lastName) &&
        !normalize(dob);
    
    const handleConfirm = async () => {
        const nextProfileName = normalize(profile_name);
        const nextFirstName = normalize(firstName);
        const nextLastName = normalize(lastName);
        const nextDob = normalize(dob);

        const updates: UpdateUserProfile = {};

        if (nextProfileName) updates.profile_name = nextProfileName;
        if (nextFirstName) updates.firstName = nextFirstName;
        if (nextLastName) updates.lastName = nextLastName;

        if (nextDob) {
            const [dobMonth, dobDay, dobYear] = getDobParts(nextDob);
            if (!isValidDob(dobMonth, dobDay, dobYear)) {
                setDobError("Invalid");
                return;
            }
            updates.dob = nextDob;
        }

        if (Object.keys(updates).length === 0) return;

        const sameDetails =
            (!updates.profile_name || updates.profile_name === normalize(user?.profile_name)) &&
            (!updates.firstName || updates.firstName === normalize(user?.firstName)) &&
            (!updates.lastName || updates.lastName === normalize(user?.lastName)) &&
            (!updates.dob || updates.dob === normalize(user?.dob));

        if (sameDetails) return;

        setFormError("");
        setDobError("");

        await updateProfile(updates);
    };

    return (
        <View
            style={{
                ...StyleSheet.absoluteFillObject,
                backgroundColor: colors.background,
                paddingBottom: BOTTOM_INSETS
            }}
        >
            <GradientHeader
                height={MENU_HEIGHT}
                baseColor={colors.background}
                style={{
                    paddingTop: insets.top
                }}
                contentStyle={{
                    height: MENU_HEIGHT,
                    paddingHorizontal: 20,
                    alignItems: "center",
                    flexDirection: "row",
                }}
            >
                <Button onPress={() => onClose?.()} clearBackground>
                    <BackIcon color={colors.text} />
                </Button>

                <View
                    style={{
                        flex: 1,
                        minWidth: 0,
                        overflow: "hidden",
                    }}
                >
                    <SectionHeader
                        title="Update"
                        showBackground
                        titleClassName={textStyles.h3}
                        leftIcon={<EditIcon size={30} color={colors.button} />}
                    />
                </View>

                <Button
                    onPress={handleConfirm}
                    style={{
                        width: 42,
                        height: 42,
                        borderRadius: 21,
                        backgroundColor: ACCENT_COLORS.teal,
                        alignItems: "center",
                        justifyContent: "center",
                        marginLeft: 8,
                    }}
                    background={loading ? false : true}
                    disabled={(loading || isEmpty) ? true : false}
                >
                    <CheckIcon color={colors.text} size={22} />
                </Button>

            </GradientHeader>

            <View
                style={{
                    flex: 1,
                    paddingHorizontal: 5,
                    paddingVertical: 10,
                    paddingTop: MENU_HEIGHT + insets.top,
                    justifyContent: "space-between"
                }}
            >
                <View
                    style={{
                        borderRadius: 30,
                        overflow: "hidden",
                    }}
                >

                    <View
                        style={{
                            margin: 15,
                            justifyContent: "space-between"
                        }}
                    >
                        <Text className={textStyles.caption}>
                            Profile Name:
                        </Text>
                        <Input
                            value={profile_name}
                            onChangeText={(val)=>{
                                setProfileName(val);
                            }}
                            placeholder={user?.profile_name ?? ""}
                            returnKeyType="done"
                            multiline={false}
                            style={{ fontSize: 15 }}
                            containerStyle={{
                                width: 175,
                            }}
                            disabled={false}
                        />
                    </View>

                    <View
                        style={{
                            margin: 15,
                            flexDirection: "row",
                            justifyContent: "space-between"
                        }}
                    >
                        <View className="">

                            <Text className={textStyles.caption}>
                                First Name:
                            </Text>
                            <Input
                                value={firstName}
                                onChangeText={(val)=>{
                                    setFirstName(val);
                                }}
                                placeholder={user?.firstName ?? ""}
                                returnKeyType="done"
                                multiline={false}
                                style={{ fontSize: 15 }}
                                containerStyle={{
                                    width: 125,
                                }}
                                disabled={false}
                            />
                        </View>

                        <View className="">
                            <Text className={textStyles.caption}>
                                Last Name:
                            </Text>
                            <Input
                                value={lastName}
                                onChangeText={(val)=>{
                                    setLastName(val);
                                }}
                                placeholder={user?.lastName ?? ""}
                                returnKeyType="done"
                                multiline={false}
                                style={{ fontSize: 15 }}
                                containerStyle={{
                                    width: 200,
                                }}
                                disabled={false}
                            />
                        </View>

                    </View>

                    <View
                        style={{
                            margin: 15,
                            width: "65%",
                            justifyContent: "space-between"
                        }}
                    >
                        <Text className={textStyles.caption}>
                            Birthday:
                        </Text>  
                        
                        <DobInput
                            value={dob}
                            size={50}
                            label={dobError}
                            onChangeText={(val) => {
                                setDobError("");
                                setDob(val);
                            }}
                            placeholder={user?.dob ?? "mm/dd/yyyy"}
                            disabled={false}
                        />       

                    </View>                    

                    <View
                        style={{
                            margin: 15,
                            gap: 5
                        }}
                    >
                        <Text className={textStyles.caption}>
                            Email: 
                        </Text> 

                        <View
                            style={{
                                height: 45,
                                width: 300,
                                borderRadius: 20,
                                paddingHorizontal: 15,
                                backgroundColor: colors.card,
                                justifyContent: "center",
                                alignItems: "flex-start",
                            }}
                        >
                            <Text className={textStyles.caption}>
                                {user?.email}
                            </Text> 
                        </View>

                    </View>

                </View>

            </View>

        </View>
    );
};

// empty loader
const EmptyBlockSection = () => {
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
        radius = 8,
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
        <View style={{ gap: 10 }}>
            {[1, 2, 3, 4, 5].map((i) => (
                <View
                    key={i}
                    style={{
                        width: "100%",
                        height: 85,
                        borderRadius: 20,
                        borderWidth: 2,
                        paddingHorizontal: 14,
                        backgroundColor: colors.card,
                        borderColor: colors.secondaryCard,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                    }}
                >
                    {bone(30, 30, 999)}

                    <View style={{ flex: 1, gap: 6 }}>
                        {bone("55%", 14, 5)}
                        {bone("35%", 11, 4)}
                    </View>

                    {bone(75, 32, 12)}
                </View>
            ))}
        </View>
    );
};
