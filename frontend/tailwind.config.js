/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ["class", "[data-theme='dark']"],
  theme: {
    extend: {
      colors: {
        fg: "hsl(var(--fg))",
        muted: "hsl(var(--fg-muted))",
        bg: "hsl(var(--bg))",
        border: "hsl(var(--border))",
        card: {
          DEFAULT: "hsl(var(--card-bg))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          hover: "hsl(var(--accent-hover))",
          fg: "hsl(var(--accent-fg))",
        },
        accentAlt: {
          DEFAULT: "hsl(var(--accent-alt))",
          hover: "hsl(var(--accent-alt-hover))",
        },
        success: "hsl(var(--success))",
        error: "hsl(var(--error))",
        warn: "hsl(var(--warn))",
        pending: "hsl(var(--pending))",
      },
      boxShadow: {
        card: "0 2px 8px 0 hsl(var(--shadow))",
        elevate: "0 6px 16px 0 hsl(var(--shadow))",
      },
      borderRadius: {
        xl: "12px",
        '2xl': "16px",
      },
    },
  },
  plugins: [],
}

