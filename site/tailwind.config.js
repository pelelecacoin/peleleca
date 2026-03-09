/** @type {import('tailwindcss').Config} */
export default {
  content: ['./*.html', './src/**/*.{js,ts,css}'],
  theme: {
    extend: {
      colors: {
        pp: {
          green: '#00C853',
          dark: '#060608',
          gold: '#FFD700',
          gray: '#111118',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
