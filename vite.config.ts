import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      {
        name: 'apk-downloader',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url && (req.url.split('?')[0] === '/totp-authenticator.apk' || req.url.split('?')[0] === '/download/apk')) {
              const apkPath = path.resolve(__dirname, 'public/totp-authenticator.apk');
              if (fs.existsSync(apkPath)) {
                const stat = fs.statSync(apkPath);
                res.writeHead(200, {
                  'Content-Type': 'application/vnd.android.package-archive',
                  'Content-Length': stat.size,
                  'Content-Disposition': 'attachment; filename="totp-authenticator.apk"',
                  'Cache-Control': 'no-cache',
                });
                fs.createReadStream(apkPath).pipe(res);
                return;
              }
            }
            next();
          });
        },
      },
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'favicon.ico',
          'apple-touch-icon.png',
          'icon.svg',
          'icon-maskable.svg',
          'fonts/Vazirmatn-Regular.woff2',
          'fonts/Vazirmatn-Medium.woff2',
          'fonts/Vazirmatn-Bold.woff2',
        ],
        manifest: {
          id: '/',
          name: 'کلیدبان - رمزساز دوعاملی (Kelidban TOTP)',
          short_name: 'کلیدبان',
          description: 'رمزساز دوعاملی امن، آفلاین و متن‌باز با رمزنگاری پیشرفته و تقویم جلالی',
          theme_color: '#0f172a',
          background_color: '#090d16',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          navigateFallback: null,
          runtimeCaching: [
            {
              urlPattern: ({ request }) => request.mode === 'navigate',
              handler: 'NetworkFirst',
              options: {
                cacheName: 'html-cache',
                networkTimeoutSeconds: 3,
              },
            },
            {
              urlPattern: ({ request }) => request.destination === 'font' || request.destination === 'image',
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'media-cache',
              },
            },
          ],
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
