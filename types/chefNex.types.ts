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

export type ChefNexImageStatus =
    | "idle"
    | "streaming"
    | "analyzing"
    | "connecting"
    | "error";

export type ChefNexFrameSample = {
    data: Uint8ClampedArray;
    width: number;
    height: number;
};

export type ChefNexBoundingBox = [number, number, number, number];

export type ChefNexIngredientComponent = {
    id: number | null;
    name: string;
    category?: string | null;
    media_url?: string | null;
    price?: number | null;
    confidence: number | null;
};

export type ChefNexIngredient = {
    id: number | null;
    name: string;
    category?: string | null;
    media_url?: string | null;
    price?: number | null;
    confidence: number | null;
    ingredients: ChefNexIngredientComponent[];
};

export type ChefNexDetectedItem = {
    id: number;
    frameId: string;    
    label: string;
    box: ChefNexBoundingBox;
    score?: number;         
    frameWidth: number;
    frameHeight: number;
    ingredient: ChefNexIngredient | null;
};

export type ChefNexFrameResults = {
    items: ChefNexDetectedItem[];
    similar_post_ids: number[];
};

export type ChefNexFeedbackRating = 1 | -1;

export type ChefNexFeedbackReason =
    | "wrong_item"
    | "wrong_box"
    | "wrong_ingredients"
    | "missing_item"
    | "other";

export type ChefNexFeedbackPayload = {
    frame_id: string;
    item_id: number | null;   
    rating: ChefNexFeedbackRating;
    reason?: ChefNexFeedbackReason;
};

export type ChefNexFeedbackAck = {
    ok?: boolean;
    id?: number;
    error?: string;             // "frame_expired" | "bad_rating" | "unauthorized_access" | "feedback_failed"
};