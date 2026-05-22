import { create } from "zustand";
import {
  DishInfoData,
  Ingredient,
  StepTimer,
  StepData,
  DietaryData,
  NutritionData,
  MediaType,
  defaultDietaryData,
  Unit,
} from "@/types/food.types";
import { uploadMediaToS3, submitPost } from "@/api/post.api";
import * as FileSystem from 'expo-file-system';

const normalizeIngredientName = (name: string) => {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/s$/, "");
};

type PostState = {

  info: DishInfoData;
  ingredients: Ingredient[];
  steps: StepData[];
  dietary: DietaryData;
  nutrition: NutritionData;
  
  loading: boolean;

  setMedia: (media: string | null, mediaType?: MediaType| null) => void;
  setInfo: (info: DishInfoData) => void;
  setIngredients: (ingredients: Ingredient[]) => void;
  setSteps: (steps: StepData[]) => void;
  setDietary: (dietary: DietaryData) => void;
  setNutrition: (nutrition: NutritionData) => void;

  canPost: () => boolean;
  submit: () => Promise<{ success: boolean }>;
  buildPayload: () => any;
  reset: () => void;

};

export const usePost = create<PostState>((set, get) => ({

  info: {
    dish_media_file: null,
    dish_media_url: "",
    dish_media_type: null,
    dish_name: "",
    dish_description: "",
    dish_difficulty: "",
  },
  ingredients: [],
  steps: [],
  dietary: defaultDietaryData,
  nutrition: {
    servings: 1,
    per_serving: {
      calories: 0,
      protein_g: 0,
      carbs_g: 0,
      sugar_g: 0,
      fat_g: 0,
      saturated_fat_g: 0,
      fiber_g: 0,
      cholesterol_mg: 0,
      sodium_mg: 0,
    },
  },

  loading: false,
  setMedia: (media, mediaType = null) => set({
    info: {
      ...get().info,
      dish_media_url: media ?? "",
      dish_media_type: mediaType ?? null,  
    }
  }),

  setInfo: (info) => set({ info }),
  setIngredients: (ingredients) => set({ ingredients }),
  setSteps: (steps) => set({ steps }),
  setDietary: (dietary) => set({ dietary }),
  setNutrition: (nutrition) => set({ nutrition }),

  buildPayload: () => {
    const state = get();
    const n = state.nutrition.per_serving;

    return {
      dish_name: state.info.dish_name,
      description: state.info.dish_description,
      difficulty: state.info.dish_difficulty,
      image_url: state.info.dish_media_url,
      media_type: state.info.dish_media_type,
      ingredients: state.ingredients.map((ingredient) => ({
        ...ingredient,
        normalized_name:
          ingredient.normalized_name ?? normalizeIngredientName(ingredient.name),
      })),
      dietary: state.dietary,   
      steps: state.steps.map(step => ({
        step_number: step.step_number,
        description: step.description,
        image_url: step.image_url ?? "",
        timer: step.timer ?? null,
        upload_url: step.upload_url ?? "",
      })),    
      nutrition: {                  
        servings: state.nutrition.servings,
        calories_per_serving: n.calories,
        protein_g: n.protein_g,
        carbs_g: n.carbs_g,
        sugar_g: n.sugar_g,
        fat_g: n.fat_g,
        saturated_fat_g: n.saturated_fat_g,
        fiber_g: n.fiber_g,
        cholesterol_mg: n.cholesterol_mg,
        sodium_mg: n.sodium_mg,
      },
    };
  },

  canPost: () => {

    const state = get();

    if (!state.info.dish_media_type) return false;
    if (!state.info.dish_name.trim()) return false;
    if (state.ingredients.length === 0) return false;
    if (state.steps.length === 0) return false;

    return true;
  },

  submit: async () => {
    
    set({ loading: true });

    try {
      const state = get();

      // -- upload main dish media if it's a local URI (not already an S3 URL)
      let dish_media_url = state.info.dish_media_url;
      if (dish_media_url && !dish_media_url.startsWith("https://")) {
        const mediaType = state.info.dish_media_type!;
        dish_media_url = await uploadMediaToS3(dish_media_url, mediaType, mediaType === "video" ? "posts/videos" : "posts/images");
      }

      // upload step media
      const uploadedSteps = await Promise.all(
        state.steps.map(async (step) => {
          const image_url = step.image_url && !step.image_url.startsWith("https://")
            ? await uploadMediaToS3(step.image_url, "image", "posts/steps")
            : step.image_url ?? "";
          return { ...step, image_url };
        })
      );

      // --updated states with s3 URLs before building payload
      set({ info: { ...state.info, dish_media_url }, steps: uploadedSteps,});

      const payload = get().buildPayload();
      //console.log("Submitting post with payload:", payload);
      const result = await submitPost(payload);
      //console.log("Post submission result:", result);

      if (result) {
        get().reset();
        return { success: true };
      } else {
        return { success: false };
      }

    } catch (error) {

      console.error("❌ Error submitting post:", error);
      return { success: false };
    } finally {
      set({ loading: false });
    }
  },

  reset: () =>
    set({
      info:{
        dish_media_file: null,
        dish_media_url: "",
        dish_media_type: null,
        dish_name: "",
        dish_description: "",
        dish_difficulty: "",
      },
      ingredients: [],
      steps: [],
      dietary: defaultDietaryData,
      nutrition:{
        servings: 1,
        per_serving: {
          calories: 0,
          protein_g: 0,
          carbs_g: 0,
          sugar_g: 0,
          fat_g: 0,
          saturated_fat_g: 0,
          fiber_g: 0,
          cholesterol_mg: 0,
          sodium_mg: 0,
        },
      },
      loading: false,
  }),

}));

