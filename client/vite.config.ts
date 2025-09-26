import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import svgr from "vite-plugin-svgr";

export default defineConfig({
  plugins: [tailwindcss(), svgr()],
  server: {
    allowedHosts: [
      "b8a105cc-a3e2-4581-885a-4c9dba782ede-00-3k8iwr9vkg4ri.janeway.replit.dev",
    ],
  },
});
