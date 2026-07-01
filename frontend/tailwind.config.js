export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0c1512",
        slatepanel: "#f7f9f8",
        // Brand = deep "optic teal" — clarity / vision, not the default AI indigo.
        brand: {
          50: "#f0fdfa",
          100: "#ccfbf1",
          200: "#99f6e4",
          300: "#5eead4",
          400: "#2dd4bf",
          500: "#14b8a6",
          600: "#0f766e",
          700: "#115e59",
          800: "#134e4a",
          900: "#0f3f3a",
          950: "#042f2e"
        },
        // Accent = warm amber, a nod to tortoiseshell eyewear frames.
        accent: {
          50: "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
          900: "#78350f",
          950: "#451a03"
        }
      },
      boxShadow: {
        soft: "0 1px 2px rgba(12, 21, 18, 0.04), 0 8px 24px rgba(12, 21, 18, 0.06)",
        glow: "0 8px 24px rgba(15, 118, 110, 0.25)"
      }
    }
  },
  plugins: []
};