export const usePostIngredient = () => {

  const ingredients = usePost((state) => state.ingredients);
  const setIngredients = usePost((state) => state.setIngredients);

  const addIngredient = (ingredient?: Partial<Ingredient>) => {
    
    if (ingredient?.id && ingredients.some((ing) => ing.id === ingredient.id)) return;
    const name = ingredient?.name ?? "";
    const newIngredient = {
      name,
      normalized_name: ingredient?.normalized_name ?? normalizeIngredientName(name),
      quantity: "",
      unit: "" as Unit,
      source: "",
      category: "",
      id: null,
      media_url: null,
      ...ingredient,
    };
    
    setIngredients([newIngredient, ...ingredients]);

  };

  const updateIngredient = (
    index: number,
    field: keyof Ingredient,
    value: string | number | null
  ) => {
    const updated = ingredients.map((ing, i) => {
      if (i !== index) return ing;

      const next = { ...ing, [field]: value };

      if (field === "name") {
        next.normalized_name = normalizeIngredientName(String(value ?? ""));
      }

      return next;
    });

    setIngredients(updated);
  };

  const removeIngredient = (index: number) => {
    const updated = ingredients.filter((_, i) => i !== index);
    setIngredients(updated);
  };

  const clearIngredients = () => {
    setIngredients([]);
  };

  return {
    ingredients,
    addIngredient,
    updateIngredient,
    removeIngredient,
    clearIngredients,
  };
};

