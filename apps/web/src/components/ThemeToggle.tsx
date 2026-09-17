import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import { useLocale } from "@/contexts/LocaleContext";

export default function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const { t } = useLocale();
  const isDark = theme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      title={isDark ? t("common.lightMode") : t("common.darkMode")}
      aria-label={isDark ? t("common.lightMode") : t("common.darkMode")}
      className={`text-muted-foreground ${className ?? ""}`}
    >
      {isDark ? <Sun /> : <Moon />}
    </Button>
  );
}
