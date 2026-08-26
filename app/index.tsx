import PagerView from "react-native-pager-view";
import { SafeAreaView } from "react-native-safe-area-context";
import React, { useState, useRef, useEffect, useCallback, memo, useMemo } from "react";
import { View, Animated, Dimensions, StyleSheet, useWindowDimensions, Linking, InteractionManager, Modal } from "react-native";
import DashBoard from "@/dashboard/index";
import Navigate from "@/sections/Navigate";
import * as Notifications from "expo-notifications";
import { Sections, SECTION_INDEX } from "@/types/layout.types";
import { Settings, Feed, Leaderboard, User, ChefNex } from "@/sections";
import OnBoardScreen from "@/onboard/index";
import { useUser } from "@/stores/useUser";
import { useNotificationListener } from "@/notifications/notification.socket";
import { useTheme } from "@/provider/ThemeProvider";
import NotificationScreen from "@/notifications/Notification";
import { useInboxListener, useMessageReadListener, useNewMessageListener } from "@/api/messages.socket";
import { useActivateBugReport, BugReportScreen } from "./bug";
import { useReel } from "@/stores/useReel";
import { initNotificationListener, registerPushNotifications, requestPushNotificationPermission } from "@/notifications/pushNotification";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DASHBOARD_HEIGHT } from "@/tags/ReelTag";
import { useOverlay } from "@/stores/useOverlay";
import Overlay from "./overlay";
import PermissionContent from "@/components/PermissionComponent";

// Overlays
import { useSlidingOverlay } from "@/stores/useSlideOverlay";
import SlidingOverlay from "./slideOverlay";
import { useSlideUpOverlay } from "@/stores/useSlideUpOverlay";
import SlideUpOverlay from "./slideUpOverlay";

import Reel from "@/sections/feed/reel";
import { useFeed } from "@/stores/useFeed";
import { useAnimatedThemeColors } from "@/stores/useTheme";

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
const MemoChefNex       = memo(ChefNex);
const MemoLeaderboard = memo(Leaderboard);
const MemoSettings   = memo(Settings);

const SLIDE_BASE_Z_INDEX = 1000;
const SLIDE_UP_BASE_Z_INDEX = 3000;
/**
 * Controls the sliding overlay lifecycle.
 *
 * Opening:
 * - Mounts the content.
 * - Starts at the right side of the screen.
 * - Animates into the viewport.
 *
 * Closing:
 * - Slides the content back to the right.
 * - Keeps rendering until the animation completes.
 * - Prevents abrupt unmounting halfway through the gesture.
*/
const SlideOverlayItem = ({
    id,
    depth,
    dark,
    closing,
    children,
}: {
    id: string;
    depth: number;
    dark: boolean;
    closing: boolean;
    children: React.ReactNode;
}) => {
    const { width } = useWindowDimensions();

    const translateX = useRef(new Animated.Value(width)).current;
    const hasClosed = useRef(false);

    useEffect(() => {
        Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 0,
            speed: 20,
        }).start();
    }, []);

    useEffect(() => {
        if (!closing || hasClosed.current) return;

        hasClosed.current = true;

        Animated.spring(translateX, {
            toValue: width,
            useNativeDriver: true,
            bounciness: 0,
            speed: 20,
        }).start(({ finished }) => {
            if (!finished) return;

            useSlidingOverlay.setState(state => ({
                stack: state.stack.slice(0, -1),
            }));
        });
    }, [closing, width]);

    return (
        <Animated.View
            style={{
                ...StyleSheet.absoluteFillObject,
                zIndex: SLIDE_BASE_Z_INDEX + depth,
                elevation: SLIDE_BASE_Z_INDEX + depth,
                transform: [{ translateX }],
            }}
        >
            <SlidingOverlay dark={dark}>
                {children}
            </SlidingOverlay>
        </Animated.View>
    );
};

