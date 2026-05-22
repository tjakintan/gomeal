import { User } from "@/types/user.types";

export const ONBOARD_USER_SECTIONS = [
    "Identity",
    "Email",
    "ConfirmEmail",
    "Personal",
    "Avatar",
] as const;

export type onBoardUserSectionName = typeof ONBOARD_USER_SECTIONS[number];

export type onBoardUserSectionNumber = 1 | 2 | 3 | 4;

export interface onBoardUserSectionProps {
    onNext?: (data?: Partial<User>) => void;
    onBack?: (data?: Partial<User>) => void;
    draft?: Partial<User> & { exists?: boolean };
};