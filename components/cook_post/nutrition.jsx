"use client";
import { useState, useRef, useEffect } from "react";
import "../../styles/cook_style.css";
import { motion } from "framer-motion";
import WobblyText from "../../hooks/WobblyText";

const colors = [
    "bg-green-500",
    "bg-teal-500",
    "bg-cyan-500",
    "bg-blue-500",
    "bg-indigo-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-rose-500",
    "bg-lime-500",
    "bg-emerald-500"
];

const emptyNutrition = {
    calories_per_100g: 0,
    protein_per_100g: 0,
    carbs_per_100g: 0,
    sugar_per_100g: 0,
    fat_per_100g: 0,
    saturated_fat_g: 0,
    fiber_g: 0,
    cholesterol_mg: 0,
    sodium_mg: 0,
    water_g: 0
};

const unitToGrams = {
    empty: 1,
    gram: 1,
    kg: 1000,
    oz: 28.3495,
    lb: 453.592,
    ml: 1,       
    l: 1000,     
    tsp: 4.2,    
    tbsp: 14.3,  
    cup: 240,    
};

const convertToGrams = (quantity, unit) => {
    const q = parseFloat(quantity) || 0;
    const u = (unit || "empty").toLowerCase();

    if (u === "empty") {
        return q;
    }

    return q * (unitToGrams[u] || 1);
};

