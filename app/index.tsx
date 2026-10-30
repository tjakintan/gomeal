import PagerView from "react-native-pager-view";
import { SafeAreaView } from "react-native-safe-area-context";
import React, { useState, useRef, useEffect, useCallback, memo, useMemo } from "react";

import {
    View,
    Animated,
    Dimensions,
    StyleSheet,
    useWindowDimensions,
    InteractionManager,
    Modal,
} from "react-native";

import {
    PanGestureHandler,
    State,
} from "react-native-gesture-handler";

import DashBoard from "@/dashboard/index";
import Navigate from "@/sections/Navigate";

import { Inbox } from "@/sections/messages/inbox";
import { Sections, BOTTOM_HEIGHT } from "@/types/layout.types";

import { Feed, Leaderboard, User, ChefNex } from "@/sections";
import OnBoardScreen from "@/onboard/index";
import { useUser } from "@/stores/useUser";
import { useNotificationListener } from "@/notifications/notification.socket";
import { useTheme } from "@/provider/ThemeProvider";
import { useInboxListener, useMessageReadListener, useNewMessageListener } from "@/api/messages.socket";
import { useActivateBugReport} from "./bug";
import Bug from "@/components/BugComponent";
import { ReelChromeContext, useReel } from "@/stores/useReel";
import { initNotificationListener, registerPushNotifications, syncBadgeCount, useAppStateReporter, useMessageBannerListener } from "@/notifications/pushNotification";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DASHBOARD_HEIGHT } from "@/types/feed.types";

import PermissionContent from "@/components/PermissionComponent";
import { BannerItem, useBannerStore } from "@/stores/useBanner";

// Overlays
import { OverlayContent, useOverlay } from "@/stores/useOverlay";
import Overlay from "./overlay";
import { useSlidingOverlay } from "@/stores/useSlideOverlay";
import SlidingOverlay from "./slideOverlay";

import Reel from "@/sections/feed/reel";
import { useFeed } from "@/stores/useFeed";
import AppBottomSheet from "./BottomSheet";
import { useBottomSheet } from "@/stores/useBottomSheet";
import { usePostHog } from "posthog-react-native";
import Banner from "./Banner";
import { useShowRewardBanner } from "@/components/RewardComponent";
import { usePermissions } from "@/provider/PermissionProvider";
import { useNotification } from "@/notifications/useNotification";
import { getScreenCornerRadius } from "expo-screen-corners";

import orientation from "@/modules/orientation";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";


