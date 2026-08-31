# Hero OS Status — Wearable JARVIS Track

## Current Phase
Phase 1 — iOS foundation + Meta connection (code written, **NOT YET
BUILT OR VERIFIED**). Stopped per the strict hardware-first workflow —
waiting on your report from the manual test procedure before Phase 2.

## Completed
- Phase 0 audit (`PROJECT_AUDIT.md`).
- Installed Meta's official Claude Code plugin (`mwdat-ios@mwdat-ios-marketplace`,
  v0.9.0) and read all 10 of its skill docs plus the `.cursor/rules`
  variants (more complete versions of the same content) before writing
  any code — setup, permissions/registration, session lifecycle,
  camera streaming, MockDevice testing, debugging, display access,
  dat-conventions, sample-app-guide.
- Wrote Phase 1 source, staged at `ios/HeroOSWearables-src/` (not yet a
  real Xcode project — see "Not Verified" below for why):
  - `App/HeroOSWearablesApp.swift` — SDK init (`Wearables.configure()`)
    + Meta AI callback URL handling.
  - `Wearables/WearableConnectionState.swift` — the one top-level status
    enum (Not Configured / Ready / Connecting / Connected / Disconnected
    / Error) the UI shows.
  - `Wearables/MetaWearablesService.swift` — the only file that imports
    `MWDATCore` directly (registration, device discovery, device
    session create/start/stop, camera-permission status check for
    display purposes only — no camera capability added yet).
  - `Wearables/WearablesManager.swift` — `ObservableObject` that maps
    real SDK state streams (`registrationStateStream()`,
    `devicesStream()`, `session.stateStream()`, `session.errorStream()`)
    onto `WearableConnectionState`. No state is set just because a
    button was tapped — every transition is commented with which SDK
    signal drives it.
  - `UI/ContentView.swift` — status card, Connect/Disconnect buttons, a
    dev-info panel (SDK/registration/permission/device state).
  - `Tests/WearablesManagerTests.swift` — **AUTOMATED TEST**, uses
    MockDeviceKit to prove device-discovery plumbing works in the
    Simulator. Explicitly documented as NOT proving real registration
    or real Bluetooth connectivity.
  - `Configuration/Info-plist-keys.md` — exact required Info.plist
    keys, with the two values you choose (URL scheme) or confirm
    (`MetaAppID = 0` for Developer Mode) called out.
- `ios/README.md` — full step-by-step: create the Xcode project, add
  the SPM package, drag in the staged files, configure Info.plist,
  build, and the numbered manual test checklist (Simulator build →
  automated test → real glasses).
- Self-review against the 12-point build-discipline checklist caught
  and fixed one real bug before it ever reached you: a registration-
  stream event could have overwritten an active "Connected" status.
  Fixed in `WearablesManager.swift` — session state now owns
  `connectionState` once a session has ever started.

## Not Verified (requires Xcode/iPhone/glasses — cannot be done from here)
- **The code has never been compiled.** This session has no Swift
  toolchain at all (confirmed: `swift`/`swiftc`/`xcodebuild` all
  "command not found"), so nothing here has been proven syntactically
  valid, only hand-checked against Meta's official code samples.
- Whether the project builds in Xcode.
- Whether it launches in the Simulator.
- Whether `WearablesManagerTests` passes.
- Whether Meta AI registration actually completes on a real iPhone.
- Whether your Ray-Ban Meta Wayfarers are discovered and connect.
- **One specific API call is uncertain**: `Wearables.shared.openDATGlassesAppUpdate()`
  in `MetaWearablesService.swift` — Meta's docs only mention it in
  prose (as the recommended action for a `.datAppOnTheGlassesUpdateRequired`
  session error), never show its exact `try`/`await` signature in a code
  sample. If Xcode's compiler flags this line, that's expected — the
  compiler error will show the real signature and it's a one-line fix.
  Every other API call was copied directly from a working code sample
  in Meta's official skill docs, not guessed.
- I did **not** have the live `mcp.developer.meta.com` docs-search tool
  mentioned in Meta's own conventions doc available in this session —
  verification was against the cloned skill markdown only (which is
  itself pulled directly from the official `facebook/meta-wearables-dat-ios`
  repo, not a third-party tutorial).

## Manual Steps (you, in Xcode, on your Mac + iPhone)
Full detail in `ios/README.md`. Summary:
1. Xcode → New Project → iOS App, SwiftUI, name `HeroOSWearables`, save
   into this repo's `ios/` folder.
2. Set deployment target to iOS 16.0.
3. Add SPM package `https://github.com/facebook/meta-wearables-dat-ios`
   — `MWDATCore` to the app target, `MWDATMockDevice` to the test
   target only.
4. Delete Xcode's auto-generated `HeroOSWearablesApp.swift` /
   `ContentView.swift`; drag in every file from
   `ios/HeroOSWearables-src/` (App/Wearables/UI into the app target,
   Tests/ into the test target).
5. Add the Info.plist keys from `Configuration/Info-plist-keys.md`.
6. Confirm your Apple ID is set as the signing team.
7. Build (⌘B) → run in Simulator (⌘R) → run tests (⌘U) → then, on your
   real iPhone with the Meta AI app + Developer Mode on + your Wayfarers
   nearby: Register → Connect → Disconnect, per the numbered checklist
   in `ios/README.md` section 8C.

## Expected Result
- Simulator: app launches, shows "HERO OS / JARVIS WEARABLE" and a
  status circle — likely "Configuring…" then some ready/error state
  (no real glasses reachable from the Simulator, so don't expect
  "Connected" there).
- Tests: `testMockDeviceAppearsInDevicesStream` passes.
- Real device: tapping "Register with Meta AI" opens the Meta AI app;
  approving there returns you to Hero OS Wearable with the Registration
  row showing `registered`; tapping "Connect" with the glasses on and
  in range turns the status green ("Connected") with a real device
  identifier in the Devices row.

## If It Fails
Send me, verbatim (don't paraphrase):
- Any Xcode build error text (red entries in the Issue Navigator, ⌘5).
- Any XCTest failure message.
- On a real-device run: which numbered step in `ios/README.md` §8C it
  stopped at, exactly what the status label and dev-info panel showed,
  and any on-screen error text.

## Known Bugs
None known in the written code (one logic bug was found and fixed
during self-review before you ever saw it — see Completed). Nothing
has been run, so "no known bugs" only means "none found by reading the
code," not "verified bug-free."

## Last Verified
2026-08-31 — Phase 1 code written and self-reviewed against Meta's
official docs; zero of it has been compiled or run. Waiting on your
Xcode/device report per the stop condition.
