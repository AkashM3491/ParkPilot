/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#3b82f6", // vibrant blue
        secondary: "#10b981", // vibrant green
        dark: "#1e293b",
      }
    },
  },
  plugins: [],
}
