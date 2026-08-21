/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#f4f7fb",
          100: "#e8eef6",
          700: "#243447",
          900: "#0f1b2d",
        },
        scan: {
          400: "#2ec7ff",
          500: "#00b4ef",
          600: "#0096c7",
        },
        verdict: {
          buy: "#0d9f6e",
          never: "#e85d4c",
          neutral: "#6b7c93",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "shelf-grid":
          "linear-gradient(180deg, rgba(0,180,239,0.08) 0%, transparent 40%), radial-gradient(ellipse at top right, rgba(46,199,255,0.18), transparent 50%)",
      },
    },
  },
  plugins: [],
};
