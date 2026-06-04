import type { Config } from "tailwindcss";
import colors from "tailwindcss/colors";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
    colors: {
      'gwgreen': '#00b259',
      'gwdarkgreen': '#005D72',
      'gwblue': '#0093d2',
      'gwdarkblue': '#002C5F',
      'gwlightblue': '#70bdc7',
      'gwred': '#FF0000',
      'gwdarkred': '#7e0909',
      'bggorange': '#FF5100',
      'bbg-10': '#249563',
      'bgg-9': '#249563',
      'bgg-8': '#2fc482',
      'bgg-7': '#1d8acd',
      'bgg-6': '#5369a2',
      'bgg-5': '#5369a2',
      'bgg-4': '#df4751',
      'bgg-3': '#df4751',
      'bgg-2': '#db303b',
      'bgg-1': '#db303b',
      ...colors,
    }
  },
  darkMode: "class",
  plugins: [],
};
export default config;
