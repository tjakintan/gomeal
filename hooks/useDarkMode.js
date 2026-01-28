import { useEffect, useState } from "react";

export default function useDarkMode() {
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        // This code only runs in the browser
        const storedTheme = localStorage.getItem("theme"); // safer than localStorage.theme
        if (storedTheme === "dark") {
            setIsDark(true);
        } else if (storedTheme === "light") {
            setIsDark(false);
        } else {
            // fallback to system preference
            const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
            setIsDark(prefersDark);
        }
    }, []);

    return [isDark, setIsDark];
}
