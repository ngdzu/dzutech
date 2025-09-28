/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "Inter", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        night: {
          900: "#030712",
          800: "#0B1220",
          700: "#111827",
        },
        accent: {
          500: "#38bdf8",
          400: "#60c6ff",
          300: "#93d7ff",
        },
      },
      boxShadow: {
        'glow': "0 0 35px rgba(56, 189, 248, 0.25)",
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: 0, transform: "translateY(20px)" },
          '100%': { opacity: 1, transform: "translateY(0)" },
        },
        'float': {
          '0%, 100%': { transform: "translateY(0px)" },
          '50%': { transform: "translateY(-5px)" },
        },
      },
      animation: {
        'fade-in-up': "fade-in-up 0.8s ease-out both",
        'float': "float 6s ease-in-out infinite",
      },
      backgroundImage: {
        'grid-radial': "radial-gradient(circle at 20% 20%, rgba(96, 198, 255, 0.25), transparent 45%), radial-gradient(circle at 80% 0%, rgba(56, 189, 248, 0.18), transparent 55%), radial-gradient(circle at 50% 100%, rgba(15, 118, 110, 0.2), transparent 50%)",
      },
    },
  },
  plugins: [],
}

