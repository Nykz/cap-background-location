# Background Location — Ionic + Angular + Capacitor

Reliable background geolocation for Android and iOS, built on
[`@capawesome-team/capacitor-background-geolocation`](https://capawesome.io/docs/sdks/capacitor/background-geolocation/).

| Layer | Version |
|---|---|
| Angular (standalone, zoneless, signals, Signal Forms) | 22 |
| Ionic (`@ionic/angular`, standalone entry) | 9 |
| Capacitor | 8 |
| Background Geolocation plugin | 0.2.x |

## Features → plugin API

| Tab | What it does | Plugin APIs |
|---|---|---|
| **Tracker** | Start/stop a watch session, live trip stats, latest position (incl. mock-location flag), live feed, one-shot fix | `startWatching`, `stopWatching`, `isWatching`, `getCurrentPosition`, `positionChange`, `positionError` |
| **Queue** | Native SQLite queue status, preview, drain into on-device history, clear | `getQueueStatus`, `getQueuedPositions`, `deleteQueuedPositions`, `clearQueue` |
| **Upload** | Queue size + HTTP upload config (URL, bearer token, batch, flush, extras), upload now, failure log | `setConfig`, `getConfig`, `resetConfig`, `triggerUpload`, `uploadFailed` |
| **Settings** | Two-step permission flow, precise-location request (iOS), tracking tuning knobs per platform | `checkPermissions`, `requestPermissions`, `openSettings`, `requestTemporaryFullAccuracy` |

Other native features: `@capacitor/preferences` (SharedPreferences / UserDefaults) for settings,
config and drained history; `@capacitor/app` resume listener re-syncs native state; `@capacitor/haptics`.
No backend is required — the plugin's own SQLite queue is the durable store.

## Run

```bash
npm install
npm run android      # build + sync + run on emulator/device
npm run ios          # build + sync + run on simulator/device
```

The npm registry for `@capawesome-team/*` needs your Capawesome Insiders token (`.npmrc`, see plugin docs).

## Quality gates

```bash
npm run lint         # ESLint incl. Angular template accessibility rules
npm run test:ci      # 153 Vitest unit/component specs (every service, component, page, pipe, util)
npm run e2e          # 26 Playwright tests (Pixel 7 + iPhone 15 profiles)
npm run verify       # all of the above + production build
```

See [TESTING.md](TESTING.md) for the on-device checklist (background tracking, upload, permissions).

## Architecture

```
src/app/
  tokens/        native plugins behind InjectionTokens (DI → mockable)
  services/      one folder per concern, signal state: tracking, queue, upload, permissions,
                 watch-settings, track-history, storage, app-lifecycle, toast, alert, haptics, platform
  components/    presentational standalone components (4 files each)
  pages/tabs/    tabs shell + tracker / queue / upload / settings (lazy loaded)
  pipes/ utils/ interfaces/ enums/
src/testing/     shared native plugin mocks for specs
e2e/             Playwright specs
tools/           local upload test server
```

Standards follow `universal-ionic-angular-skills/` (see [CLAUDE.md](CLAUDE.md)).

## Native configuration done

- **Android**: `ACCESS_BACKGROUND_LOCATION` (app manifest), Proguard keep rule, monochrome
  `ic_stat_location` notification icon, debug-only cleartext for `10.0.2.2`/`localhost`.
- **iOS**: `NSLocationWhenInUseUsageDescription`, `NSLocationAlwaysAndWhenInUseUsageDescription`,
  `NSLocationTemporaryUsageDescriptionDictionary` (`tracking` purpose key), `UIBackgroundModes: location`,
  `NSAllowsLocalNetworking`; `AppBridgeViewController` works around an iOS 27 WebView startup hang (see TESTING.md).

> Google Play requires a location permissions declaration for background location before release.
