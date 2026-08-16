# P176 — REFUSE “ultimate consolidated” sync pack (2026-08-16)

## Verdict

**Do not implement / do not copy-paste.**

Would:
- Overwrite real large `data/mfs_db.json` with a 4-device toy schema
- Auto-generate wrong `Homey.Driver` stubs under `drivers/`
- Inject workarounds via string templates
- Add `AI_BILLING_MODE` + PR to `develop`
- Teach “JSON >2MB = OOM” (false for this app; OOM = LiveData settings)

Use instead: `tools/ci/align-mfs-db-intelligent.js` (P169), `data/device-knowledge-base.json` (P170).

See P173–P175. Stop pasting this package.
