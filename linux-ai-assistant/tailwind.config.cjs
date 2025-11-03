/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx,html}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "Menlo", "Monaco", "Courier New", "monospace"],
      },
      fontSize: {
        // Optimized for reading
        xs: ["0.75rem", { lineHeight: "1.5" }],
        sm: ["0.875rem", { lineHeight: "1.6" }],
        base: ["1rem", { lineHeight: "1.75" }],
        lg: ["1.125rem", { lineHeight: "1.75" }],
        xl: ["1.25rem", { lineHeight: "1.75" }],
        "2xl": ["1.5rem", { lineHeight: "1.6" }],
        "3xl": ["1.875rem", { lineHeight: "1.5" }],
      },
      boxShadow: {
        // Subtle, sophisticated shadows for depth
        "sm-soft": "0 1px 3px 0 rgb(0 0 0 / 0.08)",
        "md-soft": "0 4px 8px -2px rgb(0 0 0 / 0.12)",
        "lg-soft": "0 10px 24px -4px rgb(0 0 0 / 0.15)",
        "xl-soft": "0 20px 40px -8px rgb(0 0 0 / 0.2)",
        "inner-soft": "inset 0 2px 4px 0 rgb(0 0 0 / 0.06)",
        glow: "0 0 20px rgba(122, 162, 247, 0.3)",
        "glow-purple": "0 0 20px rgba(187, 154, 247, 0.3)",
      },
      backdropBlur: {
        xs: "2px",
      },
      animation: {
        "fade-in": "fadeIn 200ms ease-out",
        "slide-up": "slideUp 250ms ease-out",
        "scale-in": "scaleIn 150ms ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        scaleIn: {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
