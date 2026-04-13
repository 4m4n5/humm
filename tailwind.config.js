/** @type {import('tailwindcss').Config} */
/**
 * Design tokens use the `hum` prefix (e.g. bg-hum-bg).
 * App brand is "humm" — warm, romantic minimal palette.
 */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        hum: {
          bg: '#0F0E14',
          surface: '#17151E',
          card: '#1E1C27',
          border: '#2E2938',
          primary: '#E0B4AC',
          ink: '#141218',
          secondary: '#9E91B4',
          gold: '#CDB896',
          text: '#FAF7F4',
          muted: '#ADA7B3',
          dim: '#767089',
          petal: '#D4A0A0',
          bloom: '#A87E91',
        },
      },
      fontFamily: {
        sans: ['System'],
      },
    },
  },
  plugins: [],
};
