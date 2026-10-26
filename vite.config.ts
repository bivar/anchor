/// <reference types="vitest/config" />
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

// Production CSP. The dev server needs inline <style> tags for HMR, so it is not applied there.
const CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "font-src 'self'",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
];

// Headers for static hosts that read a `_headers` file (Netlify, Cloudflare Pages).
// frame-ancestors only works as a real header, not in the <meta> tag.
const HEADERS = `/*
  Content-Security-Policy: ${[...CSP_DIRECTIVES, "frame-ancestors 'none'", 'upgrade-insecure-requests'].join('; ')}
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()
  Cross-Origin-Opener-Policy: same-origin
  Strict-Transport-Security: max-age=31536000; includeSubDomains

/sw.js
  Cache-Control: no-cache

/index.html
  Cache-Control: no-cache

/assets/*
  Cache-Control: public, max-age=31536000, immutable
`;

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? listFiles(full) : [full];
  });
}

function anchorPwa(): Plugin {
  const publicDir = new URL('./public', import.meta.url).pathname;
  return {
    name: 'anchor-pwa',
    apply: 'build',
    transformIndexHtml: () => [
      { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP_DIRECTIVES.join('; ') }, injectTo: 'head-prepend' },
    ],
    generateBundle(_options, bundle) {
      const publicFiles = listFiles(publicDir)
        .map((f) => relative(publicDir, f).split('\\').join('/'))
        .filter((f) => f !== '_headers');
      // .woff fallbacks are skipped: every browser that can install a PWA uses the .woff2 files.
      const files = [...Object.keys(bundle), ...publicFiles].filter((f) => !f.endsWith('.map') && !f.endsWith('.woff')).sort();
      const precache = ['./', ...files.map((f) => `./${f}`)];
      const template = readFileSync(new URL('./pwa/sw.template.js', import.meta.url), 'utf8');
      // Hashed file names change with content; the template is hashed too so SW logic changes rotate the cache.
      const version = createHash('sha256').update(files.join('\n')).update(template).digest('hex').slice(0, 12);
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: template.replaceAll('__VERSION__', version).replaceAll('__PRECACHE__', JSON.stringify(precache, null, 2)),
      });
      this.emitFile({ type: 'asset', fileName: '_headers', source: HEADERS });
    },
  };
}

export default defineConfig({
  // Relative base: the build works from any path (domain root or a GitHub Pages project folder).
  base: './',
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [react(), anchorPwa()],
  build: { target: 'es2020', sourcemap: false },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
  },
});
