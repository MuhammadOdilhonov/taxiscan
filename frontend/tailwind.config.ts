import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#FFCC00",
          50: "#FFFAE5",
          100: "#FFF5CC",
          200: "#FFEB99",
          300: "#FFE066",
          400: "#FFD633",
          500: "#FFCC00",
          600: "#CCA300",
          700: "#997A00",
          800: "#665200",
          900: "#332900",
        },
        ink: {
          DEFAULT: "#0F1216",
          soft: "#1A1F26",
          muted: "#5C6772",
          line: "#E5E8EC",
          bg: "#F7F8FA",
        },
      },
      fontFamily: {
        sans: ['"Inter"', "ui-sans-serif", "system-ui", "sans-serif"],
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
        "star-pulse": "starPulse 1.5s ease-in-out infinite",
      },
      keyframes: {
        starPulse: {
          "0%, 100%": { transform: "scale(0.7)", opacity: "0.5" },
          "50%": { transform: "scale(1.15)", opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(255,204,0,0.4)" },
          "50%": { boxShadow: "0 0 0 12px rgba(255,204,0,0)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
