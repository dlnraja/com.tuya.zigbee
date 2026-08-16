# P173 — REFUSE “total bidirectional enrichment” (auto-generate drivers) (2026-08-16)

## Verdict

**Do not implement.** Same family as P171/P172, worse:

- Auto-**generate** `/drivers/{id}/device.js` + `driver.json` from `mfs_db.devices` keyed by folder id (wrong model — mfs is keyed by **mfr**)
- Inject workaround snippets into live Homey drivers
- Templates using `this.homey.setTimeout` / raw `setCapabilityValue` (anti-patterns we already banned)
- `AI_BILLING_MODE` + QuotaManager + auto-PR → `develop`

## Already refused / already have

| Need | Use |
|------|-----|
| Align mfs with compose/registry | `tools/ci/align-mfs-db-intelligent.js` (P169) |
| Local crash/device KB | `data/error-patterns.json` + `data/device-knowledge-base.json` (P170) |
| External source scrape | Existing mega-crawl / crawl-z2m (silent, human review) |
| New driver | Human + sacred couple + compose — never template bot |

## Answer to “test on a sample?”

**No.** Do not run or adapt this pack against production drivers.
