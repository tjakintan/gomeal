import { apiFetch } from "./api";
import { API_BASE } from '../config';
import * as FileSystem from "expo-file-system/legacy";
import { Ingredient, MediaType, NutritionData, PostPayload, Unit } from '@/types';

const SPOONACULAR_API_KEY = process.env.EXPO_PUBLIC_SPOONACULAR_API_KEY;

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

export const uploadMediaToS3 = async (
  uri: string,
  mediaType: MediaType,
  folder: "users/profile_images" | "posts/images" | "posts/videos" | "posts/steps"
): Promise<string> => {

    if (!uri || !folder || !mediaType) return "";

    try {

        const { presignedUrl, s3Url } = await apiFetch(`${API_BASE}/post/upload-media`, {
            method: "POST",
            body: JSON.stringify({ mediaType, folder }),
        });

        const info = await FileSystem.getInfoAsync(uri);

        if (!info.exists) {
            throw new Error(`File does not exist: ${uri}`);
        }

        const result = await FileSystem.uploadAsync(presignedUrl, uri, {
            httpMethod: "PUT",
            uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
            headers: {
                "Content-Type": mediaType === "video" ? "video/mp4" : "image/jpeg",
            },
        });

        if (result.status < 200 || result.status >= 300) {
            throw new Error(`Upload failed with status ${result.status}`);
        }

        //console.log("Media uploaded successfully to S3:", s3Url);
        return s3Url;

    } catch (err) {
        
        console.error("uploadMediaToS3 error:", err);
        return "";
    }
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