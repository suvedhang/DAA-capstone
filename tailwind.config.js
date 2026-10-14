/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
colors: {
        abyss: {
          DEFAULT: "#071521",
          50: "#0B2030",
          100: "#0A1A27",
          200: "#102A3A",
          300: "#14384B",
          400: "#1B4A61",
        },
        surface: {
          DEFAULT: "#102A3A",
          raised: "#14384B",
          sunken: "#0A1A27",
        },
        cyan: {
          brand: "#00C8E8",
          soft: "#38D6EE",
          deep: "#0891A8",
        },
        aqua: {
          DEFAULT: "#2DD4A7",
          soft: "#5EE6C0",
        },
        amber: {
          brand: "#F5A524",
        },
        coral: {
          DEFAULT: "#FF5C6C",
          soft: "#FF8A96",
        },
        ink: {
          DEFAULT: "#E6F1F7",
          muted: "#93AAB8",
          faint: "#5C7484",
        },
      },
      opacity: {
        8: "0.08",
        12: "0.12",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
      },
      borderRadius: {
        lg: "0.5rem",
        md: "0.375rem",
        sm: "0.25rem",
      },
      boxShadow: {
        panel: "0 1px 0 0 rgba(255,255,255,0.03) inset, 0 8px 30px -12px rgba(0,0,0,0.6)",
        glow: "0 0 0 1px rgba(0,200,232,0.35), 0 0 24px -6px rgba(0,200,232,0.4)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.45" },
        },
        dash: {
          to: { "stroke-dashoffset": "-1000" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.25s ease-out",
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
        dash: "dash 20s linear infinite",
      },
    },
  },
  plugins: [],
};
