# ATT&CK Learner — Design Spec

- **Date:** 2026-10-17
- **Owner:** Paul (powloj@gmail.com)
- **Status:** Draft, awaiting owner review
- **Screen concepts:** "ATT&CK Learner screen concepts" canvas (claude.ai artifact, 7 artboards). The screens in §6 describe those artboards.

## 1. Purpose

A phone-first app for working with MITRE ATT&CK (Enterprise). It has two jobs:

1. **Teach** a complete newcomer what ATT&CK is and how it is structured.
2. **Practical work:** mark and score techniques in layers, search by platform, threat group or software, and exchange layers with the official MITRE ATT&CK Navigator.

The app must stay current with MITRE's releases, work offline, fit portrait orientation, and be comfortable on a touch screen.

### Success criteria

- A newcomer can explain what tactics and techniques are after the 3-screen intro and the Learn tab.
- Every screen works one-handed in portrait on a 360–412 px wide phone. Tap targets are at least 48 px. Nothing depends on hover.
- A new MITRE ATT&CK release reaches the app within about 7 days, with no manual work by the owner.
- The app is fully usable offline after install, including on first launch.
- A layer exported from the app opens in the official MITRE Navigator. A Navigator layer imported into the app shows the same scores and comments.

### Out of scope (v1)

- The Mobile and ICS matrices (Enterprise only).
- Mitigation and detection coverage checklists.
- Accounts, cloud sync, multi-user features.
- Plain-English rewrites of every technique. Only the 14 tactics and a glossary get beginner text (§6.1).
- Google Play Store publishing. The APK is sideloaded.

## 2. Decisions already made

| Topic | Decision |
|---|---|
| Delivery | One codebase, two outputs: a PWA on GitHub Pages (laptop, plus quick phone testing) and a sideloaded Capacitor APK for Android |
| Frontend | Svelte 5 + Vite, plain JavaScript (JSDoc types allowed, no TypeScript requirement) |
| Data freshness | A weekly GitHub Action builds a compact dataset from MITRE's STIX data and publishes it to GitHub Pages. The APK also bundles a snapshot. |
| Features | A) layers with scores and notes · B) Navigator JSON import/export · C) search and filter by platform, group and software |
| Theme | Follows the system light/dark setting, with a manual override: System / Light / Dark |
| Maintainer | Claude builds and maintains the code. Code clarity beats cleverness. |
| Repository | One **public** GitHub repo under Paul's account, created by Claude Code. Public is required for free GitHub Pages. No secrets in the repo; signing material lives only in Actions secrets. |
| Audience | Personal use only. The app is not shared or distributed. |

## 3. Architecture

```
MITRE attack-stix-data (GitHub)
        │  weekly cron + manual dispatch
        ▼
[GitHub Action: build-data]  tools/build-data → app/public/data/attack.json + version.json
        │  commit to main → triggers deploy
        ▼
[GitHub Action: deploy-pages] → GitHub Pages (PWA + data/attack.json + data/version.json)
        │                                   │
        ▼                                   ▼
Laptop/phone browser (PWA)         Phone (Capacitor APK, bundles attack.json)
                                   checks Pages version.json → downloads newer attack.json
[GitHub Action: build-apk] (manual dispatch / tag) → signed APK as a release asset
```

### Repository layout

```
/app                  Svelte + Vite app (the PWA; also the APK's web content)
  /src
    /lib/data         dataset loading, caching, update check
    /lib/layers       layer model, IndexedDB store, Navigator import/export
    /lib/search       search index + filters
    /lib/theme        theme resolution (system/light/dark)
    /lib/content      hand-written tactic goals + glossary (JSON)
    /routes|screens   Learn, Matrix (List + Overview), Technique, Search, Layers, Intro
  /public/data        attack.json + version.json (bundled snapshot; overwritten by build-data)
/tools/build-data     Node script: STIX bundle → compact attack.json
/android              Capacitor Android project (generated, committed)
/.github/workflows    build-data.yml, deploy-pages.yml, build-apk.yml, test.yml
/docs/superpowers     specs + plans
```

## 4. Data pipeline (`tools/build-data`)

**Source:** MITRE's `mitre-attack/attack-stix-data` GitHub repository, Enterprise collection, STIX 2.1. The script reads the repo's `index.json` to find the latest Enterprise version and its URL. It does not hard-code a version.

> ⚠ **Verify before implementing:** the exact `index.json` structure, the file URLs, and the current release number. Write the parser against a real downloaded copy and keep that copy as a test fixture.

**Input objects used:**

