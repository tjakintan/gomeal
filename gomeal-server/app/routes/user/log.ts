import db from "@/services/db";
import { PoolClient } from "pg";
import redis from "@/services/redis";
import { ActionType, TargetType } from "@/types/user.types";

interface LogUserActionParams {
    user_sub: string;
    action_type: ActionType;
    target_type: TargetType;
    target_id: number;
    metadata?: Record<string, any>;
    context?: Record<string, any>;
    action_weight?: number;
}

export const mapFeedActionToUserAction = (action_type: string): ActionType | null => {
    
    switch (action_type) {
        case "post_love":
            return "LIKE_POST";
        case "post_cook":
            return "COOK_POST";
        case "post_star":
            return "STAR_POST";
        case "post_share":
            return "SHARE_POST";
        default:
            return null;
    }
};

const log_user_actions = async ({
    user_sub,
    action_type,
    target_type,
    target_id,
    metadata = {},
    context = {},
    action_weight = 1.0,
}: LogUserActionParams, client?: PoolClient) => {

    const runner = client ?? db;

    try {

        await runner.query(
            `INSERT INTO user_actions (
                user_sub,
                action_type,
                target_type,
                target_id,
                metadata,
                context,
                action_weight
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
                user_sub,
                action_type,
                target_type,
                target_id,
                JSON.stringify(metadata),
                JSON.stringify(context),
                action_weight,
            ]
        );

        // Publish actions to ./ml/brain for updates
        await redis.publish("user_actions", JSON.stringify({
            user_sub,
            action_type,
            target_type,
            target_id,
            action_weight,
            metadata,
            timestamp: new Date().toISOString(),
        }));
        
    } catch (err) {
        console.error("Error logging user action:", err);
    }
};

export default log_user_actions;