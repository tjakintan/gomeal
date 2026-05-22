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
  profile_img_url?: string | null;
  avatar?: Avatar;
  status?: string;
  bread: number;
  xp: number;
  level: number;
  badge: BadgeLevel;
};

export type ActionType =
  | "CREATE_POST"
  | "LIKE_POST"
  | "COOK_POST"
  | "DELETE_POST"
  | "VIEW_POST";


// cart types