export const usePostSteps = () => {
  const steps = usePost((state) => state.steps);
  const setSteps = usePost((state) => state.setSteps);

  const blankStep = (stepNumber: number, partial?: Partial<StepData>): StepData => ({
    id: `step-${Date.now()}-${Math.random()}`,
    step_number: stepNumber,
    description: "",
    timer: null,
    image_url: "",
    upload_url: "",
    ...partial,
  });

  const isStepEmpty = (s: StepData) =>
    !s.description.trim() &&
    !s.timer &&
    !s.image_url.trim() 
    //!s.upload_url.trim() &&

  const addStep = (step?: Partial<StepData>) => {
    const current = usePost.getState().steps;

    if (current.length >= 10) return;

    const newStep: StepData = {
      id: `step-${Date.now()}-${Math.random()}`,
      step_number: current.length + 1,
      description: "",
      timer: null,
      image_url: "",
      upload_url: "",
      ...step,
    };

    usePost.setState({
      steps: [...current, newStep],
    });
  };
  
  const updateStep = (
    index: number,
    field: keyof StepData,
    value: string | number | StepTimer | null
  ) => {
    setSteps(steps.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  };

  const removeStep = (index: number) => {
    setSteps(
      steps
        .filter((_, i) => i !== index)
        .map((s, i) => ({ ...s, step_number: i + 1 }))
    );
  };

  const clearSteps = () => {
    const filtered = steps.filter(s => !isStepEmpty(s));
    setSteps(filtered);
  };

  return {
    steps,
    addStep,
    updateStep,
    removeStep,
    clearSteps,
  };
};

export const usePostDietary = () => {

  const dietary = usePost((state) => state.dietary);
  const setDietary = usePost((state) => state.setDietary);

  const toggleDiet = (key: keyof DietaryData) => {
    if (typeof dietary[key] !== "boolean") return;

    const newState = { ...dietary, [key]: !dietary[key] } as DietaryData;

    if (key === "vegan" && newState.vegan) {
      newState.vegetarian = true;
      newState.pescatarian = false;
    }

    if (newState.vegetarian && newState.pescatarian) {
      if (key === "vegetarian") newState.pescatarian = false;
      else if (key === "pescatarian") newState.vegetarian = false;
    }

    setDietary(newState);
  };

  const setOther = (value: string) => {
    setDietary({ ...dietary, other: value });
  };

  const clearDietary = () => {
    setDietary(defaultDietaryData);
  };

  return {
    dietary,
    toggleDiet,
    setOther,
    clearDietary,
  };
};

export const usePostNutrition = () => {
  const nutrition = usePost((state) => state.nutrition);
  const setNutrition = usePost((state) => state.setNutrition);

  const DAILY_VALUES = {
    calories:        2000,
    protein_g:       50,
    carbs_g:         275,
    sugar_g:         50,
    fat_g:           78,
    saturated_fat_g: 20,
    fiber_g:         28,
    cholesterol_mg:  300,
    sodium_mg:       2300,
  };

  const setServings = (servings: number) => {
    if (servings < 1) return;
    const clamped = Math.min(servings, 5);
    setNutrition({ ...nutrition, servings: clamped });
  };

  const getScaled = (): NutritionData["per_serving"] => {
    const ps = nutrition.per_serving;
    const s = nutrition.servings;
    return {
      calories:        ps.calories * s,
      protein_g:       ps.protein_g * s,
      carbs_g:         ps.carbs_g * s,
      sugar_g:         ps.sugar_g * s,
      fat_g:           ps.fat_g * s,
      saturated_fat_g: ps.saturated_fat_g * s,
      fiber_g:         ps.fiber_g * s,
      cholesterol_mg:  ps.cholesterol_mg * s,
      sodium_mg:       ps.sodium_mg * s,
    };
  };

  // Replace add_nutrition with set_nutrition to avoid accumulation
  const set_nutrition = (data: NutritionData[]) => {
    const totals = data.reduce((acc, n) => {
      const ps = n.per_serving;
      return {
        calories:        acc.calories + ps.calories,
        protein_g:       acc.protein_g + ps.protein_g,
        carbs_g:         acc.carbs_g + ps.carbs_g,
        sugar_g:         acc.sugar_g + ps.sugar_g,
        fat_g:           acc.fat_g + ps.fat_g,
        saturated_fat_g: acc.saturated_fat_g + ps.saturated_fat_g,
        fiber_g:         acc.fiber_g + ps.fiber_g,
        cholesterol_mg:  acc.cholesterol_mg + ps.cholesterol_mg,
        sodium_mg:       acc.sodium_mg + ps.sodium_mg,
      };
    }, { calories: 0, protein_g: 0, carbs_g: 0, sugar_g: 0, fat_g: 0, saturated_fat_g: 0, fiber_g: 0, cholesterol_mg: 0, sodium_mg: 0 });

    setNutrition({ ...nutrition, per_serving: totals });
  };

  const reset_nutrition = () => {
    setNutrition({
      ...nutrition,
      per_serving: {
        calories: 0, protein_g: 0, carbs_g: 0, sugar_g: 0,
        fat_g: 0, saturated_fat_g: 0, fiber_g: 0,
        cholesterol_mg: 0, sodium_mg: 0,
      },
    });
  };

  const getPercents = (data: NutritionData[]): Record<string, number> => {
    if (!data || data.length === 0) return Object.fromEntries(Object.keys(DAILY_VALUES).map(k => [k, 0]));

    const totals = data.reduce((acc, n) => {
      const ps = n.per_serving;
      return {
        calories:        acc.calories + ps.calories,
        protein_g:       acc.protein_g + ps.protein_g,
        carbs_g:         acc.carbs_g + ps.carbs_g,
        sugar_g:         acc.sugar_g + ps.sugar_g,
        fat_g:           acc.fat_g + ps.fat_g,
        saturated_fat_g: acc.saturated_fat_g + ps.saturated_fat_g,
        fiber_g:         acc.fiber_g + ps.fiber_g,
        cholesterol_mg:  acc.cholesterol_mg + ps.cholesterol_mg,
        sodium_mg:       acc.sodium_mg + ps.sodium_mg,
      };
    }, { calories: 0, protein_g: 0, carbs_g: 0, sugar_g: 0, fat_g: 0, saturated_fat_g: 0, fiber_g: 0, cholesterol_mg: 0, sodium_mg: 0 });

    return Object.fromEntries(
      Object.entries(DAILY_VALUES).map(([key, daily]) => {
        const value = totals[key as keyof typeof totals];
        return [key, Math.floor(Math.min((value / daily) * 100, 100))];
      })
    );
  };

  return {
    nutrition,
    servings: nutrition.servings,
    scaled: getScaled(),
    setServings,
    getPercents,
    set_nutrition,
    reset_nutrition,
  };
};