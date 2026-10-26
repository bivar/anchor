# Anchor

A gentle daily routine planner built around your energy, with the 5-Minute Rule. Anchor is an
installable web app (PWA): open it in your phone's browser, add it to your home screen, and it runs
full-screen and offline like a native app. No accounts, no servers, no tracking — all data stays on
the device.

English and Português (Brasil); light and dark themes.

## Install on your phone

Anchor has to be served over **HTTPS** to be installable (see [Deploy](#deploy)). Then:

- **Android (Chrome):** open the URL → menu ⋮ → **Install app** (or use *Settings → Install app* inside Anchor).
- **iPhone (Safari):** open the URL → **Share** → **Add to Home Screen**.

After the first visit everything is cached, so it keeps working without a connection.

## Develop

Requires Node 22 (`.nvmrc`). The system Node 18 on this machine is end-of-life and cannot run the toolchain.

```bash
nvm use
npm install
npm run dev        # http://localhost:5173 with hot reload (no service worker in dev)
npm run check      # typecheck + lint + tests + production build
npm run build && npx vite preview --host   # production build incl. service worker, reachable on your LAN
```

Phones only allow installing and offline mode on HTTPS (or `localhost`), so for a real install test,
deploy a preview instead of using the LAN address.

| Script | What it does |
| --- | --- |
| `npm run typecheck` | `tsc -b` |
| `npm run lint` | ESLint (TypeScript + React hooks rules) |
| `npm test` | Vitest unit and component tests (jsdom) |
| `npm run build` | Production build into `dist/`, including `sw.js` and `_headers` |
| `npm run icons` | Regenerates `public/icons/*` from `resources/icon-source.svg` |

## Deploy

`dist/` is a fully static site and works from any path (the build uses relative URLs).

- **GitHub Pages:** push to GitHub, then *Settings → Pages → Source: GitHub Actions*. The
  `Deploy to GitHub Pages` workflow builds and publishes every push to `main`/`master`.
- **Netlify / Cloudflare Pages:** build command `npm run build`, output directory `dist`. These hosts
  also apply `dist/_headers` (CSP with `frame-ancestors`, HSTS, `nosniff`, `Referrer-Policy`,
  `Permissions-Policy`, cache rules), which GitHub Pages ignores. Prefer them if you can.

The CSP is also injected as a `<meta>` tag at build time, so it applies on every host.

## How it works

- `src/state/reducer.ts` — all app logic as a pure reducer (day rollover, streaks, XP/gold, flows).
- `src/state/sanitize.ts` — validates and migrates anything loaded from storage or a backup file.
  Bump `SCHEMA_VERSION` and handle the old shape here when the state changes.
- `src/state/insights.ts` — learns from history (e.g. moves the focus block earlier after repeated heavy starts).
- `src/state/constants.ts` — which blocks exist on a given day (`applicableBlocks`: pet routine, work days,
  exercise plan) and the logical day boundary (`logicalTodayKey`: 3 h before the user's start of day).
- `src/lib/analytics.ts` + `src/screens/StatsTab.tsx` — the Stats page (KPIs, daily/weekday/per-anchor
  follow-through, energy, focus resistance, 4-week calendar). Charts are plain SVG in `src/components/charts.tsx`.
- `src/state/store.tsx` — React provider: persistence, timers, alerts, theme, back-button handling.
- `src/platform/` — browser APIs: storage, notifications, vibration, file share/download, calendar export, install prompt.
- `src/i18n/` — `en.ts` is the source of truth; `pt.ts` must match it key-for-key (a test enforces this).
- `pwa/sw.template.js` + the `anchor-pwa` plugin in `vite.config.ts` — generates the offline service worker,
  the CSP and `_headers` at build time.

### Known platform limits

- **Reminders:** a web app can't wake a closed phone without a push server. *Settings → Reminders*
  exports a calendar file with a daily check-in and focus reminder instead.
- **Timer alerts** fire only while Anchor is still alive in the background; the timer itself is
  timestamp-based, so it's always correct when you come back.
- **Vibration** works on Android only (iOS Safari has no Vibration API).
- **Storage:** Anchor asks the browser for persistent storage. Keep a backup anyway
  (*Settings → Export backup*), especially before switching phones.