/**
 * Shared duration (ms) for every animated value involved in the chrome
 * hide/show transition (`dashboardHeightAnim`).
 *
 * Why `timing` + one shared duration instead of `spring`:
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
const MemoInbox   = memo(Inbox);


const SLIDE_BASE_Z_INDEX = 1000;
const SLIDE_UP_BASE_Z_INDEX = 4000;
const BOTTOM_SHEET_Z_INDEX = 3000;
const BANNER_Z_INDEX = 5000;


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
const OverlayItem = ({
    id,
    content,
    children,
    dark,
    depth,
    closing
}: {
    id: string;
    content: OverlayContent | null;
    children: React.ReactNode | null;
    dark: boolean;
    depth: number;
    closing?: boolean
}) => {
    const { height } = useWindowDimensions();

    const translateY = useRef(
        new Animated.Value(height)
    ).current;

    const hasClosed = useRef(false);

    // -----------------------------
    // OPEN
    // -----------------------------
    useEffect(() => {
        translateY.setValue(height);

        Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 0,
            speed: 20,
        }).start();
    }, []);

    // -----------------------------
    // CLOSE
    // -----------------------------
    const handleClose = useCallback(() => {
        if (hasClosed.current) {
            return;
        }

        hasClosed.current = true;

        Animated.spring(translateY, {
            toValue: height,
            useNativeDriver: true,
            bounciness: 0,
            speed: 20,
        }).start(({ finished }) => {
            if (!finished) {
                hasClosed.current = false;
                return;
            }

            // Remove ONLY this overlay.
            useOverlay.getState().removeOverlay(id);
        });
    }, [
        height,
        translateY,
        id,
    ]);

    useEffect(() => {
        if (closing) handleClose();
    }, [closing, handleClose]);

    // -----------------------------
    // RENDER
    // -----------------------------
    if (!content && !children) {
        return null;
    }

    return (
        <Animated.View
            pointerEvents="auto"
            style={{
                ...StyleSheet.absoluteFillObject,

                zIndex:
                    SLIDE_UP_BASE_Z_INDEX +
                    depth,

                elevation:
                    SLIDE_UP_BASE_Z_INDEX +
                    depth,

                transform: [
                    {
                        translateY,
                    },
                ],
            }}
        >
            <Overlay
                content={content ?? undefined}
                onClose={handleClose}
                dark={dark}
            >
                {children}
            </Overlay>
        </Animated.View>
    );
};


const SlideOverlayItem = ({
    id,
    depth,
    dark,
    closing,
    children,
    onDismiss,       
}: {
    id: string;
    depth: number;
    dark: boolean;
    closing: boolean;
    children: React.ReactNode;
    onDismiss?: () => void;  
}) => {
    const { width } = useWindowDimensions();

    const translateX = useRef(
        new Animated.Value(width)
    ).current;

    const hasClosed = useRef(false);

    // --------------------------------------------------
    // REMOVE OVERLAY
    // --------------------------------------------------

    const removeOverlay = useCallback(() => {
        useSlidingOverlay.setState((state) => {
            const stack = state.stack.slice(0, -1);
            return { stack, isOpen: stack.length > 0, isClosing: false, isSwiping: false };
        });
        onDismiss?.();
    }, [onDismiss]);

    // --------------------------------------------------
    // OPEN
    // --------------------------------------------------

    useEffect(() => {
        translateX.setValue(width);

        Animated.timing(translateX, {
            toValue: 0,
            duration: 220,
            useNativeDriver: true,
        }).start();
    }, [width, translateX]);

    // --------------------------------------------------
    // PROGRAMMATIC CLOSE
    // --------------------------------------------------

    useEffect(() => {
        if (!closing || hasClosed.current) {
            return;
        }

        hasClosed.current = true;

        useSlidingOverlay.setState({
            isClosing: true,
        });

        Animated.timing(translateX, {
            toValue: width,
            duration: 180,
            useNativeDriver: true,
        }).start(({ finished }) => {
            if (!finished) return;

            removeOverlay();
        });
    }, [
        closing,
        width,
        translateX,
        removeOverlay,
    ]);

    // --------------------------------------------------
    // SWIPE
    // --------------------------------------------------

    const handleGestureEvent = useMemo(
        () =>
            Animated.event(
                [
                    {
                        nativeEvent: {
                            translationX: translateX,
                        },
                    },
                ],
                {
                    useNativeDriver: true,
                }
            ),
        [translateX]
    );

    // --------------------------------------------------
    // GESTURE STATE
    // --------------------------------------------------

    const handleHandlerStateChange = useCallback(
        (event: any) => {

            const {
                state,
                translationX,
                velocityX,
            } = event.nativeEvent;

            if (state === State.ACTIVE) {
                useSlidingOverlay.getState().setSwiping(true);
                return;
            }

            if (
                state !== State.END &&
                state !== State.CANCELLED &&
                state !== State.FAILED
            ) {
                return;
            }

            useSlidingOverlay.getState().setSwiping(false);

            // ------------------------------------------
            // CANCELLED / FAILED
            // ------------------------------------------

            if (
                state === State.CANCELLED ||
                state === State.FAILED
            ) {
                if (!hasClosed.current) {
                    Animated.spring(translateX, {
                        toValue: 0,
                        useNativeDriver: true,
                        bounciness: 0,
                        speed: 20,
                    }).start();
                }

                return;
            }

            if (hasClosed.current) {
                return;
            }

            const SWIPE_THRESHOLD = width * 0.08;
            const VELOCITY_THRESHOLD = 150;

            const shouldClose =
                translationX >= SWIPE_THRESHOLD ||
                velocityX >= VELOCITY_THRESHOLD;

            // ------------------------------------------
            // CLOSE
            // ------------------------------------------

            if (shouldClose) {
                hasClosed.current = true;

                useSlidingOverlay.setState({
                    isClosing: true,
                });

                Animated.timing(translateX, {
                    toValue: width,
                    duration: 180,
                    useNativeDriver: true,
                }).start(({ finished }) => {
                    if (!finished) return;

                    removeOverlay();
                });

                return;
            }

            // ------------------------------------------
            // NOT ENOUGH SWIPE
            // ------------------------------------------

            Animated.spring(translateX, {
                toValue: 0,
                useNativeDriver: true,
                bounciness: 0,
                speed: 20,
            }).start();
        },
        [
            width,
            translateX,
            removeOverlay,
        ]
    );

    // --------------------------------------------------
    // RENDER
    // --------------------------------------------------

    return (
        <View
            style={{
                ...StyleSheet.absoluteFillObject,
                zIndex:
                    SLIDE_BASE_Z_INDEX +
                    depth,
                elevation:
                    SLIDE_BASE_Z_INDEX +
                    depth,
            }}
        >
            {/* ------------------------------------------
                CONTENT
                ------------------------------------------ */}

            <Animated.View
                style={{
                    ...StyleSheet.absoluteFillObject,
                    transform: [
                        {
                            translateX,
                        },
                    ],
                }}
            >
                <SlidingOverlay dark={dark}>
                    {children}
                </SlidingOverlay>
            </Animated.View>

            {/* ------------------------------------------
                LEFT EDGE CLOSE GESTURE
                ------------------------------------------ */}

                <PanGestureHandler
                    activeOffsetX={[-5, 5]}
                    failOffsetY={[-20, 20]}
                    onGestureEvent={handleGestureEvent}
                    onHandlerStateChange={handleHandlerStateChange}
                >
                    <Animated.View
                        style={{
                            position: "absolute",
                            left: 0,
                            top: 0,
                            bottom: 0,
                            width: 30,
                        }}
                    />
                </PanGestureHandler>
        </View>
    );
};


