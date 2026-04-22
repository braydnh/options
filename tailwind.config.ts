import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          base: '#0F0F0F',
          panel: '#1A1A1A',
          hover: '#222222',
        },
        border: {
          DEFAULT: '#2A2A2A',
          subtle: '#1F1F1F',
        },
        text: {
          primary: '#FFFFFF',
          muted: '#555555',
          dim: '#333333',
        },
        accent: {
          green: '#22C55E',
          red: '#F87171',
          purple: '#A78BFA',
          amber: '#F59E0B',
        },
      },
    },
  },
  plugins: [],
}

export default config
