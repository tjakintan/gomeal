"use client";
import { useState, useRef, useEffect } from "react";
import "../../styles/cook_style.css";
import type { Ingredient } from "./types";
import { debounce } from "@/utils/debounce";
import { motion } from "framer-motion";
import WobblyText from "../../hooks/WobblyText";
import { v4 as uuidv4 } from 'uuid';

interface IngredientsProps {
    onBack: () => void;
    value?: {
        dish_ingredients?: Ingredient[];
        [key: string]: any;
    };
    onPassToHead: (data: { dish_ingredients: Ingredient[]; autoCalculateNutrition?: boolean }) => void;
    dish_name: string;
    dish_description: string;
}

interface UnitDropDownMenuProps {
    onSelectUnit: (unit: string) => void;
    parentId?: string;
}

type IngredientWithUI = Ingredient & {
    id: string;
    showDropdown: boolean;
    shake: boolean;
    showRemove: boolean;
    suggestions: Suggestion[];
    showSuggestions: boolean;
};

type Suggestion = {
    id: number | string;
    name: string;
    category: string;
};

const colors = [
  "bg-red-500", "bg-orange-500", "bg-amber-500", "bg-yellow-500",
  "bg-lime-500", "bg-green-500", "bg-emerald-500", "bg-teal-500",
  "bg-cyan-500", "bg-sky-500", "bg-blue-500", "bg-indigo-500",
  "bg-violet-500", "bg-purple-500", "bg-fuchsia-500", "bg-pink-500",
  "bg-rose-500", "bg-red-400", "bg-orange-400", "bg-yellow-400",
  "bg-green-400", "bg-teal-400", "bg-cyan-400", "bg-blue-400",
  "bg-indigo-400", "bg-purple-400", "bg-pink-400", "bg-rose-400",
  "bg-lime-600", "bg-emerald-600"
];

const UNITS = ["empty", "gram", "kg", "oz", "lb", "ml", "l", "tsp", "tbsp", "cup"];

const UnitDropDownMenu = ({ onSelectUnit, parentId }: UnitDropDownMenuProps) => {
    return (
        <div className="rounded-xl flex overflow-x-auto scrollbar-hide touch-pan-x">
            {UNITS.map((unit, index) => (
                <div key={`${parentId}-${unit}`} className="flex flex-col items-center p-1">
                    <motion.div
                        whileHover={{ scale: 1.07 }}
                        whileTap={{ scale: 0.95 }}
                        className={`py-2 px-4 rounded-xl cursor-pointer ${colors[index]} text-center font-thin tracking-widest
                        ${unit === "empty" ? "bg-red-500 text-transparent rounded-[10px]" : ""}`}
                        onClick={() => onSelectUnit(unit)}
                    >
                        {unit}
                    </motion.div>
                </div>
            ))}
        </div>
    );
};

const createIngredient = (): {
        id: string;
        fdcId: number | null;
        category: string | null;
        quantity: string;
        unit: string;
        name: string;
        showDropdown: boolean;
        shake: boolean;
        showRemove: boolean;
        suggestions: Suggestion[];
        showSuggestions: boolean;
    } => (
        {
            id: uuidv4(),
            fdcId: null,
            category: null,
            quantity: "",
            unit: "",
            name: "",
            showDropdown: false,
            shake: false,
            showRemove: false,
            suggestions: [],
            showSuggestions: false,
        }
);

