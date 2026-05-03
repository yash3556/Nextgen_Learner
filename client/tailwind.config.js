/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#2563EB",
        secondary: "#7C3AED",
        lightBg: "#F3F4F6",
        darkBg: "#020617",
        textDark: "#0F172A",
        textLight: "#E2E8F0"
      },
      boxShadow: {
        soft: "0 12px 28px rgba(15, 23, 42, 0.08)"
      },
      keyframes: {
        shimmer: {
          "100%": { transform: "translateX(100%)" }
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        }
      },
      animation: {
        shimmer: "shimmer 1.25s infinite",
        "fade-in-up": "fade-in-up 400ms ease-out"
      },
      fontFamily: {
        sans: ["Manrope", "Poppins", "Segoe UI", "sans-serif"]
      }
    }
  },
  plugins: []
};
