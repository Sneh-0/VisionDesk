export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0b1020",
        slatepanel: "#f6f7fb",
        // Brand = indigo/violet, aligned with the VisionDesk logo (#4f46e5)
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
          950: "#1e1b4b"
        }
      },
      boxShadow: {
        soft: "0 1px 2px rgba(16, 24, 40, 0.04), 0 8px 24px rgba(16, 24, 40, 0.06)",
        glow: "0 8px 24px rgba(79, 70, 229, 0.25)"
      }
    }
  },
  plugins: []
};
