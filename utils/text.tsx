export const capitalize = (text?: string) =>
  text
    ? text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
    : "";
    
export const limitLength = (text: string, maxLength: number) =>
    Array.from(text).length > maxLength
        ? `${Array.from(text).slice(0, maxLength).join("")}...`
        : text;

export const isWebsite = (url: string) => {
    const value = url.trim();



    if (!value) return true;

    try {
        const normalized = /^https?:\/\//i.test(value)
            ? value
            : `https://${value}`;

        const parsed = new URL(normalized);

        const devHost = process.env.EXPO_PUBLIC_HOSTNAME?.trim().toLowerCase();

        const hostname = parsed.hostname.toLowerCase();

        const isLocalhost =
            hostname === "localhost" ||
            (!!devHost && hostname === devHost);

        const isIPv4 =
            /^\d{1,3}(\.\d{1,3}){3}$/.test(parsed.hostname);

        const isDomain =
            parsed.hostname.includes(".") &&
            /^[\w.-]+$/.test(parsed.hostname);

        return (
            ["http:", "https:"].includes(parsed.protocol) &&
            (isLocalhost || isIPv4 || isDomain)
        );
    } catch {
        return false;
    }
};

export const emojiRegex =
    /^(?:\p{Extended_Pictographic}|\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Emoji_Modifier}|\u200D|\uFE0F|\u20E3|\p{Regional_Indicator})+$/u;


export const isEmojiOnly = (content: string) => {
    const trimmed = content.trim();

    if (!trimmed) {
        return false;
    }

    /*
     * Match complete emoji grapheme sequences.
     *
     * Supports:
     * 🍕
     * ❤️
     * 👍🏽
     * 👨‍🍳
     * 👩‍❤️‍💋‍👨
     * 🇺🇸
     */
    const emojiPattern =
        /^(?:(?:\p{Extended_Pictographic}|\p{Emoji_Presentation})(?:\uFE0F|\p{Emoji_Modifier})?(?:\u200D(?:\p{Extended_Pictographic}|\p{Emoji_Presentation})(?:\uFE0F|\p{Emoji_Modifier})?)*|(?:\p{Regional_Indicator}{2})|(?:\p{Emoji}\uFE0F\u20E3))$/u;

    /*
     * Split on whitespace first so multiple emojis
     * can be checked individually.
     */
    const parts = trimmed.split(/\s+/);

    return parts.every((part) =>
        emojiPattern.test(part)
    );
};


export const getEmojiCount = (content: string) => {
    const trimmed = content.trim();

    if (!trimmed) {
        return 0;
    }

    /*
     * First try native grapheme segmentation.
     */
    if (
        typeof Intl !== "undefined" &&
        typeof Intl.Segmenter === "function"
    ) {
        const segmenter = new Intl.Segmenter(
            undefined,
            {
                granularity: "grapheme",
            }
        );

        return Array.from(
            segmenter.segment(trimmed)
        ).filter(
            ({ segment }) =>
                segment.trim().length > 0
        ).length;
    }

    /*
     * Hermes / older JS environments may not expose
     * Intl.Segmenter, so manually match emoji sequences.
     *
     * The important part is that ZWJ sequences such as
     * 👨‍🍳 are treated as ONE emoji.
     */
    const emojiMatches = trimmed.match(
        /(?:\p{Extended_Pictographic}|\p{Emoji_Presentation})(?:\uFE0F|\p{Emoji_Modifier})?(?:\u200D(?:\p{Extended_Pictographic}|\p{Emoji_Presentation})(?:\uFE0F|\p{Emoji_Modifier})?)*|(?:\p{Regional_Indicator}{2})|(?:\p{Emoji}\uFE0F\u20E3)/gu
    );

    return emojiMatches?.length ?? 0;
};