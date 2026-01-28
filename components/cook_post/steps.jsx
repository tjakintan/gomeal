"use client";
import { useState, useRef, useEffect } from "react";
import "../../styles/cook_style.css";
import { motion } from "framer-motion";
import WobblyText from "../../hooks/WobblyText";
import { v4 as uuidv4 } from 'uuid';

const colors = [
    "bg-rose-500", "bg-red-400", "bg-orange-400", "bg-yellow-400",
    "bg-green-400", "bg-teal-400", "bg-cyan-400", "bg-blue-400",
    "bg-indigo-400", "bg-purple-400", "bg-pink-400", "bg-rose-400",
    "bg-lime-600", "bg-emerald-600",
    "bg-red-500", "bg-orange-500", "bg-amber-500", "bg-yellow-500",
    "bg-lime-500", "bg-green-500", "bg-emerald-500", "bg-teal-500",
    "bg-cyan-500", "bg-sky-500", "bg-blue-500", "bg-indigo-500",
    "bg-violet-500", "bg-purple-500", "bg-fuchsia-500", "bg-pink-500",
];

const CircleSlider = ({ size, color, value, max, onChange, label }) => {
    const svgRef = useRef(null);
    const circleRef = useRef(null);
    const dotRef = useRef(null);
    const dragging = useRef(false);
    const prevValue = useRef(value);
    const radius = size / 2 - 10;
    const circumference = 2 * Math.PI * radius;
    const angleToValue = (angle) => Math.round((angle / 360) * max);

    const updateVisual = (val) => {
        const progress = (val / max) * circumference;
        if (circleRef.current) {
            circleRef.current.style.strokeDashoffset = circumference - progress;
            circleRef.current.style.transform = `rotate(-90deg)`;
            circleRef.current.style.transformOrigin = '50% 50%';
        }
        if (dotRef.current) {
            const rad = (val / max) * 2 * Math.PI - Math.PI / 2;
            const x = size / 2 + radius * Math.cos(rad);
            const y = size / 2 + radius * Math.sin(rad);
            dotRef.current.setAttribute("cx", x);
            dotRef.current.setAttribute("cy", y);
        }
    };

    const handlePointerMove = (e) => {
        if (!dragging.current) return;
        const rect = svgRef.current.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const x = e.clientX ?? e.touches?.[0]?.clientX;
        const y = e.clientY ?? e.touches?.[0]?.clientY;

        let angle = Math.atan2(y - cy, x - cx) * (180 / Math.PI) + 90;
        angle = angle < 0 ? 360 + angle : angle;

        let val = angleToValue(angle);

        const prev = prevValue.current;
        if (val >= prev || (prev > max * 0.9 && val < max * 0.1)) {
            prevValue.current = val;
            onChange(val);
            updateVisual(val);
        }
    };

    const handlePointerUp = () => {
        dragging.current = false;
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
    };

    const handlePointerDown = (e) => {
        dragging.current = true;
        handlePointerMove(e);
        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", handlePointerUp);
    };

    useEffect(() => {
        updateVisual(value);
        prevValue.current = value;
    }, [value]);

    return (
        <svg
            ref={svgRef}
            width={size}
            height={size}
            onPointerDown={handlePointerDown}
            className="cursor-pointer"
        >
            {/* Define glow filter */}
            <defs>
                <filter id="glow">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>

            {/* Background Circle */}
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke="#eeeeeeff"
                strokeWidth="8"
                fill="none"
            />

            {/* Progress Circle with glow */}
            <circle
                ref={circleRef}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={color}
                strokeWidth="3"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={circumference}
                strokeLinecap="round"
                filter="url(#glow)"
            />

            {/* Dot with glow */}
            <circle
                ref={dotRef}
                r="10"
                fill={color}
            />

            {/* Value Text */}
            <text
                x="50%"
                y="45%"
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={size * 0.2}
                fontWeight="500"
                fill="#111"
            >
                {String(value).padStart(2, "0")}
            </text>

            {/* Label Text */}
            <text
                x="50%"
                y="65%"
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={size * 0.08}
                fontWeight="300"
                fill="#111"
                letterSpacing="2"
            >
                {label.toUpperCase()}
            </text>
        </svg>
    );
};

