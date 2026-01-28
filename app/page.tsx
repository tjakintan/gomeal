"use client";
import React, { useEffect, useState, useRef, JSX } from "react";
import { motion, useAnimation } from "framer-motion";
import "../styles/component_style.css";

export default function Home(): JSX.Element {

    const [open, setOpen] = useState(false);
    const controls = useAnimation();
    const [slideX, setSlideX] = useState("-40%");
    const [active, setActive] = useState(false);

    const togglePanel = () => {
        const next = !active;
        setActive(next);
        controls.start(next ? "active" : "rest");
    };  

    useEffect(() => {
        const updateX = () => {
        if (window.innerWidth < 640) {
            setSlideX("-80%"); 
        } else {
            setSlideX("-40%"); 
        }
        };

        updateX();
        window.addEventListener("resize", updateX);
        return () => window.removeEventListener("resize", updateX);
    }, []);

    return (
        <div className="w-screen h-screen overflow-y-scroll scrollbar-hide">

            <div className="w-screen h-screen relative">
                <div className="absolute inset-0 flex flex-col justify-center items-center pointer-events-none">
                    <img 
                        src="/gomeal.png"
                        className="w-[100px] h-[100px]"
                    />
                </div>
            </div>

            <div className="w-screen h-[3000px] md:h-screen bg-red-500 flex items-center justify-center p-5">
            </div>

            <div className="w-screen h-screen flex bg-cyan-500 items-center justify-start p-5">

                <div className="w-full md:w-4/5 lg:w-4/5 h-4/5 overflow-hidden">

                    <motion.div
                        className="relative w-full h-4/5 flex items-start justify-center"
                        whileHover="hover"
                        initial="rest"
                        animate={controls}
                        onHoverStart={() => controls.start("active")} 
                        onHoverEnd={() => controls.start("rest")}
                        onClick={togglePanel} 
                    >
                        <div className="relative w-full h-full flex items-center justify-center ">
                            
                            {/* Background */}
                            <div className="absolute inset-0 flex items-center justify-center py-12">
                                <div className="relative w-full h-full flex overflow-hidden items-center justify-center">

                                    <div className="absolute w-1/7 h-full flex flex-col left-0 items-center justify-center">

                                        <div className="flex-1 rounded-[30px] flex justify-center items-center">
                                            <svg 
                                                className="w-10 h-10" 
                                                viewBox="0 0 1024 1024"
                                            >
                                                <path fill="#000000" d="M640 608h-64V416h64v192zm0 160v160a32 32 0 0 1-32 32H416a32 32 0 0 1-32-32V768h64v128h128V768h64zM384 608V416h64v192h-64zm256-352h-64V128H448v128h-64V96a32 32 0 0 1 32-32h192a32 32 0 0 1 32 32v160z"/><path fill="#000000" d="m220.8 256l-71.232 80l71.168 80H768V256H220.8zm-14.4-64H800a32 32 0 0 1 32 32v224a32 32 0 0 1-32 32H206.4a32 32 0 0 1-23.936-10.752l-99.584-112a32 32 0 0 1 0-42.496l99.584-112A32 32 0 0 1 206.4 192zm678.784 496l-71.104 80H266.816V608h547.2l71.168 80zm-56.768-144H234.88a32 32 0 0 0-32 32v224a32 32 0 0 0 32 32h593.6a32 32 0 0 0 23.936-10.752l99.584-112a32 32 0 0 0 0-42.496l-99.584-112A32 32 0 0 0 828.48 544z"/>
                                            </svg>
                              
                                        </div>
                                        
                                        <div className="flex-1 rounded-[30px] flex justify-center items-center">
                                            <svg 
                                                className="W-10 h-10" 
                                                viewBox="0 0 24 24"><path fill="#000000" d="M18.05 6.56a.84.84 0 0 0-.84.84v4.78a.84.84 0 1 0 1.68 0V7.4a.85.85 0 0 0-.84-.84m-6.37 0a.85.85 0 0 0-.84.84v2.43h1.68V7.4a.85.85 0 0 0-.84-.84"/><path fill="#000000" d="M22.88 1.94H1.12A1.12 1.12 0 0 0 0 3.06v14.5a1.12 1.12 0 0 0 1.12 1.13h2.6a8.3 8.3 0 0 1-1.48 3.37c3.26.05 5.32-1.21 6.55-3.37h14.09A1.12 1.12 0 0 0 24 17.56V3.06a1.12 1.12 0 0 0-1.12-1.12M7.54 6.56H6a.85.85 0 0 0-.84.84v2.43h1.59a.75.75 0 0 1 0 1.5H5.11v2.44a.75.75 0 1 1-1.5 0V7.4A2.34 2.34 0 0 1 6 5.06h1.54a.75.75 0 1 1 0 1.5M14 13.77a.75.75 0 0 1-1.5 0v-2.44h-1.66v2.44a.75.75 0 0 1-1.5 0V7.4a2.34 2.34 0 1 1 4.66 0Zm6.37-1.59a2.37 2.37 0 0 1-1 1.9l.75.75a.75.75 0 0 1 0 1.06a.75.75 0 0 1-1.06 0l-1.4-1.4a2.34 2.34 0 0 1-2-2.31V7.4a2.34 2.34 0 1 1 4.68 0Z"/>
                                            </svg>
                                        </div>

                                        <div className="flex-1 rounded-[30px] flex justify-center items-center">
                                            <svg 
                                                className="w-10 h-10" 
                                                viewBox="0 0 576 512"
                                            >
                                                <path fill="#000000" d="m169.6 153.4l-18.7-18.7c-12.5-12.5-12.5-32.8 0-45.3L265.6-25.4c12.5-12.5 32.8-12.5 45.3 0l18.7 18.8c12.5 12.5 12.5 32.8 0 45.3L214.9 153.4c-12.5 12.5-32.8 12.5-45.3 0M276 211.7l-31.4-31.4l112-112L476 187.7l-112 112l-31.4-31.4l-232 232c-15.6 15.6-40.9 15.6-56.6 0s-15.6-40.9 0-56.6zm114.9 162.9c-12.5-12.5-12.5-32.8 0-45.3l114.7-114.7c12.5-12.5 32.8-12.5 45.3 0l18.7 18.7c12.5 12.5 12.5 32.8 0 45.3L454.9 393.4c-12.5 12.5-32.8 12.5-45.3 0l-18.7-18.7z"/>
                                            </svg>
                                        </div>
                                        
                                        <div className="flex-1 rounded-[30px] flex justify-center items-center">
                                            <svg 
                                                className="w-10 h-10" 
                                                viewBox="0 0 717 698"
                                            >
                                                <path fill="#000000" d="M358 0c198 0 359 155 359 349S556 698 358 698S0 543 0 349S160 0 358 0zM198 191v100c0 11 8 21 19 21h41c10 0 20-10 20-21V191c0-11-10-20-20-20h-41c-11 0-19 9-19 20zm241 0v100c0 11 10 21 20 21h41c11 0 19-10 19-21V191c0-11-8-20-19-20h-41c-10 0-20 9-20 20zm145 321c9-9 17-19 6-31c-9-9-20-19-29-29c-9-9-20-18-32-25c-20-12-46-15-70-9c-18 5-34 18-46 31c-13 13-25 34-43 40c-20 6-36-6-48-21c-12-14-24-29-40-39c-19-12-43-16-65-13c-23 4-40 16-55 31c-8 8-16 17-24 24c-8 8-24 20-12 32c7 7 15 19 25 24c12 5 24-13 31-21c18-17 39-45 68-30c16 9 28 29 41 42c14 14 33 24 53 27c23 4 47-1 66-13c16-11 28-26 40-40c14-16 34-27 54-15c8 5 14 13 20 20c9 8 18 18 27 26c12 12 25-3 33-11z"/>
                                            </svg>
                                        </div>

                                        <div className="flex-1 rounded-[30px] flex justify-center items-center">
                                            <svg 
                                                className="w-10 h-10" 
                                                viewBox="0 0 1024 1024"
                                            >
                                                <path fill="#000000" d="M512 896q-66 0-134-16q-34 40-69.5 69.5t-60 43.5t-47.5 21.5t-30 8.5t-11 1q26-57 30-124.5T176 786Q94 723 47 635T0 448q0-91 40.5-174t109-143T313 35.5T512 0t199 35.5T874.5 131t109 143t40.5 174t-40.5 174t-109 143T711 860.5T512 896zm-64-160q0 13 9 22.5t23 9.5h64q13 0 22.5-9.5T576 736v-64q0-14-9.5-23t-22.5-9h-64q-14 0-23 9t-9 23v64zm64-608q-85 0-152 37.5T268 262l116 58q0-27 37.5-45.5T512 256t90.5 18.5t37.5 45t-37.5 45.5t-90.5 19q-27 0-45.5 18.5T448 448v96q0 13 9 22.5t23 9.5h64q13 0 22.5-9.5T576 544v-39q83-16 137.5-67.5T768 320q0-80-75-136t-181-56z"/>
                                            </svg>
                                            
                                        </div>

                                    </div>
                                    
                                    <div className="absolute w-3/5 md:w-2/5 lg:w-2/5 h-full right-0 flex flex-col gap-4">

                                        <div className="flex-1 bg-gray-200 rounded-[30px] flex justify-center items-center">
                                            
                                        </div>
                                        <div className="flex-1 bg-gray-200 rounded-[30px] flex justify-center items-center">
                                            
                                        </div>

                                        <div className="flex-1 bg-gray-200 rounded-[30px] flex justify-center items-center">
                                            
                                        </div>
                                        <div className="flex-1 bg-gray-200 rounded-[30px] flex justify-center items-center">
                                            
                                        </div>
                                        <div className="flex-1 bg-gray-200 rounded-[30px] flex justify-center items-center">
                                            
                                        </div>

                                    </div>
                                </div>
                            </div>

                            {/* Sliding Door */}
                            <motion.div
                                className="absolute inset-0 flex items-start justify-end z-10 "
                                variants={{
                                    rest: { x: "0%" },
                                    active: { x: slideX },
                                }}
                                transition={{ type: "spring", stiffness: 200, damping: 25 }}
                            >
                                <div className="w-5/6 h-full md:w-8/9 lg:w-8/9 flex items-center justify-end overflow-hidden bg-white">

                                    <motion.div
                                        className="flex flex-col gap-4 p-10"
                                        variants={{
                                            rest: { width: "100%" },
                                            active: { width: "74%" }, 
                                        }}
                                        transition={{ type: "spring", stiffness: 200, damping: 25 }}
                                        onClick={() => controls.start("active")}
                                    >
                                        <div className="help-card">
                                            <label className="help-title">Guide</label>
                                            <p className="help-text"></p>
                                        </div>

                                        <div className="help-card">
                                            <label className="help-title">FAQs</label>
                                            <p className="help-text"></p>
                                        </div>

                                        <div className="help-card">
                                            <label className="help-title">Legal & Privacy</label>
                                            <p className="help-text"></p>
                                        </div>

                                        <div className="help-card">
                                            <label className="help-title">TroubleShoot</label>
                                            <p className="help-text help-text--spaced">
                                                If you need help for commonly asked questions.
                                            </p>
                                        </div>

                                        <div className="help-card">
                                            <label className="help-title">Contact & Help</label>
                                            <p className="help-text help-text--spaced">
                                                In the case of a concern or an issue not-specified please contact support.
                                            </p>
                                        </div>

                                    </motion.div>

                                </div>
                            </motion.div>

                        </div>

                    </motion.div>

                </div>

            </div>
        </div>
    );

}