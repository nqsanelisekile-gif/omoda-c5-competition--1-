import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Design tokens — see DESIGN.md for rationale
        ink: "#0B0B0C",       // near-black background
        graphite: "#17171A",  // panel/card background
        steel: "#26262B",     // borders / dividers
        silver: "#9A9AA2",    // secondary text
        bone: "#F5F5F2",      // off-white primary text on dark
        ignition: "#E0263F",  // signature CTA accent — used sparingly
        "ignition-dark": "#B01E32",
      },
      fontFamily: {
        display: ["'Archivo Expanded'", "'Archivo'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      letterSpacing: {
        widest2: "0.25em",
      },
      backgroundImage: {
        "fade-up": "linear-gradient(180deg, rgba(11,11,12,0) 0%, rgba(11,11,12,0.85) 60%, #0B0B0C 100%)",
      },
    },
  },
  plugins: [],
} satisfies Config;
