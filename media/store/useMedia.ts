import { useCallback, useEffect, useRef, useState } from "react";
import * as MediaLibrary from "expo-media-library";

type MediaKind = "photo" | "video";

export const PHOTO_ONLY: ("photo" | "video")[] = ["photo"];

export const MEDIA_KINDS: ("photo" | "video")[] = ["photo", "video"];

const merge = (prev: MediaLibrary.Asset[], next: MediaLibrary.Asset[]) => {
    const seen = new Set(prev.map((a) => a.id));
    return [...prev, ...next.filter((a) => !seen.has(a.id))];
};

export function useCameraRoll(mediaType: MediaKind[], pageSize = 100) {
    const [assets, setAssets] = useState<MediaLibrary.Asset[]>([]);
    const [hasNextPage, setHasNextPage] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);

    const mediaTypeRef = useRef(mediaType);
    mediaTypeRef.current = mediaType;

    const cursorRef = useRef<string | undefined>(undefined);
    const hasNextRef = useRef(false);
    const loadingMoreRef = useRef(false);
    const generationRef = useRef(0); // bumps on every refresh; stale responses are dropped

    const fetchPage = (after?: string) =>
        MediaLibrary.getAssetsAsync({
            first: pageSize,
            after,
            sortBy: [MediaLibrary.SortBy.creationTime],
            mediaType: mediaTypeRef.current,
        });

    const refresh = useCallback(async () => {
        const gen = ++generationRef.current;

        try {
            const perm = await MediaLibrary.getPermissionsAsync();

            if (gen !== generationRef.current) return;

            if (perm.status !== "granted") {
                cursorRef.current = undefined;
                hasNextRef.current = false;
                setAssets([]);
                setHasNextPage(false);
                return;
            }

            const page = await fetchPage();

            if (gen !== generationRef.current) return;

            cursorRef.current = page.endCursor;
            hasNextRef.current = page.hasNextPage;
            loadingMoreRef.current = false;

            setAssets(page.assets);          // REPLACE, never append
            setHasNextPage(page.hasNextPage);
            setLoadingMore(false);
        } catch (err) {
            console.error("[useCameraRoll] refresh failed:", err);
        }
    }, [pageSize]);

    const loadMore = useCallback(async () => {
        if (loadingMoreRef.current || !hasNextRef.current || !cursorRef.current) return;

        const gen = generationRef.current;
        loadingMoreRef.current = true;
        setLoadingMore(true);

        try {
            const page = await fetchPage(cursorRef.current);

            if (gen !== generationRef.current) return; // a refresh happened meanwhile

            cursorRef.current = page.endCursor;
            hasNextRef.current = page.hasNextPage;

            setAssets((prev) => merge(prev, page.assets));
            setHasNextPage(page.hasNextPage);
        } catch (err) {
            console.error("[useCameraRoll] loadMore failed:", err);
        } finally {
            if (gen === generationRef.current) {
                loadingMoreRef.current = false;
                setLoadingMore(false);
            }
        }
    }, [pageSize]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    return { assets, hasNextPage, loadingMore, loadMore, refresh };
}