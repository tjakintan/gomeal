"use client";
import { useState, useRef, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import type { DishInfoData } from "./types";
import WobblyText from "../../hooks/WobblyText";
import "../../styles/cook_style.css";

interface DifficultyButtonProps {
    label: string;
    active: boolean;
    onClick: () => void;
    color: {
        bg: string;
        text: string;
    };
}

interface DishInfoProps {
    value?: DishInfoData;
    onPassToHead: (data: DishInfoData) => void;
}

type DifficultyLevel = "easy" | "medium" | "hard";

function DifficultyButton({ label, active, onClick, color }: DifficultyButtonProps) {
  return (
    <div className="flex flex-col items-center cursor-pointer">
      <motion.div
        onClick={onClick}
        className={`w-[70px] h-[40px] rounded-lg ${color.bg} mb-2 ${
          active ? "scale-120" : ""
        }`}
        whileHover={{ scale: 1.05 }}
        animate={{
          scale: active ? 1.15 : 1,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      />
    </div>
  );
}

const DishInfo: React.FC<DishInfoProps> = ({ value, onPassToHead }) => {

    const [dish_image_url, setDish_image_url] = useState(value?.dish_image_url || "");
    const [dish_image_file, setDish_image_file] = useState(value?.dish_image_file || "");
    const [dish_name, setDish_name] = useState(value?.dish_name || "");
    const [dish_description, setDish_description] = useState(value?.dish_description || "");
    const [dish_difficulty, setDish_difficulty] = useState<DifficultyLevel | "">(value?.dish_difficulty || "");

    const [invalidPage, setInvalidPage] = useState<number | null>(null);
    const validateInputs = () => {
        if (!dish_image_url) return { valid: false, page: 0 };
        if (!dish_name.trim()) return { valid: false, page: 1 };
        if (!dish_description.trim()) return { valid: false, page: 2 };
        if (!dish_difficulty) return { valid: false, page: 3 };
        return { valid: true };
    };
    const [isActive, setIsActive] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showFullImgPreview, setShowFullImgPreview] = useState(false);
    const [notSupportedFile, setNotSupportedFile] = useState(false);
    const [pageIndex, setPageIndex] = useState(0);

    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const mainContainerRef = useRef<HTMLDivElement | null>(null);
    const options = ["easy", "medium", "hard"];
    const difficultyColors: Record<string, { bg: string; text: string }> = {
        easy: { bg: "bg-green-600", text: "text-green-600" },
        medium: { bg: "bg-yellow-400", text: "text-yellow-400" },
        hard: { bg: "bg-red-600", text: "text-red-600" },
    };
    const [containerWidth, setContainerWidth] = useState(0);
    const TOTAL_PAGES = 4;
    const MIN_HEIGHT = 40; 
    const MAX_HEIGHT = 200; 

    useEffect(() => {
        if (mainContainerRef.current) {
            setContainerWidth(mainContainerRef.current.clientWidth);
        }

        const handleResize = () => {
            if (mainContainerRef.current) {
                setContainerWidth(mainContainerRef.current.clientWidth);
            }
        };

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop: async (acceptedFiles: File[]) => {
            if (!acceptedFiles.length || isLoading) return;

            try {
                setIsLoading(true);
                setNotSupportedFile(false);

                let file = acceptedFiles[0];
                const heic2any = (await import("heic2any")).default;

                // Convert HEIC/HEIF → JPEG
                if (file.type === "image/heic" || file.type === "image/heif") {
                    const convertedBlob = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
                    file = new File([convertedBlob as Blob], file.name.replace(/\.(heic|heif)$/i, ".jpg"), { type: "image/jpeg" });
                }

                const imageUrl = URL.createObjectURL(file);
                setDish_image_url(imageUrl);
                setDish_image_file(file);
                swipeLeft();
            } catch (err) {
                console.error("Image processing failed:", err);
                setNotSupportedFile(true);
            } finally {
                setIsLoading(false);
            }
        },
        accept: { "image/*": [] },
        multiple: false,
    });

    const swipeLeft = () => {
        setPageIndex((prev) => {
            const next = Math.min(prev + 1, TOTAL_PAGES - 1);
            setIsActive(next > 2);
            return next;
        });
        
    };

    const swipeDown = () => {
        setPageIndex((prev) => {
            const next = Math.max(prev - 1, 0);
            setIsActive(next > 2); 
            return next;
        });
    };

    const passToHead = () => {
        const check = validateInputs();

        if (!check.valid) {
            setInvalidPage(check.page ?? null); // highlight page in red
            let stepBack = pageIndex - (check.page ?? 0);
            if (stepBack < 0) stepBack = TOTAL_PAGES + stepBack;
            for (let i = 0; i < stepBack; i++) swipeDown();
            return;
        }

        setInvalidPage(null);

        onPassToHead({
            dish_image_file: dish_image_file as File,
            dish_image_url,
            dish_name,
            dish_description,
            dish_difficulty,
        });
    };

    const handleTextInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setDish_description(e.target.value);
        e.target.style.height = "auto"; 
        const newHeight = Math.min(Math.max(e.target.scrollHeight, MIN_HEIGHT), MAX_HEIGHT);
        e.target.style.height = `${newHeight}px`;
    };

    return (

        <div className="flex items-center">

            <div ref={containerRef} className={`min-h-[100vh] w-full flex flex-col justify-end`}>
                
                <div className={`${showFullImgPreview ? "hidden" : ""} flex flex-col`}>
                    
                    {dish_image_url && !isLoading && (
                        <div className={`h-[30vh] z-30 flex justify-center items-end px-5`}>
                        <motion.div
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.92 }}   
                            onClick={() => setShowFullImgPreview(true)}
                            className={`rounded-[40px]
                                        rounded-[30px] bg-gray-100 opacity-10 hover:opacity-100 w-2/3 h-[100px]  flex items-center 
                                        justify-center shadow-xl cursor-pointer`}
                        >
                            <svg 
                                width="50" height="50" 
                                viewBox="0 0 17 16" fill="#000000"><g fill="#000000" fillRule="evenodd" transform="translate(0 2)"><path d="M13.438 11.944H2.557c-1.394 0-2.528-1.163-2.528-2.591v-6.75c0-1.43 1.135-2.591 2.528-2.591h10.881c1.393 0 2.527 1.161 2.527 2.591v6.75c0 1.428-1.135 2.591-2.527 2.591zM2.237.979c-.7 0-1.272.614-1.272 1.371v7.318c0 .757.572 1.371 1.272 1.371h11.517c.702 0 1.273-.614 1.273-1.371V2.35c0-.757-.571-1.371-1.273-1.371H2.237z"/><ellipse cx="5.471" cy="3.461" rx="1.471" ry="1.461"/><path d="m11.234 3.037l2.76 6.951H2.021L5.497 5.98l3.117.944l2.62-3.887z"/></g>
                            </svg>
                        </motion.div>
                        </div>
                    )}

                    <div className={`z-10 w-full h-[70vh] flex items-center justify-center overflow-auto scrollbar-hide`}>
                    
                        <motion.div 
                            ref={mainContainerRef}
                            className={`w-full h-full flex flex-row items-start py-1 justify-start`} 
                            animate={{ x: -pageIndex * containerWidth }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }} 
                        >
                            {/* Page 1: Image Upload */}
                            <div style={{ minWidth: containerWidth }} className="max-w-[90vw] flex flex-shrink-0 items-center justify-center">
                                
                                <div
                                    {...getRootProps({ disabled: isLoading })}
                                    className={`
                                        p-10 flex flex-col items-center justify-center gap-10 rounded-[30px]
                                        ${isDragActive ? "border-4 border-dashed bg-white border-indigo-500" : "border border-transparent"}
                                        ${isLoading 
                                        ? "pointer-events-none cursor-not-allowed hover:bg-none hover:border-none"
                                        : "cursor-pointer  hover:border-4 hover:border-dashed hover:border-indigo-500"
                                        }
                                    `}
                                >

                                    <div className={`${isLoading || notSupportedFile ? "hidden" : ""} justify-center flex`}>
                                        <input {...getInputProps({ disabled: isLoading })} />
                                        <div className={`${dish_image_url ? "hidden" : ""} flex flex-col font-thin items-center justify-center text-center`}>
                                            <h2 className="tracking-widest text-[15px] text-center  opacity-50">
                                                Drag your image or click the fry to get started
                                            </h2>
                                            <h3 className="tracking-widest text-[11px] text-center  opacity-75">
                                                "This section you swipe up or down to navigate"
                                                JPEG, PNG, WEBP, HEIC, HEIF
                                            </h3>
                                        </div>
                                        <div className="flex items-center justify-center">
                                            <svg 
                                                className="w-30 h-30"
                                                viewBox="0 0 24 24"
                                            >
                                                <g fill="none"><path fill="#ffef5e" d="m20.034 4.672l-.696-1.48a.48.48 0 0 0-.433-.275h-.772a.48.48 0 0 0-.459.344l-2.4 8.262h-.118l.787-9.842a.48.48 0 0 0-.436-.515L13.6 1.002a.48.48 0 0 0-.518.438l-.842 10.083h-.487L10.91 1.442a.476.476 0 0 0-.516-.44l-1.907.164a.48.48 0 0 0-.437.515l.793 9.842h-.122L6.317 3.26a.48.48 0 0 0-.459-.344h-.772a.48.48 0 0 0-.433.274l-.695 1.48A.48.48 0 0 0 3.93 5l1.792 6.522l1.735 5.117h9.114l1.7-5.117L20.066 5a.5.5 0 0 0-.031-.328"/><path fill="#fff9bf" d="m19.172 8.24l.89-3.238a.48.48 0 0 0-.027-.33l-.695-1.48a.48.48 0 0 0-.433-.275h-.772a.48.48 0 0 0-.46.344l-.982 3.384c.894.419 1.728.955 2.48 1.595M15.58 6.19l.362-4.51a.48.48 0 0 0-.436-.514L13.6 1.002a.48.48 0 0 0-.518.438l-.349 4.18c.97.063 1.927.255 2.847.57M4.82 8.242A11 11 0 0 1 7.3 6.645L6.317 3.26a.48.48 0 0 0-.459-.344h-.772a.48.48 0 0 0-.433.274l-.695 1.48A.48.48 0 0 0 3.93 5zm6.44-2.62l-.35-4.18a.47.47 0 0 0-.33-.419a.5.5 0 0 0-.187-.021l-1.906.164a.48.48 0 0 0-.437.515l.363 4.51c.92-.315 1.877-.506 2.847-.569"/><path stroke="#191919" strokeLinecap="round" strokeLinejoin="round" d="m20.034 4.672l-.696-1.48a.48.48 0 0 0-.433-.275h-.772a.48.48 0 0 0-.459.344l-2.4 8.262h-.118l.787-9.842a.48.48 0 0 0-.436-.515L13.6 1.002a.48.48 0 0 0-.518.438l-.842 10.083h-.487L10.91 1.442a.476.476 0 0 0-.516-.44l-1.907.164a.48.48 0 0 0-.437.515l.793 9.842h-.122L6.317 3.26a.48.48 0 0 0-.459-.344h-.772a.48.48 0 0 0-.433.274l-.695 1.48A.48.48 0 0 0 3.93 5l1.792 6.522l1.735 5.117h9.114l1.7-5.117L20.066 5a.5.5 0 0 0-.031-.328"/><path stroke="#191919" strokeLinecap="round" strokeLinejoin="round" d="m11.999 14.434l-1.09-12.992a.47.47 0 0 0-.33-.419a.5.5 0 0 0-.186-.021l-1.906.164a.48.48 0 0 0-.437.515l.984 12.186m2.965.567l1.085-12.992a.47.47 0 0 1 .167-.326a.48.48 0 0 1 .35-.114l1.905.162a.48.48 0 0 1 .437.515l-.979 12.188"/><path fill="#ffef5e" stroke="#191919" strokeLinecap="round" strokeLinejoin="round" d="m18.824 17.263l-.718 2.87H5.882l-.717-2.87z"/><path fill="#ff808c" stroke="#191919" strokeLinecap="round" strokeLinejoin="round" d="M5.877 20.13h12.229l-.536 2.143a.956.956 0 0 1-.929.727H7.346a.956.956 0 0 1-.93-.727zm14.238-8.012l-1.291 5.145H5.164l-1.28-5.145a.46.46 0 0 1 .085-.412a.48.48 0 0 1 .379-.183h2.439a.47.47 0 0 1 .467.392c.603 3.357 8.877 3.357 9.48 0a.47.47 0 0 1 .468-.392h2.449a.476.476 0 0 1 .469.593z"/></g>
                                            </svg>
                                        </div>
                                    </div>

                                    {isLoading && (
                                        <>
                                            <svg 
                                                width="50" height="50" 
                                                viewBox="0 0 24 24"
                                            >
                                                <circle cx="12" cy="2" r="0" fill="#000000"><animate attributeName="r" begin="0" calcMode="spline" dur="1s" keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8" repeatCount="indefinite" values="0;2;0;0"/></circle><circle cx="12" cy="2" r="0" fill="#000000" transform="rotate(45 12 12)"><animate attributeName="r" begin="0.125s" calcMode="spline" dur="1s" keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8" repeatCount="indefinite" values="0;2;0;0"/></circle><circle cx="12" cy="2" r="0" fill="#000000" transform="rotate(90 12 12)"><animate attributeName="r" begin="0.25s" calcMode="spline" dur="1s" keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8" repeatCount="indefinite" values="0;2;0;0"/></circle><circle cx="12" cy="2" r="0" fill="#000000" transform="rotate(135 12 12)"><animate attributeName="r" begin="0.375s" calcMode="spline" dur="1s" keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8" repeatCount="indefinite" values="0;2;0;0"/></circle><circle cx="12" cy="2" r="0" fill="#000000" transform="rotate(180 12 12)"><animate attributeName="r" begin="0.5s" calcMode="spline" dur="1s" keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8" repeatCount="indefinite" values="0;2;0;0"/></circle><circle cx="12" cy="2" r="0" fill="#000000" transform="rotate(225 12 12)"><animate attributeName="r" begin="0.625s" calcMode="spline" dur="1s" keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8" repeatCount="indefinite" values="0;2;0;0"/></circle><circle cx="12" cy="2" r="0" fill="#000000" transform="rotate(270 12 12)"><animate attributeName="r" begin="0.75s" calcMode="spline" dur="1s" keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8" repeatCount="indefinite" values="0;2;0;0"/></circle><circle cx="12" cy="2" r="0" fill="#000000" transform="rotate(315 12 12)"><animate attributeName="r" begin="0.875s" calcMode="spline" dur="1s" keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8" repeatCount="indefinite" values="0;2;0;0"/></circle>
                                            </svg>
                                            <h1 className="font-thin text-[10px] text-center tracking-wider">
                                                Converting Heic to jpg
                                            </h1>
                                        </>
                                    )}

                                    {notSupportedFile && (
                                        <>
                                            <svg 
                                                width="50" height="50" 
                                                viewBox="0 0 24 24"
                                            >
                                                <path fill="#000000" d="m20.475 23.3l-2.3-2.3H5q-.825 0-1.413-.588T3 19V5.825L.7 3.5l1.4-1.4l19.8 19.8l-1.425 1.4ZM6 17h8.175l-2.325-2.325l-.85 1.05L9 13l-3 4Zm15 1.175L5.825 3H19q.825 0 1.413.588T21 5v13.175Z"/>
                                            </svg>
                                            <h1 className="font-thin text-[12px] text-center tracking-wider">
                                                File type not supported 
                                                JPEG, PNG, WEBP, HEIC, HEIF
                                            </h1>
                                        </>                                       
                                    )}

                                </div>

                            </div>

                            {/* Page 2: Dish Name */}
                            <div style={{ minWidth: containerWidth }} className={`flex-shrink-0 flex items-center justify-center text-2xl`}>
                                <div className="flex flex-col items-center overflow-hidden p-5 gap-10 rounded-[30px] bg-gray-100">
                                    <div onClick={swipeDown} className="w-full flex justify-center">
                                        <svg className="w-6 h-6 rotate-180 " viewBox="0 0 24 24">
                                            <g id="evaArrowIosDownwardFill0">
                                                <g id="evaArrowIosDownwardFill1">
                                                    <path id="evaArrowIosDownwardFill2" fill="#5a5a5a" d="M12 16a1 1 0 0 1-.64-.23l-6-5a1 1 0 1 1 1.28-1.54L12 13.71l5.36-4.32a1 1 0 0 1 1.41.15a1 1 0 0 1-.14 1.46l-6 4.83A1 1 0 0 1 12 16Z"/>
                                                </g>
                                            </g>
                                        </svg>
                                    </div>
                                    <h1 className="tracking-widest font-bold text-[50px]">
                                        <WobblyText text="name"/>
                                    </h1>
                                    <motion.div 
                                        className="bg-yellow-300 rounded-[40px] p-5"
                                        whileHover={{ scale: 1.05 }} 
                                        transition={{ type: "spring", stiffness: 300, damping: 20 }} 
                                    >
                                        <input 
                                            value={dish_name}
                                            onChange={(e) => {setDish_name(e.target.value)}}
                                            className="w-full h-[40px] bg-yellow-100 rounded-[25px] hover:bg-white
                                                    px-3 cursor-pointer text-center font-light tracking-wide text-[15px]
                                                    placeholder-italic placeholder:font-light placeholder:tracking-wider placeholder:text-sm placeholder:italic
                                                    "
                                            placeholder="rigatoni"
                                        />
                                    </motion.div>
                                    <div className="w-full h-1/5 flex items-center justify-center">
                                        <motion.button 
                                            animate={dish_name.trim() ? { x: [-5, 5] } : {}}
                                            transition={dish_name.trim() ? { duration: 1, repeat: Infinity, repeatType: "loop", ease: "easeInOut" } : {}}
                                            whileHover={dish_name.trim() ? { scale: 1.05 } : {}}
                                            className={`next-button ${dish_name.trim() ? "" : "opacity-30 pointer-events-none"}`}
                                            onClick={swipeLeft}
                                            disabled={!dish_name.trim()}
                                        >
                                            <svg className="w-6 h-6" viewBox="0 0 24 24">
                                                <path fill="#000000" fillRule="evenodd" d="M2.538 4.113a1 1 0 0 1 1.035.068l10 7a1 1 0 0 1 0 1.638l-10 7A1 1 0 0 1 2 19V5a1 1 0 0 1 .538-.887M16 5.8A1.8 1.8 0 0 1 17.8 4h1.4A1.8 1.8 0 0 1 21 5.8v12.4a1.8 1.8 0 0 1-1.8 1.8h-1.4a1.8 1.8 0 0 1-1.8-1.8z" clipRule="evenodd"/>
                                            </svg>
                                        </motion.button>
                                    </div>
                                </div>
                            </div>

                            {/* Page 3: Dish Description */}
                            <div style={{ minWidth: containerWidth }} className={`flex-shrink-0 flex items-center justify-center text-2xl`}>
                                <div className="flex flex-col overflow-hidden p-5 gap-10 rounded-[30px] bg-gray-100">
                                    <div onClick={swipeDown} className="w-full flex justify-center">
                                        <svg className="w-6 h-6 rotate-180 " viewBox="0 0 24 24">
                                            <g id="evaArrowIosDownwardFill0">
                                                <g id="evaArrowIosDownwardFill1">
                                                    <path id="evaArrowIosDownwardFill2" fill="#5a5a5a" d="M12 16a1 1 0 0 1-.64-.23l-6-5a1 1 0 1 1 1.28-1.54L12 13.71l5.36-4.32a1 1 0 0 1 1.41.15a1 1 0 0 1-.14 1.46l-6 4.83A1 1 0 0 1 12 16Z"/>
                                                </g>
                                            </g>
                                        </svg>
                                    </div>
                                    <h1 className="text-center tracking-widest font-bold text-[45px]">
                                        <WobblyText text="description" />
                                    </h1>
                                    <motion.div 
                                        className="bg-blue-300 rounded-[40px] p-5"
                                        whileHover={{ scale: 1.05 }} 
                                        transition={{ type: "spring", stiffness: 300, damping: 20 }} 
                                    >
                                        <textarea 
                                            value={dish_description}
                                            onChange={handleTextInputChange}
                                            className="w-full flex bg-blue-200 rounded-[25px] hover:bg-white max-w-full justify-start
                                                    px-3 py-2 cursor-pointer placeholder:items-center font-light tracking-wide text-[15px] overflow-auto scrollbar-hide
                                                    placeholder-italic placeholder:font-light placeholder:tracking-wider placeholder:text-sm placeholder:italic
                                                    "
                                            placeholder="italian pasta"
                                            rows={1}
                                            style={{ minHeight: `${MIN_HEIGHT}px`, maxHeight: `${MAX_HEIGHT}px` }}
                                        />
                                    </motion.div>
                                    <div className="w-full h-1/5 flex items-center justify-center">
                                        <motion.button 
                                            animate={dish_description.trim() ? { x: [-5, 5] } : {}}
                                            transition={dish_description.trim() ? { duration: 1, repeat: Infinity, repeatType: "loop", ease: "easeInOut" } : {}}
                                            whileHover={dish_description.trim() ? { scale: 1.05 } : {}}
                                            className={`next-button ${dish_description.trim() ? "" : "opacity-30 pointer-events-none"}`}
                                            onClick={swipeLeft}
                                            disabled={!dish_description.trim()}
                                        >
                                            <svg className="w-6 h-6" viewBox="0 0 24 24">
                                                <path fill="#000000" fillRule="evenodd" d="M2.538 4.113a1 1 0 0 1 1.035.068l10 7a1 1 0 0 1 0 1.638l-10 7A1 1 0 0 1 2 19V5a1 1 0 0 1 .538-.887M16 5.8A1.8 1.8 0 0 1 17.8 4h1.4A1.8 1.8 0 0 1 21 5.8v12.4a1.8 1.8 0 0 1-1.8 1.8h-1.4a1.8 1.8 0 0 1-1.8-1.8z" clipRule="evenodd"/>
                                            </svg>
                                        </motion.button>
                                    </div>
                                </div>
                            </div>

                            {/* Page 4: Dish Difficulty */}
                            <div style={{ minWidth: containerWidth }} className={`flex-shrink-0 flex items-center justify-center text-2xl`}>
                                <div className="flex flex-col overflow-hidden p-5 gap-10 rounded-[30px] bg-gray-100">
                                        <div onClick={swipeDown} className="w-full flex justify-center">
                                        <svg className="w-6 h-6 rotate-180 " viewBox="0 0 24 24">
                                            <g id="evaArrowIosDownwardFill0">
                                                <g id="evaArrowIosDownwardFill1">
                                                    <path id="evaArrowIosDownwardFill2" fill="#5a5a5a" d="M12 16a1 1 0 0 1-.64-.23l-6-5a1 1 0 1 1 1.28-1.54L12 13.71l5.36-4.32a1 1 0 0 1 1.41.15a1 1 0 0 1-.14 1.46l-6 4.83A1 1 0 0 1 12 16Z"/>
                                                </g>
                                            </g>
                                        </svg>
                                    </div>
                                    <h1 className="text-center tracking-widest font-bold text-[50px]">
                                        <WobblyText text="difficulty" />
                                    </h1>
                                    <div className="flex flex-col">
                                        <div className="h-1/2 flex flex-row items-center justify-center space-x-5">
                                            {/* Hard */}
                                            {/* medium */}
                                            {/* easy */}
                                            {options.map((level) => (
                                                <DifficultyButton
                                                    key={level}
                                                    label={level}
                                                    active={dish_difficulty === level}
                                                    onClick={() => setDish_difficulty(level as DifficultyLevel)}
                                                    color={difficultyColors[level as DifficultyLevel]}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    <div className="h-1/5 flex items-center justify-center">
                                        <motion.button
                                            transition={{ duration: 1, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
                                            whileHover={{ scale: 1.05 }}
                                            className={`next-section-button`}
                                            onClick={passToHead}
                                        >
                                            <svg className="w-6 h-6" viewBox="0 0 8 8">
                                                <path fill="#000000" d="M3 1V0h1v1M3 8V5h1v3M1 4V2h5l1 1l-1 1"/>
                                            </svg>
                                        </motion.button>
                                    </div>
                                </div>
                            </div>

                        </motion.div>

                    </div>

                </div>

                <AnimatePresence>
                    {showFullImgPreview && (
                        <motion.div
                            className="absolute w-screen h-screen flex items-center justify-center"
                            onClick={() => setShowFullImgPreview(false)}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <motion.img
                                src={dish_image_url}
                                alt={dish_name}
                                className="w-full h-full object-cover rounded-[30px]"
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.8, opacity: 0 }}
                                transition={{ duration: 0.3 }}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

            </div> 

        </div>

    );
};

export default DishInfo;
