# Hero OS Wearable — Phase 1 setup (Meta Ray-Ban glasses connection)

Phase 1 goal: a native iOS app that configures the Meta Wearables Device
Access Toolkit, registers with Meta AI, discovers your Ray-Ban Meta
Wayfarers, connects, and shows a **truthful** connection status. No
camera, no AI, no voice yet — that's later phases.

I cannot run Xcode from this environment, so I can't generate the
`.xcodeproj` file myself. The plan below has Xcode generate it (the only
reliable way), and you drag in the source files I've already written.

All source is staged in `ios/HeroOSWearables-src/` — you'll copy it into
the real Xcode project in step 4.

## 1. Create the Xcode project

1. Open Xcode.
2. **File → New → Project…**
3. Platform: **iOS**. Template: **App**.
4. Fill in:
   - **Product Name:** `HeroOSWearables`
   - **Team:** your Apple ID (Personal Team is fine for device testing)
   - **Organization Identifier:** anything unique, e.g. `com.<yourname>`
   - **Interface:** SwiftUI
   - **Language:** Swift
   - Check **"Include Tests"**
5. Click **Next**. When Xcode asks where to save, navigate to your
   cloned `Hero_OS` repo and select the **`ios/`** folder as the save
   location (not a subfolder — Xcode creates `HeroOSWearables/` and
   `HeroOSWearables.xcodeproj` inside whatever folder you pick).
6. Click **Create**.

You should now have `ios/HeroOSWearables.xcodeproj` plus an
auto-generated `ios/HeroOSWearables/` folder with a default
`HeroOSWearablesApp.swift`, `ContentView.swift`, and `Assets.xcassets`.

## 2. Set the deployment target

1. Select the **HeroOSWearables** project in the navigator → the
   **HeroOSWearables** target → **General** tab.
2. Set **Minimum Deployments → iOS** to **16.0** (the DAT SDK's stated
   minimum).

## 3. Add the Meta Wearables DAT SDK

1. **File → Add Package Dependencies…**
2. Enter: `https://github.com/facebook/meta-wearables-dat-ios`
3. Pick the latest version tag.
4. When prompted which products to add to which target:
   - Add **`MWDATCore`** to the **HeroOSWearables** app target.
   - Add **`MWDATMockDevice`** to the **HeroOSWearablesTests** target
     (test-only — used by the automated test, not shipped in the app).
   - Do **not** add `MWDATCamera` or `MWDATDisplay` — not needed until a
     later phase, and Display doesn't apply to your Wayfarers anyway.

## 4. Replace the auto-generated files with the staged source

In Finder (not Xcode), delete Xcode's auto-generated
`ios/HeroOSWearables/HeroOSWearablesApp.swift` and
`ios/HeroOSWearables/ContentView.swift` — you're replacing them.

Then, in Xcode's project navigator, right-click the **HeroOSWearables**
group → **Add Files to "HeroOSWearables"…** and add, one folder at a
time, everything inside `ios/HeroOSWearables-src/`:

- `App/HeroOSWearablesApp.swift`
- `Wearables/WearableConnectionState.swift`
- `Wearables/MetaWearablesService.swift`
- `Wearables/WearablesManager.swift`
- `UI/ContentView.swift`

For each: check **"Copy items if needed"**, choose **"Create groups"**,
and make sure **Target Membership** (right panel) has only
**HeroOSWearables** checked (not the test target).

Then add the test file separately:
- `Tests/WearablesManagerTests.swift` → Target Membership:
  **HeroOSWearablesTests** only.

(`Configuration/Info-plist-keys.md` is documentation, not code — you can
add it for reference or just keep it open in a text editor while you do
step 5.)

## 5. Configure Info.plist keys

Follow `ios/HeroOSWearables-src/Configuration/Info-plist-keys.md`
exactly — it has the full key list and explains the two values you
choose yourself (a URL scheme string, and confirms `MetaAppID = 0` is
correct for this phase).

