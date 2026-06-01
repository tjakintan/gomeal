import { API_BASE } from '../config';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { resetSocket } from './socket';
import { clearAppState } from '@/sections/settings/UserSettings';

export const apiFetch = async (url: string, options: RequestInit = {}) => {

    let accessToken = await AsyncStorage.getItem("accessToken");

    let res = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            Authorization: accessToken ? `Bearer ${accessToken}` : "",
        },
    });

    if (res.status === 401) {

        const refreshToken = await AsyncStorage.getItem("refreshToken");

        const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken }),
        });

        const data = await refreshRes.json();

        if (data.accessToken) {
            await AsyncStorage.setItem("accessToken", data.accessToken);

            res = await fetch(url, {
                ...options,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${data.accessToken}`,
                },
            });

        } else {

            resetSocket();
            await clearAppState();
        }
    }
        
    const data = await res.json();

    return data;
};