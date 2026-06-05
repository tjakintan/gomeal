import PagerView from "react-native-pager-view";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useRef, useEffect, useCallback, memo } from "react";
import { View, Animated, Dimensions, StyleSheet } from "react-native";
import DashBoard from "@/dashboard/index";
import Navigate from "@/sections/Navigate";
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
import TimerScreen from "@/hooks/Timer";
import { useTimer } from "@/stores/useTimer";
import { usePostSteps } from "@/stores/usePost";
import { registerNotificationResponseListener, registerPushNotifications } from "@/notifications/pushNotification";
import { useMessage } from "@/stores/useMessage";
import { InboxMainScreen } from "@/sections/user/inbox";
import { useActivateBugReport, BugReportScreen } from "./bug";
import { useLiveActivity } from "@/stores/useLiveActivity";
import { useReel } from "@/stores/useReel";

const { height } = Dimensions.get("window");

// Memoized sections — won't re-render when parent state changes
const MemoUser       = memo(User);
const MemoFeed       = memo(Feed);
const MemoPost       = memo(PostScreen);
const MemoLeaderboard = memo(Leaderboard);
const MemoSettings   = memo(Settings);

const AuthenticatedApp: React.FC = () => {

  const pagerRef   = useRef<PagerView>(null);
  const slideAnim  = useRef(new Animated.Value(height)).current;

  // ─── local UI state ───────────────────────────────────────────────────────
  const [section,             setSection]             = useState<Sections>("feed");
  const [focusedSection,      setFocusedSection]      = useState<Sections>("feed");
  const [feedReelOpen,        setFeedReelOpen]        = useState(false);
  const [stopPager,           setStopPager]           = useState(false);
  const [showNoti,            setShowNoti]            = useState(false);
  const [notiMounted,         setNotiMounted]         = useState(false);
  const [bugReportOpen,       setBugReportOpen]       = useState(false);
  const [navigateSectionOpen, setNavigateSectionOpen] = useState(false);

  // ─── store selectors (stable references) ──────────────────────────────────
  const inboxOpen  = useMessage((s) => s.inboxOpen);
  const closeInbox = useMessage((s) => s.closeInbox);
  const isOpen     = useCook((s) => s.isOpen);
  const post_id    = useCook((s) => s.post_id);
  const closeCook  = useCook((s) => s.closeCook);
  const timerOpen  = useTimer((s) => s.isOpen);
  const draft      = useTimer((s) => s.draft);
  const stepIndex  = useTimer((s) => s.stepIndex);
  const closeTimer = useTimer((s) => s.closeTimer);
  const updateStep = usePostSteps().updateStep;

  const { colors } = useTheme(feedReelOpen ? "dark" : undefined); 

  // ─── listeners ────────────────────────────────────────────────────────────
  useNotificationListener();
  useInboxListener();
  useMessageReadListener();
  useNewMessageListener();

  useEffect(() => {
    const listener = registerNotificationResponseListener();
    registerPushNotifications().catch((err) => 
      console.error("Push notification registration failed", err)
    );
    return () => listener.remove();
  }, []);

  // ─── notification slide ───────────────────────────────────────────────────
  useEffect(() => {
    if (showNoti) setNotiMounted(true);
    Animated.spring(slideAnim, {
      toValue: showNoti ? 0 : height,
      useNativeDriver: true,
      bounciness: 0,
      speed: 20,
    }).start();
  }, [showNoti]);

  // ─── bug report shake ─────────────────────────────────────────────────────
  useActivateBugReport({
    enabled: !bugReportOpen,
    onShake: () => setBugReportOpen(true),
  });

  // ─── stable callbacks ─────────────────────────────────────────────────────
  const goToSection = useCallback(async (s: Sections) => {

    pagerRef.current?.setPageWithoutAnimation(SECTION_INDEX[s]);
    closeTimer();
    await closeCook();

    if (s !== "feed") {
      useReel.getState().close();
      setFeedReelOpen(false);
      setStopPager(false);
    }

    setSection(s);
    setFocusedSection(s);
    
  }, [closeTimer, closeCook]);

  const onPageSelected = useCallback((e: any) => {
    const s = Object.keys(SECTION_INDEX)[e.nativeEvent.position] as Sections;
    setSection(s);
    setFocusedSection(s);
  }, []);

  const setASectionOpen = useCallback((sec: string, open: boolean) => {
    if (sec === "reel") setFeedReelOpen(open);
    setStopPager(open);
  }, []);

  const onOpenNotification = useCallback(async (open: boolean) => {
    if (inboxOpen || isOpen || timerOpen) {
      closeInbox();
      await closeCook();
      closeTimer();
      return;
    }
    setShowNoti(open);
  }, [inboxOpen, isOpen, timerOpen, closeInbox, closeCook, closeTimer]);

  const onTimerChange = useCallback((val: any) => {
    if (stepIndex !== null) updateStep(stepIndex, "timer", val);
  }, [stepIndex, updateStep]);

  const onBugClose = useCallback(() => setBugReportOpen(false), []);

  // ─── render ───────────────────────────────────────────────────────────────
  return (
    <>
      <SafeAreaView style={{ height: 175, backgroundColor: colors.background }} edges={["top"]}>
        <DashBoard
          dark={feedReelOpen}
          onOpenNotification={onOpenNotification}
        />
      </SafeAreaView>

      <View style={{ flex: 1, backgroundColor: colors.background }}>

        <PagerView
          ref={pagerRef}
          style={{ flex: 1 }}
          scrollEnabled={!stopPager}
          initialPage={SECTION_INDEX["feed"]}
          offscreenPageLimit={1}
          onPageSelected={onPageSelected}
        >
          <View key="user">
            <MemoUser />
          </View>

          <View key="feed">
            <MemoFeed
              isFocused={focusedSection === "feed"}
              setASectionOpen={setASectionOpen}
            />
          </View>

          <SafeAreaView key="post">
            <MemoPost
              isFocused={focusedSection === "post"}
              setMediaEnhanceOpen={setStopPager}
            />
          </SafeAreaView>

          <View key="leaderboard">
            <MemoLeaderboard />
          </View>

          <SafeAreaView key="settings">
            <MemoSettings isFocused={focusedSection === "settings"} />
          </SafeAreaView>
        </PagerView>

        {/* Notification overlay — mount once, slide in/out */}
        {notiMounted && (
          <Animated.View
            style={{
              position: "absolute",
              top: 0, left: 0, right: 0, bottom: 0,
              transform: [{ translateY: slideAnim }],
              zIndex: 20,
            }}
          >
            <View style={{ flex: 1, backgroundColor: colors.background }}>
              <NotificationScreen
                dark={feedReelOpen}
                onOpen={setShowNoti}
              />
            </View>
          </Animated.View>
        )}

        {isOpen && post_id !== null && (
          <View style={StyleSheet.absoluteFillObject}>
            <CookMainScreen
              key={post_id}
              post_id={post_id}
              dark={feedReelOpen}
              onClose={closeCook}
            />
          </View>
        )}

        {timerOpen && (
          <View pointerEvents="auto" style={StyleSheet.absoluteFillObject}>
            <TimerScreen
              value={draft}
              onChange={onTimerChange}
            />
          </View>
        )}

        {inboxOpen && (
          <View pointerEvents="auto" style={{ ...StyleSheet.absoluteFillObject, zIndex: 30 }}>
            <InboxMainScreen onClose={closeInbox} />
          </View>
        )}

      </View>

      <Navigate
        goToSection={goToSection}
        section={section}
        dark={feedReelOpen}
      />

      <BugReportScreen
        visible={bugReportOpen}
        section={section}
        dark={feedReelOpen}
        onClose={onBugClose}
      />
    </>
  );
};

const App: React.FC = () => {
  const user = useUser((state) => state.user);

  if (!user) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <OnBoardScreen />
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <AuthenticatedApp />
    </View>
  );
};

export default App;