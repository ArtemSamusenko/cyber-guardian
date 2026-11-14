/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'game-dark': '#1a1a2e',
        'game-accent': '#16213e',
        'game-highlight': '#0f3460',
        'game-primary': '#e94560',
      },
    },
  },
  plugins: [],
}
