# Roadmap

Ideas agreed with Paul. Done items first, then the rest ordered easiest to hardest. Tick when done.

- [x] 1. Quiz / flashcards: tactic goals, technique-to-tactic, "which group uses this"; answers feed the "Learned it" tick
- [x] 2. Bookmarks / recents
- [x] 3. Polish: release notes in About, short commit hash for Pages version
- [x] 4. Keep the bottom tab bar visible on technique pages (App.svelte hides it for the intro and technique routes)
- [x] 5. Coverage dashboard (as "Detailed Progress", linked from Learn): % learned per tactic, "next to learn"
- [x] 6. Layer extras: duplicate, merge into new layer, heatmap legend (duplicate and legend already existed)
- [x] 7. Sync and export learning progress (layers incl. learned ticks, bookmarks, quiz results) between devices: manual file export/import, plus optional GitHub sync to the private repo `attack-learner-sync` (fine-grained token, one `progress.json`, per-item newest-wins merge).. Quiz results are not stored yet, so not included
- [x] 8. Export: CSV layer report, Markdown incident timeline, print-to-PDF timeline (browser print dialog; untested on the APK)
- [ ] 9. "What changed" after a data update: added, changed, deprecated techniques/groups/tools
- [ ] 10. Mitigations and detections (data sources) on technique pages; may need the data build extended
- [ ] 11. Campaigns (needs a data build step)
- [ ] 12. Daily "technique of the day" notification (Android, Capacitor)