/**
 * Mounted fresh per banner (keyed by `item.id` in BannerHost below), so
 * unlike OverlayItem this doesn't need a `hasOpened` guard ref — a new
 * banner means a new key means a new instance, so the open animation
 * safely runs unconditionally on mount.
 */
const AnimatedBanner: React.FC<{
    item: BannerItem;
    status: "opening" | "open" | "closing";
    dark?: boolean;
}> = ({ item, status, dark }) => {
    
    const insets = useSafeAreaInsets();
    const translateY = useRef(new Animated.Value(-200)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const hasClosed = useRef(false);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── open ──
    useEffect(() => {
        Animated.parallel([
            Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 0, speed: 20 }),
            Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        ]).start(({ finished }) => {
            if (finished) useBannerStore.getState().notifyOpenComplete();
        });

        timer.current = setTimeout(() => {
            useBannerStore.getState().dismiss();
        }, item.duration);

        return () => {
            if (timer.current) clearTimeout(timer.current);
        };
    }, []);

    // ── close ──
    useEffect(() => {
        if (status !== "closing" || hasClosed.current) return;
        hasClosed.current = true;
        if (timer.current) clearTimeout(timer.current);

        Animated.parallel([
            Animated.timing(translateY, { toValue: -200, duration: 180, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
        ]).start(({ finished }) => {
            if (finished) useBannerStore.getState().notifyCloseComplete();
        });
    }, [status]);

    return (
        <Animated.View
            pointerEvents="box-none"
            style={{ position: "absolute", top: insets.top + 8, left: 0, right: 0, transform: [{ translateY }], opacity }}
        >
            <Banner item={item} dark={dark} onPress={() => useBannerStore.getState().dismiss()} />
        </Animated.View>
    );
};


const BannerHost: React.FC<{ dark?: boolean }> = ({ dark }) => {
    const current = useBannerStore((s) => s.current);
    const status = useBannerStore((s) => s.status);

    if (!current || status === "closed") return null;

    return (
        <View pointerEvents="box-none" style={{ ...StyleSheet.absoluteFillObject, zIndex: BANNER_Z_INDEX, elevation: BANNER_Z_INDEX }}>
            <AnimatedBanner key={current.id} item={current} status={status as "opening" | "open" | "closing"} dark={dark} />
        </View>
    );
};


const AuthenticatedApp: React.FC = () => {

    const posthog = usePostHog();

    const { requestPermissions } = usePermissions();

    const radius = getScreenCornerRadius();

    const { height: screenHeight, width: screenWidth } = useWindowDimensions();

    const isLandscape = screenWidth > screenHeight;
    
    // Tracks whether the dashboard and/or nav bar is actually collapsed, independent
    // of `stopPager` (which also gets toggled by reel/cook/media-enhance —
    // unrelated concerns). Used solely to size the pager container so it
    // exactly compensates for the dashboard's translateY offset, avoiding
    // both the "always screenHeight" bug and the "flex:1 leaves a gap" bug.
    const [collapsed,  setCollapsed]  = useState(false);


    // ─── overlays ──────────────────────────────────
    const overlayStack = useOverlay((s) => s.stack);

    const appOverlayStack = overlayStack.filter(
        (overlay) => overlay.scope === "app"
    );

    const reelOverlayStack = overlayStack.filter(
        (overlay) => overlay.scope === "reel"
    );


    // ─── local UI state ───────────────────────────────────────────────────────
    const [section,             setSection]             = useState<Sections>("feed");
    const [feedReelOpen,        setFeedReelOpen]        = useState(false);
    const [stopPager,           setStopPager]           = useState(false);
    const [bugReportOpen, setBugReportOpen] = useState(false);

    const openBottomSheet = useBottomSheet((s) => s.openBottomSheet);
    const closeBottomSheet = useBottomSheet((s) => s.closeBottomSheet);


    const insets = useSafeAreaInsets();
    const forceDark = feedReelOpen;
    const { colors } = useTheme(forceDark ? "dark" : undefined); 


    // ─── listeners ────────────────────────────────────────────────────────────
    const unreadCount = useNotification((s) => s.unreadCount);

    useNotificationListener();
    useInboxListener();
    useMessageReadListener();
    useNewMessageListener();
    useEffect(() => initNotificationListener(), []);
    useShowRewardBanner();
    useEffect(() => {
        syncBadgeCount(unreadCount);
    }, [unreadCount]);
    useAppStateReporter();
    useMessageBannerListener();
  

    // ─── bug report shake ─────────────────────────────────────────────────────
    useActivateBugReport({
        enabled: !bugReportOpen && !isLandscape,
        onShake: () => {
            setBugReportOpen(true);
            openBottomSheet(
                <Bug
                    section={section}
                    dark={forceDark}
                    onClose={() => {
                        setBugReportOpen(false);
                        closeBottomSheet();
                    }}
                />,
                [420 + insets.bottom, BOTTOM_HEIGHT],
                1
            );
        },
    });


    // request notifications permission ─────────────────────────────────────────────────────
    useEffect(() => {
        let cancelled = false;

        const requestNotifications = async () => {
            const granted = await requestPermissions({
                permissions: ["notifications"],

                title: "Allow GoMeal to send notifications",

                description:
                    "Get notified about new messages, cooking reminders, and activity on your posts.",

                deniedDescription:
                    "Notifications have been disabled. Please enable Notifications for GoMeal in Settings.",

                onGranted: async () => {
                    if (cancelled) return;

                    await registerPushNotifications();
                },
            });

            if (cancelled) return;

            // Optional:
            // You can use `granted` here if the app needs
            // to react differently when notifications are denied.
        };

        requestNotifications();

        return () => {
            cancelled = true;
        };
    }, [requestPermissions]);
    

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


    // --------- Reels Refs ------------------------------------
    const reelIsClosing = useRef(false);

    const reelProgress = useRef(new Animated.Value(0)).current;
    const dragX = useRef(new Animated.Value(0)).current;
    const dragY = useRef(new Animated.Value(0)).current;

    const reelVisible = useReel((s) => s.isVisible);
    const reelPost = useFeed((s) => s.activeReelPost);
    const reelLayout = useReel((s) => s.origin);
    const isScrubbing = useReel((s) => s.isScrubbing);
    const dismissing = useReel((s) => s.isDismissing);
    const videoRect = useReel((s) => s.videoRect);

    const crop = dismissing && !isLandscape ? videoRect : null;
    const frameTop = crop?.top ?? 0;
    const frameH = crop?.height ?? screenHeight;

    const FADE_DISTANCE = 40;
    const SHRINK_DISTANCE = screenWidth * 0.5;
    const MIN_SCALE = 360 / screenHeight;
        
    const reelStart = useMemo(() => {
        if (!reelLayout) {
            return { x: 0, y: 0, scaleX: 1, scaleY: 1 };
        }

        return {
            x: reelLayout.x - (screenWidth - reelLayout.width) / 2,
            y: reelLayout.y + reelLayout.height / 2 - (frameTop + frameH / 2),
            scaleX: reelLayout.width / screenWidth,
            scaleY: reelLayout.height / frameH,
        };
    }, [
        reelLayout?.x,
        reelLayout?.y,
        reelLayout?.width,
        reelLayout?.height,
        screenWidth,
        screenHeight,
        frameTop,
        frameH,
    ]);

    
    const reelTransform = useMemo(() => {
        const maxOffsetX = (screenWidth * (1 - MIN_SCALE)) / 2;
        const maxOffsetY = (screenHeight * (1 - MIN_SCALE)) / 2;

        const tx = dragX.interpolate({
            inputRange: [-SHRINK_DISTANCE, 0, SHRINK_DISTANCE],
            outputRange: [-maxOffsetX, 0, maxOffsetX],
            extrapolate: "clamp",
        });

        const ty = dragY.interpolate({
            inputRange: [-SHRINK_DISTANCE, 0, SHRINK_DISTANCE],
            outputRange: [-maxOffsetY, 0, maxOffsetY],
            extrapolate: "clamp",
        });

        const sx = dragX.interpolate({
            inputRange: [-SHRINK_DISTANCE, 0, SHRINK_DISTANCE],
            outputRange: [MIN_SCALE, 1, MIN_SCALE],
            extrapolate: "clamp",
        });

        const sy = dragY.interpolate({
            inputRange: [-SHRINK_DISTANCE, 0, SHRINK_DISTANCE],
            outputRange: [MIN_SCALE, 1, MIN_SCALE],
            extrapolate: "clamp",
        });

        const dragScale = Animated.multiply(sx, sy);

        const lerpOut = (from: number) =>
            reelProgress.interpolate({
                inputRange: [0, 1],
                outputRange: [from, 0],
            });

        return [
            {
                translateX: Animated.add(
                    lerpOut(reelStart.x),
                    Animated.multiply(tx, reelProgress)
                ),
            },
            {
                translateY: Animated.add(
                    lerpOut(reelStart.y),
                    Animated.multiply(ty, reelProgress)
                ),
            },
            {
                scaleX: Animated.add(
                    lerpOut(reelStart.scaleX),
                    Animated.multiply(dragScale, reelProgress)
                ),
            },
            {
                scaleY: Animated.add(
                    lerpOut(reelStart.scaleY),
                    Animated.multiply(dragScale, reelProgress)
                ),
            },
        ];
    }, [
        reelStart,
        screenWidth,
        screenHeight,
        dragX,
        dragY,
        reelProgress,
    ]);


    const reelChromeOpacity = useMemo(() => {
        const fadeX = dragX.interpolate({
            inputRange: [-FADE_DISTANCE, 0, FADE_DISTANCE],
            outputRange: [0, 1, 0],
            extrapolate: "clamp",
        });
        const fadeY = dragY.interpolate({
            inputRange: [-FADE_DISTANCE, 0, FADE_DISTANCE],
            outputRange: [0, 1, 0],
            extrapolate: "clamp",
        });
        const fadeProgress = reelProgress.interpolate({
            inputRange: [0, 0.85, 1],
            outputRange: [0, 0, 1],
            extrapolate: "clamp",
        });

        return Animated.multiply(Animated.multiply(fadeX, fadeY), fadeProgress);
    }, [dragX, dragY, reelProgress]);


    const handleReelDrag = useMemo(
        () =>
            Animated.event(
                [{ nativeEvent: { translationX: dragX, translationY: dragY } }],
                { useNativeDriver: true }
            ),
        [dragX, dragY]
    );


    /**
     * Handles the Reel opening animation.
     *
     * A Reel that is opening always starts from the originating post position
     * and scales up into the full-screen Reel.
     *
     * `reelIsClosing` prevents an old closing animation from accidentally
     * triggering the opening animation again during the same lifecycle.
     *
     * When a new Reel becomes visible, the closing lock is cleared so the
     * Reel can be opened again after a previous Reel has been closed.
     */
    useEffect(() => {
        if (!reelVisible || !reelLayout) return;

        reelIsClosing.current = false;
        useReel.setState({ isDismissing: false, videoRect: null });
        dragX.setValue(0);
        dragY.setValue(0);
        reelProgress.setValue(0);

        InteractionManager.runAfterInteractions(() => {
            if (!useReel.getState().isVisible || reelIsClosing.current) return;

            Animated.spring(reelProgress, {
                toValue: 1,
                speed: 20,
                bounciness: 0,
                useNativeDriver: true,
            }).start();
        });
    }, [reelVisible, reelLayout]);
    

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
    const s_o = useSlidingOverlay((s) => s.stack);

    const stack = s_o.filter(
        (overlay) => overlay.scope === "app"
    );

    const reelStack = s_o.filter(
        (overlay) => overlay.scope === "reel"
    );


    /**
     * Handles the Reel swipe-to-close gesture.
     *
     * - Swipe right far/fast enough → animate Reel completely off-screen.
     * - The Reel is only closed after the exit animation finishes.
     * - Prevents the Reel opening animation from running during close.
     * - Small swipe → snap Reel back to center.
     */
    const handleReelClose = useCallback(() => {
        if (reelIsClosing.current) return;
        reelIsClosing.current = true;
        useReel.setState({ isDismissing: true });

        Animated.timing(reelProgress, {
            toValue: 0,
            duration: 220,
            useNativeDriver: true,
        }).start(({ finished }) => {
            if (!finished) {
                reelIsClosing.current = false;
                useReel.setState({ isDismissing: false });
                return;
            }
            useReel.getState().close();
            setFeedReelOpen(false);
        });
    }, [reelProgress]);


    const handleReelSwipe = useCallback((event: any) => {
        const { state, translationX, translationY, velocityX, velocityY } = event.nativeEvent;

        if (state === State.ACTIVE) {
            useReel.setState({ isDismissing: true });
            return;
        }

        if (state !== State.END && state !== State.CANCELLED && state !== State.FAILED) return;
        if (reelIsClosing.current) return;

        const snapBack = () => {
            useReel.setState({ isDismissing: false });
            Animated.parallel([
                Animated.spring(dragX, { toValue: 0, useNativeDriver: true, bounciness: 0, speed: 20 }),
                Animated.spring(dragY, { toValue: 0, useNativeDriver: true, bounciness: 0, speed: 20 }),
            ]).start();
        };

        if (state !== State.END) {
            snapBack();
            return;
        }

        const distance = Math.hypot(translationX, translationY);
        const speed = Math.hypot(velocityX, velocityY);

        if (distance >= screenWidth * 0.15 || speed >= 500) {
            handleReelClose();
        } else {
            snapBack();
        }
    }, [screenWidth, dragX, dragY, handleReelClose]);


    /**
     * Chrome animation ownership:
     * `dashAnim`
     * - Owned by the feed chrome callbacks (`setFeedScrolled` /
     *   `resetFeedScrolled`).
     * - Controls only the dashboard and pager position.
     * - Represents whether the feed itself is in its collapsed/fullscreen state.
     */
    const dashAnim = useRef(new Animated.Value(0)).current;

    /**
     * Updates the feed's collapsed chrome state.
     *
     * This callback owns `dashAnim`, so the dashboard and pager respond
     * immediately to feed scrolling.
     *
     * `collapsedRef` is updated synchronously before React state so stable
     * callbacks can immediately observe the new collapsed state without waiting
     * for the next render.
     */
    const setFeedScrolled = useCallback((hidden: boolean) => {
        collapsedRef.current = hidden; 
        setStopPager(hidden);
        setCollapsed(hidden);

        Animated.timing(dashAnim, {
            toValue: hidden ? 1 : 0,
            duration: 220,
            useNativeDriver: true,
        }).start();
    }, []);
    /**
     * Restores the feed's chrome after the feed scroll state is reset.
     *
     * Like `setFeedScrolled`, this only owns the feed/dashboard animation.
     * Clearing `collapsed` does not directly show the nav because another reason
     * may still require it to remain hidden, such as an open bottom sheet or reel.
     *
     * The nav is restored only when `shouldHideNav` becomes false.
     */
    const resetFeedScrolled = useCallback(() => {
        collapsedRef.current = false;
        setStopPager(false);
        setCollapsed(false);

        Animated.timing(dashAnim, {
            toValue: 0,
            duration: 220,
            useNativeDriver: true,
        }).start();
    }, []);


    // ─── sections ─────────────────────────────────────────────────────
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

        posthog.screen(s);
        setSection(s);
        },
        [resetFeedScrolled]
    );

    const setASectionOpen = useCallback((sec: string, open: boolean) => {
        if (sec === "reel") setFeedReelOpen(open);
        setStopPager(open);
    }, []);


    // ─── nav transitions ───────────────────────────────────────────────────────────────
    const navTranslateY = dashAnim.interpolate({
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

    // ─── orientation ───────────────────────────────────────────────────────────────
    useEffect(() => {
        orientation.setActive(reelVisible);

        return () => {
            orientation.setActive(false);
        };
    }, [reelVisible]);


    // ─── posthog ───────────────────────────────────────────────────────────────
    useEffect(() => {
        posthog.screen("feed");
    }, []);
    useEffect(() => {
        if (reelVisible) {
        posthog.screen("reel");
        }
    }, [reelVisible]);


  // ─── render ───────────────────────────────────────────────────────────────
  return (

    <>

        <Animated.View
            pointerEvents="auto"
            style={{
                height: DASHBOARD_HEIGHT,
                overflow: "hidden",
                zIndex: 10,
                transform: [{ translateY: dashboardTranslateY }],
            }}
        >
            <View
                style={{
                    height: 175,
                    paddingTop: insets.top,
                }}
            >
                <DashBoard />
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
                    style={[
                        StyleSheet.absoluteFillObject,
                        {
                            zIndex: section === "inbox" ? 1 : -1,
                        },
                    ]}
                >
                    <MemoInbox isFocused={section === "inbox"} />
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
                transform: [{ translateY: navTranslateY }],
            }}
        >
            <Navigate
                goToSection={goToSection}
                section={section}
                dark={forceDark}
            />
        </Animated.View>

    
        {!reelVisible && (
            <View
                pointerEvents="box-none"
                style={[
                    StyleSheet.absoluteFillObject,
                    {
                        zIndex: BOTTOM_SHEET_Z_INDEX,
                        elevation: BOTTOM_SHEET_Z_INDEX,
                    },
                ]}
            >
                <AppBottomSheet dark={forceDark} />
            </View>
        )}


        <BannerHost dark={forceDark} />


        <>
            {appOverlayStack.map((overlay, index) => (
                <OverlayItem
                    key={overlay.id}
                    id={overlay.id}
                    content={overlay.content}
                    children={overlay.children}
                    dark={forceDark}
                    depth={index}
                    closing={!!overlay.closing}
                />
            ))}
            {stack.map((overlay, index) => (
                <SlideOverlayItem
                    key={overlay.id}
                    id={overlay.id}
                    depth={index}
                    dark={forceDark}
                    closing={!!overlay.closing}
                    onDismiss={overlay.onDismiss}
                >
                    {overlay.content}
                </SlideOverlayItem>
            ))}
        </>


        {reelVisible && reelPost && reelLayout && (
            <Modal
                visible={reelVisible}
                transparent
                animationType="none"
                presentationStyle="overFullScreen"
                statusBarTranslucent
                supportedOrientations={["portrait", "landscape"]}
                onRequestClose={() => {
                    useReel.getState().close();
                    setFeedReelOpen(false);
                }}
            >
                <View
                    style={StyleSheet.absoluteFillObject}
                >
                    <BannerHost dark />

                    <PanGestureHandler
                        enabled={!isScrubbing}
                        activeOffsetX={[-9999, 5]}
                        failOffsetY={[-20, 20]}
                        onGestureEvent={handleReelDrag}
                        onHandlerStateChange={handleReelSwipe}
                    >
                        <Animated.View
                            style={{
                                position: "absolute",
                                left: 0,
                                right: 0,
                                top: frameTop,
                                height: frameH,
                                overflow: "hidden",
                                borderRadius: radius,
                                transform: reelTransform,
                            }}
                        >
                            <View
                                style={{
                                    position: "absolute",
                                    left: 0,
                                    right: 0,
                                    top: -frameTop,
                                    height: screenHeight,
                                }}
                            >
                                <ReelChromeContext.Provider value={reelChromeOpacity}>
                                    <Reel initialPost={reelPost} onBack={handleReelClose} />
                                </ReelChromeContext.Provider>
                            </View>
                        </Animated.View>
                    </PanGestureHandler>

                    {reelStack.map((overlay, index) => (
                        <SlideOverlayItem
                            key={overlay.id}
                            id={overlay.id}
                            depth={index}
                            dark
                            closing={!!overlay.closing}
                            onDismiss={overlay.onDismiss}
                        >
                            {overlay.content}
                        </SlideOverlayItem>
                    ))}

                    {reelOverlayStack.map((overlay, index) => (
                        <OverlayItem
                            key={overlay.id}
                            id={overlay.id}
                            content={overlay.content}
                            children={overlay.children}
                            dark
                            depth={index}
                            closing={!!overlay.closing}
                        />
                    ))}

                    <BottomSheetModalProvider>
                        <View
                            pointerEvents="box-none"
                            style={{
                                ...StyleSheet.absoluteFillObject,
                                zIndex: BOTTOM_SHEET_Z_INDEX,
                                elevation: BOTTOM_SHEET_Z_INDEX,
                            }}
                        >
                            <AppBottomSheet dark />
                        </View>
                    </BottomSheetModalProvider>
                    
                </View>

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