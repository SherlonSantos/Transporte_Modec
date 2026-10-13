import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        mro: {
          navy: "#041A71",
          navyDark: "#031354",
          blue: "#215FC3",
          blueLight: "#3A78DE",
          green: "#00CE7C",
          greenLight: "#29F38D",
          bg: "#F7F9FD",
          card: "#FFFFFF",
          line: "#DCE5F2",
          text: "#14204A",
          muted: "#667085",
          amber: "#F5A623",
          red: "#D92D20",
          gray: "#98A2B3",
        },
      },
      boxShadow: {
        card: "0 7px 22px rgba(4, 26, 113, 0.08)",
        dropdown: "0 10px 30px rgba(4, 26, 113, 0.15)",
      },
    },
  },
  plugins: [],
};
export default config;
