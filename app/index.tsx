import PagerView from "react-native-pager-view";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useRef, useEffect } from "react";
import { View, Pressable, Animated, Dimensions, StyleSheet, AppState } from "react-native";
import DashBoard from "@/dashboard/index";
import Navigate from "@/sections/Navigate"
import { Sections, SECTION_INDEX } from "@/types/layout.types";
import { Settings, Feed, Leaderboard, User, PostScreen } from "@/sections";
import OnBoardScreen from "@/onboard/index";
import { useUser } from "@/stores/useUser";
import { useNotificationListener } from "@/notifications/notification.socket";
import { useTheme } from "@/provider/ThemeProvider";
import { CookMainScreen } from "@/sections/cook";
import NotificationScreen from "@/notifications/Notification";
import { useInboxListener, useMessageReadListener, useNewMessageListener } from "@/api/messages.socket";
import { useCook } from "@/stores/useCook";
import { useSearch } from "@/stores/useSearch";
import TimerScreen from "@/hooks/Timer";
import { useTimer } from "@/stores/useTimer";
import { usePostSteps } from "@/stores/usePost";
import { useFeed } from "@/stores/useFeed";
import { registerNotificationResponseListener } from "@/notifications/pushNotification";
import { useMessage } from "@/stores/useMessage";
import { InboxMainScreen } from "@/sections/user/inbox";
import BootScreen from "./boot";
import { useActivateBugReport, BugReportScreen } from "./bug";
import { useLiveActivity } from "@/stores/useLiveActivity";

const { height } = Dimensions.get("window");

const withTimeout = <T,>(
  promise: Promise<T>,
  ms: number,
  errorMessage = "request_timeout"
): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout>;

  const timeout = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(errorMessage));
    }, ms);
  });

  return Promise.race([
    promise.finally(() => clearTimeout(timeoutId)),
    timeout,
  ]);
};

