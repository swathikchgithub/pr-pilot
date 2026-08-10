/** Shared Tailwind design tokens for apps/web and packages/ui. */
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#d9e6ff",
          300: "#8fb3ff",
          500: "#3366ff",
          600: "#254edb",
          700: "#1c3cad",
          900: "#132667",
        },
        risk: {
          low: "#16a34a",
          medium: "#d97706",
          high: "#dc2626",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
    },
  },
};
