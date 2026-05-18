"use client";

import { useState, useEffect } from "react";

export const colors = {
  light: {
    bg: "bg-white",
    card: "bg-gray-100",
    text: "text-black",
    muted: "text-gray-500",
    border: "border-black/10",
  },
  dark: {
    bg: "bg-black",
    card: "bg-zinc-900",
    text: "text-white",
    muted: "text-gray-400",
    border: "border-white/10",
  },
};

export const textStyles = {
  h1: "text-4xl font-bold tracking-tight",
  h2: "text-2xl font-bold",
  h3: "text-xl font-semibold",
  body: "text-base",
  small: "text-sm text-gray-500",
};

export function useTheme() {
  
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const saved = localStorage.getItem("theme") as "light" | "dark" | null;
    if (saved) setTheme(saved);
  }, []);

  const toggle = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("theme", next);
  };

  return { theme, toggle };
}