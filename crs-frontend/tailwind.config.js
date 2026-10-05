/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: '#0B0E17',
          card: '#131823',
          border: 'rgba(255, 255, 255, 0.1)',
          lime: '#84cc16',
          limeBright: '#a3e635',
        },
      },
    },
  },
  plugins: [],
}