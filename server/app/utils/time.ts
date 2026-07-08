export const getNowInTimezone = (timezone: string) => {
    const now = new Date();
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        hour: "numeric",
        minute: "numeric",
        hour12: false,
    }).formatToParts(now);

    const hour = parseInt(parts.find(p => p.type === "hour")!.value);
    const minute = parseInt(parts.find(p => p.type === "minute")!.value);

    return { hour, minute, dateString: now.toLocaleDateString("en-US", { timeZone: timezone }) };
};