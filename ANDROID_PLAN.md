# Android prototype tracker

This is the shared handoff and working checklist for the Android prototype. Read
[README.md](README.md) and [AGENTS.md](AGENTS.md) for the existing app and
repository conventions.

## Goal and scope

- Build a maintainable, completely free learning app with no monetization.
- Package the existing web-based quiz in an Android WebView, using Capacitor
  as the proposed wrapper. Keep the quiz and CSV content shared with desktop.
- Bundle the app and data for offline use. For the prototype, distribute signed
  APKs directly and send a new APK for each update; automatic updates and a
  server are not part of the initial scope.
- Preserve the existing Electron desktop experience and build commands.
- iOS and store publication are deferred, not prerequisites for Android.

## How to maintain this tracker

- At the start of Android work, read the current status, open issues, and
  checklist. Mark completed items only after their acceptance criteria pass.
- Before ending a session, update the checklist and current status. Add a dated
  handoff entry with changes, verification results, failures, and next steps.
- Record blockers and discovered issues below, including reproduction steps,
  impact, and resolution or next action. Do not label an unverified risk as a
  confirmed defect.
- Record important changes in direction under decisions. Keep unresolved choices
  visible; do not assume future agents can see previous chat sessions.
- Never put signing keys, passwords, private data, or sensitive device details
  in this file or the repository.

## Current status

- **Stage:** Planning; Android implementation has not started.
- **Next step:** Establish and record the desktop baseline, then check Android
  build prerequisites before choosing compatible Capacitor dependencies.
- **Last updated:** 2026-11-11.

## Checklist

### 1. Protect desktop and establish a baseline

- [ ] Record the current desktop build and smoke-test results, including any
      pre-existing failures. Run `npm run build-data`,
      `node --check renderer/app.js`, and exercise one set per section.
- [ ] Keep mobile work isolated on the development branch until reviewed.
      Preserve `npm start` and `npm run dist`; use separate mobile commands.
- [ ] For shared changes, verify the existing desktop behavior as well as
      Android. Review changes before merging to the desktop branch.

### 2. Create the Android build

- [ ] Check Node.js, Android Studio, Android SDK, and compatible Capacitor
      requirements; document the selected versions and setup.
- [ ] Add Capacitor and an Android project without replacing Electron.
- [ ] Create a repeatable mobile asset preparation step: generate quiz data
      from CSVs and include the renderer and all runtime assets. Preserve the
      existing CSV source of truth; do not hand-edit generated data.
- [ ] Resolve the Lucide script reference for the packaged web assets and verify
      that icons load in both Android and desktop builds.
- [ ] Build and launch on an Android emulator or device. Verify a fresh install
      starts and the quiz works with the device offline.

### 3. Validate phone usability and behavior

- [ ] Check layout, touch targets, scrolling, Japanese text, furigana, and
      examples on representative screen sizes and orientations.
- [ ] Decide and test expected Android back-button behavior.
- [ ] Exercise each section, reading and meaning steps, kana-only items,
      favorites, missed-item review, and quiz completion.
- [ ] Verify progress and favorites survive app restart. Test WebView storage
      behavior and keep the app's origin stable across updates; document any
      migration needed if storage location or schema changes.
- [ ] Recheck desktop interaction, keyboard shortcuts, layout, and quiz
      behavior after any shared changes.

### 4. Share a signed APK and deliver updates

- [ ] Choose a stable Android application ID and versioning scheme.
- [ ] Create a dedicated signing key, store and back it up securely outside the
      repository, and document the process without recording secrets.
- [ ] Build a signed APK and document how testers can install it.
- [ ] Build a later APK with the same application ID and signing key and a
      higher version code. Install it over the original without uninstalling;
      verify the update succeeds and retains progress and favorites.
- [ ] Document a repeatable release checklist in [README.md](README.md),
      including data generation, versioning, signing, sharing, and verification.

### 5. Release readiness and ongoing maintenance

- [ ] Run the data validation, JavaScript syntax check, desktop smoke tests,
      and Android install, offline, quiz, restart, and upgrade tests.
- [ ] Record tested versions, devices or emulators, results, and remaining
      limitations in the handoff log.
- [ ] Review the desktop and Android changes before merging. Track future
      improvements and regressions here as they are identified.

## Open issues and risks

- **Unverified packaging concern:** `renderer/index.html` loads Lucide from
  `../node_modules`; a mobile asset directory may not include that path. The
  mobile build must include it correctly without breaking desktop.
- **Unverified storage risk:** Progress and favorites use WebView local storage.
  Update retention depends on maintaining the app identity and storage origin;
  verify on a real update rather than assuming it. Uninstalling normally
  removes app data.
- **Environment:** Android tooling, compatible dependency versions, and device
  availability have not yet been checked.

## Decisions and deferred work

- **Prototype distribution:** Manually shared APK updates, not an automatic
  update service. Testers must install each update.
- **Content:** Keep CSVs as the source of truth and generate the bundled data
  during the build.
- **Signing and application ID:** Selection and secure backup are pending.
- **iOS and app-store distribution:** Deferred; revisit only when requested.

## Handoff log

### 2026-11-11 - Planning

- Created the initial tracker based on the agreed Android WebView prototype.
- Confirmed `APK_Dev` was the current branch and the working tree was clean
  before creating this tracker.
- No Android implementation, build, or device testing has been performed.
- Next: establish the desktop baseline and inspect Android prerequisites.
