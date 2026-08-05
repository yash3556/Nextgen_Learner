/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#2E6A4F",
        primaryHover: "#255840",
        secondary: "#6E8F7A",
        success: "#4F8A5B",
        warning: "#C68A2D",
        error: "#B84E4E",
        link: "#35694F",
        lightBg: "#F8F7F3",
        softBg: "#F2F1EC",
        darkBg: "#131715",
        darkSecondary: "#1B211E",
        cardLight: "#FFFFFF",
        cardDark: "#202723",
        textDark: "#1D241F",
        textLight: "#F3F4F1",
        textMuted: "#667063",
        mutedDark: "#A4B0A5",
        borderLight: "#D9DED7",
        borderDark: "#303833"
      },
      boxShadow: {
        soft: "0 10px 24px rgba(29, 36, 31, 0.08)"
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
