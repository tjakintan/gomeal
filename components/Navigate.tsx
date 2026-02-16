import { useRef, useState, useEffect } from "react";
import { View, Image, Pressable, Animated, Easing, Text, Dimensions } from "react-native";
import { Gesture } from "@/utils/utils";
import { User, blur_style, NavigateProps, NavigateSectionProps, Sections, SectionIconProps, SECTION_INDEX, INDEX_SECTION, getPrevSectionIndex } from "@/types/index";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { GlassView, GlassContainer, isLiquidGlassAvailable } from 'expo-glass-effect';
import { Gesture as GestureReacts, GestureDetector } from 'react-native-gesture-handler';
import { glassStyle } from "@/utils/utils";
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { useTheme } from "@/provider/ThemeProvider";
import { useSettingsStore } from "@/stores/useSettings";

if (!isLiquidGlassAvailable) {
  console.warn("Liquid Glass is not available on this device/workflow!");
}
const AnimatedBlur = Animated.createAnimatedComponent(BlurView);
const sectionIcons: SectionIconProps[] = [
    {
        name: "gomeal",
        img_url: require("@/assets/gomeal_icon.png"),
        imageStyle: {height: 27, width: 27}
    },
    {
        name: "settings",
        img_url: require("@/assets/icon/settings.png"),
    },
    {
        name: "feed",
        img_url: require("@/assets/icon/cook.png"),
    },
    {
        name: "discover",
        img_url: require("@/assets/icon/search.png"),
        imageStyle: {height: 27, width: 27}
    },
    {
        name: "post",
        img_url: require("@/assets/icon/post.png"),
    },
]

const NavigateSection: React.FC<NavigateSectionProps> = ({ goToSection, goPrevSection, expandsUp, }) => {
    const { colors } = useTheme();

    // Icons order: if expanding down (top anchor), reverse array so icons grow up
    const iconsToRender = expandsUp ? sectionIcons : [...sectionIcons].reverse();

    return (
        <View 
            className="w-full h-full items-center p-1" 
            style={{ justifyContent: expandsUp ? 'space-between' : 'flex-end' }} 
        >

            {/* Back button */}
            {expandsUp && (
                <Gesture>
                    <Pressable
                        onPress={goPrevSection}
                        style={{ width: 60, height: 60 }}
                    >
                        <BlurView
                            intensity={50}
                            tint="default"
                            className="w-full h-full p-1 overflow-hidden rounded-full"
                        >
                            <View className="flex-1 items-center justify-center">
                                <Image
                                    source={require("@/assets/icon/back.png")}
                                    style={{ width: 30, height: 30 }}
                                    resizeMode="contain"
                                />
                            </View>
                        </BlurView>
                    </Pressable>
                </Gesture>
            )}

            {/* Navigation icons */}
            <View
                className="flex-1 p-1 gap-5 w-full items-center"
                style={{ justifyContent: expandsUp ? 'flex-end' : 'flex-start' }}
            >
                {iconsToRender.map((icon) => (
                <View key={icon.name}>
                    <Gesture>
                        <Pressable
                            onPress={() => goToSection(icon.name as any)}
                            className="w-full items-center justify-center"
                        >
                            <Animated.Image
                                source={icon.img_url}
                                style={[{ width: 30, height: 30 }, icon.imageStyle]}
                                resizeMode="contain"
                            />
                            <Text
                                style={{ color: colors.text }}
                                className="font-thin text-xs tracking-widest text-center mt-1"
                            >
                                {icon.name}
                            </Text>
                        </Pressable>
                    </Gesture>
                </View>
                ))}
            </View>

            {/* Back button at bottom if expanding down */}
            {!expandsUp && (
                <Gesture>
                    <Pressable
                        onPress={goPrevSection}
                        style={{ width: 60, height: 60, marginTop: 5 }}
                    >
                        <BlurView
                            intensity={50}
                            tint="default"
                            className="w-full h-full p-1 overflow-hidden rounded-full"
                        >
                            <View className="flex-1 items-center justify-center">
                                <Image
                                    source={require("@/assets/icon/back.png")}
                                    style={{ width: 30, height: 30 }}
                                    resizeMode="contain"
                                />
                            </View>
                        </BlurView>
                    </Pressable>
                </Gesture>
            )}

        </View>
    );
};

