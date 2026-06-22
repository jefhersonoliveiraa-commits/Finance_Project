import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
        mono: ['"Plus Jakarta Sans"', 'monospace'],
      },
      colors: {
        background: '#09090b',
        card: '#18181b',
        border: '#27272a',
        muted: '#27272a',
        primary: '#fafafa',
        primary_fg: '#18181b',
        accent: '#3b82f6',
        positive: '#10b981',
        destructive: '#ef4444',
        warning: '#f59e0b',
      }
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