const ToolsPicker = ({ onChange = () => {} }) =>  {

    const [selected, setSelected] = useState([]);

    const tools = [
        "Knife", "Cutting Board", "Pan", "Pot", "Whisk", "Spatula", "Spoon", "Fork",
        "Tongs", "Peeler", "Grater", "Blender", "Mixer", "Oven", "Microwave",
        "Air Fryer", "Toaster", "Rolling Pin", "Measuring Cups", "Measuring Spoons",
        "Bowl", "Plate", "Colander", "Strainer", "Kettle", "Ladle", "Skillet",
        "Saucepan", "Mortar & Pestle", "Pressure Cooker"
    ];

    const toggleTool = (tool) => {
        setSelected((prev) => {
            const updated = prev.includes(tool)
                ? prev.filter(t => t !== tool)
                : [...prev, tool];
            onChange(updated);  
            return updated;
        });
    };

    return (
        <div className="flex flex-row gap-5 p-2 overflow-x-auto scrollbar-hide max-w-60 md:max-w-150 touch-pan-x overscroll-x-contain">
            {tools.map((tool, index) => {
                const isSelected = selected.includes(tool);

                return (
                    <motion.div
                        key={index}
                        layout
                        onClick={() => toggleTool(tool)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        animate={{ scale: isSelected ? 1.18 : 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 18 }}
                        className={`px-4 py-2 rounded-xl tracking-wider font-thin cursor-pointer whitespace-nowrap text-sm text-white shadow-sm ${colors[index]}`}
                    >
                        {tool}
                    </motion.div>
                );
            })}
        </div>
    );
}

const Steps = ({ onBack, value, onPassToHead }) => {

    const [dish_steps, setDish_steps] = useState(
        Array.isArray(value?.dish_steps) && value.dish_steps.length > 0
            ? value.dish_steps.map(step => ({ ...step, id: uuidv4() }))
            : [{ step_number: 1, description: "", timer: null, image_url: "", upload_url:"", tips: "", id: uuidv4() }]
    );
    const [shake, setShake] = useState(dish_steps.map(() => false));
    const [showTimer, setShowTimer] = useState(dish_steps.map(() => false));
    const [showPictureBox, setShowPictureBox] = useState(dish_steps.map(() => false));
    const [hours, setHours] = useState(0);
    const [minutes, setMinutes] = useState(0);
    const [seconds, setSeconds] = useState(0);
    const [showNextBox, setShowNextBox] = useState(dish_steps.map(() => false));
    const [showBoxOption, setShowBoxOption]  = useState(dish_steps.map(() => false));
    const boxOptionsRef = useRef([]);

    const formatTimer = (timer) => {
        if (!timer) return "";

        const parts = [];
        if (timer.hours) parts.push(`${timer.hours}h`);
        if (timer.minutes) parts.push(`${timer.minutes}m`);
        if (timer.seconds) parts.push(`${timer.seconds}s`);

        return parts.join(":") || "0s"; 
    };

    const addSteps = () => { 

        const lastIdx = dish_steps.length - 1; 
        setDish_steps(prev => 
            [ ...prev, { step_number: prev.length + 1, description: "", timer: null, image_url: "", tips: "",  id: uuidv4() } ]
        );
        setShake(prev => [...prev, false]); 
        setShowTimer(prev => [...prev, false]); 
        setShowNextBox(prev => { 
            const copy = [...prev];
            copy[lastIdx] = true; 
            copy.push(false); 
            return copy; 
        }); 

    }; 
    
    const removeStep = (idx) => { 
        
        setDish_steps(prev => { 
            const updated = prev 
                .filter((_, i) => i !== idx) 
                .map((step, i) => ({ ...step, step_number: i + 1 }));
            return updated;
        }); 
        setShake(prev => prev.filter((_, i) => i !== idx)); 
        setShowTimer(prev => prev.filter((_, i) => i !== idx)); 
        setShowNextBox(prev => prev.filter((_, i) => i !== idx)); 
    }; 
    
    const updateStep = (idx, field, value) => {

        setDish_steps(prev => { 
            const newSteps = [...prev]; 
            newSteps[idx] = { ...newSteps[idx], [field]: value }; 
            return newSteps; 
        }); 

        if (field === "timer") { 

            setShowTimer(prev => { 
                const newShow = [...prev]; 
                newShow[idx] = false; 
                return newShow; 
            });
            setHours(0);
            setMinutes(0);
            setSeconds(0);
        } 
    };

    useEffect(() => {
    
        const handleClickOutside = (event) => {

            boxOptionsRef.current.forEach((ref, idx) => {
                if (ref && !ref.contains(event.target)) {
                    setShowBoxOption(prev => {
                    const copy = [...prev];
                    copy[idx] = false;  
                    return copy;
                    });
                    setShowTimer(prev => {
                    const copy = [...prev];
                    copy[idx] = false;  
                    return copy;
                    });
                }
            });
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const triggerShake = (indices) => {
        setShake(prev => {
            const copy = [...prev];
            indices.forEach(idx => copy[idx] = true);
            return copy;
        });

        setTimeout(() => {
            setShake(prev => {
            const copy = [...prev];
            indices.forEach(idx => copy[idx] = false);
            return copy;
            }, 500);
        });
    };

    const passToHead = () => {

        const invalid = dish_steps
            .map((step, idx) => (!step.description.trim() ? idx : null))
            .filter(idx => idx !== null);

        if (invalid.length > 0) {
            triggerShake(invalid); 
            return;
        }

        onPassToHead({ dish_steps });
    };

    return (
        <div className="w-screen h-screen flex items-center justify-center flex-col gap-5 pb-20">
            
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
                <WobblyText text="steps"/>
            </h1>

            <div className="flex flex-col max-h-[1000px] overflow-y-auto justify-end scrollbar-hide bg-gray-100 rounded-[30px]">
                {dish_steps.map((step, idx) => (
                    
                    <motion.div 
                        key={step.id} 
                        className={`${showBoxOption[idx] ? "" : ""} flex flex-col p-1`}
                        initial={false}
                        style={{ transformOrigin: "top" }} 
                        animate={{
                            height: showBoxOption[idx] ? "auto" : "auto",
                            x: shake[idx] ? [0, -10, 10, -10, 10, 0] : 0,
                        }}
                        transition={{ 
                            height: { duration: 0.3, ease: "easeOut" },
                            x: { duration: 0.4 }
                        }}
                    >   
                        {/* show selected options */}
                        <div className={`flex flex-col px-5 ${showBoxOption[idx] ? "hidden" : ""}`}>
                            
                            <div className="w-full h-full bg-red-300">


                            </div>

                            {step.timer && (step.timer.hours || step.timer.minutes || step.timer.seconds) && (
                                <div className="w-full h-full flex items-center justify-start space-x-5 gap-2 mb-2">
                                    <div className="flex cursor-pointer" onClick={() => {updateStep(idx, "timer", null)}}>
                                        <svg className="w-6 h-6" viewBox="0 0 24 24">
                                            <line x1="4" y1="4" x2="20" y2="20" stroke="black" strokeWidth="1" strokeLinecap="round"/>
                                            <line x1="20" y1="4" x2="4" y2="20" stroke="black" strokeWidth="1" strokeLinecap="round"/>
                                        </svg>
                                    </div>
                                    <div className="py-1 px-4 rounded-[20px] font-thin tracking-widest">
                                        {formatTimer(step.timer)}
                                    </div>
                                </div>
                            )}

                            {step.tools && step.tools.length > 0 && (
                                <div className="flex items-center justify-start space-x-5 gap-2 mb-2">
                                    <div className="flex cursor-pointer" onClick={() => {updateStep(idx, "tools", [])}}>
                                        <svg className="w-6 h-6" viewBox="0 0 24 24">
                                            <line x1="4" y1="4" x2="20" y2="20" stroke="black" strokeWidth="1" strokeLinecap="round"/>
                                            <line x1="20" y1="4" x2="4" y2="20" stroke="black" strokeWidth="1" strokeLinecap="round"/>
                                        </svg>
                                    </div>
                                    <div className="flex gap-2 max-w-60 md:max-w-150 overflow-x-auto scrollbar-hide">
                                        {step.tools.map((tool, i) => (
                                            <span
                                                key={i}
                                                className={`px-4 py-2 rounded-xl tracking-wider font-thin cursor-pointer whitespace-nowrap text-sm text-white shadow-sm ${colors[i]}`}
                                            >
                                                {tool}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                        </div>

                        {/* show box options and their contents */}
                        {showBoxOption[idx] && (
                            <div 
                                ref={el => {
                                    boxOptionsRef.current[idx] = el || undefined;  
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className={`w-full flex justify-center`}
                            >
                                <div className={`${showTimer[idx] ? "hidden" : ""} flex flex-col p-1`}>

                                        <div className="w-full flex items-center gap-2 p-2 pl-1">
                                            <svg className="w-8 h-8" viewBox="0 0 24 24">
                                                <path fill="#000000" d="M15.06 9.83a2.75 2.75 0 0 1 1.737 0c.368.123.672.338.967.596c.282.248.602.579.985.975q.686.713 1.374 1.424c.448.462.628.95.626 1.602c-.006 1.659-.041 2.797-.517 3.73a4.75 4.75 0 0 1-2.076 2.075c-1.345.686-3.065.518-4.523.518h-3.266c-1.092 0-1.958 0-2.655-.057c-.714-.058-1.317-.18-1.868-.46a4.75 4.75 0 0 1-2.076-2.076c-.295-.579-.41-1.209-.47-1.976c-.088-1.16.896-2.099 1.653-2.862c.307-.31.631-.57 1.033-.718a2.75 2.75 0 0 1 1.889 0c.402.148.726.408 1.033.718c.298.3.632.7 1.036 1.185c.035.043.09.083.141.03l3.025-3.133c.384-.396.703-.727.985-.975c.295-.258.6-.473.967-.596m.023 1.723c-.23.202-.507.488-.917.913l-3.004 3.11a1.58 1.58 0 0 1-2.351-.086c-.431-.516-.724-.867-.97-1.114c-.24-.243-.38-.328-.483-.366a1.25 1.25 0 0 0-.859 0c-.103.038-.242.123-.483.366c-.37.372-.697.787-1.032 1.19c-.161.193-.205.295-.187.54c.05.656.147 1.055.307 1.37a3.25 3.25 0 0 0 1.42 1.42c.305.155.69.251 1.31.302c.63.051 1.434.052 2.566.052h3.2c1.192 0 2.765.212 3.876-.354a3.25 3.25 0 0 0 1.42-1.42c.282-.555.346-1.303.353-3.054c.001-.274-.041-.386-.238-.589l-1.32-1.367c-.41-.425-.686-.71-.917-.913c-.515-.452-1.154-.472-1.691 0"/><path fill="#000000" d="M10.367 3.25h3.266c1.092 0 1.958 0 2.655.057c.714.058 1.317.18 1.869.46a4.75 4.75 0 0 1 2.075 2.077c.281.55.403 1.154.461 1.868c.057.697.057 1.563.057 2.655v3.266c0 1.092 0 1.958-.057 2.655c-.058.714-.18 1.317-.46 1.869a4.75 4.75 0 0 1-2.077 2.075c-.55.281-1.154.403-1.868.461c-.697.057-1.563.057-2.655.057h-3.266c-1.092 0-1.958 0-2.655-.057c-.714-.058-1.317-.18-1.868-.46a4.75 4.75 0 0 1-2.076-2.076c-.281-.552-.403-1.155-.461-1.869c-.057-.697-.057-1.563-.057-2.655v-3.266c0-1.092 0-1.958.057-2.655c.058-.714.18-1.317.46-1.868a4.75 4.75 0 0 1 2.077-2.076c.55-.281 1.154-.403 1.868-.461c.697-.057 1.563-.057 2.655-.057M7.834 4.802c-.62.05-1.005.147-1.31.302a3.25 3.25 0 0 0-1.42 1.42c-.155.305-.251.69-.302 1.31c-.051.63-.052 1.434-.052 2.566v3.2c0 1.133 0 1.937.052 2.566c.05.62.147 1.005.302 1.31a3.25 3.25 0 0 0 1.42 1.42c.305.155.69.251 1.31.302c.63.051 1.434.052 2.566.052h3.2c1.133 0 1.937 0 2.566-.052c.62-.05 1.005-.147 1.31-.302a3.25 3.25 0 0 0 1.42-1.42c.155-.305.251-.69.302-1.31c.051-.63.052-1.434.052-2.566v-3.2c0-1.132 0-1.937-.052-2.566c-.05-.62-.147-1.005-.302-1.31a3.25 3.25 0 0 0-1.42-1.42c-.305-.155-.69-.251-1.31-.302c-.63-.051-1.434-.052-2.566-.052h-3.2c-1.132 0-1.937 0-2.566.052"/><path fill="#000000" d="M10 7.75a1.25 1.25 0 1 0 0 2.5a1.25 1.25 0 0 0 0-2.5M7.25 9a2.75 2.75 0 1 1 5.5 0a2.75 2.75 0 0 1-5.5 0"/>
                                            </svg>
                                            <button
                                                className="px-5 py-2 tracking-widest font-thin rounded-[20px] bg-black text-white cursor-pointer"
                                                onClick={() => setShowPictureBox(prev => {
                                                    const newShowPic = [...prev];
                                                    newShowPic[idx] = !newShowPic[idx];
                                                    return newShowPic;
                                                })}    
                                            >
                                                + picture
                                            </button>
                                        </div>

                                        <div className="w-full flex items-center gap-2 p-2">
                                            <svg 
                                                className={`w-7 h-7`}                                
                                                viewBox="0 0 64 64"
                                            >
                                                <path fill="#000000" d="M31.999 3C15.431 3 2 18.711 2 38.094C2 57.475 15.431 61 31.999 61S62 57.475 62 38.094C62 18.711 48.567 3 31.999 3zM32 50.152c-12.416 0-22.479-10.215-22.479-22.816S19.584 4.52 32 4.52c12.414 0 22.479 10.215 22.479 22.816S44.414 50.152 32 50.152z"/>
                                                <ellipse cx="22.404" cy="43.955" fill="#000000" rx="1.308" ry="1.289" transform="rotate(-59.987 22.407 43.957)"/>
                                                <ellipse cx="41.595" cy="10.715" fill="#000000" rx="1.308" ry="1.289" transform="rotate(119.993 41.595 10.714)"/>
                                                <ellipse cx="15.379" cy="36.932" fill="#000000" rx="1.29" ry="1.307" transform="rotate(-119.98 15.38 36.932)"/>
                                                <ellipse cx="48.62" cy="17.74" fill="#000000" rx="1.308" ry="1.289" transform="rotate(149.979 48.621 17.741)"/>
                                                <ellipse cx="12.808" cy="27.336" fill="#000000" rx="1.308" ry="1.289"/>
                                                <ellipse cx="51.191" cy="27.336" fill="#000000" rx="1.309" ry="1.289"/>
                                                <ellipse cx="15.379" cy="17.739" fill="#000000" rx="1.289" ry="1.31" transform="rotate(120.006 15.379 17.738)"/>
                                                <ellipse cx="48.621" cy="36.931" fill="#000000" rx="1.289" ry="1.308" transform="rotate(-59.979 48.622 36.932)"/><ellipse cx="22.404" cy="10.715" fill="#000000" rx="1.308" ry="1.289" transform="rotate(59.974 22.403 10.714)"/>
                                                <path fill="#000000" d="M40.941 42.822a1.3 1.3 0 0 0-.463 1.779a1.297 1.297 0 0 0 1.771.486c.615-.354.824-1.15.461-1.775a1.298 1.298 0 0 0-1.769-.49"/>
                                                <ellipse cx="32" cy="8.145" fill="" rx="1.289" ry="1.309"/>
                                                <ellipse cx="32" cy="46.527" fill="#000000" rx="1.289" ry="1.309"/>
                                                <path fill="#000000" d="M33.484 11.411c7.32.743 13.033 6.926 13.033 14.442c0 8.018-6.5 14.518-14.519 14.518s-14.518-6.5-14.518-14.518c0-7.517 5.712-13.699 13.032-14.442C22.375 12.161 16 19.001 16 27.336c0 8.836 7.162 16 15.999 16S48 36.172 48 27.336c0-8.335-6.376-15.175-14.516-15.925"/>
                                                <path 
                                                    className={`
                                                        transition-transform duration-300 ease-in-out
                                                        transform-box-fill origin-center scale-y-80
                                                        ${showTimer[idx] ? "rotate-90" : "rotate-0"}
                                                    `}               
                                                    fill="#000000" 
                                                    d="M32 11.336c-2.721 0-4.926 14.337-4.926 21.787c0 7.448 9.85 7.448 9.85 0c0-7.45-2.204-21.787-4.924-21.787"
                                                />
                                            </svg>
                                            <button
                                                className="ml-1 px-5 py-2 tracking-widest font-thin rounded-[20px] bg-black text-white cursor-pointer"
                                                onClick={() => setShowTimer(prev => {
                                                    const newShowTimer = [...prev];
                                                    newShowTimer[idx] = !newShowTimer[idx];
                                                    return newShowTimer;
                                                })}    
                                            >
                                                + timer
                                            </button>
                                        </div>

                                        <div className="w-full flex items-center gap-2 pl-2">
                                            <div className="flex">
                                                <svg className="w-6 h-6" viewBox="0 0 24 24">
                                                    <path fill="none" stroke="#000000" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                                                </svg>
                                            </div>
                                            <div className="overflow-hidden rounded-xl">
                                                <ToolsPicker onChange={(tools) => updateStep(idx, "tools", tools)}/>
                                            </div>
                                        </div>

                                </div>

                                <div                                     
                                    className={`flex flex-col items-center
                                                justify-center rounded-[30px] overflow-hidden space-y-2 px-3 py-2
                                                ${showTimer[idx] ? "" : "hidden"}`}
                                >
                                    <div 
                                        className={`flex flex-col gap-5`}
                                        onClick={() => {setShowTimer(prev => prev.map((val, i) => (i === idx ? !val : val)));}}
                                    >
                                        <div 
                                            className="flex flex-col md:flex-row gap-1 md:gap-5 justify-center"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <CircleSlider size={150} color="red" value={hours} max={24} onChange={setHours} label="hours"/>
                                            <CircleSlider size={150} color="yellow" value={minutes} max={60} onChange={setMinutes} label="minutes"/>
                                            <CircleSlider size={150} color="green" value={seconds} max={60} onChange={setSeconds} label="seconds"/>
                                        </div> 

                                        <div className={`flex justify-center cursor-pointer`} onClick={(e) => e.stopPropagation()}>
                                            <button 
                                                className={`px-5 py-3 cursor-pointer text-white tracking-widest font-light
                                                            ${hours || minutes || seconds ? "bg-black cursor-pointer" : "bg-gray-200 pointer-events-none"}
                                                            rounded-[30px] flex items-center justify-center`}
                                                disabled={!(hours || minutes || seconds)}
                                                onClick={() => {updateStep(idx, "timer", { hours, minutes, seconds })}}
                                            >
                                                + timer
                                            </button>
                                        </div>

                                    </div>

                                </div>

                            </div> 
                        )}

                        {/* steps layout */}
                        <div 
                            className={`px-3 gap-3 items-center 
                                        ${showBoxOption[idx] ? "justify-between" : "justify-start"} md:items-end flex flex-row`}
                        >
                            <div className="flex gap-3">

                                <h1 className={`flex font-thin leading-none text-[clamp(2.5rem,4vw,3rem)]`}>
                                    {step.step_number}
                                </h1>

                                <motion.div 
                                    ref={el => {
                                        boxOptionsRef.current[idx] = el || undefined;  
                                    }}
                                    layout
                                    className="flex items-center justify-center"
                                    animate={{ scale: showBoxOption[idx] ? 1.05 : 1 }}
                                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                    onClick={() => { setShowBoxOption(prev => prev.map((val, i) => (i === idx ? !val : val)) ); }}
                                >
                                    <svg 
                                        className="w-5 h-5 cursor-pointer"
                                        viewBox="0 0 24 24">
                                            <path fill="red" fillRule="evenodd" d="M7 3a4.002 4.002 0 0 1 3.874 3H19v2h-8.126A4.002 4.002 0 0 1 3 7a4 4 0 0 1 4-4Zm0 6a2 2 0 1 0 0-4a2 2 0 0 0 0 4Zm10 11a4.002 4.002 0 0 1-3.874-3H5v-2h8.126A4.002 4.002 0 0 1 21 16a4 4 0 0 1-4 4Zm0-2a2 2 0 1 0 0-4a2 2 0 0 0 0 4Z" clipRule="evenodd"/>
                                    </svg>
                                </motion.div>

                                <div className={`${showBoxOption[idx] ? "hidden" : ""} flex items-center `}>
                                    <input 
                                        className="w-[200px] md:w-[300px] h-[40px] bg-gray-100 rounded-[25px] flex items-center justify-center 
                                                    px-3 cursor-pointer text-sm font-light tracking-wide
                                                    placeholder:font-light placeholder:text-gray-300 placeholder:text-xs placeholder:italic
                                                    "
                                        type="text"
                                        value={step.description}
                                        placeholder={`what did you do ${step.step_number === 1 ? "first" : "next"} ?`}
                                        onChange={(e) => updateStep(idx, "description", e.target.value)}
                                    />
                                </div>

                            </div>

                            <div className={`${showBoxOption[idx] ? "hidden" : ""} flex`}>
                                {idx === dish_steps.length - 1  && (
                                    <motion.div
                                        whileHover={{ scale: 1.03 }}
                                        whileTap={{ scale: 0.9 }}
                                        className="w-full h-full cursor-pointer"
                                        onClick={() => addSteps()}
                                    >
                                        <img
                                            src="/add_ingredient.svg"
                                            className="w-10 h-10"
                                        />
                                    </motion.div>
                                )}
            
                                {showNextBox[idx] && ( 
                                    <motion.div 
                                        whileHover={{ scale: 1.03 }}
                                        whileTap={{ scale: 0.90 }} 
                                        className="w-full h-full cursor-pointer"
                                        onClick={() => removeStep(idx)}
                                    >
                                        <img 
                                            src="/remove_ingredient.svg" 
                                            className="w-10 h-10"
                                        />
                                    </motion.div>
                                )}
                            </div>

                        </div>

                    </motion.div>

                ))}
            </div>

            <div className="h-1/5 flex items-center justify-center">
                <motion.button 
                    animate={
                        !dish_steps.some(step => !step.description.trim())
                            ? { y: [-5, 5] } 
                            : { y: 0 }       
                    }
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

export default Steps;

