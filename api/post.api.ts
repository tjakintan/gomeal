import { apiFetch } from "./api";
import { API_BASE } from "../config";
import { File } from "expo-file-system";
import { fetch } from "expo/fetch";
import { Ingredient, NutritionData, PostPayload, Unit } from '@/types';
import {
    MediaType,
    MediaUploadType,
    CONTENT_TYPES,
    getMediaTypeFromContentType,
    DownloadedMedia,
    getContentTypeFromExtension,
} from "@/types/media.types";

import * as FileSystem from "expo-file-system/legacy";


export type DownloadMediaType =
    | "gif"
    | "image"
    | "video";


export const downloadMedia = async (
    uri: string,
    mediaType: DownloadMediaType
): Promise<DownloadedMedia> => {

    if (!uri) {
        throw new Error(
            "Missing media URI"
        );
    }


    /*
     * Download to a temporary file first.
     */
    const temporaryUri =
        `${FileSystem.cacheDirectory}message-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}.tmp`;


    const result =
        await FileSystem.downloadAsync(
            uri,
            temporaryUri
        );


    if (result.status !== 200) {
        throw new Error(
            `Media download failed: ${result.status}`
        );
    }


    /*
     * Try Content-Type first.
     */
    let contentType =
        result.headers?.["Content-Type"] ||
        result.headers?.["content-type"] ||
        "";


    contentType =
        contentType
            .split(";")[0]
            .trim()
            .toLowerCase();


    /*
     * If the server didn't provide a useful
     * Content-Type, inspect the URL extension.
     */
    if (
        !contentType ||
        contentType === "application/octet-stream"
    ) {

        const cleanUri =
            uri.split("?")[0];

        const extension =
            cleanUri
                .split(".")
                .pop()
                ?.toLowerCase();


        const detectedContentType =
            extension
                ? getContentTypeFromExtension(
                    extension
                )
                : null;


        if (detectedContentType) {
            contentType =
                detectedContentType;
        }
    }


    /*
     * Final fallback.
     */
    if (
        !contentType ||
        !contentType.startsWith("image/") &&
        !contentType.startsWith("video/")
    ) {

        if (mediaType === "video") {
            contentType = "video/mp4";
        } else {
            contentType = "image/gif";
        }
    }


    const extension =
        contentType === "image/gif"
            ? "gif"
            : contentType === "image/png"
                ? "png"
                : contentType === "image/webp"
                    ? "webp"
                    : contentType === "video/mp4"
                        ? "mp4"
                        : "jpg";


    const finalUri =
        `${FileSystem.cacheDirectory}message-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}.${extension}`;


    await FileSystem.moveAsync({
        from: result.uri,
        to: finalUri,
    });


    return {
        uri: finalUri,
        mediaType:
            getMediaTypeFromContentType(
                contentType
            ),
        contentType:
            contentType as DownloadedMedia["contentType"],
    };
};


export const uploadMediaToS3 = async (
    uri: string,
    mediaType: MediaType,
    uploadType: MediaUploadType,
    contentType?: string
): Promise<string> => {

    if (!uri || !mediaType || !uploadType) {
        throw new Error("uploadMediaToS3: missing uri, mediaType, or uploadType");
    }

    const ext = uri.split("?")[0].split(".").pop()?.toLowerCase();

    const resolvedContentType =
        contentType ??
        (ext ? getContentTypeFromExtension(ext) : null) ??
        (mediaType === "video" ? "video/mp4" : "image/jpeg");

    // Check the local file first so we don't burn a presign for nothing
    const file = new File(uri);

    if (!file.exists) {
        throw new Error(`File does not exist: ${uri}`);
    }

    // Ask backend for the presigned URL
    const { presignedUrl, s3Url } = await apiFetch(
        `${API_BASE}/post/upload-media`,
        {
            method: "POST",
            body: JSON.stringify({
                mediaType,
                uploadType,
                contentType: resolvedContentType,
            }),
        }
    );

    // PUT with the exact same Content-Type the URL was signed with
    const response = await fetch(presignedUrl, {
        method: "PUT",
        headers: { "Content-Type": resolvedContentType },
        body: file,
    });

    if (!response.ok) {
        throw new Error(`Upload failed with status ${response.status}`);
    }

    return s3Url;
};


export async function _find_ingredient(query: string): Promise<Ingredient[]> {

    if (!query || query.trim().length < 3) return [];

    const data = await apiFetch(`${API_BASE}/post/live-ingredients-search`, {
        method: "POST",
        body: JSON.stringify({ query }),
    });
    
    return data as Ingredient[] ?? [];
};


export const calculateNutrition = async (
    name: string,
    quantity: number,
    unit: Unit,
): Promise<NutritionData | null> => {

    if (!name) return null;

    const data = await apiFetch(`${API_BASE}/post/calculate-nutrition`, {
        method: "POST",
        body: JSON.stringify({ name, quantity, unit }),
    });
    return data as NutritionData ?? null;
};


export const submitPost = async (payload: PostPayload): Promise<{ post_id?: string;}[]> => {

    if (!payload) return [];

    try {

        const nutrition = payload.nutrition?.[0];
        const ps = nutrition?.per_serving || {};

        const data = await apiFetch(`${API_BASE}/post/upload`, {
            method: "POST",
            body: JSON.stringify(payload),
        });

        return data?.post_id ? [{ post_id: data.post_id }] : [];

    } catch (err) {
        console.error("submitPost error:", err);
        return [];
    }
};