"use client";
import React, { useRef, useState, useEffect } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { PostPayload } from "@/components/cook_post/types";

type RenderPostProps = {
  post?: PostPayload | null;
  quickPost?: boolean;
};

export const RenderPostPreview: React.FC<RenderPostProps> = ({ post, quickPost }) => {

    const ingredientCount = post?.ingredients?.length || 0;

    const totalSeconds =
        post?.steps?.reduce((acc, step) => {
        if (!step.timer) return acc;

        const h = step.timer.hours || 0;
        const m = step.timer.minutes || 0;
        const s = step.timer.seconds || 0;

        return acc + h * 3600 + m * 60 + s;
        }, 0) || 0;

    const totalMinutes = Math.round(totalSeconds / 60);

    const formatCookTime = () => {
        if (totalMinutes < 60) return `${totalMinutes} min`;
        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    };

    return (
        <div className="w-full h-full rounded-[30px] flex flex-col items-center justify-start p-5 bg-gray-100">

            {/* image */}
            <div className="flex h-1/3 w-full rounded-[30px] overflow-hidden">
                <img 
                    src={post?.image_url}
                    className="w-full h-full object-cover"
                />
            </div>

            {/* name */}
            <div className="flex w-full space-x-5">
                <img src="/post/name.svg" className="w-7 h-7"/>
                {post?.dish_name}
            </div>

            {/* desc */}
            <div className="flex w-full">
                <img src="/post/description.svg" className="w-6 h-6"/>
            </div>
            
            {/* estimated Cook time */}
            <div className="flex w-full">
                <img src="/post/time.svg" className="w-6 h-6"/>
            </div>

            {/* ingredient count */}
            <div className="flex w-full">
                <img src="/post/ingredient.svg" className="w-6 h-6"/>
                {ingredientCount}
            </div>

            {/* steps count */}
            <div className="flex w-full">
                
            </div>

            {/* user specified difficulty */}
            <div className="flex w-full">
                <img src="/post/difficulty.png" className="w-9 h-9"/>
            </div>

            {/* user specified difficulty */}
            <div className="flex w-full">
                
            </div>

            {/* dietary */}
            <div className="flex w-full">
                <img src="/post/warning.svg" className="w-6 h-6"/>
            </div>

        </div>
    );
};
