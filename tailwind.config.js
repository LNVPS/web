/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        cyber: {
          primary: "#39ff14",
          "primary-dim": "#39ff1466",
          dark: "#0a0a0a",
          darker: "#050505",
          panel: "#0d1117",
          "panel-light": "#161b22",
          border: "#39ff1433",
          "border-bright": "#39ff1488",
          accent: "#00fff2",
          "accent-dim": "#00fff266",
          warning: "#ffb800",
          danger: "#ff0040",
          "danger-dim": "#ff004066",
          success: "#39ff14",
          muted: "#4a5568",
          text: "#b8c4d0",
          "text-bright": "#e2e8f0",
        },
      },
      boxShadow: {
        neon: "0 0 5px #39ff14, 0 0 20px #39ff1433",
        "neon-sm": "0 0 3px #39ff14, 0 0 10px #39ff1433",
        "neon-lg": "0 0 10px #39ff14, 0 0 40px #39ff1433, 0 0 80px #39ff1422",
        "neon-accent": "0 0 5px #00fff2, 0 0 20px #00fff233",
        "neon-danger": "0 0 5px #ff0040, 0 0 20px #ff004033",
        "neon-warning": "0 0 5px #ffb800, 0 0 20px #ffb80033",
        "neon-inset": "inset 0 0 10px #39ff1422",
      },
      borderColor: {
        DEFAULT: "#39ff1433",
      },
      animation: {
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        scanline: "scanline 8s linear infinite",
        flicker: "flicker 3s infinite",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        scanline: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        flicker: {
          "0%, 100%": { opacity: "1" },
          "92%": { opacity: "1" },
          "93%": { opacity: "0.8" },
          "94%": { opacity: "1" },
          "96%": { opacity: "0.9" },
          "98%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
