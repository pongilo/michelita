import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";
import { nitro } from 'nitro/vite'
import { VitePWA } from 'vite-plugin-pwa'


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
    viteReact(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      outDir: '.output/public',
      manifest: {
        name: 'Michelita Confeitaria',
        short_name: 'Michelita',
        description: 'Sistema de gestão da Michelita Confeitaria',
        theme_color: '#593A93',
        background_color: '#593A93',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/app/orders',
        lang: 'pt-BR',
        icons: [
          {
            src: 'pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png',
          },
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2}'],
        navigateFallback: null,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
    nitro(),
  ],
});
