import { SpinningLogoImage } from "@/utils/Logo";
import { Text, View } from "react-native";
import { Button } from "./ButtonComponent";
import { useTheme } from "@/provider/ThemeProvider";
import { useState } from "react";
import { BackIcon } from "@/icons/Icon";

const PermissionContent: React.FC<{
    title: string;
    description: string;
    onContinue: () => Promise<void> | void;
    continueText?: string;
}> = ({
    title,
    description,
    onContinue,
    continueText = "Continue",
}) => {

    const { colors, textStyles } = useTheme();
    const [loading, setLoading] = useState(false);

    return (
        <View
            style={{
                flex: 1,
                justifyContent: "center",
                gap: 20
            }}
        >
            <View>

                <Text
                    className={textStyles.h1}
                >
                    {title}
                </Text>

                <Text
                    className={textStyles.body}
                    style={{
                        color: colors.secondaryText,
                    }}
                >
                    {description}
                </Text>

            </View>

            <Button
                background={!loading}
                style={{
                    height: 50,
                    width: 120,
                    borderRadius: 999,
                    flexDirection: "row",
                    gap: 5
                }}
                onPress={async () => {
                    try {
                        setLoading(true);
                        await onContinue();
                    } finally {
                        setLoading(false);
                    }
                }}
            >
                {loading ? (
                    <SpinningLogoImage size={20} />
                ) : (
                    <>
                        <Text className={textStyles.caption}>
                            {continueText}
                        </Text>

                        {continueText === "Continue" && (
                            <BackIcon
                                rotate={180}
                                size={20}
                                color={colors.secondaryText}
                            />
                        )}
                    </>
                )}
            </Button>

        </View>
    );
};

export default PermissionContent;