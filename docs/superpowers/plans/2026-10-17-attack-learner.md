# ATT&CK Learner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a portrait, touch-first app for learning MITRE ATT&CK (Enterprise) and building Navigator-compatible layers. It ships as a PWA on GitHub Pages and as a sideloaded Android APK, and it updates itself weekly from MITRE's STIX data.

**Architecture:**

- A Node script (`tools/build-data`) turns MITRE's Enterprise STIX bundle into a compact `attack.json`. A weekly GitHub Action runs it and commits the result into the app's `public/data/`.
- A Svelte 5 + Vite app loads data from its cache or the bundled copy, then checks GitHub Pages for newer data.
- Layers live in IndexedDB. Capacitor wraps the same build as an APK.

**Tech Stack:**

- Node 22, Svelte 5, Vite, plain JS with JSDoc
- Vitest, jsdom, fake-indexeddb, Playwright
- `idb`, `marked`, `dompurify`, `vite-plugin-pwa`
- Capacitor 7 (`@capacitor/android`, `@capacitor/status-bar`, `@capacitor/share`, `@capacitor/filesystem`)
- GitHub Actions, GitHub Pages

**Spec:** `docs/superpowers/specs/2026-10-17-attack-learner-design.md`. Read it before starting. Section numbers below (§n) refer to it.

**Screen concepts:** `docs/design/screens/*.png` (rendered mockups) and `docs/design/source/*.dc.html` (their source). Match layout, hierarchy and copy. The mockups were rendered with fallback fonts, so take the font itself from the spec: IBM Plex.

## Global Constraints

