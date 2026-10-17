# ATT&CK Sensai

A portrait-first app for learning [MITRE ATT&CK®](https://attack.mitre.org) and putting it to practical use. It runs in the browser as an installable PWA and as an Android app (APK), and covers the **Enterprise**, **ICS** and **Mobile** matrices.

- **Live app:** https://powlotech.github.io/attack-sensai/
- **Android APK:** the latest `attack-sensai-<version>.apk` on the [Releases](https://github.com/powlotech/attack-sensai/releases) page

## What it is for

ATT&CK is a large knowledge base of how attackers operate. Reading it on a website is slow on a phone, and the official tools are built for desktop analysts. ATT&CK Sensai is a pocket version with two jobs:

1. **Learn it.** Walk through the attacker goals (tactics) in the order an attack unfolds, read plain-language descriptions of techniques, and look up unfamiliar terms as you go.
2. **Use it.** Score techniques on your own *layers* to track what you have studied, what a threat group does, what you detect, or what happened in a real incident. Export layers to the official [ATT&CK Navigator](https://mitre-attack.github.io/attack-navigator/), or import layers from it.

Typical uses:

- Studying for a security course or certification and tracking which techniques you have covered.
- Mapping a real incident to ATT&CK, step by step, in the order it happened.
- Comparing a threat group's techniques with your own detection coverage to find gaps.
- Quickly looking up a technique, group or tool during an investigation or a meeting.

## Features

### Learn
- **Intro**: a short first-run walkthrough of what ATT&CK is and how the app is laid out.
- **Learn tab**: the tactics in attack order, each with a plain-language goal, leading into its techniques.
- **Glossary**: defined terms in descriptions are tappable and show a short explanation.
- **Quiz**: questions on tactic goals, technique-to-tactic and "which group uses this"; correct answers feed the *Learned it* tick.
- **Daily question**: one question a day, with an optional reminder notification on Android (set the time in Settings). Your streak is kept.
- **Detailed Progress**: percent learned per tactic and what to learn next, linked from the Learn tab.
- **Saved**: bookmark techniques, groups and software, and see what you opened recently.

### Matrix
- **List view**: browse the techniques and sub-techniques of each tactic.
- **Overview**: a compact view of every tactic at once, coloured by your active layer, with a per-tactic summary.
- **Timeline**: the techniques you have given a step number, in order, for walking through an incident.
- **Platform filter**: narrow everything to the platforms you care about (Windows, Linux, macOS, and so on; Android and iOS in Mobile).

### Technique, group and software pages
- Description, tactics, platforms and the groups and software known to use a technique.
- **Mitigations** (with how they apply) and **detection strategies** (with their data components), as collapsible lists.
- **Campaigns** that used the technique, shown as chips.
- A link out to the full entry on attack.mitre.org.
- Score the technique on the active layer right from its page (see below).

### Search
- Search techniques, groups and software by name or ID (for example `T1059` or `APT29`).
- Open a group or tool and save its techniques straight into a new layer.
- A Campaigns tab lists campaigns and the techniques they used.

### Layers
A layer is your own colouring of the matrix. Each technique can have:

- a **score from 0 to 4**, shown as colour and number everywhere in the app;
- a **comment**;
- a **Learned it** tick;
- an optional **step number** and **when** note (for example `03:12 UTC`) to build an incident timeline.

You can create, rename, duplicate, merge and delete layers. A score legend stays pinned to the bottom of the Matrix screen. Each matrix keeps its own layers and its own active layer. The Learning progress layer is created for you.

### Compare layers
Pick a reference layer (for example a threat group) and one of your own. The app lists the reference techniques as **Gaps** (you score 0), **Weak** (score 1) or **Covered** (score 2 or more), and shows a summary such as "N of M techniques are gaps". **Save gaps as layer** turns the gaps into a new layer to work through.

### Reports
From a layer's menu, export a **CSV** report, a **Markdown** incident timeline or a **PDF** timeline (through the print dialog).

### Navigator import and export
- **Export** the active layer as a Navigator layer file and share it from your phone. It opens in the official ATT&CK Navigator.
- **Import** Navigator layers. The matrix (Enterprise, ICS or Mobile) is detected from the file and the app switches to it. Techniques the data does not know are counted and reported rather than silently dropped.
- Step numbers and "when" notes travel inside the file's per-technique metadata.

### Three matrices
Switch between **Enterprise**, **ICS** and **Mobile** on the Layers screen. The choice is remembered. Each matrix has its own data, layers and exports.

### Works offline, stays current
- All three matrices are bundled, so the app works with no connection after the first load.
- When online, it checks for newer ATT&CK data at most once a day, and **What changed** lists the techniques, groups and tools added, changed or deprecated. New data is verified with a SHA-256 checksum before it is used, and a failed check or download never replaces the data you already have. **Check now** in Settings forces a check.
- A scheduled workflow rebuilds the data from MITRE's official STIX releases every week.

### Theme and layout
- System, light or dark theme, set in Settings.
- A hamburger menu opens the main screens: Learn, Matrix, Search, Layers, Saved and Settings.
- Built for portrait use on a phone. The Android app respects the status bar and navigation bar.

## Your data

Layers, scores and notes are stored on your device (IndexedDB), with settings in local storage. Nothing is sent to a server unless you turn on sync. The only other network requests are for the app files and the ATT&CK data update check.

### Sync between devices
In Settings, **Export file** and **Import file** move your layers (including *Learned it* ticks) and bookmarks between devices. Importing merges and never overwrites: higher scores and ticks are kept and comments are joined. Optionally, sync through a private GitHub repo you own using a fine-grained token limited to that repo. Deleted layers are not synced.

## Installing

- **Browser / iPhone / desktop:** open the live app and use *Install* or *Add to Home Screen*.
- **Android:** download `attack-sensai-<version>.apk` from Releases and open it. Each build installs over the previous one. Builds are signed with the project's release key; see `docs/apk-signing.md`.

## Development

```
cd app
npm install
npm run dev        # dev server
npm test           # unit tests (Vitest)
npm run build && npm run e2e   # end-to-end tests (Playwright, against the built app)
```

The ATT&CK data in `app/public/data/` is generated by `tools/build-data` from MITRE's STIX releases:

```
node tools/build-data/src/cli.js --out app/public/data
```

Built with Svelte 5, Vite, vite-plugin-pwa and Capacitor. Pushing a `v*` tag runs the tests, builds and signs the APK, and publishes it as a GitHub release; pushes to `main` deploy the web app to GitHub Pages.

More detail: `docs/superpowers/specs/` (design), `docs/sources.md` (data sources) and `docs/apk-signing.md`.

## Attribution

© The MITRE Corporation. ATT&CK® is a registered trademark of The MITRE Corporation. This app is not affiliated with or endorsed by MITRE.