- `x-mitre-tactic`
- `attack-pattern` (techniques and sub-techniques)
- `intrusion-set` (groups)
- `malware` and `tool` (software)
- `relationship`, both `uses` and `subtechnique-of`
- `x-mitre-matrix`, for tactic order

**Filters:** drop objects where `revoked === true` or `x_mitre_deprecated === true`. Drop relationships whose source or target was dropped.

**Output: `attack.json`** (target under 4 MB uncompressed; check this in a test):

```json
{
  "attackVersion": "<from source>",
  "builtAt": "<ISO timestamp>",
  "tactics": [{ "id": "TA0002", "shortname": "execution", "name": "Execution", "description": "..." }],
  "techniques": [{
    "id": "T1059.001", "name": "PowerShell", "parent": "T1059", "isSub": true,
    "tactics": ["execution"], "platforms": ["Windows"],
    "description": "...markdown...", "url": "https://attack.mitre.org/techniques/T1059/001/"
  }],
  "groups":   [{ "id": "G0016", "name": "APT29", "aliases": ["..."], "description": "...", "techniques": ["T1059.001"] }],
  "software": [{ "id": "S0154", "name": "Cobalt Strike", "type": "malware|tool", "platforms": [], "description": "...", "techniques": [] }]
}
```

- Tactic order comes from `x-mitre-matrix.tactic_refs`.
- Descriptions keep MITRE's markdown. Citation markers like `(Citation: X)` are stripped.
- **`version.json`:** `{ "attackVersion", "builtAt", "sha256", "bytes" }`.
- **Commits:** the job commits only when `sha256` changes, so the weekly run produces no empty commits.
- **Failure:** if the download fails, parsing fails, or a sanity check fails (for example fewer than 100 techniques, or 0 tactics), the job fails and commits nothing. The live data stays as it was.

## 5. App data layer

### Load order at startup

1. Read the cached dataset from IndexedDB, if one exists. Otherwise load the bundled `/data/attack.json`.
2. Render immediately.
3. In the background, at most once every 24 hours and only when online, fetch the remote `version.json`.
   - **Remote URL:** for the PWA, a same-origin URL. For the APK, the absolute GitHub Pages URL, set in build config.
   - **If the remote is newer** (by `builtAt`): fetch `attack.json` and check its sha256. Only after validation passes, replace the cache atomically.
   - **Show** "ATT&CK data vX · checked <date>" in Layers, with a "Check now" button.

### Errors

- Network failure, a hash mismatch or a JSON parse error: keep the current data and show a quiet note in the data-status row. Never a blocking dialog.

### Layers

- **Storage:** IndexedDB, object store `layers`:

  ```
  { id, name, createdAt, updatedAt,
    entries: { [techniqueId]: { score: 0-4, comment, learned: bool } } }
  ```

- **Active layer:** one active layer id, kept in `localStorage` with a try/catch fallback.
- **Default layer:** "Learning progress", created on first launch.
- **Score legend:** 0 = not looked at/none, 1–4 = increasing. The colours come from the theme (§7).

### Navigator compatibility

