"use client";
import { useState, useRef, useEffect } from "react";
import "../../styles/cook_style.css";
import { color, motion } from "framer-motion";
import WobblyText from "../../hooks/WobblyText";
import { col } from "framer-motion/client";

const colors = [
    "bg-green-600", "bg-teal-600", "bg-cyan-600", "bg-blue-500",
    "bg-orange-600", "bg-purple-600", "bg-pink-600", "bg-rose-600",
    "bg-lime-600", "bg-emerald-600"
];

const Dietary = ({ onBack, value, onPassToHead }) => {

    const [dish_dietary, setDish_dietary] = useState({
        vegetarian: value?.dish_dietary?.vegetarian || false,
        vegan: value?.dish_dietary?.vegan || false,
        gluten_free: value?.dish_dietary?.gluten_free || false,
        dairy_free: value?.dish_dietary?.dairy_free || false,
        nut_free: value?.dish_dietary?.nut_free || false,
        keto: value?.dish_dietary?.keto || false,
        halal: value?.dish_dietary?.halal || false,
        pescatarian: value?.dish_dietary?.pescatarian || false,
        kosher: value?.dish_dietary?.kosher || false,
        other: value?.dish_dietary?.other ?? "" 
    });

    const dietaryDescriptions = {
        vegetarian: "No meat; may include eggs, milk, cheese, tofu",
        vegan: "No animal products at all; includes vegetables, beans, nuts, grains",
        gluten_free: "No wheat, barley, or rye; includes rice, quinoa, potatoes",
        dairy_free: "No milk or milk-based products; includes plant milks, oils",
        nut_free: "Contains no tree nuts or peanuts; safe for nut allergies",
        keto: "Low-carb, high-fat; includes meat, eggs, cheese, avocado, nuts",
        halal: "Prepared according to Islamic law; includes halal meat and grains",
        pescatarian: "Includes fish like salmon, tilapia, shrimp; no other meat",
        kosher: "Prepared following Jewish dietary laws; includes kosher meat, dairy rules",
        other: "soy-free, nightshade-free"
    };

    const dietaryIcons = {
        vegetarian: "/dietary/vegetarian.svg",
        vegan: "/dietary/vegan.svg",
        gluten_free: "/dietary/gluten_free.svg",
        dairy_free: "/dietary/dairy_free.png",
        nut_free: "/dietary/nut_free.png",
        keto: "/dietary/keto.png",
        halal: "/dietary/halal_food.svg",
        pescatarian: "/dietary/pescatarian.png",
        kosher: "/dietary/kosher_food.svg",
    };

    const [invalidCombination1, setInvalidCombination1] = useState([]);
    const [invalidCombination6, setInvalidCombination6] = useState([]);
    const dietaryKeys = Object.keys(dish_dietary);
    const rowConfig = [4, 3, 3];

    const toggleDiet = (key) => {
        setDish_dietary(prev => {
            const newState = { ...prev, [key]: !prev[key] };

            // Logical Restriction 1: Vegan ticks Vegetarian
            if (key === "vegan" && newState.vegan) {
                newState.vegetarian = true;
                if (newState.pescatarian) {
                    newState.pescatarian = false;
                }
                setInvalidCombination1(["vegetarian"]); 
            } else {
                setInvalidCombination1([]); 
            }

            let invalid6 = [];

            if (newState.vegetarian && newState.pescatarian) {
                if (key === "vegetarian") {
                    newState.pescatarian = false;
                } else if (key === "pescatarian") {
                    newState.vegetarian = false; 
                }
            }

            // Now set invalid array for UI disabling
            if (newState.vegetarian) invalid6.push("pescatarian"); 
            if (newState.pescatarian) invalid6.push("vegetarian"); 

            setInvalidCombination6(invalid6);

            return newState;
        });
    };

    const getRows = () => {
        const rows = [];
        let start = 0;
        for (let count of rowConfig) {
        const row = dietaryKeys.slice(start, start + count);
        if (row.length) rows.push(row);
        start += count;
        }
        return rows;
    };

    const rows = getRows();

    return (
        <div className="w-screen flex flex-col gap-5 items-center justify-center text-white">

            <div onClick={onBack} className="w-full flex justify-center">
                <svg className="w-6 h-6 rotate-180 " viewBox="0 0 24 24">
                    <g id="evaArrowIosDownwardFill0">
                        <g id="evaArrowIosDownwardFill1">
                            <path id="evaArrowIosDownwardFill2" fill="#5a5a5a" d="M12 16a1 1 0 0 1-.64-.23l-6-5a1 1 0 1 1 1.28-1.54L12 13.71l5.36-4.32a1 1 0 0 1 1.41.15a1 1 0 0 1-.14 1.46l-6 4.83A1 1 0 0 1 12 16Z"/>
                        </g>
                    </g>
                </svg>
            </div>

            <h1 className="text-center tracking-widest font-bold text-[50px] text-black">
                <WobblyText text="dietary"/>
            </h1>

            <div className="flex-1 overflow-hidden">

                <div className="flex flex-col gap-2 p-2 overflow-y-auto max-w-[1200px] mx-auto scrollbar-hide">

                    {rows.map((rowKeys, rowIdx) => (
                        <div key={`row-${rowIdx}`} className="flex justify-center gap-4 p-3 flex-wrap ">
                            {rowKeys.map((key, idx) => (
                                <div 
                                    key={`row-${rowIdx}-item-${key}`} 
                                    className={`relative flex ${colors[idx]}
                                                overflow-hidden flex flex-col rounded-[25px] 
                                                ${invalidCombination6.includes(key) ? "opacity-50 pointer-events-none" : ""}`}
                                >      
                                    <div className={`absolute w-full h-full z-0 ${colors[key]} blur`}></div>

                                    <div className={`m-4 z-10`}>

                                        {/* input checked box toggle */}
                                        <div className="w-full h-1/2 flex justify-between space-x-15">
                                            
                                            <div className="flex space-x-3">
                                                {key != "other" && (
                                                    <img src={dietaryIcons[key]} alt={key} className="w-7 h-7"/>
                                                )}
                                                <span className="font-thin tracking-widest text-md capitalize">{key.replace("_", " ")}</span>
                                            </div>

                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only"
                                                    checked={dish_dietary[key]}
                                                    onChange={() => toggleDiet(key)}
                                                    disabled={invalidCombination6.includes(key)}
                                                />
                                                {/* Track */}
                                                <motion.div
                                                    className="w-12 h-6 rounded-full bg-gray-300"
                                                    animate={{ backgroundColor: dish_dietary[key] ? "#2563EB" : "#D1D5DB" }} 
                                                    transition={{ duration: 0.2 }}
                                                />
                                                {/* Knob */}
                                                <motion.div
                                                    className="absolute top-.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md"
                                                    animate={{ x: dish_dietary[key] ? 24 : 0 }} 
                                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                                />
                                            </label>
                                        </div>

                                        <div className="w-full border-t border-gray-300"></div>

                                        {/* input box information */}
                                        <div className={`mt-1 font-light text-[10px] tracking-widest text-start max-w-60`}>  
                                            {key === "other" ? (
                                                <input
                                                    type="text"
                                                    placeholder={dietaryDescriptions[key]}
                                                    onChange={(e) => setDish_dietary(prev => ({ ...prev, other: e.target.value }))}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter") {
                                                            setDish_dietary(prev => ({ ...prev, other: e.target.value }));
                                                        }
                                                    }}
                                                    value={dish_dietary.other || ""}
                                                    className="w-full h-[35px] bg-cyan-500 rounded-xl text-start
                                                            px-3 cursor-pointer text-center font-light tracking-wide text-sm hover:outline-1 hover:outline-white
                                                            placeholder-italic placeholder:font-light placeholder:tracking-widest placeholder:text-[10px]
                                                            placeholder:text-white"                                                
                                                />
                                            ) : (
                                                <div className="mt-1 font-light text-[10px] tracking-widest text-start max-w-60">
                                                    {dietaryDescriptions[key]}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                </div>
                            ))}
                        </div>
                    ))}

                </div>

            </div>

            <div className="w-full h-1/5 flex items-center justify-center">
                <motion.button 
                    animate={{ y: [-5, 5] }}  
                    transition={{ 
                        duration: 1, 
                        repeat: Infinity, 
                        repeatType: "reverse",  
                        ease: "easeInOut" 
                    }}
                    whileHover={{ scale: 1.05 }} 
                    className="next-section-button"
                    onClick={() => onPassToHead({ dish_dietary })}
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

export default Dietary;