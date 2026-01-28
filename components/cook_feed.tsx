"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/utils/user";
import "../styles/component_style.css"; 

// Interfaces Regiments for Cook Feed & Post 
interface CookFeedProps {
  data?: any[];
}
interface CookDetailsProps {
  post_id: string;
}

export const CookFeed: React.FC<CookFeedProps> = ({ data }) => {

  const { user } = useUser();
  const router = useRouter();

  return (
    <div className="w-screen h-screen bg-blue-300">
      HHH
      <button
        onClick={() => router.push("/feed?cook=true&post_id=123")}
        className="py-1 px-2 bg-black text-white rounded-xl mt-4"
      >
        Go to Post 123
      </button>
    </div>
  );
};

export const CookDetails: React.FC<CookDetailsProps> = ({ post_id }) => {
    return (
        <div className="w-screen h-screen bg-yellow-300 flex items-center justify-center">
            <p>Viewing post: {post_id}</p>
        </div>
    );
};
