# Project rules — Background Location (Ionic 9 + Angular 22 + Capacitor 8)

Follow `universal-ionic-angular-skills/` (skills + docs). Key rules, with project-specific overrides:

- Standalone components, `ChangeDetectionStrategy.OnPush`, `inject()`, signals/computed/effect, `@if/@for/@switch`.
- **Ionic 9**: import everything from `@ionic/angular` (it *is* the standalone entry; `@ionic/angular/standalone` no longer exists).
- `provideIonicAngular()` without `mode` (platform-native styling).
- Native plugins are consumed only through tokens in `src/app/tokens/native-plugins.tokens.ts`.
- Services own state as private writable signals exposed `asReadonly()`; no BehaviorSubject.
- Forms: Angular Signal Forms (`form`, `FormField`, `applyWhen`); `provideSignalFormsConfig` emits `ng-*` classes so Ionic shows `errorText`.
- Every page/component has 4 files (`.ts/.html/.scss/.spec.ts`); every service/pipe/util has a `.spec.ts`.
- Page folders: `pages/tabs/<name>/`; import depth `../../../`.
- Colors/spacing/typography only via tokens in `src/theme/variables.scss`; system font stack (no CDN).
- Positions: the native queue is the source of truth; `positionChange` is live UI only.
  Never mix HTTP upload and manual drain without warning the user.
- Before handoff: `npm run verify`.
- iOS shell uses `AppBridgeViewController` (SceneDelegate + Main.storyboard) — keep it until Capacitor fixes the iOS 27 `prompt()` startup hang.
