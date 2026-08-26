import { ML_API_BASE } from "@/config";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const mlFetch = async (path: string, options: RequestInit = {}): Promise<Response> => {
    const accessToken = await AsyncStorage.getItem("accessToken");

    const res = await fetch(`${ML_API_BASE}${path}`, {
        ...options,
        headers: {
            ...(options.headers || {}),
            Authorization: accessToken ? `Bearer ${accessToken}` : "",
        },
    });

    if (res.status === 401) {
        throw new Error("unauthorized");
    }

    if (!res.ok) {
        throw new Error(`ml_request_failed:${res.status}`);
    }

    return res;
};