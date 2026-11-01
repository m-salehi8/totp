import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const distPath = path.resolve(__dirname, 'dist');

// Security Headers Middleware
app.use((req, res, next) => {
  // Strict Content Security Policy: no external scripts, no eval, self only
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: blob:; connect-src 'self'; worker-src 'self' blob:; media-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self';"
  );

  // Prevent MIME-sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Prevent clickjacking / framing
  res.setHeader('X-Frame-Options', 'DENY');

  // Never send referrers
  res.setHeader('Referrer-Policy', 'no-referrer');

  // Strict Permissions Policy: allow camera for QR scanning, disallow micro, geo
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()');

  // HSTS (HTTP Strict Transport Security)
  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');

  // Isolation policies
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');

  next();
});

// Serve static assets with immutable cache headers for hashed files
app.use(
  express.static(distPath, {
    maxAge: '1y',
    immutable: true,
    index: false,
  })
);

// Direct APK download route
app.get(['/totp-authenticator.apk', '/download/apk'], (req, res) => {
  const apkPath = path.join(distPath, 'totp-authenticator.apk');
  res.setHeader('Content-Type', 'application/vnd.android.package-archive');
  res.download(apkPath, 'totp-authenticator.apk');
});

// Fallback to index.html for SPA client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Kelidban Authenticator server running securely at http://localhost:${PORT}`);
});
