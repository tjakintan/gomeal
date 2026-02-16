import PagerView from "react-native-pager-view";
import { useState, useRef } from "react";
import { View, Pressable } from "react-native";
import Navigate from "@/components/Navigate";
import { Sections, SECTION_INDEX } from "@/types/index";
import {
  Gomeal,
  Settings,
  Feed,
  Discover,
  Post,
  User
} from "@/sections";

const App: React.FC = () => {
    const pagerRef = useRef<PagerView>(null);
    const [section, setSection] = useState<Sections>("feed"); // default entry section
    const [navigateSectionOpen, setNavigateSectionOpen] = useState(false);

    const goToSection = (s: Sections) => {
        setSection(s);
        pagerRef.current?.setPage(SECTION_INDEX[s]);
    };

    const closeNavigateSection = () => setNavigateSectionOpen(false);

    return (
        <View className="flex-1">

            {/* Sections */}
            <PagerView
                ref={pagerRef}
                style={{ flex: 1 }}
                initialPage={SECTION_INDEX[section]}
                onPageSelected={(e) => {
                    const index = e.nativeEvent.position;
                    const s = Object.keys(SECTION_INDEX)[index] as Sections;
                    setSection(s);
                }}
            >
                {/* In order */}
                <View key="gomeal"><Gomeal /></View>
                <View key="settings"><Settings /></View>
                <View key="feed"><Feed /></View>
                <View key="discover"><Discover /></View>
                <View key="post"><Post /></View>
                <View key="user"><User /></View>
            </PagerView>

            {/* Overlay to close menu */}
            {navigateSectionOpen && (
                <Pressable
                    style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
                    onPress={closeNavigateSection}
                />
            )}

            {/* Floating Navigation */}
            <Navigate 
                openNavigateSection={navigateSectionOpen}
                setOpenNavigateSection={setNavigateSectionOpen}
                goToSection={goToSection}
                section={section}
            />

        </View>
    );
};

export default App;