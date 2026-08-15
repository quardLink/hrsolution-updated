import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Sanitizes free-typed input for a decimal-only field (e.g. a salary amount):
// strips non-digit/non-dot characters and collapses everything after the
// first "." into digits only, so the user can never type a second decimal point.
export function parseDecimalInput(raw: string): string {
  const digitsAndDots = raw.replace(/[^0-9.]/g, "");
  const firstDot = digitsAndDots.indexOf(".");
  if (firstDot === -1) return digitsAndDots;
  return digitsAndDots.slice(0, firstDot + 1) + digitsAndDots.slice(firstDot + 1).replace(/\./g, "");
}
