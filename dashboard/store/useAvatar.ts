import { create } from 'zustand';
import { useState } from "react";
import { createAvatar } from '@dicebear/core';
import { toonHead } from '@dicebear/collection';
import { Avatar, User } from "@/types/user.types";

export type Hair = "bun"| "sideComed" | "spiky" | "undercut"
export type Eyes = "bow" | "happy" | "humble" | "wide" | "wink";
export type Mouth = "agape" | "angry" | "laugh" | "sad" | "smile";
export type Beard = "chin" | "chinMoustache" | "fullBeard" | "longBeard" | "moustacheTwirl";
export type Clothes = "dress" | "openJacket" | "shirt" | "tShirt" | "turtleNeck";
export type HairColor = string;     
export type SkinColor = string;    
export type ClothesColor = string;   

export type Mood =
  | "idle"
  | "cooking"
  | "celebrating"
  | "sad"
  | "happy"
  | "excited"
  | "angry"
  | "sleepy"
  | "confused"
  | "shy"
  | "focused"
  | "surprised"
  | "love"
  | "sick"
  | "cool";
  
export type AvatarMoodStore = { mood: Mood; setMood: (mood: Mood, duration?: number) => void;};

export const DEFAULT_AVATAR = {
    hair: ["bun", "sideComed", "spiky", "undercut" ] as Hair[],
    hairColor: ["2c1b18","724133","a55728"] as HairColor[],
    eyes: ["bow","happy","humble","wide","wink"] as Eyes[],
    mouth: ["agape","angry","laugh","sad","smile"] as Mouth[],
    skinColor: ["5c3829","a36b4f","b98e6a","c68e7a","f1c3a5"] as SkinColor[],
    clothes: ["dress","openJacket","shirt","tShirt","turtleNeck"] as Clothes[],
    clothesColor: ["0b3286","147f3c","731ac3","151613","545454","b11f1f","e8e9e6","eab308","ec4899","f97316"] as ClothesColor[],
    beard: ["chin","chinMoustache","fullBeard","longBeard","moustacheTwirl"] as Beard[],
    beardProbability: 0,  
    hairProbability: 0,
};

export const useAvatar = (initialSeed: string) => {
    
    const [avatar, setAvatar] = useState<Avatar>({
        style: 'toon-head',
        seed: initialSeed,
        hair: DEFAULT_AVATAR.hair[2],
        hairColor: DEFAULT_AVATAR.hairColor[0],
        eyes: DEFAULT_AVATAR.eyes[1],
        mouth: DEFAULT_AVATAR.mouth[4],
        skinColor: DEFAULT_AVATAR.skinColor[0],
        clothes: DEFAULT_AVATAR.clothes[3],
        clothesColor: DEFAULT_AVATAR.clothesColor[0],
        beard: DEFAULT_AVATAR.beard[0],
        beardProbability: DEFAULT_AVATAR.beardProbability,
        hairProbability: DEFAULT_AVATAR.hairProbability,
    });

    const updateTrait = (
        trait: keyof Omit<Avatar, 'style' | 'seed'>,
        value: string | number | undefined
    ) => {
        setAvatar(prev => ({
            ...prev,
            [trait]: value,
        }));
    };

    const getSvg = () => {
        return createAvatar(toonHead, {
            seed: avatar.seed,
            hair: avatar.hair ? [avatar.hair as Hair] : DEFAULT_AVATAR.hair,
            hairColor: avatar.hairColor ? [avatar.hairColor as HairColor] : DEFAULT_AVATAR.hairColor,
            eyes: avatar.eyes ? [avatar.eyes as Eyes] : DEFAULT_AVATAR.eyes,
            mouth: avatar.mouth ? [avatar.mouth as Mouth] : DEFAULT_AVATAR.mouth,
            skinColor: avatar.skinColor ? [avatar.skinColor as SkinColor] : DEFAULT_AVATAR.skinColor,
            clothes: avatar.clothes ? [avatar.clothes as Clothes] : DEFAULT_AVATAR.clothes,
            clothesColor: avatar.clothesColor ? [avatar.clothesColor as ClothesColor] : DEFAULT_AVATAR.clothesColor,
            beard: avatar.beard ? [avatar.beard as Beard] : DEFAULT_AVATAR.beard,
            beardProbability: avatar.beardProbability ?? DEFAULT_AVATAR.beardProbability,
            hairProbability: avatar.hairProbability ?? DEFAULT_AVATAR.hairProbability,
            rearHairProbability: 0,
        });
    };

    const getUri = async () => {
        return getSvg().toDataUri();
    };

    return { avatar, setAvatar, updateTrait, getSvg, getUri };
};

export const useUserAvatar = (user: User) => {

    const initialSeed = user?.profile_name || "default-seed";
    const { avatar, updateTrait, getSvg } = useAvatar(initialSeed);

    return { avatar, updateTrait, getSvg };
};

export const useAvatarMood = create<AvatarMoodStore>((set) => ({
    mood: "idle",
    setMood: (mood, duration) => {
        set({ mood });
        if (duration) setTimeout(() => set({ mood: "idle" }), duration);
    },
}));
