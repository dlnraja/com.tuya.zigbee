# Couple source policy (SSOT)

**Rule (user decision 2026-10-11):** One reliable source is enough for an exact productId and an exact mfr+pid couple (user rule 2026-10-11): Z2M, ZHA, deCONZ, Johan, blakadder, SmartThings/Hubitat lists, Z2S, a user diagnostic. Record the source per couple (registry/pins/mfs_db). Never invent; skip only when the pid is ambiguous (the source lists several pids for the mfr). Place in the driver matching the device type, W4 move with curated removals and pins. Quirks/behaviour workarounds keep their own ≥2-source rule.

- Applies to: lead promotion, lost-couple restores, forum/GitHub/Johan couples, exact pid additions.
- Doesn't apply to: firmware quirks/behaviour workarounds (they still need ≥2 sources or a diagnostic,
  W12), or value-agreement checks in SmartDataValidator.
- Recording: `data/user-misattribution-registry.json` `sources`, `config/architecture/couple-driver-pins.json`
  `source`, and mfs_db `source`.
- Ambiguous pid examples: a Homey or Johan driver listing TS0003/TS0013/TS0043 for one mfr, with no source
  naming the exact pid. Skip those until one source names the exact pid.
- Supersedes the earlier "second source" practice in docs/knowledge/LOST_COUPLES_RESTORE_2026-10-11.md.
