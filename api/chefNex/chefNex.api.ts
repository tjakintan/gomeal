import { mlFetch } from "./api";

export const _health = async (): Promise<{ status: string }> => {
    const res = await mlFetch('/chefNex/');
    return res.json();
};