const SlideUpOverlayItem = ({
    id,
    depth,
    dark,
    closing,
    children,
}: {
    id: string;
    depth: number;
    dark: boolean;
    closing: boolean;
    children: React.ReactNode;
}) => {
    const { height } = useWindowDimensions();

    const translateY = useRef(new Animated.Value(height)).current;
    const hasClosed = useRef(false);

    // Open: slide from below the screen upward
    useEffect(() => {
        translateY.setValue(height);

        Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 0,
            speed: 20,
        }).start();
    }, []);

    // Close: slide back below the screen, then remove THIS overlay
    useEffect(() => {
        if (!closing || hasClosed.current) return;

        hasClosed.current = true;

        Animated.spring(translateY, {
            toValue: height,
            useNativeDriver: true,
            bounciness: 0,
            speed: 20,
        }).start(({ finished }) => {
            if (!finished) return;

            useSlideUpOverlay.setState((state) => ({
                stack: state.stack.filter((item) => item.id !== id),
            }));
        });
    }, [closing, height, id, translateY]);

    return (
        <Animated.View
            pointerEvents="auto"
            style={[
                StyleSheet.absoluteFillObject,
                {
                    zIndex: SLIDE_UP_BASE_Z_INDEX + depth,
                    elevation: SLIDE_UP_BASE_Z_INDEX + depth,
                    transform: [{ translateY }],
                },
            ]}
        >
            <SlideUpOverlay dark={dark}>
                {children}
            </SlideUpOverlay>
        </Animated.View>
    );
};

