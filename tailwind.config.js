/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        blinkit: {
          yellow: "#F8CB46",
          green: "#0C831F",
          darkGreen: "#085E16",
          red: "#D32F2F",
          gray: "#F4F6F8",
        },
      },
    },
  },
  plugins: [],
};
