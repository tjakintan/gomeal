import AsyncStorage from "@react-native-async-storage/async-storage";

const SEARCH_HISTORY_KEY = "@gomeal/search_history";
const MAX_SEARCH_HISTORY = 10;

const normalizeHistory = (items: unknown): string[] => {
    if (!Array.isArray(items)) return [];

    const unique = new Map<string, string>();

    for (const item of items) {
        if (typeof item !== "string") continue;

        const query = item.trim();
        if (!query) continue;

        const key = query.toLowerCase();

        if (!unique.has(key)) {
            unique.set(key, query);
        }
    }

    return Array.from(unique.values()).slice(
        0,
        MAX_SEARCH_HISTORY
    );
};

export const getSearchHistory = async (): Promise<string[]> => {
    try {
        const stored = await AsyncStorage.getItem(
            SEARCH_HISTORY_KEY
        );

        if (!stored) return [];

        const history = normalizeHistory(JSON.parse(stored));

        // Repair existing storage if it contains more than 10 items.
        await AsyncStorage.setItem(
            SEARCH_HISTORY_KEY,
            JSON.stringify(history)
        );

        return history;
    } catch {
        return [];
    }
};

export const addSearchHistory = async (
    query: string
): Promise<string[]> => {
    const normalized = query.trim();

    if (!normalized) return getSearchHistory();

    try {
        const history = await getSearchHistory();

        const updated = normalizeHistory([
            normalized,
            ...history.filter(
                (item) =>
                    item.toLowerCase() !==
                    normalized.toLowerCase()
            ),
        ]);

        await AsyncStorage.setItem(
            SEARCH_HISTORY_KEY,
            JSON.stringify(updated)
        );

        return updated;
    } catch {
        return [];
    }
};

export const removeSearchHistory = async (
    query: string
): Promise<string[]> => {
    try {
        const history = await getSearchHistory();

        const updated = history.filter(
            (item) =>
                item.toLowerCase() !== query.trim().toLowerCase()
        );

        await AsyncStorage.setItem(
            SEARCH_HISTORY_KEY,
            JSON.stringify(updated)
        );

        return updated;
    } catch {
        return [];
    }
};

export const clearSearchHistory = async (): Promise<void> => {
    try {
        await AsyncStorage.removeItem(SEARCH_HISTORY_KEY);
    } catch {}
};
