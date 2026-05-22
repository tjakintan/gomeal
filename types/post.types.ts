import React from "react";

import {
  DishMedia,
  DishInfo,
  Ingredients,
  Steps,
  Dietary,
  Nutrition,
} from "@/sections/post/exports";

export type MediaSource = "post_main" | "step_image";
export type PostScreenMode = "MEDIA_PICKER" | "INFO_PICKER";

export const POST_SCREEN_CONFIG: Record<
  PostScreenMode,
  {
    heightRatio: number;
  }
> = {
  MEDIA_PICKER: {
    heightRatio: 0.9,
  },
  INFO_PICKER: {
    heightRatio: 0.9,
  },
};

export type PostSection =
  | "DishMedia"
  | "DishInfo"
  | "Ingredients"
  | "Steps"
  | "Dietary"
  | "Nutrition";

export const POST_SECTIONS_INDEX: Record<PostSection, number> = {
  DishMedia: 0,
  DishInfo: 1,
  Ingredients: 2,
  Steps: 3,
  Dietary: 4,
  Nutrition: 5,
};

export type PostSectionInfoProps = {
  isFocused: boolean;
  mediaSource?: MediaSource;
  stepIndex?: number; 
  onMediaSelected?: (uri: string, source: MediaSource, stepIndex?: number) => void;
  onEnhanceMediaOpen?: (open: boolean) => void;
  onCompleteChange?: (complete: boolean) => void;
};

export const POST_SECTION_COMPONENTS: Record<
  PostSection,
  React.ComponentType<PostSectionInfoProps>
> = {
  DishMedia,
  DishInfo,
  Ingredients,
  Steps,
  Dietary,
  Nutrition,
};

export const POST_SECTIONS_LABELS: Record<PostSection, string> = {
  DishInfo: "info",
  Ingredients: "ingredients",
  Steps: "steps",
  Dietary: "Dietary",
  Nutrition: "nutrition",
  DishMedia: "media",
};

export const POST_SECTIONS_HINTS: Record<PostSection, { title: string; description: string; icon: string }> = {
  DishMedia: {
    title: "Media",
    icon: "",
    description: "Upload a photo or video of your dish. Tap the camera to shoot live or pick from your library.",
  },
  DishInfo: {
    title: "Info",
    icon: "",
    description: "Enter the name, a short description to help us know what your dish contains, and how difficult it is to make ",
  },
  Ingredients: {
    title: "Ingredients",
    icon: "",
    description: "Search for the name and category of the ingredient, once found, click to add. Add the amount used and the specific unit measured in. You can add up to 10 ingredients.",
  },
  Steps: {
    title: "Steps",
    icon: "",
    description: "Tap the empty box icon. List the procedures you did, add images and timers for steps that required one. You can add up to 10 steps, previous box must be filled before creating new one.",
  },
  Dietary: {
    title: "Dietary",
    icon: "",
    description: "Toogle dietary preferences like vegan, gluten-free, or nut-free so others can filter by them.",
  },
  Nutrition: {
    title: "Nutrition",
    icon: "",
    description: "Set the number of servings, you can have a maximum of 5 servings. These can be estimated or exact.",
  },
};