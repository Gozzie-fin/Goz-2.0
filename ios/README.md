# Goz-Transfo — native iPhone app (SwiftUI)

This is the native Swift version of the web app in `../src`. It is a SwiftPM
package, so there is no `.xcodeproj` to maintain.

## Run it in Xcode

1. Install **Xcode 16** (or newer) from the Mac App Store.
2. Open `ios/Package.swift` in Xcode (File › Open…).
3. Choose an iPhone simulator (or your iPhone) in the scheme bar.
4. Press **Run** (⌘R).

To put it on your own iPhone, select the `GozTransfo` target › Signing &
Capabilities, pick your Apple ID as the team, and allow Xcode to manage signing.

## What's included

- **Today:** day counter, phase progress, daily quote, water (+/- 250 ml),
  steps, distance, body weight, workout toggle, calories, mood, notes.
- **Diet:** meal ideas for the current phase (swipe to log), daily calorie and
  macro totals, food log with delete.
- **Grocery:** phase-based suggested shopping list, plus a spending log with
  weekly and all-time totals.
- **Stats:** weight trend against goal, last-7-day water chart, progress.
- **Settings:** start date, body numbers, calorie/macro/water targets.

Data is saved on the device as JSON in Application Support.

## What is not in this version yet

- **No sign-in and no cloud sync.** The web app syncs through Supabase; this
  version keeps everything on the phone.
- **Existing web data is not imported.** The web app's data lives in the
  browser's localStorage (and Supabase), so it has to be migrated separately.
- **Sleep, meds, progress photos, personal records, fasting, custom habits, and
  the custom-food estimator** are not ported yet.
- **No app icon asset** is wired in yet.
- **Not yet run on a device or simulator.** This folder was type-checked with
  `swift build` on macOS only, because full Xcode is not installed on the build
  machine. Expect some small fixes the first time you run it in Xcode.

## Regenerating the data

The meal ideas, grocery list, and quotes are generated from `../src/App.jsx`:

```bash
node ios/tools/gen-data.mjs
```

This rewrites the JSON files in `Sources/GozTransfo/Resources/`. Re-run it
whenever the web data changes.
