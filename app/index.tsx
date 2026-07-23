import PagerView from "react-native-pager-view";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useRef, useEffect, useCallback, memo, useMemo } from "react";
import { View, Animated, Dimensions, StyleSheet, useWindowDimensions, Linking } from "react-native";
import DashBoard from "@/dashboard/index";
import Navigate from "@/sections/Navigate";
import * as Notifications from "expo-notifications";
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
import TimerScreen from "@/utils/Timer";
import { useTimer } from "@/stores/useTimer";
import { usePostSteps } from "@/stores/usePost";
import { useMessage } from "@/stores/useMessage";
import { InboxMainScreen } from "@/sections/user/inbox";
import { useActivateBugReport, BugReportScreen } from "./bug";
import { useReel } from "@/stores/useReel";
import { initNotificationListener, registerPushNotifications, requestPushNotificationPermission } from "@/notifications/pushNotification";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DASHBOARD_HEIGHT } from "@/tags/ReelTag";
import { useOverlay } from "@/stores/useOverlay";
import { Overlay } from "./overlay";
import PermissionContent from "@/components/PermissionComponent";

const { height } = Dimensions.get("window");

/**
 * Shared duration (ms) for every animated value involved in the chrome
 * hide/show transition (`headerNavAnim` + `dashboardHeightAnim`).
 *
 * Why `timing` + one shared duration instead of `spring`:
 * `headerNavAnim` runs on the native driver (it only drives `transform`),
 * while `dashboardHeightAnim` must run on the JS driver (RN's native driver
 * doesn't support animating `height`). Two *separate* `Animated.spring`
 * calls — even with identical bounciness/speed — are independent physics
 * simulations running on different threads; they are *usually* close but
 * are not mathematically guaranteed to reach 1 on the same frame, which is
 * what produces visible drift between the slide and the collapse over time.
 *
 * `Animated.timing` is deterministic: given the same `duration`, both
 * values are guaranteed to hit 1 at the same elapsed time. Driving both
 * from a single `Animated.parallel` call, started in the same tick, with
 * the same `duration`, is what actually guarantees sync — not the specific
 * curve chosen, just that both are time-based and started together.
 */

// Memoized sections — won't re-render when parent state changes
const MemoUser       = memo(User);
const MemoFeed       = memo(Feed);
const MemoPost       = memo(PostScreen);
const MemoLeaderboard = memo(Leaderboard);
const MemoSettings   = memo(Settings);