- **Matrix:** Enterprise only. Domain string `"enterprise-attack"`.
- **Layout:**
  - Portrait-first. It must work at 360–412 px wide.
  - Tap targets at least 48 px (the mockup's 44 px minimum is raised to 48 px in code).
  - Nothing depends on hover.
- **Plain JavaScript only.** No TypeScript compile step; JSDoc types are welcome.
- **No runtime network requests** except `version.json` and `attack.json` from the data base URL, and the attack.mitre.org links the user taps.
  - Fonts are self-hosted woff2 (IBM Plex Sans 400/500/600/700, IBM Plex Mono 500).
- **Score scale:** integers 0–4. 0 means "not looked at/none".
- **Score colours:**
  - light: `#FFFFFF`(outlined `#C5C9C2`) `#FCE7C8` `#F6B76B` `#E07A2E` `#9A3F0E`
  - dark: `#2A2E33`(outlined `#3A3F46`) `#4A3520` `#8A5320` `#D9772E` `#FFB070`
- **Theme tokens:**
  - light: bg `#F4F5F2`, surface `#FFFFFF`, border `#DADDD6`, text `#16181D`, muted `#4A4F57`, accent `#0F6E74`, accent-tint `#E3F0F0`
  - dark: bg `#111316`, surface `#1B1E22`, border `#30353B`, text `#ECEEF0`, muted `#A3A8B0`, accent `#4FB3B8`, accent-tint `#1F3536`
- **Text contrast:** at least 4.5:1.
- **Data size:** `attack.json` at most 4 MB uncompressed.
- **Update cadence:** the app checks for a data update at most once per 24 h, and only when online. Manual "Check now" bypasses the limit.
- **Repo:** public. Never commit keystores, passwords or `*.jks`/`*.keystore`. Personal layer exports (`*.layer.json`, `exports/`) are gitignored.
- **Attribution text, verbatim:** "© The MITRE Corporation. ATT&CK® is a registered trademark of The MITRE Corporation. This app is not affiliated with or endorsed by MITRE."
- **Routing:** hash-based routing, because the app runs under a GitHub Pages sub-path and inside Capacitor.
  - Routes: `#/intro`, `#/learn`, `#/matrix?tactic=<shortname>&view=list|overview`, `#/technique/<ID>`, `#/search?q=&kind=&platforms=`, `#/layers`.

## Review Focus

1. **A user's layer has entries for techniques MITRE later revoked or renamed.**
   - Expected: entries are kept, never silently deleted. They're hidden from the matrix, and Layers shows "N entries refer to retired techniques".
   - Tests: Task 6 and Task 7.
2. **Importing a Navigator file from another domain (mobile/ics), or a non-layer JSON file.**
   - Expected: clear rejection naming the problem. No partial layer is created.
   - Test: Task 7.
3. **Odd search input: empty, whitespace, regex characters such as `C++`, `(`, `*`, or a very long string.**
   - Expected: no crash. Empty input shows no results rather than everything.
   - Test: Task 8.
4. **Storage fails while caching a new dataset (quota exceeded or IndexedDB unavailable).**
   - Expected: the current dataset keeps working, and the status row shows the error.
   - Test: Task 5.
5. **The user types a note and leaves the page within the 500 ms autosave window.**
   - Expected: the note is saved.
   - Tests: Task 6 (the `debounce().flush`) and Task 12 (flush when the page is destroyed).

---

### Task 1: Repo bootstrap, toolchain, CI

**Files:**
- Create: `.gitignore`, `README.md`, `package.json` (npm workspaces: `app`, `tools/build-data`), `app/` (Vite Svelte template), `app/vitest.config.js`, `.github/workflows/test.yml`, `.nvmrc` (`22`)

**Interfaces:**
- Produces:
  - root scripts `npm test` (all workspaces' unit tests) and `npm run e2e` (Playwright in `app`)
  - app scripts `dev`, `build`, `preview`, `test`

- [ ] **Step 1: Create the GitHub repo.** Run `gh auth status` and expect it to be logged in as Paul.

  ```bash
  gh repo create attack-learner --public --source . --remote origin --description "Personal ATT&CK learning app"
  ```

  Expected: the repo URL is printed. (This folder already contains `docs/`, which has the spec, plan and design images. Keep it.)
- [ ] **Step 2: Scaffold the app.** Run `npm create vite@latest app -- --template svelte`, then in `app/` install:

  ```bash
  npm i idb marked dompurify
  npm i -D vitest jsdom fake-indexeddb @playwright/test vite-plugin-pwa
  ```

  Delete the template's demo component.
- [ ] **Step 3: Write `.gitignore`.** Include `node_modules/ dist/ *.jks *.keystore keystore.properties exports/ *.layer.json android/app/build/ .env*`.
- [ ] **Step 4: Write `.github/workflows/test.yml`.** On push and pull_request: checkout, setup-node from `.nvmrc`, `npm ci`, `npm test`, `npx playwright install --with-deps chromium`, `npm run build -w app`, `npm run e2e`.
- [ ] **Step 5: Add a smoke test** `app/src/lib/smoke.test.js` that asserts `1 + 1 === 2`. Run `npm test` and expect 1 test passing.
- [ ] **Step 6: Commit and push.**

  ```bash
  git add -A && git commit -m "chore: bootstrap app, workspaces, CI" && git push -u origin main
  ```

  Expected: the test workflow goes green on GitHub (`gh run watch`).

### Task 2: Verify sources and capture fixtures

Resolves spec §12 items 1 and 2. Nothing downstream may hard-code a URL, field or version that this task hasn't confirmed.

**Files:**
- Create: `docs/sources.md`
- Create: `tools/build-data/test/fixtures/enterprise-mini.json`
- Create: `app/src/lib/layers/test/fixtures/navigator-sample.json`
- Create: `tools/build-data/scripts/make-fixture.js`

**Interfaces:**
- Produces:
  - `docs/sources.md`, recording: the `index.json` URL; the Enterprise collection's name and version list shape; the latest version and its bundle URL; the bundle's size; whether raw.githubusercontent.com sends `Access-Control-Allow-Origin`; the current Navigator layer format version and its required fields, with links.
  - the fixtures above

- [ ] **Step 1: Inspect the STIX index.** Download `https://raw.githubusercontent.com/mitre-attack/attack-stix-data/master/index.json` and inspect it. Record the facts above in `docs/sources.md`. If the structure differs from the spec's assumptions, note the real structure; Task 3 follows `docs/sources.md`, not the spec.
- [ ] **Step 2: Download the latest Enterprise bundle** into a temp folder outside the repo. Write `make-fixture.js`. Its interface is `node make-fixture.js <bundle> <out>`, and it keeps:
  - the `x-mitre-matrix` and every `x-mitre-tactic`
  - techniques T1059 (with all its subs), T1053 (with subs), T1078, T1027, T1566 (with subs), T1203, T1047
  - one revoked `attack-pattern` and one deprecated `attack-pattern`
  - groups G0016 and G0046, software S0154 and S0363
  - every `relationship` among the objects kept, plus one relationship that points to a dropped object

  Write the result to `enterprise-mini.json`.
- [ ] **Step 3: Check the Navigator layer format.** Read the layer-format doc in the `mitre-attack/attack-navigator` repo (`layers/` folder) and record the version and required fields. Save a real example layer from that repo, with a few techniques, scores, comments and metadata, as `navigator-sample.json`.
- [ ] **Step 4: Commit.**

  ```bash
  git add docs/sources.md tools/build-data app/src/lib/layers/test/fixtures && git commit -m "chore: record verified data sources and fixtures"
  ```

### Task 3: build-data transform

**Files:**
- Create: `tools/build-data/package.json` (type: module, `test` script `vitest run`), `tools/build-data/src/transform.js`, `tools/build-data/src/stripCitations.js`
- Test: `tools/build-data/test/transform.test.js`

**Interfaces:**
- Consumes: `enterprise-mini.json` (Task 2)
- Produces:
  - `transform(bundle: object, {builtAt: string}) -> Dataset`, where `Dataset` is exactly the `attack.json` shape in spec §4
  - `stripCitations(md: string) -> string`
  - Technique `url`: `https://attack.mitre.org/techniques/T1059/001/` for subs, `.../T1059/` for parents
  - Platforms copied verbatim from `x_mitre_platforms`
  - Top-level techniques have `parent: null, isSub: false`

- [ ] **Step 1: Write the failing tests.**

  ```js
  import bundle from './fixtures/enterprise-mini.json' with { type: 'json' };
  import { transform } from '../src/transform.js';
  const d = transform(bundle, { builtAt: '2026-10-17T00:00:00Z' });
  const t = (id) => d.techniques.find((x) => x.id === id);

  test('tactics in matrix order', () => {
    expect(d.tactics.map((x) => x.shortname).slice(0, 4))
      .toEqual(['reconnaissance', 'resource-development', 'initial-access', 'execution']);
    expect(d.tactics).toHaveLength(14); // adjust only if docs/sources.md records a different count
  });
  test('sub-technique parenting', () => {
    expect(t('T1059.001')).toMatchObject({ name: 'PowerShell', parent: 'T1059', isSub: true, tactics: ['execution'] });
    expect(t('T1059').isSub).toBe(false);
    expect(t('T1059.001').url).toBe('https://attack.mitre.org/techniques/T1059/001/');
  });
  // make-fixture.js prints the ATT&CK ids of the revoked and deprecated objects it kept; paste them here.
  const REVOKED_ID = '<from make-fixture output>';
  const DEPRECATED_ID = '<from make-fixture output>';
  test('revoked and deprecated dropped', () => {
    const ids = d.techniques.map((x) => x.id);
    expect(ids).not.toContain(REVOKED_ID);
    expect(ids).not.toContain(DEPRECATED_ID);
  });
  test('group uses links', () => {
    const g = d.groups.find((x) => x.id === 'G0016');
    expect(g.aliases.length).toBeGreaterThan(0);
    expect(g.techniques).toContain('T1059.001');
  });
  test('software typed', () => {
    expect(d.software.find((x) => x.id === 'S0154').type).toBe('malware'); // or 'tool' per real data — assert what the fixture says
  });
  test('citations stripped', () => {
    expect(JSON.stringify(d)).not.toMatch(/\(Citation:/);
  });
  test('dangling relationships ignored', () => {
    expect(() => transform(bundle, { builtAt: 'x' })).not.toThrow();
  });
  ```

- [ ] **Step 2: Run the tests** with `npm test -w tools/build-data`. Expected: FAIL, `transform` not defined.
- [ ] **Step 3: Implement `transform` and `stripCitations`.** Map STIX ids to ATT&CK ids through `external_references[source_name='mitre-attack'].external_id`. Get tactic order from `x-mitre-matrix.tactic_refs`. Get each technique's tactics from `kill_chain_phases[kill_chain_name='mitre-attack'].phase_name`.
- [ ] **Step 4: Run the tests.** Expected: PASS.
- [ ] **Step 5: Commit.**

  ```bash
  git commit -am "feat(data): STIX → compact dataset transform"
  ```

### Task 4: build-data CLI, sanity checks, weekly workflow

**Files:**
- Create: `tools/build-data/src/cli.js`, `tools/build-data/src/sanity.js`, `.github/workflows/build-data.yml`
- Test: `tools/build-data/test/sanity.test.js`
- Output: `app/public/data/attack.json`, `app/public/data/version.json`

**Interfaces:**
- Consumes: `transform` (Task 3), the URLs from `docs/sources.md`
- Produces:
  - `sanityCheck(d: Dataset) -> string[]` (an empty array means OK). Fails on: fewer than 100 techniques, 0 tactics, 0 groups, a technique whose tactic isn't in `tactics`, or a serialised size over 4 MB.
  - `node tools/build-data/src/cli.js --out app/public/data` fetches the latest Enterprise bundle and writes both files. `version.json` holds `{ attackVersion, builtAt, sha256, bytes }`, with sha256 taken over the exact `attack.json` bytes.
  - The CLI exits 1 with messages if `sanityCheck` returns anything, and writes nothing in that case.

- [ ] **Step 1: Write failing tests** for `sanityCheck`. Use the transformed fixture, then a copy with `techniques` truncated to 50 (expect a message matching `/techniques/`), then a copy with a technique tactic of `'nope'` (expect a message matching `/tactic/`). The fixture itself has fewer than 100 techniques, so call `sanityCheck(d, { minTechniques: 1 })` for the passing case. The default is `minTechniques: 100`.
- [ ] **Step 2: Run the tests** and confirm they fail. Then implement `sanity.js` and `cli.js`, and run the tests again: PASS.
- [ ] **Step 3: Run the CLI for real:** `node tools/build-data/src/cli.js --out app/public/data`. Expected: both files are written, and `attack.json` is at most 4 MB. Print its size.
- [ ] **Step 4: Write `build-data.yml`.**
  - **Triggers:** `schedule: cron '23 4 * * 1'` (Mondays 04:23 UTC) and `workflow_dispatch`.
  - **Permissions:** `contents: write`.
  - **Steps:** run the CLI, then compare the new `version.json` sha256 with the committed one. Only if they differ, commit as `github-actions[bot]` with the message `data: ATT&CK <attackVersion>` and push. This push triggers `deploy-pages` (Task 15).
- [ ] **Step 5: Commit** the CLI, workflow and generated data:

  ```bash
  git add -A && git commit -m "feat(data): CLI, sanity checks, weekly build-data workflow"
  ```

  Then run `gh workflow run build-data.yml` and `gh run watch`. Expected: success, with no new commit because the data is unchanged.

### Task 5: App data layer (load, cache, update)

**Files:**
- Create: `app/src/lib/data/dataset.js`, `app/src/lib/data/indexDataset.js`, `app/src/lib/data/db.js`, `app/src/lib/config.js`
- Test: `app/src/lib/data/dataset.test.js`, `app/src/lib/data/indexDataset.test.js`

**Interfaces:**
- Consumes: the `attack.json` and `version.json` shapes (Task 4)
- Produces:
  - **`config.js`:** `DATA_BASE`, which is `import.meta.env.VITE_DATA_BASE ?? (import.meta.env.BASE_URL + 'data/')`.
  - **`db.js`:** `openDb() -> Promise<IDBPDatabase>`, with database `attack-learner` version 1 and stores `meta` (key-value) and `layers` (keyPath `id`).
  - **`loadDataset({ fetchFn = fetch } = {}) -> Promise<{ data: Dataset, source: 'cache'|'bundled' }>`:** reads `meta['dataset']`, else fetches `DATA_BASE + 'attack.json'` from the bundled copy.
  - **`checkForUpdate({ current: Dataset, force = false, now = Date.now(), fetchFn = fetch }) -> Promise<{ status: 'updated'|'current'|'skipped'|'error', data?: Dataset, message?: string }>`:**
    - Returns `'skipped'` if not forced and the last check was within 24 h.
    - Returns `'updated'` only after the sha256 matches (via `crypto.subtle`) and the cache write succeeds.
  - **`getDataStatus() -> Promise<{ attackVersion, builtAt, lastChecked, lastError }>`**
  - **`indexDataset(d) -> Idx`**, where Idx is:

    ```
    { byId: Map<string, Technique>, childrenOf: Map<string, Technique[]>,
      topByTactic: Map<shortname, Technique[]> /* sorted by name */,
      groupsById, softwareById,
      usedBy: Map<techId, { groups: Group[], software: Software[] }> }
    ```

- [ ] **Step 1: Write failing tests**, using `import 'fake-indexeddb/auto'` and a stub `fetchFn`:
  - `loadDataset` returns `source: 'bundled'` on first run, and `'cache'` after an update has been cached.
  - `checkForUpdate` returns `'skipped'` when called again within 24 h, and `'updated'` with `force: true`.
  - A sha256 mismatch gives `status: 'error'`, `message` matching `/integrity/i`, and the cache is unchanged.
  - *(Review Focus 4)* With the IndexedDB `put` stubbed to throw `QuotaExceededError`, the result is `'error'`, and `loadDataset` still returns the previous data.
  - An offline fetch (`fetchFn` rejects) gives `'error'` and does not throw.
  - `indexDataset`: `childrenOf.get('T1059')` contains T1059.001; `usedBy.get('T1059.001').groups` includes G0016; `topByTactic.get('execution')` has no sub-techniques.
- [ ] **Step 2: Run** `npm test -w app` and confirm FAIL. Implement. Run again: PASS.
- [ ] **Step 3: Commit.**

  ```bash
  git commit -am "feat(app): dataset load, cache and update check"
  ```

### Task 6: Layer store

**Files:**
- Create: `app/src/lib/layers/store.js`, `app/src/lib/util/debounce.js`
- Test: `app/src/lib/layers/store.test.js`, `app/src/lib/util/debounce.test.js`

**Interfaces:**
- Consumes: `openDb` (Task 5)
- Produces:
  - **Layer type:**

    ```
    Layer = { id, name, createdAt, updatedAt,
              entries: { [techId]: { score: 0-4, comment: string, learned: boolean } } }
    ```

  - **Functions:**

    ```
    listLayers(), getLayer(id), createLayer(name, entries = {}), renameLayer(id, name),
    duplicateLayer(id), deleteLayer(id),
    setEntry(layerId, techId, patch: Partial<Entry>) -> Promise<Layer>,
    ensureDefaultLayer() -> Promise<Layer>   // creates "Learning progress" if none
    getActiveLayerId() / setActiveLayerId(id) // localStorage, try/catch
    isPersistent() -> Promise<boolean>        // false when IndexedDB unavailable
    orphanCount(layer, idx) -> number         // entries whose techId is not in idx.byId
    ```

    In-memory fallback when IndexedDB throws on open.
  - **`debounce(fn, ms) -> { call(...args), flush(), cancel() }`**

- [ ] **Step 1: Write failing tests:**
  - `ensureDefaultLayer` is idempotent: calling it twice leaves one layer named "Learning progress".
  - `setEntry` clamps the score to 0–4 and merges patches. An entry with score 0, an empty comment and `learned: false` is removed from `entries`.
  - `duplicateLayer` produces a new id with name "<name> (copy)".
  - *(Review Focus 1)* `orphanCount` counts IDs missing from the index, and `setEntry` and `listLayers` never drop them.
  - IndexedDB open throws → `isPersistent()` is false, and CRUD still works in memory.
  - `debounce.flush()` runs a pending call immediately, exactly once *(Review Focus 5)*.
- [ ] **Step 2: Run** the tests and confirm FAIL. Implement. Run again: PASS.
- [ ] **Step 3: Commit.**

  ```bash
  git commit -am "feat(app): layer store"
  ```

### Task 7: Navigator import/export

**Files:**
- Create: `app/src/lib/layers/navigator.js`
- Test: `app/src/lib/layers/navigator.test.js`

**Interfaces:**
- Consumes: `Layer` (Task 6), `navigator-sample.json` (Task 2), and the layer-format version from `docs/sources.md`
- Produces:
  - **`toNavigatorLayer(layer, { attackVersion }) -> object`:**
    - `name`, `domain: 'enterprise-attack'`, `versions: { attack, navigator, layer }` (values per `docs/sources.md`)
    - `techniques: [{ techniqueID, score, comment, enabled: true, metadata? }]`
    - `gradient: { colors: [score-1 colour, score-4 colour], minValue: 0, maxValue: 4 }` (light palette)
    - `legendItems` for 1–4
  - **`fromNavigatorLayer(json, { knownIds: Set<string> }) -> { name, entries, unknownCount }`**
  - **`class LayerImportError extends Error { field }`**
  - **`exportFileName(layer) -> string`:** slugified name + `.layer.json`

- [ ] **Step 1: Write failing tests:**
  - Round trip: `fromNavigatorLayer(toNavigatorLayer(L))` returns entries equal to `L.entries` (score, comment and learned all preserved).
  - Importing `navigator-sample.json` keeps each technique's score and comment.
  - The same `techniqueID` listed under two tactics with scores 1 and 3 imports as 3, with the comments joined by `"\n"`.
  - IDs not in `knownIds` are counted in `unknownCount` and excluded from `entries`.
  - *(Review Focus 2)* `domain: 'mobile-attack'` throws `LayerImportError` with `field === 'domain'` and a message matching `/Enterprise/`.
  - `{}` throws with `field === 'techniques'`.
  - Valid JSON that isn't an object (`[]`, `"x"`) throws.
  - A score outside 0–4 is clamped. A non-numeric score is treated as 0, and the comment is kept.
- [ ] **Step 2: Run** the tests and confirm FAIL. Implement. Run again: PASS.
- [ ] **Step 3: Commit.**

  ```bash
  git commit -am "feat(app): Navigator layer import/export"
  ```

### Task 8: Search

**Files:**
- Create: `app/src/lib/search/search.js`, `app/src/lib/search/platforms.js`
- Test: `app/src/lib/search/search.test.js`

**Interfaces:**
- Consumes: `Idx` (Task 5)
- Produces:
  - **`PLATFORM_GROUPS`:** an ordered list of `{ key, label, members: string[] }`:
    - Windows; Linux; macOS
    - Cloud = IaaS, SaaS, Office Suite, Identity Provider, Google Workspace, Azure AD, Office 365 (include whichever exist in data)
    - Network = Network, Network Devices
    - Containers
  - **`normaliseTechniqueId(q: string) -> string|null`:** `t1059.001`, `1059.001`, `T1059/001` and `T1059 001` all become `T1059.001`. Returns null when the input isn't an ID.
  - **`buildSearchIndex(idx) -> SearchIndex`**
  - **`search(si, query, { kind: 'techniques'|'groups'|'software', platforms: Set<key> }) -> Result[]`:**
    - Exact ID first, then name prefix, then name substring, then alias or description-word match.
    - Results capped at 50.
    - Case-insensitive, plain string matching (no regex built from user input).
  - **`techniquesForPlatforms(idx, platforms: Set<key>) -> Set<techId>`**

- [ ] **Step 1: Write failing tests:**
  - All four ID spellings normalise.
  - `search(si, 'powershell', { kind: 'techniques' })[0].id === 'T1059.001'`.
  - `search(si, 'cozy', { kind: 'groups' })[0].id === 'G0016'` (assuming the alias exists in the fixture).
  - With the Windows platform set, T1059.004 (Unix Shell) is excluded.
  - *(Review Focus 3)* `''`, `'   '`, `'C++'`, `'('`, `'*'` and `'a'.repeat(5000)` return arrays without throwing; the empty inputs return `[]`.
- [ ] **Step 2: Run** the tests and confirm FAIL. Implement. Run again: PASS.
- [ ] **Step 3: Commit.**

  ```bash
  git commit -am "feat(app): search and platform filters"
  ```

### Task 9: Theme, tokens, fonts, content files

**Files:**
- Create: `app/src/lib/theme/theme.js`, `app/src/styles/tokens.css`, `app/src/styles/base.css`
- Create: `app/public/fonts/*.woff2` (IBM Plex, OFL; add `app/public/fonts/LICENSE.txt`)
- Create: `app/src/lib/content/tactics.json`, `app/src/lib/content/glossary.json`, `app/src/lib/content/glossary.js`
- Test: `app/src/lib/theme/theme.test.js`, `app/src/lib/content/content.test.js`

**Interfaces:**
- Produces:
  - **Theme functions:**
    - `resolveTheme(pref: 'system'|'light'|'dark', systemDark: boolean) -> 'light'|'dark'`
    - `getThemePref()` / `setThemePref(pref)` (localStorage, default `'system'`)
    - `startTheme(onChange?: (resolved) => void) -> () => void`: sets `<html data-theme>` and listens to `matchMedia('(prefers-color-scheme: dark)')`. Returns an unsubscribe function.
  - **`tokens.css`:** custom properties `--bg --surface --border --text --muted --accent --accent-tint --score-0..4 --score-0-border` for both themes (values in Global Constraints). The `[data-theme=dark]` selector wins.
  - **`tactics.json`:** `{ [shortname]: goal }`, covering all 14. Use the six goals from the mockup verbatim and write the remaining eight in the same voice, at most 7 words each.
  - **`glossary.json`:** `[{ id, term, aliases: string[], definition }]`, about 50 terms. Each definition is at most 2 sentences. Must include: command-line interface, C2 / command and control, lateral movement, privilege, credential, payload, persistence, exfiltration, LSASS, registry, scheduled task, phishing, malware, backdoor, obfuscation, PowerShell, WMI, API, process injection, hash.
  - **`linkGlossary(root: Element, glossary) -> void`:** wraps the first case-insensitive, whole-word occurrence of each term or alias in text nodes inside `root` in `<button type="button" class="gloss" data-term="<id>">`. It never links inside `a`, `code` or `button` elements.

- [ ] **Step 1: Write failing tests:**
  - `resolveTheme` covers all 6 combinations.
  - `tactics.json` has exactly the 14 shortnames from the generated `attack.json` (load it and compare). Every goal is non-empty and at most 7 words.
  - Glossary: ids are unique, and every definition is at most 2 sentences.
  - `linkGlossary` (jsdom): wraps only the first occurrence, respects word boundaries ("hash" doesn't match "hashtag"), and skips text inside `<a>`.
- [ ] **Step 2: Run** the tests and confirm FAIL. Implement and write the content. Run again: PASS.
- [ ] **Step 3: Commit.**

  ```bash
  git commit -am "feat(app): theme, tokens, fonts, tactic goals, glossary"
  ```

  **Ask Paul to review the tactic goals and glossary wording** (spec §12.3), then commit any edits he asks for.

### Task 10: App shell, router, tab bar, Intro, Learn

**Files:**
- Create: `app/src/App.svelte`, `app/src/lib/router.js`, `app/src/lib/stores.js`
- Create: `app/src/components/TabBar.svelte`, `app/src/screens/Intro.svelte`, `app/src/screens/Learn.svelte`
- Modify: `app/src/main.js`, `app/index.html` (viewport `width=device-width, initial-scale=1, viewport-fit=cover`; theme-color metas for both schemes)
- Test: `app/src/lib/router.test.js`

**Interfaces:**
- Consumes: Tasks 5, 6, 9
- Produces:
  - **`router.js`:** `route` (a Svelte readable `{ name, params, query }`), `navigate(path)`, `back()`. `parseHash(hash) -> { name, params, query }` is pure and unit-tested.
  - **`stores.js`:** these Svelte stores, initialised in `App.svelte` at startup:
    - `dataset` (`Dataset|null`), `idx` (`Idx|null`), `dataStatus`
    - `layers` (`Layer[]`), `activeLayer` (`Layer|null`)
    - `highlight` (`{ label, ids: Set }|null`, session only)
    - `platformFilter` (`Set<key>`)
  - **Startup order:** `startTheme` → `loadDataset` → `indexDataset` → `ensureDefaultLayer` → render → `checkForUpdate()` in the background.
  - **First launch:** a localStorage flag `introSeen`. When it's absent, redirect to `#/intro`.

- [ ] **Step 1: Write a failing test** for `parseHash`: `'#/matrix?tactic=execution&view=overview'` parses to `{ name: 'matrix', params: {}, query: { tactic: 'execution', view: 'overview' } }`, and `'#/technique/T1059.001'` gives `params.id === 'T1059.001'`. An empty string gives `name: 'learn'`. Run it and confirm FAIL. Implement. Run again: PASS.
- [ ] **Step 2: Build the TabBar, Intro and Learn screens** to match `docs/design/screens/01-intro.png` and `02-learn.png`.
  - The tab bar is a `<nav>` of 4 `<a>` links at least 48 px tall, with `aria-current="page"` on the active tab. It's hidden on `#/intro` and `#/technique/*`.
  - Intro has 3 steps; Skip and finish set `introSeen`.
  - Learn shows a progress card (the count of `learned` entries in the active layer), "Replay the intro", and tactic cards from `idx`/`tactics.json`. A missing goal falls back to the first sentence of MITRE's description. Tapping a card goes to `#/matrix?tactic=<shortname>`.
- [ ] **Step 3: Check it visually.** Run `npm run dev -w app` and open it at 390×844 in Playwright or devtools. Compare against the PNGs.
- [ ] **Step 4: Commit.**

  ```bash
  git commit -am "feat(app): shell, router, tab bar, intro, learn"
  ```

### Task 11: Matrix — List and Overview

**Files:**
- Create: `app/src/screens/Matrix.svelte`, `app/src/components/MatrixList.svelte`, `app/src/components/MatrixOverview.svelte`, `app/src/components/ScoreSquare.svelte`, `app/src/components/LayerPicker.svelte`, `app/src/lib/matrix/summary.js`
- Test: `app/src/lib/matrix/summary.test.js`

**Interfaces:**
- Consumes: `idx`, `activeLayer`, `highlight`, `platformFilter` (Task 10), `techniquesForPlatforms` (Task 8)
- Produces:
  - **`tacticSummary(idx, layer, shortname) -> { scored: number, total: number }`:** counts top-level techniques only. A technique counts as scored if its score is above 0.
  - **`effectiveScore(layer, techId) -> 0..4`**

- [ ] **Step 1: Write a failing test** for `tacticSummary` and `effectiveScore`, using a small hand-built idx and layer. Run it and confirm FAIL. Implement. Run again: PASS.
- [ ] **Step 2: Build the List view** per `03-matrix-list.png` and spec §6.3.
  - Header: the layer picker opens a bottom sheet listing the layers.
  - A List/Overview control that updates `view` in the hash.
  - A tactic chip row that scrolls horizontally; tapping a chip scrolls to that section and expands it.
  - Sections expand one at a time, starting from `query.tactic`.
  - Technique rows show a `ScoreSquare`, the name and the ID. A sub-technique toggle expands indented subs.
  - Tapping a row navigates to `#/technique/<id>`.
  - When `highlight` is set, show a banner "Highlighting <label> ✕" and give highlighted rows a 2 px accent outline.
  - When `platformFilter` is non-empty, show a dismissible chip and hide techniques that don't match.
  - A legend strip sits above the tab bar.
- [ ] **Step 3: Build the Overview** per `03b-matrix-overview-dark.png` and spec §6.4.
  - A 14-column grid. Each column is a `<button>` with `aria-label="<Tactic>: N of M scored"` containing a 2-wide grid of squares coloured `--score-n`.
  - A summary card with "Open in list" (→ `view=list&tactic=…`).
- [ ] **Step 4: Check it visually** at 360 and 412 px widths, in both themes.
- [ ] **Step 5: Commit.**

  ```bash
  git commit -am "feat(app): matrix list and overview"
  ```

### Task 12: Technique detail

**Files:**
- Create: `app/src/screens/Technique.svelte`, `app/src/lib/content/renderDescription.js`
- Test: `app/src/lib/content/renderDescription.test.js`

**Interfaces:**
- Consumes: `idx`, `activeLayer`, `setEntry` and `debounce` (Task 6), `linkGlossary` and the glossary (Task 9)
- Produces:
  - **`renderDescription(md: string) -> string`:** HTML produced by `marked`, then `DOMPurify.sanitize` with tags limited to `p, ul, ol, li, a, code, em, strong, br`.
    - Links get `target="_blank" rel="noopener"`.
    - Relative attack.mitre.org links (`/techniques/T1003`) become absolute.

- [ ] **Step 1: Write failing tests:**
  - `<script>` and `onerror` attributes are stripped.
  - A relative MITRE link becomes `https://attack.mitre.org/techniques/T1003`.
  - Markdown lists render as `<ul>`.

  Run and confirm FAIL. Implement. Run again: PASS.
- [ ] **Step 2: Build the screen** per `04-technique-detail.png` and spec §6.5.
  - Back link: Android back and swipe use history; the back link shows the parent tactic's name.
  - Name, ID, a "sub-technique of" link, and platform chips.
  - **Layer card:**
    - 5 score buttons with `aria-pressed`
    - a "Learned it" toggle
    - a notes textarea, debounced at 500 ms through `setEntry`
    - `onDestroy` and `visibilitychange` → `flush()` *(Review Focus 5)*
  - Description via `renderDescription`, then `linkGlossary` on the container. Tapping a `.gloss` button toggles an inline definition card below that paragraph.
  - "Used by": the first 6 groups/software chips plus "+N more". Tapping a chip goes to `#/search?q=<name>&kind=groups|software`.
  - The "Open on attack.mitre.org" link.
- [ ] **Step 3: Commit.**

  ```bash
  git commit -am "feat(app): technique detail"
  ```

### Task 13: Search screen, highlight, save as layer

**Files:**
- Create: `app/src/screens/Search.svelte`, `app/src/lib/search/actions.js`
- Test: `app/src/lib/search/actions.test.js`

**Interfaces:**
- Consumes: `buildSearchIndex`, `search` and `PLATFORM_GROUPS` (Task 8), `createLayer` and `setActiveLayerId` (Task 6), the `highlight` and `platformFilter` stores
- Produces:
  - **`layerEntriesFor(item: Group|Software) -> entries`:** every technique scored 1, with an empty comment and `learned: false`.
  - **`highlightFor(item) -> { label: item.name, ids: Set(item.techniques) }`**

- [ ] **Step 1: Write a failing test** for both functions using G0016 from the fixture. Run it and confirm FAIL. Implement. Run again: PASS.
- [ ] **Step 2: Build the screen** per `05-search.png` and spec §6.6.
  - The search input syncs to `query.q` in the hash, debounced at 150 ms.
  - A Techniques/Groups/Software control (`role="tablist"`).
  - Platform chips toggle `platformFilter`, which persists for the session and also applies to the Matrix.
  - The group/software card offers:
    - "Highlight in matrix": sets `highlight` and navigates to the matrix.
    - "Save as layer": creates a layer, makes it active, navigates to `#/layers`, and shows a toast "Saved '<name>'".
  - Technique results open the detail page.
- [ ] **Step 3: Commit.**

  ```bash
  git commit -am "feat(app): search screen, highlight, save as layer"
  ```

### Task 14: Layers screen, import/export, data status, theme setting, About

**Files:**
- Create: `app/src/screens/Layers.svelte`, `app/src/lib/layers/share.js`, `app/src/components/Toast.svelte`, `app/src/components/ConfirmSheet.svelte`
- Test: `app/src/lib/layers/share.test.js`

**Interfaces:**
- Consumes: Tasks 5, 6, 7, 9
- Produces:
  - **`shareOrDownload(filename: string, json: object, { platform }) -> Promise<'shared'|'downloaded'>`:**
    - Inside Capacitor (`Capacitor.isNativePlatform()`): write the file to the cache directory with `@capacitor/filesystem`, then share it with `@capacitor/share`. The Capacitor imports are dynamic.
    - In a browser: use `navigator.share({ files })` if `canShare` allows it.
    - Otherwise: an `<a download>` Blob link.

- [ ] **Step 1: Write a failing test** for `shareOrDownload` in the browser fallback path. Stub `navigator.share` as undefined; expect `'downloaded'` and a created object URL. Run it and confirm FAIL. Implement. Run again: PASS.
- [ ] **Step 2: Build the screen** per `06-layers.png` and spec §6.7.
  - **Layer cards:** radio-select sets the active layer. The ⋯ menu has Rename, Duplicate, Export and Delete; Delete asks for confirmation via `ConfirmSheet`. Show an orphan-count note when it's above 0 *(Review Focus 1)*.
  - **New:** prompts for a name.
  - **Import:** a hidden `<input type="file" accept="application/json,.json">`, then `fromNavigatorLayer`.
    - Success → toast "Imported '<name>' · N techniques" (plus "· M not found" when M > 0).
    - `LayerImportError` → toast with its message.
  - **Export active layer:** `shareOrDownload`.
  - **Data status row:** "ATT&CK data <attackVersion> · checked <relative date>", a "Check now" button (`force: true`), and the last error if there is one.
  - **Theme:** a 3-way System/Light/Dark segmented control → `setThemePref`.
  - **About:** a disclosure with the attribution text (verbatim from Global Constraints) and a link to MITRE's terms of use.
  - **Non-persistent storage:** when `isPersistent()` is false, show a banner "Layers won't be saved in this browser mode".
- [ ] **Step 3: Commit.**

  ```bash
  git commit -am "feat(app): layers screen, import/export, data status, theme, about"
  ```

### Task 15: PWA and GitHub Pages deploy

**Files:**
- Modify: `app/vite.config.js`
- Create: `app/public/icons/` (192, 512 and maskable 512 PNG; a simple original glyph on `#0F6E74`, not MITRE's logo), `.github/workflows/deploy-pages.yml`

**Interfaces:**
- Produces:
  - **Live PWA** at `https://<gh-user>.github.io/attack-learner/`.
  - **Vite `base: '/attack-learner/'`**, overridable with the env var `VITE_BASE`.
  - **Manifest:**
    - `name: 'ATT&CK Learner'`, `short_name: 'ATT&CK'`
    - `display: 'standalone'`, `orientation: 'portrait'`
    - `theme_color: '#0F6E74'`, `background_color: '#F4F5F2'`
    - `start_url: './#/learn'`
  - **Workbox:**
    - Precache the app shell, fonts and `data/attack.json`.
    - `data/version.json` is `NetworkFirst`.
    - Exclude `data/attack.json` from runtime caching rules. The app's own update logic (Task 5) owns it.

- [ ] **Step 1: Configure `vite-plugin-pwa`** as above with `registerType: 'autoUpdate'`. Run `npm run build -w app && npm run preview -w app`. Expected: Lighthouse/devtools shows an installable manifest and a service worker, and the app loads offline after one visit.
- [ ] **Step 2: Write `deploy-pages.yml`** with the standard `actions/configure-pages`, `upload-pages-artifact` (path `app/dist`) and `deploy-pages` steps.
  - Triggers: push to `main` and `workflow_dispatch`.
  - `needs: test` (call `test.yml` as a reusable workflow, or repeat its steps).
  - Run `gh api -X POST repos/{owner}/attack-learner/pages -f build_type=workflow` once to enable Pages.
- [ ] **Step 3: Commit, push and watch the run.** Expected: the site loads on Paul's phone in Chrome, and "Add to Home screen" installs it.

  ```bash
  git commit -am "feat: PWA + GitHub Pages deploy" && git push && gh run watch
  ```

### Task 16: Android APK (Capacitor) and signing

**Files:**
- Create: `app/capacitor.config.json`, `app/android/` (generated), `app/src/lib/native/statusBar.js`, `.github/workflows/build-apk.yml`, `docs/apk-signing.md`
- Modify: `app/src/App.svelte` (call the status bar sync when the theme changes)

**Interfaces:**
- Consumes: `startTheme(onChange)` (Task 9)
- Produces:
  - **App id:** `appId: 'io.github.<gh-user>.attacklearner'`, `appName: 'ATT&CK Learner'`, `webDir: 'dist'`.
  - **APK build:** built with `VITE_BASE='./'` and `VITE_DATA_BASE='https://<gh-user>.github.io/attack-learner/data/'`.
  - **`syncStatusBar(resolved: 'light'|'dark') -> Promise<void>`:** a no-op on the web. On native it calls `StatusBar.setStyle` (Dark style for the dark theme) and `setBackgroundColor` with `--bg`.
  - **Signed release APK** published as a GitHub Release asset.

- [ ] **Step 1: Add Capacitor.**

  ```bash
  npm i @capacitor/core @capacitor/status-bar @capacitor/share @capacitor/filesystem && npm i -D @capacitor/cli @capacitor/android
  npx cap init && npx cap add android
  ```

  Lock to portrait by setting `android:screenOrientation="portrait"` on the main activity in `AndroidManifest.xml`. Wire up `syncStatusBar`.
- [ ] **Step 2: Walk Paul through creating the keystore** on his laptop, outside the repo. Write these steps into `docs/apk-signing.md`:

  ```bash
  keytool -genkeypair -v -keystore ~/attack-learner-release.jks -alias attacklearner -keyalg RSA -keysize 4096 -validity 10000
  base64 -w0 ~/attack-learner-release.jks > /tmp/ks.b64
  gh secret set ANDROID_KEYSTORE_B64 < /tmp/ks.b64 && rm /tmp/ks.b64
  gh secret set ANDROID_KEYSTORE_PASSWORD
  gh secret set ANDROID_KEY_ALIAS --body attacklearner
  gh secret set ANDROID_KEY_PASSWORD
  ```

  Remind Paul to back up the `.jks` file and its passwords offline. If they're lost, the installed app can't be updated.
- [ ] **Step 3: Write `build-apk.yml`.**
  - Triggers: `workflow_dispatch` and push of tags `v*`.
  - Steps: setup-node, setup-java 21 (temurin), `npm ci`, build the app with the two env vars, `npx cap sync android`, decode the keystore from the secret into the runner temp folder, then `./gradlew assembleRelease` with signing properties passed as `-P` args.
  - `versionCode = github.run_number`; `versionName` = the tag name, or `0.0.<run_number>` when there's no tag.
  - Upload `app-release.apk` as an artifact, and on tags create a Release with `gh release create`.
- [ ] **Step 4: Tag and release.** Run `git tag v0.1.0 && git push --tags && gh run watch`. Expected: a Release with `app-release.apk`. Paul downloads it on the phone, allows installs from that source, and installs.
- [ ] **Step 5: Commit.**

  ```bash
  git commit -am "feat: Capacitor Android build and signed APK workflow"
  ```

### Task 17: End-to-end tests and release check

**Files:**
- Create: `app/playwright.config.js` (`webServer: npm run preview`, `use: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }`), `app/e2e/*.spec.js`

**Interfaces:**
- Consumes: the whole app

- [ ] **Step 1: Write these specs:**
  1. **`intro.spec`:** first visit lands on intro → Skip → Learn shows 14 tactic cards. A reload doesn't show the intro again.
  2. **`scoring.spec`:** Learn → Execution → T1059 → open subs → PowerShell → score 3 + Learned + note "test" → back. The list shows a "3" square for PowerShell. Overview's Execution column `aria-label` contains "1 of". Learn's progress shows 1 learned.
  3. **`note-flush.spec`** *(Review Focus 5)*: type a note and press back within 100 ms. Reopen: the note persists.
  4. **`search-layer.spec`:** Search "apt29" → Groups → Save as layer → Layers lists "APT29" as active → Matrix shows the highlighted/scored rows.
  5. **`import-export.spec`:** export the active layer (catch the download), delete the layer, import the downloaded file. Scores and comments are restored. Importing a mobile-domain file shows a toast matching `/Enterprise/`.
  6. **`offline.spec`:** load, wait for the service worker, `context.setOffline(true)`, reload. Learn still renders 14 tactics.
  7. **`theme.spec`:** with `colorScheme: 'dark'`, `<html>` resolves dark and the body background is `rgb(17, 19, 22)`. Layers → Light → background `rgb(244, 245, 242)`.
- [ ] **Step 2: Run** `npm run build -w app && npm run e2e`. Expected: all specs pass. Fix the app, not the tests, unless a test contradicts the spec.
- [ ] **Step 3: Do the manual release check on Paul's phone** (spec §10):
  - portrait layout at real size
  - Android back gesture on detail pages
  - share-sheet export
  - status bar colour in both themes
  - the app works in airplane mode
- [ ] **Step 4: Commit and push.** CI should be green.

  ```bash
  git commit -am "test: e2e flows" && git push
  ```
