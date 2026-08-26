export type ChefNexStatus =
    | "idle"
    | "connecting"
    | "listening"
    | "thinking"
    | "speaking"
    | "error";

    
export type ChefNexMessage = {
    id: string;
    role: "user" | "chefNex";
    text: string;
    intent?: string;
    createdAt: number;
};
