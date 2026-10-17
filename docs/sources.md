# Verified data sources (checked 2026-10-17)

## STIX index
- URL: `https://raw.githubusercontent.com/mitre-attack/attack-stix-data/master/index.json` (33 KB).
- Shape: `{ id, name, description, created, modified, collections: [...] }`. Each collection is `{ id, name, description, created, versions: [{ version, url, modified }] }`, newest version first.
- Enterprise collection: name `"Enterprise ATT&CK"`, id `x-mitre-collection--1f5f1533-f617-4ca8-9ab4-6a02367fa019`. Mobile and ICS are separate collections; ignore them.
- Latest Enterprise: version `"20.0"` (modified 2026-10-13), url `https://raw.githubusercontent.com/mitre-attack/attack-stix-data/master/enterprise-attack/enterprise-attack-20.0.json`.
- Bundle size: 55,271,014 bytes (~55 MB). It must only be fetched by the build script, never by the app.
- CORS: raw.githubusercontent.com sends `access-control-allow-origin: *`.

## Bundle structure (v20.0)
- `{ type: "bundle", id, objects: [...] }`, 26,690 objects: attack-pattern 867 (149 revoked, 12 deprecated), x-mitre-tactic 15, x-mitre-matrix 1, intrusion-set 193, malware 750, tool 95, campaign 57, relationship 21,819, plus course-of-action, x-mitre-analytic, -data-component, -data-source, -detection-strategy, identity, marking-definition.
- `x-mitre-collection` object: `x_mitre_version` = `"20.0"`, `name` = `"Enterprise ATT&CK"`.
- **Tactics: 15, not 14.** Names/shortnames: reconnaissance, resource-development, initial-access, execution, persistence, privilege-escalation, **stealth**, **defense-impairment**, credential-access, discovery, lateral-movement, collection, command-and-control, exfiltration, impact. `defense-evasion` no longer exists in v20. All 15 are listed in the matrix's `tactic_refs`, in matrix order; `x-mitre-tactic` objects have `x_mitre_shortname`.
- Technique (`attack-pattern`) fields used: `external_references[0].external_id` (T####, T####.###), `name`, `description`, `kill_chain_phases[].phase_name` (tactic shortname), `x_mitre_platforms`, `x_mitre_is_subtechnique`, `x_mitre_deprecated`, `revoked`.
- Relationship types: uses (18,975), mitigates, subtechnique-of (481), detects, revoked-by (157), attributed-to.
- Group = `intrusion-set` (e.g. G0016 APT29, G0046 FIN7); software = `malware` / `tool` (S0154 Cobalt Strike, S0363 Empire).
- Platforms seen on T1059: Containers, ESXi, IaaS, Identity Provider, Linux, macOS, Network Devices, Office Suite, SaaS, Windows.

## Navigator layer format
- Spec: https://github.com/mitre-attack/attack-navigator/blob/master/layers/spec/v4.5/layerformat.md (latest is v4.5).
- Required: `name` (string), `domain` (`"enterprise-attack"` | `"mobile-attack"` | `"ics-attack"`), `versions.navigator` (>= "4.9.0") and `versions.layer` (must be `"4.5"`) when `versions` is present. Everything else optional.
- Technique object: `techniqueID` (required), `tactic`, `comment`, `enabled`, `score` (any number), `color`, `metadata`, `links`, `showSubtechniques`.
- `tactic` absent means the entry applies under every tactic of that technique.
- Older samples (e.g. `heatmap_layer.json`) use `version: "3.0"` and `domain: "mitre-enterprise"`. Not v4.5; importer treats these as unsupported unless Task 7 rules otherwise.
- `app/src/lib/layers/test/fixtures/navigator-sample.json` is the example layer from the v4.5 spec doc (techniques with score/color/comment/links/metadata, layout, gradient, legend).
