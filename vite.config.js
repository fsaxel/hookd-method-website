import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function replaceWorkCarousel() {
  return {
    name: "hookd-optimized-work-carousel",
    enforce: "pre",
    transform(code, id) {
      const normalizedId = id.replace(/\\/g, "/");
      if (!normalizedId.endsWith("/src/App.jsx")) return null;

      const helperStart = code.indexOf("const wrapIndex = (index)");
      const sectionStart = code.indexOf("\nfunction SectionTitle", helperStart);
      const sourceCode =
        helperStart === -1 || sectionStart === -1
          ? code
          : code.slice(0, helperStart) + code.slice(sectionStart);

      const start = sourceCode.indexOf("function WorkCarousel() {");
      const end = sourceCode.indexOf("\nfunction AnimatedStat", start);
      if (start === -1 || end === -1) return null;

      const nextCode = [
        'import OptimizedWorkCarousel from "./OptimizedWorkCarousel.jsx";\n',
        sourceCode.slice(0, start),
        "function WorkCarousel() {\n  return <OptimizedWorkCarousel />;\n}\n",
        sourceCode.slice(end),
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
