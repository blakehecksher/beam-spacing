import { defineConfig } from "vite";
import preact from "@preact/preset-vite";

export default defineConfig({
  plugins: [preact()],
  // IMPORTANT: if your repo is named something else, change this to "/<repo-name>/"
  base: "/beam-spacing/"
});
