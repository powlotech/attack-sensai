import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE ?? '/attack-learner/',
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'ATT&CK Learner',
        short_name: 'ATT&CK',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#0F6E74',
        background_color: '#F4F5F2',
        start_url: './#/learn',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,json}'],
        globIgnores: ['data/version.json'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        // attack.json is precached (offline first run) but never runtime-cached: the app's own update logic owns it
        runtimeCaching: [{ urlPattern: ({ url }) => url.pathname.endsWith('/data/version.json'), handler: 'NetworkFirst' }],
      },
    }),
  ],
})
