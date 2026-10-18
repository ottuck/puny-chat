// Prepares `expo export -p web` output for the Cloudflare Worker's static assets
// (app/wrangler.jsonc). Run after exporting: node scripts/worker-assets.mjs dist
import fs from 'node:fs';
import path from 'node:path';

const dist = process.argv[2] ?? 'dist';

// Expo Router's route list is a development aid; it has no place on the public site.
fs.rmSync(path.join(dist, '_sitemap.html'), { force: true });

// Unknown paths get Expo's not-found page (not_found_handling: "404-page").
fs.copyFileSync(path.join(dist, '+not-found.html'), path.join(dist, '404.html'));

// This deploy's version, also compiled into the bundle (EXPO_PUBLIC_WEB_VERSION): an open web app
// compares the two and reloads when they differ (src/lib/web-update.web.ts).
fs.writeFileSync(
  path.join(dist, 'version.json'),
  JSON.stringify({ version: process.env.EXPO_PUBLIC_WEB_VERSION ?? 'dev' }),
);

// Browsers check the service worker (and the version) for updates, so neither may be served stale.
fs.writeFileSync(
  path.join(dist, '_headers'),
  `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin

/sw.js
  Cache-Control: no-cache

/version.json
  Cache-Control: no-cache

/manifest.webmanifest
  Content-Type: application/manifest+json
`,
);
console.log('404.html, version.json and _headers written');
