/** @type {import('tailwindcss').Config} */
/**
 * Design tokens use the `hum` prefix (e.g. bg-hum-bg).
 * App brand: Hum ("Hum - rituals" on stores) — warm, romantic minimal palette.
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
          ink: '#141218',
          text: '#FAF7F4',
          muted: '#ADA7B3',
          dim: '#767089',
          primary: '#E8A09A',
          secondary: '#9FB8D2',
          sage: '#B5C68F',
          spark: '#9FB7BA',
          gold: '#E9C685',
          petal: '#E89AAE',
          bloom: '#A990C2',
          crimson: '#D27373',
        },
      },
      fontFamily: {
        // Note: actual font-family per Text node is injected at runtime in
        // `lib/setupFonts.ts` based on each node's `fontWeight`. These values
        // exist mainly to keep Tailwind classes type-safe.
        sans: ['Inter_400Regular', 'System'],
        display: ['Inter_200ExtraLight', 'System'],
      },
    },
  },
  plugins: [],
};