Quickest path: target **HeroOSWearables** → **Info** tab → add each row
listed in that file.

## 6. Signing

Target **HeroOSWearables** → **Signing & Capabilities** → confirm your
Apple ID / Personal Team is selected under **Team**, and that
**"Automatically manage signing"** is checked.

## 7. Build

**Product → Build** (⌘B).

## 8. Manual test procedure

### A. Simulator build check (proves it compiles — no glasses needed)

1. Select an iPhone simulator (e.g. "iPhone 16") as the run destination.
2. **Product → Run** (⌘R).
3. **Expected result:** app launches showing "HERO OS / JARVIS WEARABLE",
   a status circle, and "Not Configured" or "Configuring…" as the
   status label — `Wearables.configure()` should succeed even in the
   Simulator (it just can't reach real glasses there).
4. **If it fails:** send me the exact Xcode build error text (red text
   in the Issue Navigator, ⌘5) — do not paraphrase it, paste it
   verbatim.

### B. Automated test (MockDeviceKit, still no glasses)

1. **Product → Test** (⌘U).
2. **Expected result:** `WearablesManagerTests.testMockDeviceAppearsInDevicesStream`
   passes.
3. **If it fails:** paste the exact XCTest failure message. Note: a
   pass here proves device-discovery plumbing works against a simulated
   device — it does **not** prove real registration or real Bluetooth
   pairing works.

### C. Physical device — real glasses (the actual Phase 1 goal)

1. On your **iPhone**: confirm the **Meta AI app** is installed.
2. In the Meta AI app: **Settings → (your Ray-Ban Meta glasses) →
   Developer Mode → ON**. The glasses may restart.
3. Connect your iPhone to your Mac, select it as the Xcode run
   destination (top toolbar device picker).
4. **Product → Run** (⌘R) — this installs and launches Hero OS Wearable
   on your actual iPhone. You may need to trust your developer
   certificate on the phone the first time: **Settings → General → VPN
   & Device Management** on the iPhone.
5. In the running app, tap **"Register with Meta AI"**.
6. **Expected result:** the Meta AI app opens automatically, asking you
   to approve Hero OS Wearable. Approve it.
7. **Expected result:** Meta AI returns you to Hero OS Wearable, and the
   "Registration" dev-info row changes to `registered` within a few
   seconds, and the status circle turns blue ("Ready").
8. Put on your Ray-Ban Meta Wayfarers, powered on, within Bluetooth
   range of the iPhone.
9. Tap **"Connect"**.
10. **Expected result:** status goes yellow ("Connecting…"), then green
    ("Connected") once the glasses are found and the session starts. The
    "Devices" dev-info row should show a real device identifier.
11. Tap **"Disconnect"**.
12. **Expected result:** status goes gray ("Disconnected").

**Tell me exactly what happened at each numbered step** — which step it
stopped working at, what the status label and dev-info panel actually
showed, and any error text on screen. That's what "verified" means here
— not "I think it worked."

### If step 5–10 fails

Check, in this order (from Meta's own debugging guide):
- Is Developer Mode actually on for these specific glasses? (It's
  per-device, and turns off after a glasses firmware update.)
- Is Bluetooth on, on the iPhone?
- Are the glasses powered on and in range?
- Does the "Registration" dev-info row say `available`, `registering`,
  or `unavailable`? Tell me which — it changes what's wrong.

## Known limitation of this whole setup

This session doesn't have Xcode, so nothing above has been compiled by
me — only checked by hand against Meta's official SDK documentation. The
one API I'm least certain of is `Wearables.shared.openDATGlassesAppUpdate()`
in `MetaWearablesService.swift` (only referenced in prose in Meta's docs,
never shown as a code sample with its exact `try`/`await` requirements)
— if Xcode flags that one line, it's an easy one-line fix once the
compiler tells us the real signature; everything else is copied directly
from working code samples in Meta's official skill docs.
