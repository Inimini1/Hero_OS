# Required Info.plist / target-configuration keys — Phase 1

Add these in Xcode: select the **HeroOSWearables** target → **Info** tab
→ right-click any row → **Add Row** (this works whether or not your
project has a checked-in `Info.plist` file — modern Xcode SwiftUI
templates usually don't, and manage these through the target's Info
pane instead, which is exactly equivalent).

If you prefer raw XML (e.g. you do have an `Info.plist` file checked
in), this is the equivalent block:

```xml
<!-- URL scheme Meta AI uses to call back into this app after registration -->
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleTypeRole</key>
    <string>Editor</string>
    <key>CFBundleURLName</key>
    <string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>heroos-wearables</string>
    </array>
  </dict>
</array>

<!-- Lets the SDK detect and open the Meta AI app -->
<key>LSApplicationQueriesSchemes</key>
<array>
  <string>fb-viewapp</string>
</array>

<!-- External accessory protocol used to talk to the glasses -->
<key>UISupportedExternalAccessoryProtocols</key>
<array>
  <string>com.meta.ar.wearable</string>
</array>

<!-- Background modes required to keep the Bluetooth link alive -->
<key>UIBackgroundModes</key>
<array>
  <string>bluetooth-peripheral</string>
  <string>external-accessory</string>
</array>
<key>NSBluetoothAlwaysUsageDescription</key>
<string>Hero OS needs Bluetooth to connect to your Ray-Ban Meta glasses.</string>

<!-- DAT configuration -->
<key>MWDAT</key>
<dict>
  <key>AppLinkURLScheme</key>
  <string>heroos-wearables://</string>
  <key>MetaAppID</key>
  <string>0</string>
</dict>
```

## What you must decide / verify yourself

- **`heroos-wearables`** — the URL scheme. Any unique string works for
  Developer Mode; it just needs to match in both `CFBundleURLSchemes`
  and `MWDAT.AppLinkURLScheme` (with `://` appended in the second spot).
  Pick something unlikely to collide with another app you have
  installed.
- **`MetaAppID` = `0`** — correct for Developer Mode / local development
  (confirmed in the official permissions-registration doc: "Developer
  Mode: Registration always allowed, use MetaAppID = 0"). You do **not**
  need a Meta Developer Center account for Phase 1. A real
  `APPLICATION_ID` from https://wearables.developer.meta.com/ is only
  needed later, for production release — not part of this phase.
- **Bundle identifier** — whatever Xcode assigned when you created the
  project (e.g. `com.yourname.HeroOSWearables`). `$(PRODUCT_BUNDLE_IDENTIFIER)`
  in the XML above resolves automatically; no action needed.

## Also required (separate from Info.plist)

- **Developer Mode** must be turned on in the **Meta AI app on your
  iPhone**: Settings → (your glasses) → Developer Mode. This is a
  one-time manual step, done on your phone, not in Xcode.
- **Signing & Capabilities tab**: no special entitlement is documented
  as required for Phase 1 (no push notifications, no App Groups, etc.)
  — just make sure the target has your personal Apple ID selected as
  the signing team so it can install to your iPhone.
