import { StepData } from "@/types";

export const formatCount = (num: number): string => {
    if (num < 1000) return `${num}`;

    if (num < 1_000_000) {
        const value = num / 1000;
        return value < 10 ? `${Math.floor(value * 10) / 10}K` : `${Math.floor(value)}K`;
    }

    if (num < 1_000_000_000) {
        const value = num / 1_000_000;
        return value < 10 ? `${Math.floor(value * 10) / 10}M` : `${Math.floor(value)}M`;
    }

    const value = num / 1_000_000_000;
    return value < 10 ? `${Math.floor(value * 10) / 10}B`: `${Math.floor(value)}B`;
};

export const getTotalSeconds = (timer: StepData["timer"]): number => {
    if (!timer) return 0;
    return (timer.hours ?? 0) * 3600 + (timer.minutes ?? 0) * 60 + (timer.seconds ?? 0);
};

export const formatTimerDisplay = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

export const formatTime = (
    date: Date | string,
    showTime = true
): string => {
    const d = new Date(date);
    const now = new Date();

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());

    const diffDays = Math.round(
        (startOfToday.getTime() - startOfDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    const time = showTime ? ` ${formatTimeOfDay(d)}` : "";

    if (diffDays === 0) return `Today${time}`;
    if (diffDays === 1) return `Yesterday${time}`;

    if (diffDays < 7) {
        return `${d.toLocaleDateString([], { weekday: "long" })}${time}`;
    }

    if (diffDays < 365) {
        return `${d.toLocaleDateString([], {
            weekday: "short",
            month: "short",
            day: "numeric",
        })}${time}`;
    }

    return `${d.toLocaleDateString([], {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
    })}${time}`;
};

export const isSameDay = (a: Date | string, b: Date | string) => {
    const da = new Date(a), db = new Date(b);
    return (
        da.getFullYear() === db.getFullYear() &&
        da.getMonth() === db.getMonth() &&
        da.getDate() === db.getDate()
    );
};

export const formatTimeOfDay = (date: Date | string): string => {
    const d = new Date(date);
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
};

export const formatBread = (num: number): string => {
    return Math.trunc(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

export const getDobParts = (date = "") => {
    if (!date) return ["", "", ""];

    if (date.includes("/")) {
        const [month = "", day = "", year = ""] = date.split("/");
        return [month, day, year];
    }

    const match = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return ["", "", ""];

    return [match[2], match[3], match[1]];
};

export const onlyDigits = (value: string, maxLength: number) => value.replace(/[^0-9]/g, "").slice(0, maxLength);

export const isValidDob = (month: string, day: string, year: string) => {
    if (month.length !== 2 || day.length !== 2 || year.length !== 4) return true;

    const m = Number(month);
    const d = Number(day);
    const y = Number(year);

    if (m < 1 || m > 12) return false;
    if (d < 1 || d > 31) return false;
    if (y < 1900) return false;

    const date = new Date(y, m - 1, d);
    const today = new Date();

    return (
        date.getFullYear() === y &&
        date.getMonth() === m - 1 &&
        date.getDate() === d &&
        date <= today
    );
};
