# SSOT couple-sources ledger (P3136, t731u)

- File: `data/ssot/couple-sources.json`, built by `tools/ci/ssot-couple-enrich.js`, refreshed by `.github/workflows/ssot-couple-enrich.yml` (daily head probe, rebuild only when Z2M/ZHA/Johan moved or weekly; kill switch `vars.SSOT_ENRICH_DISABLED`).
- One entry per exact mfr+pid couple (case variants grouped under the lower-case mfr key). Fields: `status`, `sources`, `drivers`, `dps` (from `data/dp_couple_knowledge.json`), model/vendor.
- `verified` = at least one external source (Z2M, ZHA, or a recorded forum/diag/issue reference). `unverified` = only Johan's driver listing or an internal seed (e.g. `_TZ3000_dfgbtub0|TS0044`). Couples with no source at all are listed per driver under `unverified` (mfr x pid cross-products).
- `drivers.<id>` holds class, gang/button count, capabilities, the HomeKit service Homey exposes, the capabilities HomeKit does not show natively and the compensation rule (flow card / custom capability / setting, t722u/t723u).
- Never removes anything. `unverified` is a review flag: before any removal, run the full source check (t730u).
- Additive data only; nothing is read at pairing time. No house/user data.
- P3200: a couple listed in source is not proof it ships. User-reported couples go in `data/leads/reported-couples.json`; `tools/ci/reported-couples-publish-survival.js` checks they survive publish compaction. User reports are presumed true (docs/rules/USER_REPORTS_PRESUMED_TRUE.md).
- P3207: manifest `bindings` follow the SSOT only for clusters every couple of the driver serves; the rest live in `lib/zigbee/data/runtime-bindings.json` and are bound at runtime when the node has them (docs/rules/DYNAMIC_ADAPTATION.md).
