import { useTheme } from "@/provider/ThemeProvider";
import { Button, ExpandingButton } from "@/components/ButtonComponent";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import React from "react";
import { useOverlay } from "@/stores/useOverlay";
import { useSlidingOverlay } from "@/stores/useSlideOverlay";
import ChefNexVoiceScreen from "./Voice";
import ChefNexImageScreen from "./Image";
import { NAV_SIZE } from "../Navigate";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DASHBOARD_HEIGHT } from "@/tags/ReelTag";
import { MenuIcon, XIcon } from "@/icons/Icon";
import { GradientHeader } from "@/components/GradientComponent";

const MENU_HEIGHT = 65;
const ChefNexMainScreen: React.FC<{isFocused?: boolean; dark: boolean }> = ({ isFocused, dark }) => {

    const insets = useSafeAreaInsets();
    const [showMenu, setShowMenu] = React.useState(false);
    const { colors, textStyles} = useTheme(dark ? "dark" : undefined);

    return (
        <View
            style={{
                flex: 1,
                backgroundColor: colors.background,
            }}
        >
            {showMenu && (
                <Pressable
                    onPress={() => setShowMenu(false)}
                    style={{
                        ...StyleSheet.absoluteFillObject,
                        zIndex: 4,
                    }}
                />
            )}

            <GradientHeader
                height={MENU_HEIGHT}
                baseColor={colors.background}
                style={{
                    height: 50,
                    width: "auto",
                    flexDirection: "row",
                    justifyContent: "flex-end",
                    alignItems: "center",
                    paddingHorizontal: 10,
                    zIndex: 5,
                }}
            >
                <ExpandingButton
                    expanded={showMenu}
                    onPress={() => setShowMenu(true)}
                    clearBackground
                    anchor="top-right"
                    expandedHeight={200}
                    borderRadius={20}
                    style={{
                        top: showMenu ? 70 : 0
                    }}
                    expandedStyle={{
                        flexDirection: "row",
                        justifyContent: "space-evenly",
                        paddingHorizontal: 8,
                    }}
                    expandedChildren={
                        <>
                            <Button
                                clearBackground
                                onPress={() => {
                                    setShowMenu(false);
                                    // 
                                }}
                            >

                            </Button>

                            <Button
                                clearBackground
                                onPress={() => {
                                    setShowMenu(false);
                                    // 
                                }}
                            >

                            </Button>

                            <Button clearBackground onPress={() => setShowMenu(false)}>
                                <XIcon color={colors.text} />
                            </Button>
                        </>
                    }
                >
                    <MenuIcon color={colors.text} />
                </ExpandingButton>

            </GradientHeader>

            <ScrollView
                style={{
                    flex: 1,
                    backgroundColor: "red",
                }}
                contentContainerStyle={{
                    gap: 10,
                    paddingHorizontal: 10,
                    paddingTop: MENU_HEIGHT,
                }}
            >
                <View
                    style={{
                        height: 500,
                        width: "auto",
                        backgroundColor: "green",
                    }}
                >

                </View>
                                
                <View
                    style={{
                        height: 500,
                        width: "auto",
                        backgroundColor: colors.card,
                    }}
                >

                </View>

            </ScrollView>

        </View>
    )

};

export default ChefNexMainScreen;