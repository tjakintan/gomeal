import { io, Socket } from "socket.io-client";
import { API_BASE, CHEFNEX_API_BASE } from "../config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { clearAppState } from "@/sections/settings/UserSettings";

let chefNexSocket: Socket | null = null;

export function resetChefNexSocket() {
    if (chefNexSocket) {
        chefNexSocket.disconnect();
        chefNexSocket = null;
    }
}

export function pauseChefNexSocket() {
    if (chefNexSocket?.connected) {
        chefNexSocket.disconnect();
    }
}

export async function resumeChefNexSocket() {
    if (!chefNexSocket) return;
    if (!chefNexSocket.connected) {
        const accessToken = await AsyncStorage.getItem("accessToken");
        chefNexSocket.auth = { token: accessToken };
        chefNexSocket.connect();
    }
}

export async function getChefNexSocket(): Promise<Socket> {
    if (chefNexSocket?.connected) return chefNexSocket;

    const accessToken = await AsyncStorage.getItem("accessToken");

    if (!chefNexSocket) {
        chefNexSocket = io(CHEFNEX_API_BASE!, {
            transports: ["websocket"],
            auth: { token: accessToken },
            autoConnect: false,
            reconnection: true,
        });

        chefNexSocket.on("connect_error", async (err) => {
            if (err.message === "unauthorized_access" || err.message === "invalid_or_expired_token") {
                const refreshToken = await AsyncStorage.getItem("refreshToken");

                // NOTE: refresh still goes through Express (API_BASE), not the ml
                // service — auth/refresh issuance is centralized there regardless
                // of which backend the resulting token gets used against.
                const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ refreshToken }),
                });

                const data = await refreshRes.json();

                if (data.accessToken) {
                    await AsyncStorage.setItem("accessToken", data.accessToken);
                    chefNexSocket!.auth = { token: data.accessToken };
                    chefNexSocket!.connect();
                } else {
                    resetChefNexSocket();
                    await clearAppState();
                }
            }
        });

        chefNexSocket.connect();
    }

    return chefNexSocket;
}

export async function chefNexSocketEmit<T>(
    event: string,
    payload: Record<string, unknown>,
    timeoutMs = 5000,
): Promise<T | null> {
    const socket = await getChefNexSocket();

    return new Promise((resolve) => {
        socket.timeout(timeoutMs).emit(
            event,
            payload,
            (err: Error | null, response: { error?: string } & T) => {
                if (err) {
                    console.error(`chefnex_socket_${event}_timeout`);
                    resolve(null);
                    return;
                }
                if (response?.error) {
                    console.error(`chefnex_socket_${event}_error:`, response.error);
                    resolve(null);
                    return;
                }
                resolve(response);
            },
        );
    });
}