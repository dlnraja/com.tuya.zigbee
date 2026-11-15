# siren_moes_mg_bjq002: isolated by the P3095 hold bisect

- Date (UTC): 2026-11-15T10:17:12.688Z
- Build: ? v9.0.1622 run 43700362228
- Athom result: AggregateError with only this driver released, so it stays in config/publish-hold-drivers.json.
- Hypothesis (P3243): manifest-size-limit: 5 distinct never-published drivers refused alone (heiman_keyfob, heiman_siren, presence_radar_aoyan_ay204t, water_leak_aoyan_ay222z, siren_moes_mg_bjq002); shrink manifest before releasing more
- Next: check its driver.compose.json (fingerprints, capabilities, settings, images, flow cards) against a Test build; no Athom contact.
