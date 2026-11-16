import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./" → 커스텀 도메인(island.abracadelulu.com)과
// GitHub Pages 하위 경로(edibulb.github.io/harry-island/) 모두에서 동작
export default defineConfig({
  plugins: [react()],
  base: "./",
});
