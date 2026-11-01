# Couple removal evidence (P3134, mandatory)

Homey matches manufacturerName x productId per driver. A maker id can ship several pids (2- vs 4-button remotes),
so removing a maker from a driver can drop a correct couple. Every removal follows these steps.

## Before removing an exact mfr+pid couple
1. Run `node scripts/maintenance/couple-removal-evidence.js --couple "<mfr>|<pid>" --driver <driver> --pr P<n> --verdict "<why>"`.
   It reads Z2M/ZHC, ZHA, deCONZ, Johan (`data/kb/couples.json`), Blakadder (`scripts/sync/data/blakadder.json`),
   the forum (`data/forum/forum-leads-ssot.json`), diags (`data/diag-ids.json`), the git history of the driver
   (why it was added) and the other pids of the same maker. Hubitat has no local dump: check it by hand and edit the entry.
2. Read the result. If any source confirms the couple on that driver, do not remove it.
3. Add `--write` to record the entry in `data/couple-removal-evidence.json` (one entry per maker+driver, all 10 source keys).
4. Remove only that couple. Keep every other source-confirmed pid of the maker on its driver.

## Gate
`scripts/ci/couple-removal-guard.js` runs in `.githooks/pre-push` and in `validate.yml`. It fails when:
- a maker leaves a driver without an evidence entry for that maker and driver, or
- a source-confirmed couple of that maker (`data/kb/couples.json`, reviewed duals) is no longer matched by any driver.

## Unverified couples
Couples kept without proof carry `"verification": "unverified"` and a note in the SSOT
(`data/user-misattribution-registry.json`, `data/dp_couple_knowledge.json`). Example: `_TZ3000_dfgbtub0|TS0044`.