const Ingredients: React.FC<IngredientsProps> = ({ onBack, value, onPassToHead, dish_name, dish_description }) => {

    const dropdownRef = useRef<(HTMLDivElement | null)[]>([]);
    const buttonRef = useRef<(HTMLDivElement | null)[]>([]);
    const debounceTimers = useRef<Record<number, NodeJS.Timeout>>({});

    const [ingredients, setIngredients] = useState<IngredientWithUI[]>(() => {
        if (Array.isArray(value?.dish_ingredients) && value.dish_ingredients.length > 0) {
        return value.dish_ingredients.map(ing => ({
            ...createIngredient(),
            ...ing
        }));
        }
        return [createIngredient()];
    });

    const fetchSuggestionsRaw = async (query: string) => {
        if (!query || query.trim().length < 3) return [];
        try {
            const body = JSON.stringify({
                query,
                dish_name,
                dish_description
            });
            const res = await fetch("https://api.gomeal.org/liveingredientssearch", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body
            });
            if (!res.ok) return [];
            const data = await res.json();
            return data || [];
        } catch (err) {
            console.error("Live ingredient search error:", err);
            return [];
        }
    };

    const fetchSuggestions = debounce(fetchSuggestionsRaw, 400);

    const addIngredient = () => {
        setIngredients(prev => {
            const copy = [...prev];
            copy[copy.length - 1].showRemove = true;
            return [...copy, createIngredient()];
        });
    };

    const updateIngredient = async (idx: number, field: keyof IngredientWithUI, value: string) => {

        setIngredients(prev =>
            prev.map((ing, i) =>
                i === idx
                ? {
                    ...ing,
                    [field]: field === "unit" && value === "empty" ? "" : value,
                    ...(field === "name" ? { showSuggestions: true } : {})
                    }
                : ing
            )
        );
        if (field !== "name") return;

        // Clear previous timer for this input
        if (debounceTimers.current[idx]) {
            clearTimeout(debounceTimers.current[idx]);
        }

        // Set new debounce timer
        debounceTimers.current[idx] = setTimeout(async () => {

            if (!value || value.trim().length < 3) {
                setIngredients(prev =>
                    prev.map((ing, i) =>
                        i === idx ? { ...ing, suggestions: [], showSuggestions: false } : ing
                    )
                );
                return;
            }

            const suggestions = await fetchSuggestions(value);

            setIngredients(prev =>
                prev.map((ing, i) =>
                    i === idx
                        ? { ...ing, suggestions, showSuggestions: true }
                        : ing
                )
            );
        }, 100);
    };

    const selectSuggestion = (idx: number, suggestion: Suggestion) => {
        setIngredients(prev =>
            prev.map((ing, i) =>
                i === idx
                ? { 
                    ...ing,
                    name: suggestion.name, 
                    fdcId:typeof suggestion.id === "number" ? suggestion.id : parseInt(suggestion.id as string) || null,
                    category:suggestion.category, 
                    showSuggestions: false, 
                    suggestions: [] 
                }
                : ing
            )
        );
    };

    const removeIngredient = (idx: number) => {
        setIngredients(prev => prev.filter((_, i) => i !== idx));
    };

    useEffect(() => {

        const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as Node | null
        if (!target) return;

        setIngredients(prev =>

            prev.map((ing, idx) => {
                const dropdown = dropdownRef.current[idx];
                const button = buttonRef.current[idx];

                if (
                    dropdown &&
                    !dropdown.contains(target) &&
                    button &&
                    !button.contains(target)
                ) {
                    return { ...ing, showDropdown: false, showSuggestions: false };
                }

                return ing;
            })
        );
    };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const triggerShake = (indices: number[]) => {
        setIngredients(prev =>
            prev.map((ing, i) =>
                indices.includes(i) ? { ...ing, shake: true } : ing
            )
        );

        setTimeout(() => {
            setIngredients(prev =>
                prev.map(ing => ({ ...ing, shake: false }))
            );
        }, 500);
    };

    const passToHead = () => {
        const invalid = ingredients
            .map((ing, i) => (!ing.quantity.trim() || !ing.name.trim() ? i : null))
            .filter(i => i !== null);

        if (invalid.length > 0) {
            triggerShake(invalid);
            return;
        }

        onPassToHead({
            dish_ingredients: ingredients.map(({ showDropdown, shake, showRemove, id, showSuggestions, suggestions, ...clean }) => clean),
            autoCalculateNutrition: true
        });
    };

    return (
        <div className="w-screen h-screen flex items-center justify-center flex-col gap-5 p-5">

            <div onClick={onBack} className="w-full flex justify-center">
                <svg className="w-6 h-6 rotate-180 " viewBox="0 0 24 24">
                    <g id="evaArrowIosDownwardFill0">
                        <g id="evaArrowIosDownwardFill1">
                            <path id="evaArrowIosDownwardFill2" fill="#5a5a5a" d="M12 16a1 1 0 0 1-.64-.23l-6-5a1 1 0 1 1 1.28-1.54L12 13.71l5.36-4.32a1 1 0 0 1 1.41.15a1 1 0 0 1-.14 1.46l-6 4.83A1 1 0 0 1 12 16Z"/>
                        </g>
                    </g>
                </svg>
            </div>
            
            <h1 className="text-center tracking-widest font-bold text-[50px]">
                <WobblyText text="ingredients"/>
            </h1>

            <div className="max-h-[1000px] flex flex-col gap-1 justify-end scrollbar-hide relative bg-gray-100 rounded-[30px]">

                {ingredients.map((ing, idx) => (
                    <motion.div 
                        key={`${ing.id || "ing"}-${idx}`} 
                        className={`relative rounded-[40px] flex flex-col items-center justify-center py-1 px-3`}
                        animate={ing.shake ? { x: [0, -10, 10, -10, 10, 0] } : { x: 0 }}
                    >
                        {ing.showDropdown && (
                            <div  
                                ref={(el: HTMLInputElement | null) => { dropdownRef.current[idx] = el;}}
                                className={`flex p-1 overflow-x-auto max-w-70 md:max-w-150`}
                            >
                                <UnitDropDownMenu
                                    parentId={ing.id}
                                    onSelectUnit={(unit) => {updateIngredient(idx, "unit", unit);}}
                                />
                            </div>
                        )}

                        <div className={`flex gap-2`}>

                            <div className="flex items-center justify-center gap-5">

                                {/* Ingredient quantity & unit input */}
                                <div className="flex items-center justify-center space-x-2">

                                    <input 
                                        className="w-[60px] h-[40px] bg-gray-100 rounded-[25px] flex items-center justify-center 
                                                    px-3 cursor-pointer text-center text-sm font-thin tracking-wide
                                                    placeholder:font-light placeholder:text-gray-300 placeholder:text-xs placeholder:italic
                                                    "
                                        type="numeric"
                                        min="0"
                                        value={ing.quantity}
                                        placeholder="3.5g"
                                        inputMode="numeric"
                                        step="any"
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (/^\d*\.?\d*$/.test(val)) {
                                                updateIngredient(idx, "quantity", val);
                                            }
                                        }}
                                    />

                                    {/* show unit section */}
                                    <motion.div 
                                        ref={(el: HTMLInputElement | null) => { buttonRef.current[idx] = el;}}
                                        className={`relative h-[40px] rounded-md 
                                                    flex flex-col items-center justify-center cursor-pointer 
                                                    ${ing.unit ? "" : ""}`}
                                        onClick={() =>
                                            setIngredients(prev =>
                                                prev.map((x, i) =>
                                                i === idx ? { ...x, showDropdown: !x.showDropdown } : x
                                                )
                                            )
                                        }
                                    >
                                        <svg 
                                            className={`w-3 h-3 ${ing.unit ? "hidden" : ""}`} 
                                            viewBox="0 0 24 24"
                                        >
                                            <g
                                                fill="none"
                                                stroke="red"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth="2"
                                            >
                                                <path d="M9 17.25a3 3 0 1 0 6 0a3 3 0 0 0-6 0m3-3v2.25" />
                                                <path d="M22.432 21.3A1.5 1.5 0 0 1 21 23.25H3a1.5 1.5 0 0 1-1.432-1.95l2.813-9a1.5 1.5 0 0 1 1.431-1.05h12.375a1.5 1.5 0 0 1 1.432 1.05zM3 .75a.75.75 0 0 0-.692 1.039a10.5 10.5 0 0 0 15.515 4.696a10.5 10.5 0 0 0 3.866-4.697A.75.75 0 0 0 21 .75zm6 7.065v3.435m6-3.435v3.435" />
                                            </g>
                                        </svg>

                                        <h1 className={`text-black text-sm font-thin tracking-widest ${ing.unit ? "" : "hidden"}`}>
                                            {ing.unit}
                                        </h1>

                                    </motion.div>

                                </div>
                                
                                {/* Ingredient name input */}
                                <div className="relative flex flex-col items-center justify-center">

                                    <input 
                                        className="w-[175px] md:w-[300px] h-[40px] bg-gray-100 rounded-[25px] flex items-center justify-center 
                                                    px-3 cursor-pointer text-sm font-thin tracking-wide
                                                    placeholder:font-light placeholder:text-gray-300 placeholder:text-xs placeholder:italic
                                                    "
                                        type="text"
                                        value={ing.name}
                                        placeholder="rice"
                                        onChange={(e) => updateIngredient(idx, "name", e.target.value)}
                                    />

                                    {/* live input section */}
                                    {ing.showSuggestions && ing.suggestions.length > 0 && (

                                        <div
                                            ref={(el: HTMLInputElement | null) => { dropdownRef.current[idx] = el;}}
                                            className="absolute top-[50px] z-50 w-full max-h-[200px] overflow-y-auto bg-white scrollbar-hide"
                                        >
                                            {ing.suggestions.map((sug) => (

                                                <div
                                                    key={sug.id}
                                                    className="px-3 py-2 font-extralight rounded-2xl text-sm tracking-wider cursor-pointer hover:bg-gray-200"
                                                    onClick={() => selectSuggestion(idx, sug)}
                                                >
                                                    {sug.name} <span className="text-gray-400 text-[10px] ml-1">({sug.category})</span>
                                                </div>

                                            ))}

                                        </div>

                                    )}

                                </div>

                            </div>

                            {/* Add ingredient button */}
                            {idx === ingredients.length - 1  && (
                                <motion.div
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => addIngredient()}
                                >
                                    <img
                                        src="/add_ingredient.svg"
                                        className="w-10 h-10"
                                        alt="Add ingredient"
                                    />
                                </motion.div>
                            )}

                            {/* remove ingredient button */}
                            {ing.showRemove && ( 
                                <motion.div 
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.90 }} 
                                    onClick={() => removeIngredient(idx)}  
                                >
                                    <img 
                                        src="/remove_ingredient.svg" 
                                        className="w-10 h-10"
                                    />
                                </motion.div>
                            )}

                        </div>

                    </motion.div>
                ))}

            </div>

            <div className="w-full h-1/5 flex items-center justify-center">
                <motion.button 
                    animate={!ingredients.some(ing => !ing.quantity.trim() || !ing.name.trim()) 
                        ? { y: [-5, 5] } 
                        : { y: 0 }}  
                    transition={{ 
                        duration: 1, 
                        repeat: Infinity, 
                        repeatType: "reverse",  
                        ease: "easeInOut" 
                    }}
                    whileHover={{ scale: 1.05 }} 
                    className="next-section-button"
                    onClick={passToHead}
                >
                    <svg className="w-6 h-6" viewBox="0 0 24 24">
                        <g id="evaArrowIosDownwardFill0">
                            <g id="evaArrowIosDownwardFill1">
                                <path id="evaArrowIosDownwardFill2" fill="#000000" d="M12 16a1 1 0 0 1-.64-.23l-6-5a1 1 0 1 1 1.28-1.54L12 13.71l5.36-4.32a1 1 0 0 1 1.41.15a1 1 0 0 1-.14 1.46l-6 4.83A1 1 0 0 1 12 16Z"/>
                            </g>
                        </g>
                    </svg>
                </motion.button>
            </div>

        </div>
    );
};

export default Ingredients;