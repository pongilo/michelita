import { defineConfig } from "vite";
import tsConfigPaths from 'vite-tsconfig-paths'
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 3000,
  },
  plugins: [
    tailwindcss(),
    tsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tanstackStart({
      srcDirectory: 'src',
      prerender: {
        enabled: true,
      }
    }),
    viteReact()
  ],
});
