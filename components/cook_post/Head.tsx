"use client";
import React, { useEffect, useState, useRef, JSX, useLayoutEffect} from "react";
import { DishInfo, Ingredients, Steps, Nutrition, Dietary } from "./index";
import type { DishInfoData, Ingredient, StepData, DietaryData, NutritionData, PostPayload} from "./types";
import { motion, AnimatePresence, useMotionValue, animate } from "framer-motion";
import "../../styles/cook_style.css";
import { useUser } from "../../utils/user";
import { getUserSub } from "../../utils/auth";
import { RenderPostPreview } from "@/hooks/RenderPost";

type StepWrapperProps = {
    keyProp?: string;
    children: React.ReactNode;
    isActive?: boolean;
    bgClass?: string;
    height?: string;
}

export default function Head(): JSX.Element {
    const { user } = useUser();
    const sub = getUserSub(user);
    const [step, setStep] = useState(0);
    const isActive = (index: number) => step === index;
    const containerRef = useRef<HTMLDivElement>(null);
    // Width of the sliding box
    const boxX = useMotionValue(0);
    const [containerWidth, setContainerWidth] = useState(0);
    const boxWidth = (containerWidth * 4) / 5;
    const [swipeToSend, setSwipeToSend] = useState(false);
    const [posted, setPosted] = useState(false);
    const [mounted, setMounted] = useState(false);

    // Measure container width
    useEffect(() => {
        if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
        }

        const handleResize = () => {
        if (containerRef.current) setContainerWidth(containerRef.current.offsetWidth);
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
        if (swipeToSend) return; // stop tracking after swipe

        const send = boxX.onChange((latestX) => {
            if (latestX > containerWidth - 50) { // swipe right
                console.log("Slide-to-send triggered!");
                setSwipeToSend(true);
            }
        });

        return () => send();
    }, [boxX, swipeToSend, containerWidth]);

    useEffect(() => {
    setContainerWidth(window.innerWidth);
}, []);

    const resetSlide = () => {
        setSwipeToSend(false);
        animate(boxX, 0, { type: "spring", stiffness: 300, damping: 30 });
    };

    const [dishInfoData, setDishInfoData] = useState<DishInfoData>({
        dish_image_file: null,   
        dish_image_url: "",      
        dish_name: "",
        dish_description: "",
        dish_difficulty: "",
    });
    const [dishIngredientsData, setDishIngredientsData] = useState<Ingredient[]>([]);
    const [dishStepsData, setDishStepsData] = useState<StepData[]>([]);
    const [dishDietaryData, setDishDietaryData] = useState<DietaryData[]>([]);
    const [nutritionResults, setNutritionResults] = useState<NutritionData[]>([]);
    const [dishNutritionData, setDishNutritionData] = useState<NutritionData[]>([]);
    const [quickPost, setQuickPost] = useState<boolean>(false);
    const [renderPostData, setRenderPostData] = useState<PostPayload | null>(null);

    const handleDishInfoChange = (data: DishInfoData) => {
        setDishInfoData(data);
        setQuickPost(true);
    };
    const handleDishIngredientsChange = (data: { dish_ingredients: Ingredient[] }) => {
        setDishIngredientsData(data.dish_ingredients);
        setStep(2);
    };
    const handleDishStepsChange = (data: { dish_steps: StepData[] }) => {
        setDishStepsData(data.dish_steps);
        setStep(3);
    };
    const handleDishDietaryChange = (data: { dish_dietary: DietaryData[] }) => {
        setDishDietaryData(data.dish_dietary);
        setStep(4);
    };
    const handleDishNutritionChange = (data: NutritionData[]) => {
        setDishNutritionData(data);
        setStep(5);
    };

    const handleBack = () => {
        setStep(prev => Math.max(prev - 1, 0));
    };

    useEffect(() => {
        if (!dishIngredientsData?.length) return;

        const timer = setTimeout(async () => {
            console.log("Ingredients: ", dishIngredientsData);
            try {
                const payload = { ingredients: dishIngredientsData };

                const res = await fetch("https://api.gomeal.org/autocalculatenutrition", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify(payload),
                });

                let data = await res.json();
                if (typeof data.body === "string") {
                    data = JSON.parse(data.body);
                }
                if (res.ok) {
                    setNutritionResults(data.autoCalculatedNutrition);
                    console.log("results : ", data.autoCalculatedNutrition)
                } else {
                    console.error("API error:", data);
                }
            } catch (err) {
                console.error("Error fetching nutrition:", err);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [dishIngredientsData]);

    const uploadToS3 = async (file: File) => {
        const res = await fetch("https://api.gomeal.org/imageuploadfunc", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                fileName: file.name,
                fileType: file.type,
            }),
        });

        const { uploadUrl, fileUrl } = await res.json();

        await fetch(uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": file.type },
            body: file,
        });        

        return { fileUrl, uploadUrl };
    };

    const buildPayload = async ({
        dishInfoData = {} as DishInfoData,
        dishIngredientsData = [] as Ingredient[],
        dishStepsData = [] as StepData[],
        dishNutritionData = [] as NutritionData[],
        dishDietaryData = [] as DietaryData[],
        userSub = "",
    }: {
        dishInfoData?: DishInfoData;
        dishIngredientsData?: Ingredient[];
        dishStepsData?: StepData[];
        dishNutritionData?: NutritionData[];
        dishDietaryData?: DietaryData[];
        userSub?: string;
    }) => {
        const mainImageData = dishInfoData.dish_image_file
            ? await uploadToS3(dishInfoData.dish_image_file)
            : { fileUrl: dishInfoData.dish_image_url || "", uploadUrl: null };

        const payload: PostPayload = {
            dish_name: dishInfoData.dish_name || "",
            description: dishInfoData.dish_description || "",
            difficulty: dishInfoData.dish_difficulty || "",
            image_url: mainImageData.fileUrl || "",
            upload_url: mainImageData.uploadUrl || undefined,
            user_sub: userSub || undefined,
            ingredients: dishIngredientsData,
            steps: dishStepsData,
            nutrition: dishNutritionData, 
            dietary: dishDietaryData,
        };

        return payload;
    };

    const sendToPost = async () => {
        const payload = await buildPayload({
            dishInfoData,
            dishIngredientsData,
            dishStepsData,
            dishNutritionData,
            dishDietaryData,
            userSub: sub,
        });
        console.log("Final payload", payload);
        setRenderPostData(payload);
        //setStep(5);
    };

    const quickSendToPost = async () => {
        const payload = await buildPayload({ dishInfoData });

        setRenderPostData(payload);
        setQuickPost(false);
        setStep(5);
        console.log("Quick post payload", payload);
        
    };

    useEffect(() => {
        const updateRenderPost = async () => {
            const payload = await buildPayload({
                dishInfoData,
                dishIngredientsData,
                dishStepsData,
                dishNutritionData,
                dishDietaryData,
                userSub: sub,
            });
            setRenderPostData(payload);
        };
        updateRenderPost();
    }, [
        dishInfoData,
        dishIngredientsData,
        dishStepsData,
        dishNutritionData,
        dishDietaryData,
        sub
    ]);

    return (
        <>
            
                <div className={`h-screen justify-end
                                flex flex-col scrollbar-hide overflow-y-auto`}
                >
                        {step >= 0 && (
                            <StepWrapper keyProp="step0" bgClass="">
                                <DishInfo value={dishInfoData} onPassToHead={handleDishInfoChange} />
                            </StepWrapper>
                        )}
                        {step >=  1 && (
                            <StepWrapper keyProp="step1" bgClass="">
                                <Ingredients 
                                    onBack={handleBack}
                                    value={dishIngredientsData} 
                                    dish_name={dishInfoData.dish_name} 
                                    dish_description={dishInfoData.dish_description}
                                    onPassToHead={handleDishIngredientsChange} />
                            </StepWrapper>
                        )}
                        {step >=  2 && (
                            <StepWrapper keyProp="step2" bgClass="">
                                <Steps onBack={handleBack} value={dishStepsData} onPassToHead={handleDishStepsChange} />
                            </StepWrapper>
                        )}
                        {step >=  3 && (
                            <StepWrapper keyProp="step3" bgClass="">
                                <Dietary 
                                    onBack={handleBack}
                                    value={{ dish_dietary: dishDietaryData[0] || {} }}
                                    onPassToHead={handleDishDietaryChange} 
                                />
                            </StepWrapper>
                        )}
                        {step >=  4 && (
                            <StepWrapper keyProp="step4" bgClass="">
                                <Nutrition 
                                    value={dishNutritionData}
                                    nutritionResults={nutritionResults} 
                                    onPassToHead={handleDishNutritionChange} 
                                />
                            </StepWrapper>
                        )}
                        {step >= 5 && (
                            <StepWrapper keyProp="step5" bgClass="">

                                <div className="w-full h-screen flex items-center justify-center pointer-event-none px-1">
        
                                    <div
                                        ref={containerRef}
                                        className="relative w-full h-3/5 bg-white overflow-hidden outline-2"
                                    >
                                        
                                        {/* Draggable Box */}
                                        {containerWidth > 0 && (
                                            <motion.div
                                                className="absolute h-full bg-red-300 flex items-center justify-center text-black font-bold cursor-grab p-3"
                                                style={{x: boxX, width: boxWidth }}
                                                drag="x"
                                                dragConstraints={{ left: 0, right: containerWidth - boxWidth }}
                                                dragElastic={0}
                                            >
                                                <RenderPostPreview post={renderPostData} quickPost={quickPost} />                                          
                                            </motion.div>
                                        )}

                                    </div>

                                </div>
                            </StepWrapper>
                        )}
                </div>

                {quickPost && (
                    <motion.div
                        key="quick-post-popup"
                        initial={{ opacity: 0, scale: 0.9, y: 50 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 50 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className="fixed inset-0 z-50 flex items-center justify-center  backdrop-blur-sm p-5"
                    >
                        <div className="w-full max-w-md p-6 flex flex-col gap-5 relative items-center">
                            
                            <button
                                onClick={() => setQuickPost(false)}
                                className="absolute cursor-pointer top-0 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold"
                            >
                                ×
                            </button>
                            
                            <h1 className="font-thin tracking-wider text-[13px]">click the icon to quick post</h1>
                            <motion.div
                                className={`flex cursor-pointer`}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={quickSendToPost}
                            >
                                <svg 
                                    width="100" height="100"  
                                    viewBox="0 0 100 100"
                                >
                                    <path fill="#000000" d="M88.558 49.96c0-.885-.435-1.663-1.097-2.151l.014-.024l-9.324-5.383l5.367-9.296l-.018-.011a2.666 2.666 0 0 0-.127-2.408a2.667 2.667 0 0 0-2.025-1.314v-.026H70.58V18.61h-.022a2.667 2.667 0 0 0-1.314-2.022a2.662 2.662 0 0 0-2.412-.125l-.013-.023l-9.481 5.474l-5.25-9.094l-.019.011a2.668 2.668 0 0 0-2.149-1.094c-.885 0-1.664.435-2.151 1.097l-.024-.014l-5.337 9.244l-9.19-5.306l-.011.019a2.666 2.666 0 0 0-2.408.127a2.666 2.666 0 0 0-1.315 2.025h-.027v10.674H18.845v.021a2.667 2.667 0 0 0-2.022 1.314a2.667 2.667 0 0 0-.126 2.41l-.023.014l5.246 9.087l-9.394 5.424l.011.019a2.668 2.668 0 0 0-1.094 2.149c0 .885.435 1.664 1.097 2.151l-.014.024l9.324 5.383l-5.367 9.296l.018.01a2.666 2.666 0 0 0 .127 2.408a2.667 2.667 0 0 0 2.025 1.314v.027H29.42V81.39h.022c.092.816.549 1.58 1.314 2.022a2.665 2.665 0 0 0 2.412.125l.013.023l9.481-5.474l5.25 9.094l.019-.011a2.668 2.668 0 0 0 2.149 1.094c.885 0 1.664-.435 2.151-1.096l.023.013l5.337-9.244l9.191 5.306l.011-.019a2.666 2.666 0 0 0 2.408-.127a2.666 2.666 0 0 0 1.315-2.025h.027V70.398h10.613v-.021a2.667 2.667 0 0 0 2.022-1.314a2.67 2.67 0 0 0 .126-2.411l.023-.013l-5.246-9.087l9.394-5.424l-.011-.019a2.666 2.666 0 0 0 1.094-2.149zM43.715 61.355l-9.846-4.35l4.345 7.525l-2.456 1.418l-6.662-11.537l2.525-1.459l9.53 4.162l-4.185-7.248l2.457-1.418l6.66 11.537l-2.368 1.37zm4.652-2.686l-6.661-11.538l8.165-4.713l1.248 2.162l-5.709 3.295l1.398 2.422l5.587-3.225l1.248 2.16l-5.587 3.227l1.518 2.629l5.709-3.295l1.248 2.162l-8.164 4.714zm18.906-10.915L60.675 41l2.567 9.08l-2.611 1.508l-9.965-9.629l2.75-1.588l6.838 7.168l-2.617-9.605l1.92-1.108l6.993 7.079l-2.79-9.506l2.75-1.588l3.375 13.436l-2.612 1.507z"/>
                                </svg>
                            </motion.div>

                            <h1 className="font-thin tracking-wider text-[13px] mt-3">add additional information</h1>
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => {
                                    setQuickPost(false);
                                    setStep(1);
                                }}
                                className="px-5 py-2 tracking-widest font-thin rounded-[20px] bg-black text-white cursor-pointer"
                            >
                                + ingredient
                            </motion.button>

                        </div>
                    </motion.div>
                )}
        </>
    );
}

// Step wrapper 
const StepWrapper = ({ children, isActive, bgClass, height }: StepWrapperProps) => (
    <motion.div
        className={`${bgClass}   
                    ${isActive ? "pointer-events-auto" : ""}`}
        variants={slideVariants}
        initial="initial"
        animate="animate"
        exit="exit"
    >
        {children}
    </motion.div>
);

const slideVariants = {
    initial: { y: 50, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: -50, opacity: 0 },
};
