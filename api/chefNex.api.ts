import AsyncStorage from "@react-native-async-storage/async-storage";
import { CHEFNEX_API_BASE } from "../config";

/**
 * Asks the main API (Express, on the t3) to start the ChefNex GPU box if it's off.
 * Fire-and-forget: the server throttles it and ignores it when the GPU is already up.
 */
export async function wakeChefNex(): Promise<void> {
    const accessToken = await AsyncStorage.getItem("accessToken");

    await fetch(`${CHEFNEX_API_BASE}/wake`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
        },
    });
}