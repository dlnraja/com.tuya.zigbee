# P175 — REFUSE “complete improved” bidirectional pack (2026-08-16)

## Verdict

**Do not implement.** Fourth paste of the same auto-mutate-drivers pipeline.

Extra harms in this paste:
- `--force` rewrite of live `device.js`
- Fake `Homey.Driver` templates (wrong for this Zigbee app)
- Hard fail on JSON **>2MB** (breaks real `mfs_db.json`)
- Forbid manual driver edits except via bot
- Branches `main`/`develop` (wrong; use `master`/`stable-v5`)
- Treat existing large `mfs_db` as missing / recreate empty v1.0.0

Still use: P169 align-mfs, P170 device-knowledge-base (read-only / human), mega-crawl.

Answer to “generate initial mfs_db + knowledge-base?” → **No.**
