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
            if (req.url) {
              const pathname = req.url.split('?')[0];
              if (pathname === '/totp-authenticator.apk' || pathname === '/download/apk') {
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
              if (pathname === '/sw.js') {
                const swPath = path.resolve(__dirname, 'public/sw.js');
                if (fs.existsSync(swPath)) {
                  res.writeHead(200, {
                    'Content-Type': 'application/javascript; charset=utf-8',
                    'Service-Worker-Allowed': '/',
                    'Cache-Control': 'no-cache',
                  });
                  fs.createReadStream(swPath).pipe(res);
                  return;
                }
              }
              if (pathname === '/manifest.json') {
                const manifestPath = path.resolve(__dirname, 'public/manifest.json');
                if (fs.existsSync(manifestPath)) {
                  res.writeHead(200, {
                    'Content-Type': 'application/manifest+json; charset=utf-8',
                    'Cache-Control': 'no-cache',
                  });
                  fs.createReadStream(manifestPath).pipe(res);
                  return;
                }
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
          theme_color: '#5a1414',
          background_color: '#fffcfc',
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
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,json}'],
          navigateFallback: null,
          runtimeCaching: [
            {
              urlPattern: ({ request }) => true,
              handler: 'CacheFirst',
              options: {
                cacheName: 'kelidban-app-cache',
                cacheableResponse: {
                  statuses: [0, 200],
                },
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
