import { useState } from "react";
import * as WebBrowser from "expo-web-browser";

import { View, Text, ScrollView } from "react-native";
import { Button } from "@/components/ButtonComponent";
import { useTheme } from "@/provider/ThemeProvider";
import { DeleteIcon } from "@/icons/Icon";

import { SpinningLogoImage } from "@/utils/Logo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GradientHeader } from "./GradientComponent";
import { SectionHeader } from "./SectionComponent";
import { useOverlay } from "@/stores/useOverlay";

const DeleteConfirm: React.FC<{
    onConfirm: () => Promise<void>;
    onCancel: () => void;
}> = ({ onConfirm, onCancel }) => {

    const { colors, textStyles } = useTheme();
    const insets = useSafeAreaInsets();
    const [deleting, setDeleting] = useState(false);

    const requestClose = useOverlay((s) => s.requestClose);

    const handleConfirm = async () => {
        if (deleting) return;

        try {
            setDeleting(true);
            await onConfirm();
        } finally {
            setDeleting(false);
        }
    };

    return (
        <View
            style={{
                flex: 1,
                backgroundColor: colors.background,
            }}
        >
            <GradientHeader
                baseColor={colors.background}
                fadeSteps={[1, 1]}
                direction="top"
                zIndex={5}
            >
                <SectionHeader
                    title="Delete account"
                    subtitle="Manage your GoMeal account and personal data."
                    showDivider
                    leftIcon={
                        <DeleteIcon
                            color={colors.danger}
                            size={24}
                        />
                    }
                />
            </GradientHeader>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                    flexGrow: 1,
                    paddingTop: 100,
                    paddingBottom: 24,
                }}
            >
                <View
                    style={{
                        marginBottom: 30,
                        alignItems: "flex-start",
                    }}
                >
                    <Text
                        className={textStyles.section}
                        style={{
                            color: colors.text,
                            fontSize: 22,
                            marginBottom: 12,
                        }}
                    >
                        Delete your account ?
                    </Text>

                    <Text
                        className={textStyles.body}
                        style={{
                            color: colors.secondaryText,
                            fontSize: 16,
                            lineHeight: 24,
                        }}
                    >
                        Your account will be deactivated immediately.
                        Account data may be retained for up to 30 days
                        before permanent deletion in accordance with our{" "}
                        <Text
                            onPress={() =>
                                WebBrowser.openBrowserAsync(
                                    "https://www.gomeal.org/privacy"
                                )
                            }
                            style={{
                                color: colors.button,
                                textDecorationLine: "underline",
                            }}
                        >
                            Privacy Policy
                        </Text>
                        .
                    </Text>
                </View>

                <View
                    style={{
                        padding: 16,
                        borderRadius: 16,
                        backgroundColor: colors.secondaryCard,
                        gap: 12,
                        marginHorizontal: 20,
                    }}
                >
                    <Text
                        className={textStyles.sectionText}
                        style={{ color: colors.text }}
                    >
                        Before you continue
                    </Text>

                    {[
                        "Your account will be deactivated immediately.",
                        "You may lose access to your profile and GoMeal features.",
                        "Your account data may be permanently deleted after the retention period.",
                    ].map((item) => (
                        <View
                            key={item}
                            style={{
                                flexDirection: "row",
                                alignItems: "flex-start",
                                gap: 10,
                            }}
                        >
                            <Text
                                style={{
                                    color: colors.danger,
                                    fontSize: 18,
                                }}
                            >
                                {"\u2022"}
                            </Text>

                            <Text
                                className={textStyles.body}
                                style={{
                                    flex: 1,
                                    color: colors.secondaryText,
                                    fontSize: 14,
                                    lineHeight: 21,
                                }}
                            >
                                {item}
                            </Text>
                        </View>
                    ))}
                </View>
            </ScrollView>

            <GradientHeader
                baseColor={colors.background}
                height={130}
                direction="bottom"
                zIndex={5}
            >
                <View
                    style={{
                        paddingHorizontal: 20,
                        paddingTop: 12,
                        paddingBottom: Math.max(insets.bottom, 12),
                    }}
                >
                    <Button
                        onPress={handleConfirm}
                        disabled={deleting}
                        style={{
                            height: 54,
                            width: "100%",
                            borderRadius: 27,
                            borderWidth: 1,
                            borderColor: colors.danger,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: "transparent",
                            opacity: deleting ? 0.6 : 1,
                        }}
                    >
                        {deleting ? (
                            <SpinningLogoImage size={35} />
                        ) : (
                            <Text
                                className={textStyles.sectionText}
                                style={{
                                    color: colors.danger,
                                    fontSize: 16,
                                }}
                            >
                                Delete my account
                            </Text>
                        )}
                    </Button>

                    <Button
                        onPress={() => {
                            requestClose();
                        }}
                        disabled={deleting}
                        style={{
                            height: 44,
                            alignItems: "center",
                            justifyContent: "center",
                            opacity: deleting ? 0.5 : 1,
                        }}
                    >
                        <Text
                            className={textStyles.sectionText}
                            style={{
                                color: colors.secondaryText,
                                fontSize: 15,
                            }}
                        >
                            Cancel
                        </Text>
                    </Button>
                </View>
            </GradientHeader>
        </View>
    );
};

export default DeleteConfirm;