const Navigate: React.FC<NavigateProps> = ({ section, openNavigateSection, setOpenNavigateSection, goToSection }) => {

    const navCirclePosition = useSettingsStore((state) => state.settings.app.navCirclePosition);
    const navCircleColor = useSettingsStore((state) => state.settings.app.navCircleColor);
    const offsetX = useSharedValue(0);
    const offsetY = useSharedValue(0);
    const getNavAnchorStyle = (position: "TL" | "TR" | "BL" | "BR") => {
        switch (position) {
            case "TL":
                return { top: 10, left: 10 };
            case "TR":
                return { top: 10, right: 10 };
            case "BL":
                return { bottom: 10, left: 10 };
            case "BR":
            default:
                return { bottom: 10, right: 10 };
        }
    };
    const expandsUp = navCirclePosition === "BL" || navCirclePosition === "BR";
    const insets = useSafeAreaInsets();
    const width = 70;
    const height = 70;
    const sectionHeight = Math.min(800 - insets.bottom, Dimensions.get("window").height - 100);
    //const [section, setSection] = useState<Sections>();
    const currentIcon = sectionIcons.find((icon) => icon.name === section);
    const sectionNumber = SECTION_INDEX[section];
    const mainButtonRef = useRef(null);
    const mainContainerRef = useRef(null);
    const sectionHeightAnim = useRef(new Animated.Value(0)).current;
    const sectionOpacity = useRef(new Animated.Value(0)).current;
    const containerHeight = useRef(new Animated.Value(80)).current; 
    const [increaseSectionHeight, setIncreaseSectionHeight] = useState(false);
    const [sectionsSelectors, showSectionSelectors] = useState(false);
    const animateSections = (open: boolean) => {
        setIncreaseSectionHeight(open);

        Animated.timing(containerHeight, {
            toValue: open ? sectionHeight : height,
            duration: 300,
            easing: Easing.out(Easing.ease),
            useNativeDriver: false,
        }).start(() => {
            showSectionSelectors(open);
            setOpenNavigateSection(open);
        });

        if (open) {
            sectionHeightAnim.setValue(0);
            sectionOpacity.setValue(0);
            Animated.parallel([
                Animated.timing(sectionHeightAnim, {
                    toValue: sectionHeight - height,
                    duration: 300,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: false,
                }),
                    Animated.timing(sectionOpacity, {
                    toValue: 1,
                    duration: 300,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: false,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(sectionHeightAnim, {
                    toValue: 0,
                    duration: 200,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: false,
                }),
                Animated.timing(sectionOpacity, {
                    toValue: 0,
                    duration: 200,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: false,
                }),
            ]).start();
        }
    };
    const showSectionsButtons = () => {
        animateSections(!increaseSectionHeight);
    };
    useEffect(() => {
        animateSections(openNavigateSection);
    }, [openNavigateSection]);
    const closeSections = () => {
        if (increaseSectionHeight || openNavigateSection) {
            animateSections(false); 
        }
    };
    const goPrevSection = () => {
        const prevIndex = getPrevSectionIndex(sectionNumber);
        const prevSection = INDEX_SECTION[prevIndex];
        goToSection(prevSection);
        closeSections();
    };
    const dragGesture = GestureReacts.Pan()
        .onUpdate((event) => {
            offsetX.value = event.translationX;
            offsetY.value = event.translationY;
        })
        .onEnd(() => {
            // Snap back to original position
            offsetX.value = withSpring(0);
            offsetY.value = withSpring(0);
        });

    const animatedGlassStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: offsetX.value },
            { translateY: offsetY.value },
        ],
    }));

    return (
        <AnimatedBlur
            ref={mainContainerRef}
            intensity={10} 
            tint="default"
            style={[{ width, height: containerHeight }, getNavAnchorStyle(navCirclePosition)]}  
            className={`absolute overflow-hidden rounded-full ${expandsUp ? "justify-end" : "justify-start"}`}
        >
            
            {/* Sections buttons navigation (** Conditionally Shown) */}
            {sectionsSelectors && (
                <Animated.View style={{ width, height: sectionHeight - height, ...(expandsUp ? { bottom: height } : { top: height }),}}>
                    <NavigateSection             
                        goToSection={(s) => {
                            goToSection(s);
                            closeSections() 
                        }}
                        goPrevSection={goPrevSection}
                        expandsUp={expandsUp}
                    />
                </Animated.View>
            )}

            {/* Main Navigation Icon (** Initially Shown), absolute positioned at bottom and on not section hide content */}
            <View 
                style={{height: height}} 
                className="absolute w-full flex-1 overflow-hidden p-1 rounded-full"
            >
                            <GlassContainer style={glassStyle.containerStyle}>
                            <GlassView style={glassStyle.glass1} isInteractive />
                            <GlassView style={glassStyle.glass2} />
                            <GlassView style={glassStyle.glass3} />
                            </GlassContainer>
                <Gesture>
                    <Pressable ref={mainButtonRef} onPress={showSectionsButtons} className={`rounded-full w-full h-full overflow-hidden`}>
                    {!sectionsSelectors && currentIcon &&  (
                        <View style={{flex: 1, backgroundColor: navCircleColor}} className="rounded-full w-full h-full items-center justify-center">
                            <Animated.Image
                                source={currentIcon?.img_url} 
                                style={[{ width: 30, height: 30 }, currentIcon?.imageStyle]}
                            />
                        </View>
                    )}

                    </Pressable>
                </Gesture>
            </View>
 
        </AnimatedBlur>
    );
};

export default Navigate;
