# Hero OS Status — Wearable JARVIS Track

## Current Phase
Phase 0 — Audit (complete). Awaiting confirmation before Phase 1.

## Completed
- Repo audit — see `PROJECT_AUDIT.md`.
- Installed Meta's official Claude Code plugin (`mwdat-ios@mwdat-ios-marketplace`,
  v0.9.0) — 10 skills covering setup, camera streaming, session lifecycle,
  permissions, display access, MockDeviceKit testing, debugging, and the
  official sample-app patterns. This is now the source of truth for all
  Meta DAT API calls going forward (no guessing/hallucinating APIs).
- Confirmed real Meta DAT setup requirements: Xcode 15.0+ (CameraAccess
  sample wants 26.4+), iOS 16.0+ deployment target (sample wants 17.2+),
  Swift 6.3+, SPM package `https://github.com/facebook/meta-wearables-dat-ios`
  with `MWDATCore` + `MWDATCamera` targets.

## Current Task
None in progress — waiting on user go-ahead to start Phase 1 (new
`ios/HeroOSWearables/` SwiftUI project).

## Blocker
**This session runs in a Linux cloud container — no Xcode, no iOS
Simulator, no device attach.** I can write correct Swift source files
against the real Meta DAT SDK, but every "does it actually build / does
it actually connect to the glasses" verification step has to happen on
the user's own Mac + iPhone + physical Ray-Ban Meta Wayfarers. This
changes the collaboration model versus the morning-brief work: I hand
over files + exact commands, the user runs Xcode locally and reports
back what happened (build errors, connection state, etc.), same shape as
the `npm`/launchd back-and-forth from the morning-brief setup.

No backend is currently deployed anywhere (confirmed in the audit) — if
Phase 4 (Vision AI) or later needs a secure server-side proxy instead of
an on-device API key, that's a real infrastructure decision to make
when we get there, not now.

## Next Task
Phase 1: scaffold the iOS project (SwiftUI app target, SPM dependencies,
`Info.plist` config, `Wearables.configure()` at launch) and hand the user
exact steps to open it in Xcode and confirm it builds.

## Known Bugs
None (no wearable code written yet).

## Manual Setup Required (user, on their own Mac/iPhone)
- Xcode 15+ installed.
- Meta AI companion app installed on the test iPhone.
- Developer Mode enabled in the Meta AI app (Settings → Your glasses →
  Developer Mode).
- Eventually: opening the new Xcode project, building, running on a
  physical device (DAT requires a real iPhone for glasses pairing, not
  just the Simulator), and pairing the Wayfarers.

## Last Verified
2026-08-31 — Phase 0 audit complete, plugin installed and confirmed
working, no code changes to the existing app yet.