const AuthenticatedApp: React.FC = () => {

  const pagerRef   = useRef<PagerView>(null);
  const slideAnim  = useRef(new Animated.Value(height)).current;
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  
  // Tracks whether the dashboard and/or nav bar is actually collapsed, independent
  // of `stopPager` (which also gets toggled by reel/cook/media-enhance —
  // unrelated concerns). Used solely to size the pager container so it
  // exactly compensates for the dashboard's translateY offset, avoiding
  // both the "always screenHeight" bug and the "flex:1 leaves a gap" bug.
  const [collapsed,  setCollapsed]  = useState(false);

  // ─── store selectors (stable references) ──────────────────────────────────
  const { isOpen: overlayOpen, openOverlay, content, children: overlayChildrenFromStore, closeOverlay } = useOverlay();

  // ─── local UI state ───────────────────────────────────────────────────────
  const [section,             setSection]             = useState<Sections>("feed");
  const [feedReelOpen,        setFeedReelOpen]        = useState(false);
  const [stopPager,           setStopPager]           = useState(false);
  const [checkedPushPermission, setCheckedPushPermission] = useState(false);
  const [bugReportOpen, setBugReportOpen] = useState(false);

  const overlaySlideAnim = useRef(new Animated.Value(height)).current;
  const [overlayMounted, setOverlayMounted] = useState(false);
  const [overlayContent, setOverlayContent] = useState(content);
  const [overlayChildren, setOverlayChildren] = useState(overlayChildrenFromStore);

  const insets = useSafeAreaInsets();
  const forceDark = feedReelOpen || section === "chefNex";
  const { colors } = useTheme(forceDark ? "dark" : undefined); 

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
                  dark={forceDark}
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

  const sectionRef = useRef<Sections>(section);
  useEffect(() => { sectionRef.current = section; }, [section]);

  const collapsedRef = useRef(collapsed);
  useEffect(() => { collapsedRef.current = collapsed; }, [collapsed]);

  const chromeWasHiddenBeforeOverlayRef = useRef(false);
  

  // --------- Reels Refs ------------------------------------
  const reelTranslateX = useRef(new Animated.Value(0)).current;
  const reelTranslateY = useRef(new Animated.Value(0)).current;
  const reelScale = useRef(new Animated.Value(1)).current;

  const reelVisible = useReel((s)=>s.isVisible);
  const reelPost = useFeed((s)=>s.activeReelPost);
  const reelLayout = useReel((s)=>s.origin);

  useEffect(() => {
      if (!reelVisible || !reelLayout) return;

      // reset starting position
      reelTranslateX.setValue(
          reelLayout.x - (screenWidth - reelLayout.width) / 2
      );

      reelTranslateY.setValue(
          reelLayout.y - (screenHeight - reelLayout.height) / 2
      );

      reelScale.setValue(
          Math.min(
              reelLayout.width / screenWidth,
              reelLayout.height / screenHeight
          )
      );


      InteractionManager.runAfterInteractions(() => {
          Animated.parallel([
              Animated.spring(reelTranslateX,{
                  toValue:0,
                  speed:20,
                  bounciness:0,
                  useNativeDriver:true,
              }),

              Animated.spring(reelTranslateY,{
                  toValue:0,
                  speed:20,
                  bounciness:0,
                  useNativeDriver:true,
              }),

              Animated.spring(reelScale,{
                  toValue:1,
                  speed:20,
                  bounciness:0,
                  useNativeDriver:true,
              }),
          ]).start();
      });


  },[
      reelVisible,
      reelLayout?.x,
      reelLayout?.y,
      reelLayout?.width,
      reelLayout?.height,
      screenWidth,
      screenHeight
  ]);
  
  /**
   * Slides the sliding overlay in/out from the right edge of the screen.
   *
   * Unlike `Overlay`, this component is intentionally content-only:
   *
   * - `SlidingOverlay` does not own animation state.
   * - `SlidingOverlay` does not control mounting/unmounting.
   * - `AuthenticatedApp` owns the Animated.Value and transition lifecycle.
   *
   * This keeps all global screen transitions centralized in the app shell,
   * preventing multiple animation owners from competing over the same UI layer.
   *
   * The animation uses `translateX` because the overlay behaves like a drawer:
   *
   *   closed:
   *      translateX = screenWidth
   *
   *   open:
   *      translateX = 0
   *
   * The native driver is used because `transform` properties are fully
   * supported by React Native's native animation system, allowing the slide
   * transition to remain smooth without JS thread involvement.
   *
   * The content is kept mounted during close animations so the exit transition
   * can complete before removing the overlay from the render tree.
  */
  const stack = useSlidingOverlay((s) => s.stack);
  const slideUpStack = useSlideUpOverlay((s) => s.stack);

  // ─── Reel z-index tracking ──────────────────────────────────────
  // Reel's stacking position isn't fixed — it depends on how many sliding
  // overlays existed *before* reel opened:
  //
  //   - Opened directly from feed (stack empty) → reel must sit ABOVE
  //     whatever gets pushed from within it (e.g. Cook), so Cook is
  //     visible on top when launched from inside reel.
  //   - Opened from within an already-open sliding overlay (e.g. profile)
  //     → reel must sit ABOVE that overlay, but anything pushed on top of
  //     the stack *after* reel opened (e.g. Cook, launched from reel)
  //     must still render above reel.
  //
  // Captured as `stack.length` at the instant reel becomes visible, then
  // offset by -0.5 so it sits strictly between "already on stack" (below)
  // and "pushed after" (above), regardless of zIndex-tie render order.


  // ─── stable callbacks ─────────────────────────────────────────────────────
  const resetFeedScrolled = useCallback(() => {
    setStopPager(false);
    setCollapsed(false);

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

  const goToSection = useCallback(
    async (s: Sections) => {
      if (s !== "feed") {
        useReel.getState().close();
        setFeedReelOpen(false);
        setStopPager(false);

        if (collapsedRef.current) {
          resetFeedScrolled();
        }
      }

      setSection(s);
    },
    [resetFeedScrolled]
  );

  const setASectionOpen = useCallback((sec: string, open: boolean) => {
    if (sec === "reel") setFeedReelOpen(open);
    setStopPager(open);
  }, []);

  const dashAnim = useRef(new Animated.Value(0)).current;
  const navAnim = useRef(new Animated.Value(0)).current;

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
      setOverlayChildren(overlayChildrenFromStore)
      setOverlayMounted(true);

      const chromeAlreadyHidden = collapsedRef.current;
      chromeWasHiddenBeforeOverlayRef.current = chromeAlreadyHidden;

      if (!chromeAlreadyHidden) {
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
            backgroundColor: colors.background, // inner static View — see note below
          }}
        >
          <DashBoard dark={forceDark}  />
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

        <View style={{ flex: 1 }}>

            <View
                pointerEvents={section === "feed" ? "auto" : "none"}
                style={[
                    StyleSheet.absoluteFillObject,
                    { display: section === "feed" ? "flex" : "none" },
                ]}
            >
                <MemoFeed
                    isFocused={section === "feed"}
                    setASectionOpen={setASectionOpen}
                    onChromeHidden={setFeedScrolled}
                    chromeAnim={dashAnim}
                />
            </View>

            <View
                pointerEvents={section === "leaderboard" ? "auto" : "none"}
                style={[
                    StyleSheet.absoluteFillObject,
                    { display: section === "leaderboard" ? "flex" : "none" },
                ]}
            >
                <MemoLeaderboard
                    isFocused={section === "leaderboard"}
                />
            </View>

            <View
                pointerEvents={section === "chefNex" ? "auto" : "none"}
                style={[
                    StyleSheet.absoluteFillObject,
                    { display: section === "chefNex" ? "flex" : "none" },
                ]}
            >
                <MemoChefNex
                    isFocused={section === "chefNex"}
                    dark={forceDark}
                />
            </View>

            <View
                pointerEvents={section === "user" ? "auto" : "none"}
                style={[
                    StyleSheet.absoluteFillObject,
                    { display: section === "user" ? "flex" : "none" },
                ]}
            >
                <MemoUser
                    isFocused={section === "user"}
                />
            </View>

            <View
                pointerEvents={section === "settings" ? "auto" : "none"}
                style={[
                    StyleSheet.absoluteFillObject,
                    { display: section === "settings" ? "flex" : "none" },
                ]}
            >
                <SafeAreaView style={{ flex: 1 }}>
                    <MemoSettings
                        isFocused={section === "settings"}
                    />
                </SafeAreaView>
            </View>

        </View>

      </Animated.View>

      <Animated.View
        pointerEvents="auto"
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 499,
          transform: [{ translateY: navTranslateY }], // remove navHideTranslateY
        }}
      >
        <Navigate
          goToSection={goToSection}
          section={section}
          dark={forceDark}
        />
      </Animated.View>

      {overlayMounted && (overlayContent || overlayChildren) && (
        <Animated.View
          pointerEvents="auto"
          style={{
            position: "absolute",
            top: 0, left: 0, right: 0, bottom: 0,
            transform: [{ translateY: overlaySlideAnim }],
            zIndex: 2000,
          }}
        >
          <Overlay content={overlayContent ?? {}} onClose={closeOverlay} dark={forceDark}>
            {overlayChildren}
          </Overlay>
        </Animated.View>
      )}

      {stack.map((overlay, index) => (
          <SlideOverlayItem
              key={overlay.id}
              id={overlay.id}
              depth={index}
              dark={forceDark}
              closing={!!overlay.closing}
          >
              {overlay.content}
          </SlideOverlayItem>
      ))}
      {slideUpStack.map((overlay, index) => (
          <SlideUpOverlayItem
              key={overlay.id}
              id={overlay.id}
              depth={index}
              dark={forceDark}
              closing={!!overlay.closing}
          >
              {overlay.content}
          </SlideUpOverlayItem>
      ))}
      {reelVisible && reelPost && reelLayout && (
          <Modal
              visible={reelVisible}
              transparent
              animationType="none"
              presentationStyle="overFullScreen"
              statusBarTranslucent
              onRequestClose={() => {
                  useReel.getState().close();
                  setFeedReelOpen(false);
              }}
          >
              <Animated.View
                  style={[
                      StyleSheet.absoluteFillObject,
                      {
                          overflow: "hidden",
                          backgroundColor: "black",
                          transform: [
                              { translateX: reelTranslateX },
                              { translateY: reelTranslateY },
                              { scale: reelScale },
                          ],
                      },
                  ]}
              >
                  <Reel
                      initialPost={reelPost}
                      onBack={() => {
                          useReel.getState().close();
                          setFeedReelOpen(false);
                      }}
                  />
              </Animated.View>
          </Modal>
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