const AuthenticatedApp: React.FC = () => {

  const pagerRef   = useRef<PagerView>(null);
  const slideAnim  = useRef(new Animated.Value(height)).current;
  const { height: screenHeight } = useWindowDimensions();
  
  // Tracks whether the dashboard and/or nav bar is actually collapsed, independent
  // of `stopPager` (which also gets toggled by reel/cook/media-enhance —
  // unrelated concerns). Used solely to size the pager container so it
  // exactly compensates for the dashboard's translateY offset, avoiding
  // both the "always screenHeight" bug and the "flex:1 leaves a gap" bug.
  const [collapsed,  setCollapsed]  = useState(false);

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
  const { isOpen: overlayOpen, openOverlay, content, closeOverlay } = useOverlay();

  // ─── local UI state ───────────────────────────────────────────────────────
  const [section,             setSection]             = useState<Sections>("feed");
  const [focusedSection,      setFocusedSection]      = useState<Sections>("feed");
  const [feedReelOpen,        setFeedReelOpen]        = useState(false);
  const [stopPager,           setStopPager]           = useState(false);
  const [showNoti,            setShowNoti]            = useState(false);
  const [notiMounted,         setNotiMounted]         = useState(false);
  const [hideNav,             setHideNav]             = useState(false);
  const [checkedPushPermission, setCheckedPushPermission] = useState(false);
  const [bugReportOpen, setBugReportOpen] = useState(false);

  const overlaySlideAnim = useRef(new Animated.Value(height)).current;
  const [overlayMounted, setOverlayMounted] = useState(false);
  const [overlayContent, setOverlayContent] = useState(content);

  const insets = useSafeAreaInsets();
  const { colors } = useTheme(feedReelOpen ? "dark" : undefined);

  // ─── request push notification permission───────────────────────────────────────────────────────
  useEffect(() => {
    if (checkedPushPermission) return;

    const check = async () => {
      const permission = await Notifications.getPermissionsAsync();

      const granted =
        permission.granted ||
        permission.ios?.status ===
          Notifications.IosAuthorizationStatus.PROVISIONAL;

      if (granted) {
        await registerPushNotifications();
        setCheckedPushPermission(true);
        return;
      }

      openOverlay({
        custom: (
          <PermissionContent
            title="Allow GoMeal to send notifications"
            description={
              permission.canAskAgain
                ? "Get notified about new messages, cooking reminders, and activity on your posts."
                : "Notifications have been disabled. Please enable Notifications for GoMeal in Settings."
            }
            continueText={
              permission.canAskAgain ? "Continue" : "Open Settings"
            }
            onContinue={async () => {
              if (permission.canAskAgain) {
                const granted =
                  await requestPushNotificationPermission();

                if (!granted) return;

                await registerPushNotifications();
              } else {
                Linking.openSettings();
              }

              closeOverlay();
            }}
          />
        ),
      });

      setCheckedPushPermission(true);
    };

    check();
  }, []);

  // ─── listeners ────────────────────────────────────────────────────────────
  useNotificationListener();
  useInboxListener();
  useMessageReadListener();
  useNewMessageListener();
  initNotificationListener();

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
      onShake: () => {
          setBugReportOpen(true);
          openOverlay({
              title: "Bug ?",
              showX: false,
              custom: (
                <BugReportScreen
                  section={section}
                  dark={feedReelOpen}
                  onClose={() => {
                    setBugReportOpen(false);
                    closeOverlay();
                  }}
                />
              ),
          });
      },
  });

  // ─── refs that mirror state for use inside stable callbacks ───────────────
  // `onPageSelected` / `onPageScrollStateChanged` are defined once with `[]`
  // deps so they stay referentially stable for the native PagerView. Refs
  // let them read *current* lock state instead of a stale closure.
  const stopPagerRef = useRef(stopPager);
  useEffect(() => { stopPagerRef.current = stopPager; }, [stopPager]);

  const hideNavRef = useRef(hideNav);
  useEffect(() => { hideNavRef.current = hideNav; }, [hideNav]);

  const sectionRef = useRef<Sections>(section);
  useEffect(() => { sectionRef.current = section; }, [section]);

  const collapsedRef = useRef(collapsed);
  useEffect(() => { collapsedRef.current = collapsed; }, [collapsed]);

  const showNotiRef = useRef(showNoti);
  useEffect(() => { showNotiRef.current = showNoti; }, [showNoti]);

  const inboxOpenRef = useRef(inboxOpen);
  useEffect(() => { inboxOpenRef.current = inboxOpen; }, [inboxOpen]);

  const cookOpenRef = useRef(isOpen);
  useEffect(() => { cookOpenRef.current = isOpen; }, [isOpen]);

  const timerOpenRef = useRef(timerOpen);
  useEffect(() => { timerOpenRef.current = timerOpen; }, [timerOpen]);

  const chromeWasHiddenBeforeOverlayRef = useRef(false);

  // ─── stable callbacks ─────────────────────────────────────────────────────
  const resetFeedScrolled = useCallback(() => {
    setStopPager(false);
    setCollapsed(false);
    setHideNav(false);

    Animated.timing(dashAnim, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start();

    Animated.timing(navAnim, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, []);

  const goToSection = useCallback(async (s: Sections) => {
    pagerRef.current?.setPageWithoutAnimation(SECTION_INDEX[s]);
    closeTimer();
    await closeCook();

    if (s !== "feed") {
      useReel.getState().close();
      setFeedReelOpen(false);
      setStopPager(false);

      if (collapsedRef.current || hideNavRef.current) {
        resetFeedScrolled();
      }
    }

    setSection(s);
    setFocusedSection(s);
  }, [closeTimer, closeCook, resetFeedScrolled]);

  /**
   * Swipe guard, part 1: fires once a swipe has fully resolved into a page
   * change. If paging should be locked (`stopPager` or `hideNav`), the
   * native pager may still have accepted the gesture before the
   * `scrollEnabled={false}` prop update crossed the bridge — so this snaps
   * back to the locked section instead of trusting the new position.
   */
  const onPageSelected = useCallback((e: any) => {
    const newSection = Object.keys(SECTION_INDEX)[e.nativeEvent.position] as Sections;

    if (stopPagerRef.current || hideNavRef.current) {
      pagerRef.current?.setPageWithoutAnimation(SECTION_INDEX[sectionRef.current]);
      return;
    }

    setSection(newSection);
    setFocusedSection(newSection);

    if (newSection !== "feed" && (collapsedRef.current || hideNavRef.current)) {
      resetFeedScrolled();
    }
  }, [resetFeedScrolled]);

  /**
   * Swipe guard, part 2: fires as soon as a drag *starts*, before
   * `onPageSelected` would ever fire. Catches the case where the user
   * begins swiping mid-lock — re-snaps immediately rather than letting the
   * gesture settle on the wrong page first.
   */
  const onPageScrollStateChanged = useCallback((e: any) => {
    const state = e.nativeEvent.pageScrollState as "idle" | "dragging" | "settling";
    if (state === "dragging" && (stopPagerRef.current || hideNavRef.current)) {
      pagerRef.current?.setPageWithoutAnimation(SECTION_INDEX[sectionRef.current]);
    }
  }, []);

  const setASectionOpen = useCallback((sec: string, open: boolean) => {
    if (sec === "reel") setFeedReelOpen(open);
    setStopPager(open);
  }, []);

  const onTimerChange = useCallback((val: any) => {
    if (stepIndex !== null) updateStep(stepIndex, "timer", val);
  }, [stepIndex, updateStep]);

  const dashAnim = useRef(new Animated.Value(0)).current;
  const navAnim = useRef(new Animated.Value(0)).current;

  const onOpenNotification = useCallback(async (open: boolean) => {
    if (inboxOpen || isOpen || timerOpen) {
      closeInbox(); await closeCook(); closeTimer(); return;
    }
    setShowNoti(open);
    setHideNav(open);
  }, [inboxOpen, isOpen, timerOpen, closeInbox, closeCook, closeTimer]);

  /**
   * Hides/shows the dashboard + nav chrome.
   *
   * `headerNavAnim` (native, drives translateY on dashboard + nav) and
   * `dashboardHeightAnim` (JS, drives the dashboard container's `height`
   * collapse) are started together inside a single `Animated.parallel`
   * call, using `Animated.timing` with the same `CHROME_ANIM_DURATION` for
   * both. This is what keeps the slide and the collapse perfectly in sync —
   * same start tick, same duration, deterministic curve — rather than two
   * independently-tuned springs that merely look similar.
   *
   * `dashboardVisible` is intentionally NOT set here synchronously; it's
   * derived from a listener on `headerNavAnim` below, so pointerEvents only
   * flips once the animation has actually finished, not the instant it's
   * requested.
   */
  const setFeedScrolled = useCallback((hidden: boolean) => {
    setStopPager(hidden);
    setCollapsed(hidden);

    Animated.timing(dashAnim, {
      toValue: hidden ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();

    Animated.timing(navAnim, {
      toValue: hidden ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, []);

  // ─── nav transitions ───────────────────────────────────────────────────────────────
  const navTranslateY = navAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 120],
  });

  useEffect(() => {
    Animated.timing(navAnim, {
      toValue: hideNav ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [hideNav]);

  // ─── dashboard transitions ───────────────────────────────────────────────────────────────
  const dashboardTranslateY = dashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -DASHBOARD_HEIGHT],
  });

  // ─── pager transitions ───────────────────────────────────────────────────────────────
  const pagerTranslateY = dashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -DASHBOARD_HEIGHT],
  });

  /**
   * Slides the overlay in/out and coordinates it with dashboard/nav chrome.
   *
   * The overlay does NOT unconditionally hide the chrome on open or restore
   * it on close — both directions check the current chrome state first:
   *
   * - On OPEN: if the feed is already fullscreen/collapsed (`collapsedRef`)
   *   or chrome is already hidden for some other reason (`hideNavRef`), the
   *   dashboard/nav are already where they need to be. Re-animating them to
   *   the same value they're already at is harmless but pointless, so we
   *   skip it entirely and only animate the overlay's own slide-in.
   *
   * - On CLOSE: chrome must stay hidden if ANYTHING else still needs it
   *   hidden — notifications, inbox, cook screen, timer, OR the feed itself
   *   being scroll-collapsed. Without the `collapsedRef` check here, closing
   *   the overlay while the feed is fullscreen would incorrectly restore
   *   the chrome even though the feed never asked for it back.
   *
   * `navAnim` is intentionally never touched directly in here — it has a
   * single owner (the `hideNav` effect below), so this function only ever
   * flips the `hideNav` boolean and lets that effect drive `navAnim`. This
   * avoids the double-animation race that happens when two effects both
   * try to animate the same value in response to the same state change.
   * `dashAnim` has no such owner, so it's driven directly here.
   *
   * `overlayMounted` lags one tick behind `overlayOpen` by design — it's
   * what keeps the overlay's `content` rendered for the duration of the
   * slide-down close animation, since the store's `content` may already be
   * null by the time `closeOverlay()` has been called.
   */
  useEffect(() => {
    if (overlayOpen && content) {
      setOverlayContent(content);
      setOverlayMounted(true);

      const chromeAlreadyHidden = collapsedRef.current || hideNavRef.current;
      chromeWasHiddenBeforeOverlayRef.current = chromeAlreadyHidden;

      if (!chromeAlreadyHidden) {
        setHideNav(true);
        Animated.parallel([
          Animated.timing(dashAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
          Animated.spring(overlaySlideAnim, {
            toValue: 0, useNativeDriver: true, bounciness: 0, speed: 20,
          }),
        ]).start(({ finished }) => {
          if (finished) useOverlay.getState().notifyOpenComplete();
        });
      } else {
        Animated.spring(overlaySlideAnim, {
          toValue: 0, useNativeDriver: true, bounciness: 0, speed: 20,
        }).start(({ finished }) => {
          if (finished) useOverlay.getState().notifyOpenComplete();
        });
      }

    } else if (overlayMounted) {
      const chromeMustStayHidden = chromeWasHiddenBeforeOverlayRef.current;

      const anims = [
        Animated.spring(overlaySlideAnim, {
          toValue: height, useNativeDriver: true, bounciness: 0, speed: 20,
        }),
      ];

      if (!chromeMustStayHidden) {
        setHideNav(false);
        anims.push(
          Animated.timing(dashAnim, { toValue: 0, duration: 220, useNativeDriver: true })
        );
      }

      Animated.parallel(anims).start(({ finished }) => {
        if (finished) {
          setOverlayMounted(false);
          useOverlay.getState().notifyCloseComplete();
        }
      });
    }
  }, [overlayOpen, content]);

  // ─── render ───────────────────────────────────────────────────────────────
  return (
    <>

      <Animated.View
        pointerEvents="auto"
        style={{
          height: DASHBOARD_HEIGHT,
          overflow: "hidden",
          zIndex: 10,
          backgroundColor: colors.background,
          transform: [{ translateY: dashboardTranslateY }],
        }}
      >
        <View
          style={{
            height: 175,
            paddingTop: insets.top,
            backgroundColor: colors.background,
          }}
        >
          <DashBoard
            dark={feedReelOpen}
            onOpenNotification={onOpenNotification}
          />
        </View>
      </Animated.View>

      <Animated.View
        style={{
          // Exactly compensates for the dashboard's -DASHBOARD_HEIGHT
          // translateY: when collapsed, the pager grows by DASHBOARD_HEIGHT
          // to fill the space left behind. When expanded, it's shrunk back
          // down so it doesn't overflow under the dashboard.
          height: screenHeight,
          backgroundColor: colors.background,
          transform: [{ translateY: pagerTranslateY }],
        }}
      >

        <PagerView
          ref={pagerRef}
          style={{ flex: 1 }}
          scrollEnabled={!stopPager && !hideNav}
          initialPage={SECTION_INDEX["feed"]}
          offscreenPageLimit={1}
          onPageSelected={onPageSelected}
          onPageScrollStateChanged={onPageScrollStateChanged}
        >

          <View key="feed">
            <MemoFeed
              isFocused={focusedSection === "feed"}
              setASectionOpen={setASectionOpen}
              onChromeHidden={setFeedScrolled}
              chromeAnim={dashAnim}
            />
          </View>

          <View key="leaderboard">
            <MemoLeaderboard
              isFocused={focusedSection === "leaderboard"}
            />
          </View>

          <SafeAreaView key="post">
            <MemoPost
              isFocused={focusedSection === "post"}
              setMediaEnhanceOpen={setStopPager}
            />
          </SafeAreaView>

          <SafeAreaView key="settings">
            <MemoSettings isFocused={focusedSection === "settings"} />
          </SafeAreaView>

          <View key="user">
            <MemoUser
              isFocused={focusedSection === "user"}
              setHideNav={setHideNav}
            />
          </View>

        </PagerView>

        {notiMounted && (
          <Animated.View
            style={{
              position: "absolute",
              top: 0, left: 0, right: 0, bottom: 0,
              transform: [{ translateY: slideAnim }],
              zIndex: 20,
            }}
          >
            <View style={{ flex: 1, backgroundColor: "red" }}>
              <NotificationScreen
                dark={feedReelOpen}
                onOpen={onOpenNotification}
              />
            </View>
          </Animated.View>
        )}

        {isOpen && post_id !== null && (
          <View style={{
              ...StyleSheet.absoluteFillObject,
            }}
          >
            <CookMainScreen
              key={post_id}
              post_id={post_id}
              dark={feedReelOpen}
              onClose={closeCook}
              chromeAnim={dashAnim}
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
            <InboxMainScreen onClose={closeInbox} setHideNav={setHideNav}/>
          </View>
        )}

      </Animated.View>

      <Animated.View
        pointerEvents={(hideNav || showNoti) ? "none" : "auto"}
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 999,
          transform: [{ translateY: navTranslateY }], // remove navHideTranslateY
        }}
      >
        <Navigate
          goToSection={goToSection}
          section={section}
          dark={feedReelOpen}
        />
      </Animated.View>

      {overlayMounted && overlayContent && (
        <Animated.View
          pointerEvents="auto"
          style={{
            position: "absolute",
            top: 0, left: 0, right: 0, bottom: 0,
            transform: [{ translateY: overlaySlideAnim }],
            zIndex: 1000,
          }}
        >
          <Overlay content={overlayContent} onClose={closeOverlay} dark={feedReelOpen} />
        </Animated.View>
      )}

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