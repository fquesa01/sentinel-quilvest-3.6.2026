import { Moon, Sun, Leaf, Sparkles, Anchor, Layers, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "green" | "sentinel" | "navy" | "linear" | "orange";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("green");

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    
    const validThemes = ["dark", "light", "green", "sentinel", "navy", "linear", "orange"];
    const initialTheme: Theme = validThemes.includes(stored || "")
      ? stored as Theme
      : "green";
    
    setTheme(initialTheme);
    applyTheme(initialTheme);
  }, []);

  const applyTheme = (newTheme: Theme) => {
    document.documentElement.classList.remove("dark", "green", "sentinel", "navy", "linear", "orange");
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else if (newTheme === "green") {
      document.documentElement.classList.add("green");
    } else if (newTheme === "sentinel") {
      document.documentElement.classList.add("sentinel");
    } else if (newTheme === "navy") {
      document.documentElement.classList.add("navy");
    } else if (newTheme === "linear") {
      document.documentElement.classList.add("linear");
    } else if (newTheme === "orange") {
      document.documentElement.classList.add("orange");
    }
  };

  const cycleTheme = () => {
    const themeOrder: Theme[] = ["light", "dark", "green", "sentinel", "navy", "linear", "orange"];
    const currentIndex = themeOrder.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themeOrder.length;
    const newTheme = themeOrder[nextIndex];
    
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    applyTheme(newTheme);
  };

  const getAriaLabel = () => {
    switch (theme) {
      case "light":
        return "Switch to dark mode";
      case "dark":
        return "Switch to green mode";
      case "green":
        return "Switch to sentinel mode";
      case "sentinel":
        return "Switch to navy mode";
      case "navy":
        return "Switch to linear mode";
      case "linear":
        return "Switch to orange mode";
      case "orange":
        return "Switch to light mode";
    }
  };

  const getIcon = () => {
    switch (theme) {
      case "light":
        return <Moon className="h-5 w-5" />;
      case "dark":
        return <Leaf className="h-5 w-5" />;
      case "green":
        return <Sparkles className="h-5 w-5" />;
      case "sentinel":
        return <Anchor className="h-5 w-5" />;
      case "navy":
        return <Layers className="h-5 w-5" />;
      case "linear":
        return <Flame className="h-5 w-5" />;
      case "orange":
        return <Sun className="h-5 w-5" />;
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={cycleTheme}
      data-testid="button-theme-toggle"
      aria-label={getAriaLabel()}
    >
      {getIcon()}
    </Button>
  );
}
