import type { Config } from "tailwindcss";
import colors from "tailwindcss/colors";
import tailwindcssAnimate from "tailwindcss-animate";

/**
 * Tally palette: decorative hues resolve to the brand violet (#5b4cf0),
 * status hues collapse to one green / amber / red, and grays use the cool
 * lavender-gray scale (slate-50 = canvas, slate-900 = dark card, slate-950 = dark canvas).
 */
const accent = {
  50: "#f1efff",
  100: "#e4e0ff",
  200: "#cbc4ff",
  300: "#aba0ff",
  400: "#9488ff",
  500: "#7464f7",
  600: "#5b4cf0",
  700: "#4b3dd4",
  800: "#3d33a8",
  900: "#332d85",
  950: "#1e1a4f",
};
const coolGray = {
  50: "#f4f5fb",
  100: "#eceefa",
  200: "#e1e3f0",
  300: "#c9ccdd",
  400: "#9ba1bd",
  500: "#737896",
  600: "#5c6178",
  700: "#2a2f4a",
  800: "#1c2038",
  900: "#131629",
  950: "#0b0d1a",
};
const paletteOverrides = {
  slate: coolGray,
  gray: coolGray,
  zinc: coolGray,
  neutral: coolGray,
  stone: coolGray,
  sky: accent,
  blue: accent,
  cyan: accent,
  teal: accent,
  violet: accent,
  purple: accent,
  fuchsia: accent,
  pink: accent,
  indigo: accent,
  emerald: colors.emerald,
  lime: colors.emerald,
  green: colors.emerald,
  yellow: colors.amber,
  orange: colors.amber,
  amber: colors.amber,
  rose: colors.rose,
  red: colors.rose,
};

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ...paletteOverrides,
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      maxWidth: {
        "7xl": "80rem",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
