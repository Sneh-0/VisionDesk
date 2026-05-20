export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#101828",
        slatepanel: "#f8fafc",
        brand: {
          50: "#eef8ff",
          100: "#d8efff",
          500: "#2474e8",
          600: "#1d5fca",
          700: "#184fa5"
        }
      },
      boxShadow: {
        soft: "0 12px 32px rgba(15, 23, 42, 0.08)"
      }
    }
  },
  plugins: []
};
