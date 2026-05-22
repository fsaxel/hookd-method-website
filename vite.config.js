import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function replaceWorkCarousel() {
  return {
    name: "hookd-optimized-work-carousel",
    enforce: "pre",
    transform(code, id) {
      const normalizedId = id.replace(/\\/g, "/");
      if (!normalizedId.endsWith("/src/App.jsx")) return null;

      const start = code.indexOf("function WorkCarousel() {");
      const end = code.indexOf("\nfunction AnimatedStat", start);
      if (start === -1 || end === -1) return null;

      const nextCode = [
        'import OptimizedWorkCarousel from "./OptimizedWorkCarousel.jsx";\n',
        code.slice(0, start),
        "function WorkCarousel() {\n  return <OptimizedWorkCarousel />;\n}\n",
        code.slice(end),
      ]
        .join("")
        .replace(/\n\s*<style>\{`[\s\S]*?`\}<\/style>/, "");

      return { code: nextCode, map: null };
    },
  };
}

export default defineConfig({
  plugins: [replaceWorkCarousel(), react()],
});
