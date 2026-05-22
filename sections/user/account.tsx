import { Button } from "@/components/ButtonComponent";
import { DobInput, Input } from "@/components/InputComponent";
import { SectionHeader } from "@/components/SectionComponent";
import { AvatarRender } from "@/dashboard/Avatar";
import { BackIcon, EditIcon, InfoIcon, PersonXIcon } from "@/icons/Icon";
import { useTheme } from "@/provider/ThemeProvider";
import { useFeed } from "@/stores/useFeed";
import { useBlockUser } from "@/stores/useReport";
import { useUser } from "@/stores/useUser";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { getDobParts, isValidDob } from "@/utils/time";
import { useProfile } from "@/stores/useProfile";
import { UpdateUserProfile } from "@/types/profile.types";
import { SpinningLogoImage } from "@/utils/Logo";

export const InfoMainScreen: React.FC<{ onClose: () => void }> = ({ onClose }) => {

    const { colors, textStyles } = useTheme();

    const [showBlockSection, setShowBlockSection] = useState(false);
    const [showUpdateSection, setShowUpdateSection] = useState(false);

    if (showBlockSection) {
        return <BlockSection onClose={() => setShowBlockSection(false)} />;
    }

    if (showUpdateSection) {
        return <UpdateSection onClose={() => setShowUpdateSection(false)} />;
    }

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
                <Button onPress={() => onClose?.()} background>
                    <BackIcon color={colors.background} />
                </Button>

                <SectionHeader
                    title="Account"
                    showBackground
                    titleClassName={textStyles.h3}
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
                    onPress={() => {setShowUpdateSection(true)}}
                    style={{
                        width: "100%",
                        height: 95,
                        borderRadius: 20,
                        borderWidth: 2,
                        paddingHorizontal: 16,
                        backgroundColor: colors.card,
                        borderColor: colors.secondaryCard,
                        justifyContent: "center",
                        alignItems: "flex-start",
                    }}
                >
                    <Text className={textStyles.h3} style={{ color: colors.text }}>
                        Update
                    </Text>

                    <Text
                        className={textStyles.small}
                        numberOfLines={1}
                        style={{ color: colors.secondaryText }}
                    >
                        Change your name, profile name and preferences
                    </Text>
                </Button>

                <Button
                    onPress={() => setShowBlockSection(true)}
                    style={{
                        width: "100%",
                        height: 95,
                        borderRadius: 20,
                        borderWidth: 2,
                        paddingHorizontal: 16,
                        backgroundColor: colors.card,
                        borderColor: colors.secondaryCard,
                        justifyContent: "center",
                        alignItems: "flex-start",
                    }}
                >
                    <Text className={textStyles.h3} style={{ color: colors.text }}>
                        Blocked
                    </Text>

                    <Text
                        className={textStyles.small}
                        numberOfLines={1}
                        style={{ color: colors.secondaryText }}
                    >
                        Hidden users, muted content, and restrictions
                    </Text>
                </Button>
            </View>

        </View>
    );

};

const BlockSection: React.FC<{ onClose: () => void }> = ({ onClose }) => {

    const { colors, textStyles } = useTheme();

    const {
        blockedUsers,
        loadingBlockedUsers,
        getBlockedUsers,
        removeBlockedUser,
    } = useBlockUser();

    const { loadFeed, loadReel, selectedScope } = useFeed()

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
            <View
                style={{
                    height: 65,
                    paddingHorizontal: 20,
                    alignItems: "center",
                    flexDirection: "row",
                }}
            >
                <Button onPress={() => onClose?.()} background>
                    <BackIcon color={colors.background} />
                </Button>

                <SectionHeader
                    title="Blocked users"
                    showBackground
                    titleClassName={textStyles.h3}
                    leftIcon={<PersonXIcon size={30} color={colors.button} />}
                />
            </View>

            <View style={{ flex: 1, padding: 10 }}>
                {loadingBlockedUsers ? (
                    <View className="flex-1 items-center justify-center">
                        <SpinningLogoImage size={30} />
                    </View>
                ) : !blockedUsers.length ? (
                    <View className="flex-1 items-center justify-center">
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
                                        className={textStyles.bodyMedium}
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
                                    <Text
                                        className={textStyles.caption}
                                    >
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

    const { width, height } = useWindowDimensions();
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
                <Button onPress={() => onClose?.()} background>
                    <BackIcon color={colors.background} />
                </Button>

                <SectionHeader
                    title="Update account"
                    showBackground
                    titleClassName={textStyles.h3}
                    leftIcon={<EditIcon size={30} color={colors.button} />}
                />
            </View>

            <View
                style={{
                    flex: 1,
                    paddingHorizontal: 5,
                    paddingVertical: 10,
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

                <View style={{padding: 10}}>
                    <Button 
                        onPress={handleConfirm} 
                        style={{height: 50, width: 250, gap: 15, alignSelf: "center", flexDirection: "row", justifyContent: "center"}} 
                        background={loading ? false : true}
                        disabled={(loading || isEmpty) ? true : false}
                    >
                        {loading ? (
                            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                                <SpinningLogoImage size={20} />
                            </View>
                        ) : (
                            <Text className={textStyles.caption}>
                                Confirm
                            </Text>
                        )}
                    </Button>
                </View>

            </View>

        </View>
    );
};

