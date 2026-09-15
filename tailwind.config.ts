import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        border: "var(--border)",
        fg: "var(--fg)",
        "fg-muted": "var(--fg-muted)",
        "fg-subtle": "var(--fg-subtle)",
        gold: "var(--gold)",
        "gold-soft": "var(--gold-soft)",
        ring: "var(--ring)",
        "block-1": "var(--block-1)",
        "block-2": "var(--block-2)",
        "block-3": "var(--block-3)",
        "block-4": "var(--block-4)",
        "block-5": "var(--block-5)",
        "block-6": "var(--block-6)",
      },
      borderRadius: {
        sm: "var(--r-sm)",
        md: "var(--r-md)",
        lg: "var(--r-lg)",
        xl: "var(--r-xl)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        elev: "var(--elev-1)",
      },
    },
  },
  plugins: [],
};

export default config;
