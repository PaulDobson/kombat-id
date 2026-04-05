import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combina clases Tailwind sin conflictos.
 * Usar siempre que se mezclen clases condicionales o props de className.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
