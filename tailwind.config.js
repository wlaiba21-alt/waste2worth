
export default {
  content: [
  './index.html',
  './src/**/*.{js,ts,jsx,tsx}'
],
  theme: {
    extend: {
      colors: {
        eco: {
          green: '#22C55E',
          deep: '#15803D',
          light: '#86EFAC',
        },
        sky: {
          blue: '#3B82F6',
        },
        soft: {
          orange: '#F97316',
        },
        yellow: {
          accent: '#FACC15',
        },
        dark: {
          bg: '#0F172A',
          card: '#1E293B',
        },
        border: {
          gray: '#334155',
        },
        text: {
          light: '#CBD5E1',
          white: '#FFFFFF',
        }
      },
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
