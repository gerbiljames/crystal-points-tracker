import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

// BASE_PATH lets CI set the subpath for GitHub Pages project deploys.
const base = process.env.BASE_PATH || "/";

export default defineConfig({
  base,
  plugins: [solid()],
  esbuild: { jsx: "preserve" },
  server: { host: "127.0.0.1", port: 8770 },
  build: { target: "es2022" },
});
