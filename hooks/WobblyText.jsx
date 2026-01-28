import { motion } from "framer-motion";
import { useMemo } from "react";

export default function WobblyText({ text }) {
    const letters = useMemo(
      () =>
        text.split("").map(() => ({
          rotate: Math.random() * 12 - 6,   // -6° to 6°
          x: Math.random() * 4 - 2,         // -2px to 2px
          y: Math.random() * 4 - 2,         // -2px to 2px
          duration: 2 + Math.random() * 2,  // 2–4s
        })),
      [text]
    );

    return (
        <>
            {text.split("").map((char, i) => (
                <motion.span
                    key={i}
                    className="inline-block"
                    animate={{
                      rotate: [
                        letters[i].rotate,
                        -letters[i].rotate,
                        letters[i].rotate,
                      ],
                      x: [letters[i].x, -letters[i].x, letters[i].x],
                      y: [letters[i].y, -letters[i].y, letters[i].y],
                    }}
                    transition={{
                      duration: letters[i].duration,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                >
                   {char}
                </motion.span>
            ))}
        </>
    );
}