- **Export:**
  - Navigator layer JSON, current layer format (`versions.layer` 4.5 at the time of writing; ⚠ verify against the Navigator repo's layer-format doc).
  - `domain: "enterprise-attack"` and `versions.attack` set to the dataset version.
  - Each entry becomes `{ techniqueID, score, comment, enabled: true, metadata: [{ name: "learned", value: "true" }] when learned }`.
  - Include `gradient` and `legendItems` matching the app's 0–4 scale.
- **Delivery:** through the Web Share API when available (the Android share sheet in the APK), otherwise a file download.
- **Import:** accept Navigator layer JSON.
  - Map `techniqueID` → score, comment and the learned metadata.
  - Ignore unknown fields.
  - If the same technique appears under several tactics, take the highest score and join the comments.
  - Count technique IDs that aren't in the current dataset, and report them to the user as "N techniques not found (renamed or removed)".
  - Reject files that fail validation, with a plain-English message naming the bad field.

### Search

- An in-memory index built after load, covering:
  - technique name and ID (with or without the "T" prefix and the dot)
  - group name and aliases
  - software name
- Filters: platform chips (Windows, Linux, macOS, Cloud/IaaS/SaaS/Office Suite/Identity Provider grouped as "Cloud", Network, Containers), plus a Techniques / Groups / Software segmented control.
- Use a small fuzzy-match library (for example MiniSearch) or a hand-rolled prefix and substring match. Pick whichever keeps the bundle small.

## 6. Screens

The app has a bottom tab bar (Learn · Matrix · Search · Layers) and a full-screen Technique detail page pushed on top. Android back and swipe-back close the detail page.

### 6.1 Intro (first launch, 3 steps, skippable)

1. What ATT&CK is: a map of real attacker behaviour.
2. Tactics (goals) vs techniques (methods), with a worked example (Persistence → T1053).
3. Layers: colour the matrix with your own progress or a threat group's techniques.

The intro can be replayed from the Learn tab.

### 6.2 Learn

- A progress card showing the number of techniques marked learned in the active layer.
- The 14 tactics as cards in matrix order. Each card shows its number, name, ID and a **hand-written plain-English goal** from `content/tactics.json`, keyed by tactic shortname.
- **Fallback:** if MITRE adds a tactic with no hand-written goal, show the first sentence of MITRE's description.
- Tapping a tactic opens the Matrix with that tactic expanded.

### 6.3 Matrix: List view (default)

- **Header:** the active-layer pill, which opens a layer picker.
- **View switch:** List / Overview.
- **Tactic chips:** a horizontally scrolling row of all tactics. Tapping one jumps to it.
- **Tactic sections:** collapsible, one open at a time by default. Each technique row has:
  - a score square (0–4, with the number printed in it)
  - the name and ID
  - a sub-technique control
- **Sub-techniques:** indented under their parent when expanded.
- **Legend:** a score legend strip sits above the tab bar.
- **Platform filter:** a platform filter set on the Search tab also applies here, shown as a dismissible chip.

### 6.4 Matrix: Overview view

- **Grid:** 14 equal columns, one per tactic, labelled with 2-letter abbreviations. Each column is a 2-wide grid of small squares, one square per top-level technique, coloured by score.
- **Columns:** each column is a button. Tapping it selects the column and updates a summary card ("<Tactic> · N of M techniques scored"), which has an "Open in list" link.
- **Purpose:** gap-spotting at a glance. Squares aren't individually tappable, because they're too small to tap reliably.

### 6.5 Technique detail

- **Header:** name, ID, "sub-technique of <parent>" (linked), and platform chips.
- **Active layer card**, placed near the top within thumb reach:
  - 5 score buttons (0–4)
  - a "Learned it" toggle
  - a notes textarea that autosaves after 500 ms of no typing
- **"What it is":** MITRE's description, rendered from markdown with a sanitiser and no raw HTML. Glossary terms are underlined. Tapping one opens an inline definition card.
- **"Used by":** groups and software chips, showing the first 6 plus a "+N more" control. Tapping a chip opens it in Search.
- **External link:** "Open on attack.mitre.org".

### 6.6 Search

- Search field, the Techniques / Groups / Software control, and platform chips.
- **Group or software result:** name, ID, aliases, description, and two buttons:
  - "Highlight in matrix": a temporary overlay, not saved.
  - "Save as layer": creates a layer that scores each technique the group or software uses as 1, named after it.
- **Technique results:** name, tactics and ID. Tapping one opens its detail page.

### 6.7 Layers

- The list of layers as radio-select cards. The ⋯ menu has Rename, Duplicate, Delete (with confirmation) and Export.
- A "New" button.
- "Import Navigator file (.json)".
- "Share / export active layer".
- The data-status row (§5).
- The theme setting: System / Light / Dark.

### 6.8 Content files (hand-written, in repo)

- `content/tactics.json`: a one-line goal for each of the 14 Enterprise tactic shortnames.
- `content/glossary.json`: about 50 terms (term, aliases, a definition of 2 sentences or fewer). Terms are matched case-insensitively on word boundaries, at most once per term per description.

## 7. Visual design and theme

- **Type:** IBM Plex Sans for UI text, IBM Plex Mono for IDs. Both are self-hosted (bundled woff2) so they work offline. No Google Fonts at runtime.
- **Light theme:**
  - background #F4F5F2, surface #FFFFFF, border #DADDD6, text #16181D, muted text #4A4F57
  - accent #0F6E74, accent tint #E3F0F0
- **Dark theme:**
  - background #111316, surface #1B1E22, border #30353B, text #ECEEF0, muted text #A3A8B0
  - accent #4FB3B8
- **Score colours (0–4):**
  - light: #FFFFFF (outlined), #FCE7C8, #F6B76B, #E07A2E, #9A3F0E
  - dark: #2A2E33 (outlined), #4A3520, #8A5320, #D9772E, #FFB070
  - The scale gets brighter with higher scores in dark mode. The steps differ in lightness so they're distinguishable without hue.
- **Theme resolution:**
  - CSS custom properties on `:root`, with `prefers-color-scheme` for System mode.
  - A manual override sets `data-theme` on `<html>`.
  - In the APK, `@capacitor/status-bar` sets the status-bar style and colour to match the resolved theme. It updates when the system theme changes.
- **Accessibility:**
  - Text contrast of at least 4.5:1.
  - Real buttons and links, with `aria-pressed` on toggles and `aria-label` on icon-only buttons.
  - Visible focus rings.
  - Respects `prefers-reduced-motion`.

## 8. PWA and APK

### PWA (`vite-plugin-pwa`)

- **Manifest:** `display: standalone`, `orientation: portrait`, theme and background colours, maskable icons.
- **Service worker:**
  - Precaches the app shell, fonts and the bundled dataset.
  - Fetches `data/version.json` network-first.
  - Leaves `attack.json` updates to the app's own update logic (§5), not the service worker's cache.
- **Hosting:** GitHub Pages under the repo's path. Vite's `base` is set to match.

### APK (Capacitor)

- **Settings:** `appId` such as `io.github.<user>.attacklearner`, locked to portrait, `webDir` pointing to the Vite build output.
- **Signing:** with a keystore Paul creates once. The keystore and its passwords are stored as GitHub Actions secrets and never committed.
- **`build-apk.yml`:**
  - Runs on manual dispatch or a `v*` tag.
  - Builds the web app, runs `cap sync android`, then runs Gradle `assembleRelease`.
  - Uploads the signed APK as a workflow artifact and a GitHub Release asset.
- **Version numbers:** `versionCode` comes from the run number. `versionName` comes from the tag.
- **Sideloading:** Paul installs by downloading the release APK on the phone and allowing installs from that source.

## 9. Error handling summary

| Situation | Behaviour |
|---|---|
| Offline at launch | Cached or bundled data; status row shows the data date |
| Update download fails or hash mismatch | Keep current data; quiet status note |
| MITRE changes STIX layout | build-data job fails, nothing published, owner gets GitHub's failure email |
| Bad layer import | Reject with field-specific message; existing layers untouched |
| Imported IDs not in dataset | Import the rest; report count of unknown IDs |
| IndexedDB unavailable (private mode) | Session-only layers with a visible "won't be saved" banner |
| New tactic without hand-written goal | Fall back to MITRE's first sentence |

## 10. Testing

- **Unit tests (Vitest):**
  - **build-data:** run against a trimmed real STIX fixture. Checks revoked/deprecated filtering, sub-technique parenting, tactic order, group/software → technique links, citation stripping, and the size budget.
  - **Layers:** CRUD, export → import round trip (lossless for score, comment and learned), merging duplicate technique IDs, rejecting malformed files.
  - **Navigator compatibility:** a test fixture of a real layer exported from the official Navigator imports correctly.
  - **Search:** ID normalisation (`t1059.001`, `1059.001`, `T1059/001`), alias matching, platform filtering.
  - **Theme:** resolution logic.
- **End-to-end (Playwright, viewport 390×844, portrait):**
  - The intro flow.
  - Scoring a technique and seeing it in List and Overview.
  - Search → highlight a group → save it as a layer.
  - Export and re-import a layer.
  - Offline reload (via service worker).
  - Toggling dark mode.
- **CI:** `test.yml` runs the unit and end-to-end tests on every push and PR. Deploy and APK jobs require tests to pass.
- **Manual check before each APK release:** install on Paul's phone. Check portrait layout, the back gesture, the share sheet export and the status bar colour in both themes.

## 11. Licensing and attribution

- Show "© The MITRE Corporation. ATT&CK® is a registered trademark of The MITRE Corporation", with a link to MITRE's terms of use, in an About section and in the README.
  - The app is for personal use and won't be distributed. The repo is public, but it serves only the app and MITRE's own public data.
- The app is not affiliated with or endorsed by MITRE. Don't use MITRE logos.

## 12. Open items for the implementation plan

1. Verify the attack-stix-data `index.json` format, URLs and current Enterprise version (§4).
2. Verify the current Navigator layer format version and required fields (§5).
3. Write `tactics.json` (14 goals) and `glossary.json` (about 50 terms). The owner reviews the wording.
4. Claude Code (on Paul's laptop, using Paul's `gh` login) creates the public repo, enables Pages (source: GitHub Actions), and walks Paul through creating the Android signing keystore and adding its secrets. The plan should include exact commands. Paul keeps an offline backup of the keystore file and passwords.
