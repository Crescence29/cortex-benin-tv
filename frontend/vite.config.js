import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // 'prompt' + enregistrement manuel (src/lib/autoUpdate.js) : le rechargement
      // après mise à jour est différé tant qu'un formulaire est en cours de saisie.
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'logo.png'],
      manifest: {
        name: 'Cortex Bénin TV',
        short_name: 'Cortex TV',
        description: "L'actualité du Bénin, de l'Afrique et du monde en temps réel.",
        lang: 'fr',
        start_url: '/',
        display: 'standalone',
        background_color: '#0a0a0d',
        theme_color: '#0a0a0d',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Les articles/vidéos changent en continu : on ne met en cache que les
        // fichiers statiques du build, jamais les réponses de l'API.
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  server: {
    host: true,
  },
})