const AuthenticatedApp: React.FC = () => {

  const pagerRef = useRef<PagerView>(null);
  const [showNoti, setShowNoti] = useState(false);
  const [feedReelSectionOpen, setFeedReelSectionOpen] = useState(false);
  const [stopPageViewer, setStopPageViewer] = useState(false);
  const [bugReportOpen, setBugReportOpen] = useState(false);

  const [section, setSection] = useState<Sections>("feed");
  const [focusedSection, setFocusedSection] = useState<Sections>("post");
  const prevSectionRef = useRef<Sections>(section);
  const [navigateSectionOpen, setNavigateSectionOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(height)).current;

  const { inboxOpen, closeInbox } = useMessage();
  const { isOpen, post_id, closeCook } = useCook();
  const { stopActivity } = useLiveActivity();
  const { colors } = useTheme(feedReelSectionOpen ? "dark" : undefined);

  const { isOpen: timerOpen, draft, stepIndex, closeTimer } = useTimer();
  const { updateStep } = usePostSteps();

  useNotificationListener(); 
  useInboxListener();
  useMessageReadListener();
  useNewMessageListener();

  useEffect(() => {
      const listener = registerNotificationResponseListener();
      return () => listener.remove(); 
  }, []);

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: showNoti ? 0 : height,
      useNativeDriver: true,
      bounciness: 0,
      speed: 20,
    }).start();
  }, [showNoti]);

  useActivateBugReport({
    enabled: !bugReportOpen,
    onShake: () => {
      setBugReportOpen(true);
    },
  });

  return (
    <>

      <SafeAreaView style={{ height: 175, backgroundColor: colors.background }} edges={["top"]}>
        <DashBoard
          dark={feedReelSectionOpen}
          onOpenNotification={async (open) => {
            if (inboxOpen || isOpen || timerOpen) {
              closeInbox();
              await closeCook();
              closeTimer();
              return;
            }
            setShowNoti(open); 
          }}
        />
      </SafeAreaView>

      <View style={{ flex: 1, backgroundColor: colors.background }}>

        <PagerView
          ref={pagerRef}
          style={{ flex: 1 }}
          scrollEnabled={!stopPageViewer}
          initialPage={SECTION_INDEX[section]}
          onPageSelected={(e) => {         
            const index = e.nativeEvent.position;
            const s = Object.keys(SECTION_INDEX)[index] as Sections;
            prevSectionRef.current = section;
            setSection(s);
            setFocusedSection(s);
          }}
        >
          <View key="user"><User /></View>
          <View key="feed">
            <Feed
              isFocused={focusedSection === "feed"}
              setASectionOpen={(section, open) => {
                if (section === "reel") setFeedReelSectionOpen(open);
                setStopPageViewer(open);
              }}
            />
          </View>
          <SafeAreaView key="post">
            <PostScreen
              isFocused={focusedSection === "post"}
              setMediaEnhanceOpen={setStopPageViewer}
            />
          </SafeAreaView>
          <View key="leaderboard"><Leaderboard /></View>
          <SafeAreaView key="settings">
            <Settings isFocused={focusedSection === "settings"} />
          </SafeAreaView>
        </PagerView>

        <Animated.View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            transform: [{ translateY: slideAnim }],
            zIndex: 20,
          }}
        >
          <View style={{ flex: 1, backgroundColor: colors.background }} >
            <NotificationScreen dark={feedReelSectionOpen} onOpen={(open) => setShowNoti(open)} />
          </View>
        </Animated.View>

        {isOpen && post_id !== null && (
          <View style={StyleSheet.absoluteFillObject}>
            <CookMainScreen
              key={post_id}   
              post_id={post_id}
              dark={feedReelSectionOpen}
              onClose={closeCook}
            />
          </View>
        )}

        {timerOpen && (
          <View
            pointerEvents="auto"
            style={{
              ...StyleSheet.absoluteFillObject,
            }}
          >
            <TimerScreen
              value={draft}
              onChange={(val) => {
                if (stepIndex !== null) {
                  updateStep(stepIndex, "timer", val);
                }
              }}
            />
          </View>
        )}

        {inboxOpen && (
            <View
                pointerEvents="auto"
                style={{ ...StyleSheet.absoluteFillObject, zIndex: 30 }}
            >
                <InboxMainScreen onClose={closeInbox} />
            </View>
        )}

      </View>
      
        <Navigate
          openNavigateSection={navigateSectionOpen}
          setOpenNavigateSection={setNavigateSectionOpen}
          goToSection={async (s: Sections) => {
            closeTimer();
            await closeCook();             
            setSection(s);
            pagerRef.current?.setPage(SECTION_INDEX[s]);
          }}
          section={section}
          dark={feedReelSectionOpen}
        />

      <BugReportScreen
        visible={bugReportOpen}
        section={section}
        onClose={() => setBugReportOpen(false)}
      />

    </>
  );
};

const App: React.FC = () => {
  const user = useUser((state) => state.user);

  const loadFeed = useFeed((state) => state.loadFeed);
  const loadTrend = useSearch((state) => state.loadTrend);

  const [booting, setBooting] = useState(true);
  const [showBootOverlay, setShowBootOverlay] = useState(true);

  const bootOpacity = useRef(new Animated.Value(1)).current;
  const bootStartedRef = useRef(false);

  useEffect(() => {
    if (!user) {
      bootStartedRef.current = false;
      setBooting(false);
      setShowBootOverlay(false);
      return;
    }

    if (bootStartedRef.current) return;
    bootStartedRef.current = true;

    let mounted = true;

    const boot = async () => {
      try {
        setBooting(true);
        setShowBootOverlay(true);
        bootOpacity.setValue(1);

        await withTimeout(
          Promise.all([
            loadFeed(undefined, undefined, true, false),
            loadTrend(),
          ]),
          7000,
          "feed_boot_timeout"
        );
      } catch (err) {
        console.log("[app_boot_error]", err);
      } finally {
        if (!mounted) return;

        setBooting(false);

        Animated.timing(bootOpacity, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }).start(() => {
          if (mounted) {
            setShowBootOverlay(false);
          }
        });
      }
    };

    boot();

    return () => {
      mounted = false;
    };
  }, [user?.sub]);

  if (!user) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <OnBoardScreen />
      </SafeAreaView>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <AuthenticatedApp />

      {showBootOverlay && (
        <Animated.View
          pointerEvents={booting ? "auto" : "none"}
          style={{
            ...StyleSheet.absoluteFillObject,
            opacity: bootOpacity,
            zIndex: 999,
          }}
        >
          <BootScreen />
        </Animated.View>
      )}
    </View>
  );

};

export default App;