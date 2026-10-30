import { useCallback, useEffect, useRef, useState } from "react";
import { View } from "react-native";

type Opts = {
    enabled?: boolean;                    // false = nothing plays (reel/overlay open)
    eligible?: (id: number) => boolean;   // extra gate, e.g. "top card only"
    min?: number;                         // minimum visible fraction to play
    margin?: number;                      // challenger must beat current by this
    throttleMs?: number;
};

export function useActiveVideo({
    enabled = true, eligible, min = 0.5, margin = 0.15, throttleMs = 120,
}: Opts = {}) {
    const [activeId, setActiveId] = useState<number | null>(null);
    const activeRef = useRef<number | null>(null);
    const viewport = useRef<View | null>(null);
    const items = useRef(new Map<number, View>());
    const refCache = useRef(new Map<number, (n: View | null) => void>());
    const eligibleRef = useRef(eligible);
    eligibleRef.current = eligible;
    const runId = useRef(0);
    const lastRun = useRef(0);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const commit = (id: number | null) => {
        if (id === activeRef.current) return;
        activeRef.current = id;
        setActiveId(id);
    };

    const evaluate = useCallback(() => {
        const vp = viewport.current;
        if (!vp) return;
        const token = ++runId.current;

        vp.measureInWindow((vx, vy, vw, vh) => {
            const entries = [...items.current.entries()].filter(
                ([id]) => !eligibleRef.current || eligibleRef.current(id)
            );
            if (!entries.length) return commit(null);

            const results: { id: number; f: number }[] = [];
            let pending = entries.length;

            entries.forEach(([id, node]) =>
                node.measureInWindow((x, y, w, h) => {
                    if (token !== runId.current) return; // superseded
                    const ox = Math.max(0, Math.min(x + w, vx + vw) - Math.max(x, vx));
                    const oy = Math.max(0, Math.min(y + h, vy + vh) - Math.max(y, vy));
                    results.push({ id, f: w > 0 && h > 0 ? (ox * oy) / (w * h) : 0 });

                    if (--pending > 0) return;

                    let best: { id: number; f: number } | null = null;
                    let current: number | null = null;
                    for (const r of results) {
                        if (r.id === activeRef.current) current = r.f;
                        if (r.f >= min && (!best || r.f > best.f)) best = r;
                    }
                    if (current !== null && current >= min) {
                        if (best && best.id !== activeRef.current && best.f > current + margin) commit(best.id);
                    } else {
                        commit(best ? best.id : null);
                    }
                })
            );
        });
    }, [min, margin]);

    const schedule = useCallback(() => {
        const wait = throttleMs - (Date.now() - lastRun.current);
        if (wait <= 0) {
            lastRun.current = Date.now();
            evaluate();
            return;
        }
        if (timer.current) return;
        timer.current = setTimeout(() => {
            timer.current = null;
            lastRun.current = Date.now();
            evaluate();
        }, wait);
    }, [evaluate, throttleMs]);

    const itemRef = useCallback((id: number) => {
        let fn = refCache.current.get(id);
        if (!fn) {
            fn = (node: View | null) => {
                if (node) { items.current.set(id, node); setTimeout(schedule, 50); }
                else items.current.delete(id);
            };
            refCache.current.set(id, fn);
        }
        return fn;
    }, [schedule]);

    useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

    useEffect(() => {
        if (!enabled) return;
        const timers = [150, 450, 900].map((ms) => setTimeout(evaluate, ms));
        return () => timers.forEach(clearTimeout);
    }, [enabled, evaluate]);

    return {
        activeId: enabled ? activeId : null,
        viewportRef: viewport,
        itemRef,
        onScroll: schedule,   // pass to onScroll (scrollEventThrottle={16})
        refresh: evaluate,    // call on scroll end / layout / data change
    };
}