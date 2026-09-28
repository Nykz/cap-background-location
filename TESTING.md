# Testing

## Automated

| Suite | Command | Covers |
|---|---|---|
| Unit / component | `npm run test:ci` | All services (plugin mocked via DI tokens), components, pages, pipes, utils |
| E2E (browser) | `npm run e2e` | Routing, tabs, forms + validation, Preferences persistence, platform mode, browser fallback |
| Lint | `npm run lint` | TS + template + accessibility rules |

The plugin is native-only (it throws `UNIMPLEMENTED` on web), so the browser shows a
"Runs on Android & iOS only" banner and disables native buttons. Plugin behaviour is covered by
the unit tests and the device checklist below.

## Android emulator

```bash
npm run android
# simulate movement (lon lat):
adb emu geo fix 13.4050 52.5200
adb emu geo fix 13.4080 52.5206
```
Or use *Extended controls → Location → Routes* to play a GPX route.

## iOS simulator

```bash
npm run ios
```
Simulator menu: *Features → Location → City Run / Freeway Drive*, or
`xcrun simctl location booted start --speed=15 52.52,13.405 52.53,13.43`.

## Device checklist

1. **Permissions** (Settings tab): step 1 → system dialog; step 2 → Android opens app location
   settings ("Allow all the time"), iOS shows the "Change to Always Allow" prompt.
2. **Foreground**: Start tracking → Live chip, points/distance/duration update, Latest position filled.
3. **Background**: press Home, move for a while. Android shows the persistent "Location Tracking"
   notification; iOS shows the blue location indicator. Return → Queue tab count has grown.
4. **Queue**: *Save queue to history* moves everything into History and the queue drops to 0.
5. **Upload**:
   - Playground: create a session key at https://background-geolocation-playground.capawesome.io,
     tap *Use test Playground URL*, paste the key, *Apply*. Positions appear on its map.
   - Local: `npm run upload-test-server`, URL `http://10.0.2.2:3000/positions` (Android emulator) or
     `http://localhost:3000/positions` (iOS simulator). `STATUS=503` → retries + failure log;
     `STATUS=400` → batch dropped, *Dropped* counter increases.
6. **Resume**: revoke the permission in system settings, return → permission badges and state refresh.
7. **Force-quit**: the session ends (OS restriction); queued positions survive and are uploaded on next start.

## Verified in development (2026-09-21)

- Android 17 emulator (Pixel 10 Pro XL): permission dialog, watch session with live stats (6 fixes, 807 m),
  foreground service `BackgroundGeolocationService` running with `foregroundServiceType=location`,
  app backgrounded → 6 more fixes recorded into the native queue (7 → 14) while the session stayed live,
  "Save queue to history" drained 14 positions (2.47 km) and emptied the queue. The queue also survived
  an external process kill (a WebView auto-update).
- iOS 27 simulator (iPhone 18 Pro): native location prompt with the app's usage text, watch session
  (40 fixes / 580 m on a simulated route), app sent to Home → location kept flowing (status-bar arrow),
  queue reached 114 positions, "Save queue to history" drained it to 0, and a `POSITION_UNAVAILABLE`
  positionError was surfaced as a toast when the simulated location was removed.

## Known platform issue (iOS 27) — handled in `ios/App/App/AppBridgeViewController.swift`

On iOS 27, Capacitor 8.5.2's `native-bridge.js` blocks at startup on a synchronous `window.prompt()`
it uses to read its own config (`CapacitorCookies.isEnabled`, `CapacitorHttp`); the reply never arrives,
so the WebView stays blank. `AppBridgeViewController` injects a document-start script that answers those
two questions with the real values from `capacitor.config` and forwards any other prompt unchanged.
`npx cap sync` does not touch this file. Remove it once Capacitor ships a fix.