const Nutrition = ({ value, onPassToHead, nutritionResults }) => {

    const [dish_nutrition, setDish_nutrition] = useState(emptyNutrition);
    const [baseNutrition, setBaseNutrition] = useState(emptyNutrition);
    const [servings, setServings] = useState(1);

    const increaseServings = () => {
        setServings(prev => prev + 1);
    };

    const decreaseServings = () => {
        setServings(prev => Math.max(1, prev - 1));
    };

    useEffect(() => {
        if (!nutritionResults || nutritionResults.length === 0) return;

        const totals = nutritionResults.reduce((acc, ing) => {
            const nutrition = ing.nutrition || {};
            const factor = ing.unit === "empty" 
                ? parseFloat(ing.quantity) || 0 
                : (convertToGrams(ing.quantity, ing.unit) / 100);

            acc.calories_per_100g += (nutrition.calories_per_100g || 0) * factor;
            acc.protein_per_100g  += (nutrition.protein_g || 0) * factor;
            acc.carbs_per_100g    += (nutrition.carbs_g || 0) * factor;
            acc.sugar_per_100g    += (nutrition.sugar_g || 0) * factor;
            acc.fat_per_100g      += (nutrition.fat_g || 0) * factor;
            acc.saturated_fat_g   += (nutrition.saturated_fat_g || 0) * factor;
            acc.fiber_g           += (nutrition.fiber_g || 0) * factor;
            acc.cholesterol_mg    += (nutrition.cholesterol_mg || 0) * factor;
            acc.sodium_mg         += (nutrition.sodium_mg || 0) * factor;
            acc.water_g           += (nutrition.water_g || 0) * factor;

            return acc;
        }, { ...emptyNutrition });

        setBaseNutrition(totals);
    }, [nutritionResults]);

    useEffect(() => {
        const scaled = Object.fromEntries(
            Object.entries(baseNutrition).map(([key, val]) => [
                key,
                val * servings
            ])
        );

        setDish_nutrition(scaled);

        if (onPassToHead) {
            onPassToHead(scaled);
        }
    }, [servings, baseNutrition]);

    const displayRow = (label, value, unit = "g", index = 0) => (
        <div key={label} className="flex justify-between items-center p-2 space-x-20">
            <div className={`font-medium py-1 px-2 rounded-lg ${colors[index % colors.length]}`}>
                {label}
            </div>
            <div className="flex ">
                <span className="font-bold pr-5 tracking-wider">
                    {Number(value).toFixed(1)}
                    <span className="text-sm font-medium ml-[0.25px]">{unit}</span>
                </span>
                <svg className="w-6 h-6" viewBox="0 0 512 512">
                    <path fill="#000000" d="M441 58.9L453.1 71c9.4 9.4 9.4 24.6 0 33.9L424 134.1L377.9 88L407 58.9c9.4-9.4 24.6-9.4 33.9 0zM209.8 256.2L344 121.9l46.1 46.1l-134.3 134.2c-2.9 2.9-6.5 5-10.4 6.1L186.9 325l16.7-58.5c1.1-3.9 3.2-7.5 6.1-10.4zM373.1 25L175.8 222.2c-8.7 8.7-15 19.4-18.3 31.1l-28.6 100c-2.4 8.4-.1 17.4 6.1 23.6s15.2 8.5 23.6 6.1l100-28.6c11.8-3.4 22.5-9.7 31.1-18.3L487 138.9c28.1-28.1 28.1-73.7 0-101.8L474.9 25c-28.1-28.1-73.7-28.1-101.8 0M88 64c-48.6 0-88 39.4-88 88v272c0 48.6 39.4 88 88 88h272c48.6 0 88-39.4 88-88V312c0-13.3-10.7-24-24-24s-24 10.7-24 24v112c0 22.1-17.9 40-40 40H88c-22.1 0-40-17.9-40-40V152c0-22.1 17.9-40 40-40h112c13.3 0 24-10.7 24-24s-10.7-24-24-24z"/>
                </svg>
            </div>
        </div>
    );

    return (
        <div className="w-screen h-screen flex flex-col items-center justify-center py-5 text-black">

            <div className="min-h-[600px] min-w-[300px] p-1 flex bg-transparent">

                <div className={`flex flex-col ${nutritionResults?.length ? "" : "hidden"}`}>
                    <h1 className="tracking-widest font-bold text-[50px] text-center">
                        <WobblyText text="nutrition"/>
                    </h1>

                    <div className="h-[1px] bg-white"></div>

                    <div className="flex justify-between p-1 items-center">
                        <div className="tracking-wider text-[20px] font-bold">
                            Servings
                        </div>
                        <div className="gap-3 flex items-center">
                            <svg onClick={increaseServings} className="w-6 h-6 cursor-pointer" viewBox="0 0 24 24" fill="currentColor">
                                <circle cx="12" cy="12" r="11" stroke="currentColor" strokeWidth="1" fill="none"/>
                                <line x1="12" y1="7" x2="12" y2="17" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
                                <line x1="7" y1="12" x2="17" y2="12" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
                            </svg>
                            <h1 className="font-bold text-center text-2xl">
                                {servings}
                            </h1>
                            <svg onClick={decreaseServings} className={`${servings === 1 ? "opacity-20 pointer-events-none" : "" } w-6 h-6 cursor-pointer`} viewBox="0 0 24 24" fill="currentColor">
                                <circle cx="12" cy="12" r="11" stroke="currentColor" strokeWidth="1" fill="none"/>
                                <line x1="7" y1="12" x2="17" y2="12" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
                            </svg>
                        </div>
                    </div>

                    <div className="h-[10px] bg-white"></div>

                    <div className="flex justify-between items-center text-[25px] font-extrabold mb-2">
                        <span>Calories</span>
                        <span className="">
                            {Math.round(dish_nutrition.calories_per_100g)}
                            <span className="text-sm font-medium ml-[0.25px]">kcal</span>
                        </span>
                    </div>

                    <div className="h-[5px] bg-white"></div>

                    <div className="flex flex-col gap-3">
                        {[
                            ["Protein", dish_nutrition.protein_per_100g],
                            ["Carbohydrates", dish_nutrition.carbs_per_100g],
                            ["Sugars", dish_nutrition.sugar_per_100g],
                            ["Fat", dish_nutrition.fat_per_100g],
                            ["Saturated Fat", dish_nutrition.saturated_fat_g],
                            ["Fiber", dish_nutrition.fiber_g],
                            ["Cholesterol", dish_nutrition.cholesterol_mg, "mg"],
                            ["Sodium", dish_nutrition.sodium_mg, "mg"]
                        ].map(([label, val, unit], idx) => 
                            displayRow(label, val, unit || "g", idx)
                        )}
                    </div>
                </div>

                <div className={`w-full gap-5 flex flex-col items-center justify-center ${nutritionResults?.length ? "hidden" : ""}`}>
                    <svg 
                        className="w-15 h-15"
                        viewBox="0 0 24 24"
                    >
                        <circle cx="12" cy="2" r="0" fill="currentColor">
                            <animate attributeName="r" begin="0" calcMode="spline" dur="1s" keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8" repeatCount="indefinite" values="0;2;0;0"/>
                        </circle>
                        <circle cx="12" cy="2" r="0" fill="currentColor" transform="rotate(45 12 12)">
                            <animate attributeName="r" begin="0.125s" calcMode="spline" dur="1s" keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8" repeatCount="indefinite" values="0;2;0;0"/>
                        </circle>
                        <circle cx="12" cy="2" r="0" fill="currentColor" transform="rotate(90 12 12)">
                            <animate attributeName="r" begin="0.25s" calcMode="spline" dur="1s" keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8" repeatCount="indefinite" values="0;2;0;0"/>
                        </circle>
                        <circle cx="12" cy="2" r="0" fill="currentColor" transform="rotate(135 12 12)">
                            <animate attributeName="r" begin="0.375s" calcMode="spline" dur="1s" keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8" repeatCount="indefinite" values="0;2;0;0"/>
                        </circle>
                        <circle cx="12" cy="2" r="0" fill="currentColor" transform="rotate(180 12 12)">
                            <animate attributeName="r" begin="0.5s" calcMode="spline" dur="1s" keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8" repeatCount="indefinite" values="0;2;0;0"/>
                        </circle>
                        <circle cx="12" cy="2" r="0" fill="currentColor" transform="rotate(225 12 12)">
                            <animate attributeName="r" begin="0.625s" calcMode="spline" dur="1s" keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8" repeatCount="indefinite" values="0;2;0;0"/>
                        </circle>
                        <circle cx="12" cy="2" r="0" fill="currentColor" transform="rotate(270 12 12)">
                            <animate attributeName="r" begin="0.75s" calcMode="spline" dur="1s" keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8" repeatCount="indefinite" values="0;2;0;0"/>
                        </circle>
                        <circle cx="12" cy="2" r="0" fill="currentColor" transform="rotate(315 12 12)">
                            <animate attributeName="r" begin="0.875s" calcMode="spline" dur="1s" keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8" repeatCount="indefinite" values="0;2;0;0"/>
                        </circle>
                    </svg>
                    <h1 className="font-thin tracking-widest text-sm">
                        Loading Nutritional Values
                    </h1>
                </div>

            </div>

        </div>
    );
};

export default Nutrition;