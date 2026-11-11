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

- **Stage:** Parts 1 and 2 complete: desktop baseline preserved; Android debug
  APK built and verified offline in an emulator.
- **Next step:** Part 3: phone usability, Android back-button behavior, and
  broader device testing. Release signing and upgrade testing remain in Part 4.
- **Last updated:** 2026-11-11.

## Checklist

### 1. Protect desktop and establish a baseline

- [x] Record the current desktop build and smoke-test results, including any
      pre-existing failures. Run `npm run build-data`,
      `node --check renderer/app.js`, and exercise one set per section.
- [x] Establish branch isolation and desktop command protection: work remains
      on `APK_Dev`; `npm start` and `npm run dist` are unchanged. Add separate
      mobile commands in Part 2 rather than replacing these commands.
- [x] Establish the regression gate: shared changes require desktop and Android
      verification before merging. Record unavailable checks as not run, never
      as passed. Android checks remain pending in Parts 3 and 5.

### 2. Create the Android build

- [x] Check Node.js, Android Studio, Android SDK, and compatible Capacitor
      requirements; document the selected versions and setup.
- [x] Add Capacitor and an Android project without replacing Electron.
- [x] Create a repeatable mobile asset preparation step: generate quiz data
      from CSVs and include the renderer and all runtime assets. Preserve the
      existing CSV source of truth; do not hand-edit generated data.
- [x] Resolve the Lucide script reference for the packaged web assets and verify
      that icons load in both Android and desktop builds.
- [x] Build and launch on an Android emulator or device. Verify a fresh install
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

- **Pre-existing content warnings:** `npm run build-data` succeeds but reports
  vocabulary entries with conflicting duplicate meanings (first definition
  retained), and an unmatched sentence row at `data/sentences/mdiccionary.csv:735`
  (ignored). Reproduce with `npm run build-data`. No blocking build failure;
  content cleanup is deferred and must not be mixed into mobile packaging.
- **Resolved packaging concern:** The mobile staging script copies Lucide into
  its generated web directory and rewrites only the staged HTML reference.
  Icons loaded in both desktop and the offline Android WebView.
- **Unverified storage risk:** Progress and favorites use WebView local storage.
  Update retention depends on maintaining the app identity and storage origin;
  verify on a real update rather than assuming it. Uninstalling normally
  removes app data.
- **Resolved setup issues:** Java SDK downloads initially failed with its
  default certificate store; using Windows system trust resolved this without
  disabling TLS verification. The large Gradle `all` download timed out; the
  checksum-pinned `bin` distribution downloaded successfully. Native builds
  then failed to move a generated cache workspace in the synced project
  directory; using a short dedicated non-synced Gradle cache resolved the
  failure, including with normal worker settings.
- **JDK compatibility:** Android Studio installed JBR 25, which Gradle 8.14.3
  does not support. Builds used the existing JDK 23.0.2; select JDK 21 through 24
  in Android Studio's Gradle settings. Setup instructions are in README.md.
- **Non-blocking tool warnings:** The stock Capacitor build reports `flatDir`
  repository warnings and an SDK XML version warning with the latest SDK tools.
  APK assembly and signing verification still passed. AVD creation also
  reported a missing image `devices.xml`; the generated Pixel 6 configuration
  booted and passed tests. Revisit these if tooling is updated or they become
  blocking; do not suppress errors.
- **Emulator diagnostics:** Raw emulator logs can contain host-specific details.
  Summarize safe test outcomes rather than forwarding or persisting raw logs.
  The requested test-emulator shutdown returned exit code 1 after the tests
  passed; cleanup verified that its test ports were closed.
- **Remaining prototype limitations:** Stock launcher/splash artwork,
  phone-specific visual review, Android back-button policy, physical-device
  tests, and signed release/upgrade testing are still pending.

## Decisions and deferred work

- **Prototype distribution:** Manually shared APK updates, not an automatic
  update service. Testers must install each update.
- **Content:** Keep CSVs as the source of truth and generate the bundled data
  during the build.
- **Desktop protection:** Keep the existing Electron shell and desktop commands
  intact. Share quiz logic and content, but isolate mobile packaging and
  platform-specific behavior. A development branch does not replace regression
  testing before merge. Do not reset desktop progress to run tests.
- **Application ID and origin:** The user approved `com.local.jlptpractice`
  for the prototype. Capacitor explicitly uses `https://localhost` for Android.
  Keep both stable when issuing updates.
- **Signing:** Debug APKs use development signing only. Dedicated release
  signing and secure key backup remain pending.
- **iOS and app-store distribution:** Deferred; revisit only when requested.

## Handoff log

### 2026-11-11 - Part 2: Android wrapper and offline debug APK

- Added Capacitor core, CLI, and Android 8.6.0 as pinned development dependencies
  to avoid adding them to Electron's runtime dependency tree. Generated the
  native Android project; removed unused Google Services plugin scaffolding
  and stock example tests, including a test with an unrelated template app ID.
- Added `build-mobile`, `test:mobile`, `android:sync`, `android:open`,
  `android:build`, and `android:run`. Mobile staging uses only the existing
  renderer, generated data, and Lucide; desktop sources are unchanged.
