# Production readiness — status (updated 2026-10-24)

The audit of 2026-10-23 listed what the Capacitor/Android app needed before release. On 2026-10-24 the
app was converted to an **installable web app (PWA)**, so the native-only items no longer apply. Every
item is listed below with what happened to it.

✅ done · ➖ no longer applies (native shell removed) · ⚠️ partly done, or needs you

## Security

| # | Status | Item |
|---|---|---|
| S1 | ⚠️ | Keystore password leak: the password is removed from the files **and** from all of git history (rewritten 2026-10-24; a backup bundle was kept outside the repo). The key itself (`android/keystore/`, git-ignored) still sits on disk: delete it, or rotate its password with `keytool` if that APK will ever ship again. |
| S2 | ✅ | Git history scrubbed. |
| S3 | ➖ | Capacitor CLI `tar` advisories: Capacitor is removed. `npm audit` reports 0 vulnerabilities. |
| S4–S6 | ➖ | Play App Signing, FileProvider, iOS privacy manifest: native-only. |
| S7 | ✅ | `@capacitor/assets`, `sharp 0.32` and `uuid` are gone. Icons are built by `resources/make-icons.mjs` with `sharp 0.35.5`. |
| — | ✅ | Strict CSP (`script-src 'self'`, no inline scripts or styles, `object-src`/`base-uri`/`form-action` locked down), plus `_headers` with HSTS, `frame-ancestors 'none'`, `nosniff`, `Referrer-Policy` and `Permissions-Policy`. |
| — | ✅ | Backups and stored state are validated and size-capped; text inputs are stripped of control and bidi characters; reward prices come from the catalog. |

## Bugs

| # | Status | Fix |
|---|---|---|
| B1 | ✅ | The fonts were HTML 404 pages. They're replaced by the real Caprasimo and Figtree files (`@fontsource`, latin subset, precached). |
| B2 | ✅ | When the Tornado timer runs out, the block is completed and XP is awarded, exactly once. |
| B3 | ✅ | Export uses the share sheet on phones and a download elsewhere. Import uses a file picker. Both are validated, and the last backup date is tracked with a 30-day reminder. |
| B4 | ✅ | The browser/Android back button closes the open flow instead of leaving the app, and asks first while a timer is running. |
| B5 | ✅ | In-progress flows are saved and restored. Timers are timestamp-based, so a reload or OS kill doesn't lose them. |
| B6 | ✅ | The "keep going" stopwatch counts from a start timestamp, so it is correct after the screen has been off. |
| B7/B8 | ✅ | Notification permission is requested in context (when a timer starts, or from Settings). Alerts go through the service worker and touch only Anchor's own tags. |
| B9 | ✅ | The launchpad list edits a copy of the defaults (Add no longer wipes them, Remove works). At least one item is kept. |
| B10 | ✅ | Dialog labels, onboarding and sport copy follow the real schedule, work hours and language. |
| B11 | ✅ | Tornado is free to skip only on low-energy days; otherwise it takes a Skip Pass, so the pass is worth buying. |
| B12 | ✅ | Resistance, energy-after and "worked" are recorded per day and feed the insights engine, which really does move the focus block earlier. |
| B13 | ✅ | Days the app wasn't opened are recorded as missed. Momentum is counted once per day (the focus block can only be finished once). |
| B14 | ✅ | Saves are throttled (at most every 1.5 s) and flushed when the page is hidden. |
| B15 | ✅ | An error boundary shows a recovery screen (reload / download data / reset). State is hydrated synchronously, so there is no blank first frame. |
| B16 | ✅ | "After work too" check-ins re-plan the rest of the day from the energy logged after work. Both sports are free text with suggestions. |
| B17 | ✅ | Custom rewards can be edited and deleted; ids are random UUIDs. |
| B18 | ✅ | `sportPreference` is merged into `sportSchedule` by the schema v1 → v2 migration. |
| B19 | ➖ | Native-only. Orientation is locked in the web manifest; the version is 1.0.0 everywhere. |

## Features & engineering

| # | Status | Item |
|---|---|---|
| F1/F2 | ➖ / ⚠️ | No store submission is needed. You do need **HTTPS hosting**: a GitHub Pages workflow is ready, and Netlify or Cloudflare Pages also work (see README). There's no hosted privacy policy, but the in-app Privacy section states that no data leaves the device. |
| F3 | ✅ | CI (typecheck, lint, test, build, audit) and a Pages deploy workflow in `.github/workflows/`. ⚠️ There's no git remote yet: create the GitHub repo and push. |
| F4 | ✅ | Persistent-storage request, backup reminders, share-sheet export. |
| F5 | ✅ | `schemaVersion` 2 with a migration path in `sanitize.ts`. |
| F6 | ⚠️ | Daily reminders are a calendar (.ics) export, because a web app can't schedule notifications without a push server. |
| F7 | ✅ | Labelled dialogs with focus management, Escape and inert background; labelled controls and radio groups; live regions; pinch-zoom allowed; reduced-motion support. |
| F8 | ✅ | ESLint (typescript-eslint + react-hooks). 43 Vitest tests, including component tests with Testing Library. Prettier was not added, to avoid reformatting the whole codebase. |
| F9 | ⚠️ | On-device error log with "copy error report" in Settings. There's no remote crash reporting, by design (no servers). |
| F10 | ✅ | Portrait orientation in the manifest; visibility-based resync of timers and rollover. |
| F11 | ✅ | Insights engine, a 4-week history grid and a stats panel (current/best streak, full days, focus sessions, average resistance). |
| F12 | ✅ | English and Português (Brasil). The language follows the device, with an override in Settings. |
| F13 | ✅ | Dark theme (auto/light/dark). The browser theme color follows it. |
