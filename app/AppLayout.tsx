"use client";
import React, { useState, useRef } from "react";
import { motion, useAnimationControls } from "framer-motion";
import { useUser } from "../utils/user";
import { useRouter } from "next/navigation";
import "../styles/main_page.css";

// Components
import Settings from "./settings/page";

export default function AppLayout({ children }: { children: React.ReactNode }) {

    const { user, loading } = useUser();
    const router = useRouter();
    const controls = useAnimationControls();
    const [showSettings, setShowSettings] = useState(false);
    const showSettingsRef = useRef<HTMLDivElement | null>(null);

    const handleSettingsToggle = () => {
        setShowSettings((prev) => {
        controls.start({ y: prev ? 0 : "0vh" });
        return !prev;
        });
    };

   
    return (
        <motion.div
            animate={controls}
            initial={{ y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="flex flex-col h-screen overflow-auto scrollbar-hide"
        >
            <motion.div
                initial={{ height: 0 }}
                transition={{ duration: 0.1, ease: "easeInOut" }}
                className="z-60"
            >
                <div className={`fixed flex w-full`}>

                    {showSettings && (
                        <div
                        className="fixed inset-0 z-10 bg-black/20 backdrop-blur-sm"
                        onClick={() => setShowSettings(false)}
                        />
                    )}

                    <motion.div className="w-full z-20">
                        <Settings isOpen={showSettings} toggleOpen={handleSettingsToggle} />
                    </motion.div>

                </div>
                
            </motion.div>

            <div className={`flex`}>
                {children}
            </div>

        </motion.div>
    );
}
