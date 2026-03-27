import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";
import { nitro } from 'nitro/vite'


export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
    tsconfigPaths: true
  },
  server: {
    port: 3000,
  },
  plugins: [
    tailwindcss(),
    tanstackStart({
      srcDirectory: 'src',
    }),
    nitro(),
    viteReact()
  ],
});
