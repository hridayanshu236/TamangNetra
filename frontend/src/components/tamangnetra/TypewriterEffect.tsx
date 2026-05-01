"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export function TypewriterEffect({ text }: { text: string }) {
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    let currentText = "";
    let currentIndex = 0;
    
    // Very simple typewriter effect
    const interval = setInterval(() => {
      if (currentIndex < text.length) {
        currentText += text[currentIndex];
        setDisplayedText(currentText);
        currentIndex++;
      } else {
        clearInterval(interval);
      }
    }, 15); // Fast typing speed

    return () => clearInterval(interval);
  }, [text]);

  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="inline-block"
    >
      {displayedText}
      <motion.span
        animate={{ opacity: [0, 1, 0] }}
        transition={{ repeat: Infinity, duration: 0.8 }}
        className="inline-block ml-[1px] w-[2px] h-[1em] bg-emerald-500 translate-y-[2px]"
      />
    </motion.span>
  );
}
