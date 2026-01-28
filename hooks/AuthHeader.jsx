import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { use } from "react";

export default function AuthHeader() {

    const router = useRouter();

    return (

        <motion.img 
            whileHover={{ scale: 1.07 }}
            whileTap={{ scale: 0.95 }}
            src="/gomeal.png"
            className="w-[100px] h-[100px] cursor-pointer"
            onClick={() => {router.replace("/")}}
        />

    );

}