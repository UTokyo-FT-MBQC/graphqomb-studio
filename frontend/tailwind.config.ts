import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        node: {
          input: "#22c55e",
          output: "#3b82f6",
          intermediate: "#6b7280",
        },
        flow: {
          x: "#ef4444",
          z: "#3b82f6",
        },
      },
    },
  },
  plugins: [],
};

export default config;
