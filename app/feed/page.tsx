"use client";
import React from "react";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { CookFeed, CookDetails } from "../../components/cook_feed"; 
import { notifyMLBackend } from "../../utils/ai-API";
import { useUser } from "@/utils/user";
import "../../styles/pages_style.css"

const Feed: React.FC = () => {

    const { user } = useUser();
    const router = useRouter();
    const searchParams = useSearchParams();

    const cook = searchParams.get("cook");
    const post_id = searchParams.get("post_id");

    if (cook && post_id) {
        return <CookDetails post_id={post_id as string} />;
    }
    if (cook) {
        return <CookFeed />;
    }
    return (
        <div className=" w-screen items-center justify-center flex flex-col overflow-hidden">
            <div className="w-full h-screen p-1">
                <div className="h-full flex flex-col">

                    <div className="w-full h-full overflow-hidden flex flex-col items-center justify-start p-5 gap-5  bg-indigo-400">
                        <div className="w-full h-[500px] rounded-[30px] bg-gray-100">
                            jjs
                        </div>
                        <div className="w-full h-[500px] rounded-[30px] bg-gray-100">
                            jsj
                        </div>
                    </div>

                    <div className="w-full h-full bg-red-300">

                    </div>
                    
                </div>
            </div>
            <div className="w-full h-screen bg-cyan-300">
                
            </div>
            <div className="w-full h-screen bg-green-300">
                <button
                className="py-1 px-2 bg-black text-white rounded-xl cursor-pointer"
                onClick={async () => {
                    // Example user object (replace with actual auth)
                    // user.sub
                    try {
                        const response = await notifyMLBackend();
                        console.log("ML backend response:", response);
                    } catch (err) {
                        console.error("Failed to notify ML backend:", err);
                    }

                    // Navigate after notifying backend
                    router.push("/feed?cook=true");
                }}
                >
                cook feed
                </button>
            </div>
        </div>
    );
};

export default Feed;
