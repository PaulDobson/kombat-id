import type { Config } from "tailwindcss";

// Tailwind v4: la mayor parte de la configuración vive en globals.css con @theme.
// Este archivo solo se mantiene para compatibilidad con plugins que aún lo requieran.
const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/modules/**/*.{js,ts,jsx,tsx,mdx}",
  ],
};

export default config;
