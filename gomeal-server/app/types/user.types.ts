import { FeedActionType } from "./feed.types";

export type BadgeLevel = 1 | 2 | 3 | 4 | 5 | 6;

export type Avatar = {
  style: "toon-head";
  seed: string;
  skinColor?: string;
  hair?: string;
  beard?: string
  hairColor?: string;
  eyes?: string;
  mouth?: string;
  head?: string;
  clothes?: string;
  clothesColor?: string;
  beardProbability?: number;   
  hairProbability?: number;
};

export type User = {
  sub: string,
  email: string;
  firstName?: string;
  lastName?: string;
  dob: string;
  profile_name: string;
  bio?: string | null;
  website?: string | null;
  profile_img_url?: string | null;
  avatar?: Avatar;
  status?: string;
  bread: number;
  xp: number;
  level: number;
  badge: BadgeLevel;
  tag_color?: string | null;
};

export type ActionType =
  | "CREATE_POST"
  | "LIKE_POST"
  | "COOK_POST"
  | "DELETE_POST"
  | "VIEW_POST"
  | "SHARE_POST"
  | "STAR_POST";

export type TargetType =
  | "POST"
  | "USER";

export const ActionWeights: Record<ActionType, number> = {
  CREATE_POST: 3.0,
  LIKE_POST: 1.5,
  COOK_POST: 5.0,
  VIEW_POST: 0.5,
  DELETE_POST: -3.0,
  SHARE_POST: 2.0,
  STAR_POST: 2.5,
};

export interface UserAction {
  id: number;
  user_sub: string;
  action_type: ActionType;
  target_type: TargetType;
  target_id: number;
  metadata: Record<string, any>;
  context: Record<string, any>;
  action_weight: number;
}