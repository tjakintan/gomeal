import React from "react";
import { View, Text } from "react-native";
import * as WebBrowser from "expo-web-browser";

import { Button } from "@/components/ButtonComponent";
import { SectionHeader } from "@/components/SectionComponent";
import { useTheme } from "@/provider/ThemeProvider";
import { EmailIcon } from "@/icons/Icon";

const HelpSettings: React.FC = () => {
    const { colors, textStyles } = useTheme();

    return (
        <View
            style={{
                width: "100%",
                gap: 20,
            }}
        >
            {/* Contact Support */}
            <View style={{ gap: 12, overflow: "hidden" }}>
                <SectionHeader
                    title="Contact Support"
                    subtitle="Have a question or ran into an issue? Our team is here to help."
                    showDivider
                    titleClassName={textStyles.section}
                />

                <View
                    style={{
                        paddingHorizontal: 10,
                        paddingVertical: 8,
                        flexDirection: "row",
                        alignItems: "center",
                    }}
                >
                    <Button
                        onPress={() =>
                            WebBrowser.openBrowserAsync(
                                "https://www.gomeal.org/contact"
                            )
                        }
                        style={{
                            height: 50,
                            minWidth: 120,
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 10,
                            backgroundColor: colors.button,
                            paddingHorizontal: 20,
                            borderRadius: 16,
                        }}
                        background={true}
                    >
                        <EmailIcon
                            size={20}
                            color={colors.secondaryText}
                        />

                        <Text
                            className={textStyles.h3}
                            style={{ color: "white" }}
                        >
                            Email
                        </Text>
                    </Button>
                </View>
            </View>
        </View>
    );
};

export default HelpSettings;