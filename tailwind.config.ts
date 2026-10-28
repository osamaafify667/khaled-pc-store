import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      screens: {
        xs: "380px",
      },
      colors: {
        ink: {
          950: "#05070a",
          900: "#080b10",
          850: "#0b0f15",
          800: "#0f141b",
          750: "#131a22",
          700: "#19212b",
          600: "#232e3a",
        },
        accent: {
          DEFAULT: "#2ee6a8",
          soft: "#8ff5d6",
          dark: "#12b483",
        },
        sky: {
          brand: "#4cc9f0",
        },
        line: "rgba(148, 163, 184, 0.14)",
      },
      fontFamily: {
        sans: ["var(--font-cairo)", "Segoe UI", "Tahoma", "sans-serif"],
        display: ["var(--font-cairo)", "Segoe UI", "Tahoma", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(46,230,168,0.24), 0 18px 60px -24px rgba(46,230,168,0.35)",
        card: "0 20px 50px -32px rgba(0,0,0,0.9)",
      },
      backgroundImage: {
        "grid-fade":
          "radial-gradient(ellipse at top, rgba(46,230,168,0.12), transparent 55%), linear-gradient(rgba(148,163,184,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.05) 1px, transparent 1px)",
      },
      backgroundSize: {
        grid: "auto, 56px 56px, 56px 56px",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "fade-up": "fade-up .45s ease-out both",
        shimmer: "shimmer 1.6s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
