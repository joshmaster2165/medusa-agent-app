/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Lifted from medusa-frontend design tokens. Stay in sync with
        // medusa-frontend/src/app/globals.css.
        bg: {
          primary: "#0c1322",
          card: "#141b2b",
          elevated: "#232a3a",
          deep: "#070e1d",
        },
        ink: {
          primary: "#dce2f7",
          secondary: "#c0c9be",
        },
        accent: {
          DEFAULT: "#96d5a3",
          green: "#96d5a3",
          warn: "#ffb2bb",
          danger: "#75333e",
        },
        border: "#404941",
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};
