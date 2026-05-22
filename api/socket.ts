import { io, Socket } from "socket.io-client";
import { API_BASE } from "../config";
import AsyncStorage from "@react-native-async-storage/async-storage";

let socket: Socket | null = null;

export function resetSocket() {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
}

export async function getSocket(): Promise<Socket> {

    if (socket?.connected) return socket;

    const accessToken = await AsyncStorage.getItem("accessToken");

    if (!socket ) {

        socket = io(API_BASE, {
            transports: ["websocket"],
            auth: { token: accessToken },
            autoConnect: false,
            reconnection: true,
        });


        socket.on("connect", () => {
            console.log(`socket_connected_on_${socket?.id}`);
        });

        socket.on("connect_error", async (err) => {

            if (err.message === "unauthorized_access" || err.message === "invalid_or_expired_token") {

                const refreshToken = await AsyncStorage.getItem("refreshToken");

                const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ refreshToken }),
                });

                const data = await refreshRes.json();

                if (data.accessToken) {

                    await AsyncStorage.setItem("accessToken", data.accessToken);
                    socket!.auth = { token: data.accessToken };
                    socket!.connect();
                }
            }
        });

        socket.connect();
    
    }

  return socket;
}

export async function socketEmit<T>(
    event: string,
    payload: Record<string, unknown>
): Promise<T | null> {

  const socket = await getSocket();

    return new Promise((resolve) => {
        
        socket.emit(event, payload, (response: { error?: string } & T) => {

            if (response?.error) {
                console.error(`socket_${event}_error:`, response.error);
                resolve(null);
                return;
            }

            resolve(response);

        });
    });
}