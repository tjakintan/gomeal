import { motion } from "framer-motion";
import { WobblyText } from "@/hooks/WobblyText"

export default function Loading({text}) {
  return (
    <div className="flex flex-col gap-2 items-center justify-center h-screen w-screen bg-white">
      <motion.img
        src="/gomeal.png"
        className="w-[75px] h-[75px] cursor-pointer"
        animate={{ scale: [1, 1.4, 1] }} 
        transition={{
          duration: 1,
          repeat: Infinity,
          repeatType: "loop",
          ease: "easeInOut",
        }}
      />
      <motion.span
        className="tracking-widest font-thin text-[10px]"
        animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
        transition={{
          duration: 1,
          repeat: Infinity,
          repeatType: "loop",
          ease: "easeInOut",
        }}
      >
        {text}
      </motion.span>
    </div>
  );
}