- Installed tooling with explicit user approval: Android Studio 2026.2.2.8,
  SDK command-line tools build 15859902 (official archive SHA-256 verified),
  API 36, Build-Tools 35.0.0 and 36.0.0, Platform-Tools, emulator 37.2.13,
  and the API 36 default x86_64 AOSP image. Hardware acceleration was already
  available; no Windows virtualization features or reboot were needed.
- Created the project-specific `JLPT_API_36` Pixel 6 emulator under ignored
  `dist/android-avd`, with its Android user state in `dist/android-user`.
  The user also approved a dedicated generated Gradle cache outside the
  synced project. README documents the environment variables without
  machine-specific paths.
- **PASS:** `npm run android:build` with the documented environment settings:
  builds CSV data, stages web assets, syncs Capacitor, and assembles the APK.
  Gradle 8.14.3 / Android Gradle Plugin 8.13.0 / JDK 23.0.2 were used.
- **PASS:** `npm run test:mobile`; checks self-contained asset references,
  stale-file removal, byte-identical shared scripts/styles/data, and unchanged
  desktop sources. `node --check renderer/app.js` also passed.
- **PASS:** Desktop regression through the actual Electron app: ten-item sets
  in all five main sections, favorites and sentence display, with icons loaded.
  The staged mobile assets passed the same quizzes at a 412px emulated width.
  Test profiles were isolated from normal desktop progress.
- **PASS:** Fresh APK installation on Android 16 / API 36, then app launch with
  airplane mode enabled and Wi-Fi/mobile data disabled. Automation attached
  only to this test app's actual Android WebView (`Capacitor.getPlatform()`
  returned `android`, origin `https://localhost`).
- **PASS:** Offline ten-item sets in Vocabulary, Grammar, Kanji, Random, and
  M.Diccionary, plus a Favorites set; all scored 100%. Icons and sentence
  display worked. Fifty studied entries and the favorite survived a full
  Android app process restart while remaining offline. No uncaught renderer
  errors were observed; sampled home layouts did not overflow at 412px.
- **PASS:** APK signature verified with `apksigner`; application ID
  `com.local.jlptpractice`, version code 1, version name 1.0, minimum API 24,
  target API 36. Output: `android/app/build/outputs/apk/debug/app-debug.apk`
  (about 4.6 MB, development signing only).
- **PASS:** Desktop start/dist commands, runtime dependencies, Electron
  configuration, and shared renderer sources stayed unchanged. Temporary
  smoke scripts and test helpers were cleaned up; the reusable test AVD,
  installed SDK, and approved dedicated Gradle cache remain for future work.
- **Not run:** Physical-device and multi-size visual testing, Android back
  navigation validation, release signing, update-over-install testing,
  portable EXE packaging, or iOS. Part 3 and Part 4 checklists remain pending.
- Next: phone usability review and an explicit Android back-button policy.

### 2026-11-11 - Part 1: desktop baseline

- Baseline: commit `283d393`; branch `APK_Dev`, tracking `origin/APK_Dev`.
  Working tree was clean before verification. No application, dependency, CSV,
  or generated-data changes were needed.
- Environment: Windows, Node.js `v24.22.1`, Electron `33.4.11`.
- **PASS:** `npm run build-data`; 2,722 entries from four CSV files:
  Vocabulary 1,735, Grammar 59, Kanji 10, M.Diccionary 918. Of these, 1,796 have
  example sentences. Non-blocking content warnings are recorded above.
- **PASS:** `node --check renderer/app.js`.
- **PASS:** `npm start` launched the actual Electron app using a separate,
  temporary test profile. Automated DOM interaction through a loopback-only
  DevTools connection exercised the real Electron renderer, not a browser copy.
- **PASS:** Ten-item sets in Vocabulary, Grammar, Kanji, Random, and
  M.Diccionary; a one-item Favorites set also completed. Clean sets scored
  100%. The intentionally missed Vocabulary reading scored 7/8 and retained
  its first-attempt penalty after a clean retry (94% combined score).
- **PASS:** Reading and meaning steps, kana-only reading skip, answer disabling,
  unique displayed options, favorite icon and saved list, sentence show/hide,
  number-key answers, Enter/Space advancement, and Escape navigation.
  The sampled Random set excluded M.Diccionary.
- **PASS:** The missed item was retried and its missed flag cleared after the
  clean retry. Fifty distinct studied entries were saved. Progress and favorites
  survived renderer reload and a full Electron process restart.
- **PASS:** No horizontal page overflow at the tested desktop viewport
  (1084 x 741); Node integration was unavailable in the renderer as intended.
  No uncaught renderer exceptions were observed during the automated checks.
- Temporary automation, test profile, and the isolated Electron process were
  cleaned up; normal desktop progress was not used or modified.
- **Not run:** Portable executable packaging (`npm run dist`), exhaustive visual
  inspection, Android builds, or Android device tests. The desktop distribution
  command and configuration were left unchanged.
- Initial smoke automation needed a category-card selector correction; this was
  a test-harness issue, not an application failure.
- Next: Part 2 environment checks. Keep desktop regression checks required
  for later shared-code changes; the baseline is not a permanent guarantee.

### 2026-11-11 - Planning

- Created the initial tracker based on the agreed Android WebView prototype.
- Confirmed `APK_Dev` was the current branch and the working tree was clean
  before creating this tracker.
- No Android implementation, build, or device testing has been performed.
- Next: establish the desktop baseline and inspect Android prerequisites.
