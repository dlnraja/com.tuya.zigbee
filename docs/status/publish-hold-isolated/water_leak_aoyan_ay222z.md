# water_leak_aoyan_ay222z: isolated by the P3095 hold bisect

- Date (UTC): 2026-11-03T12:05:32.237Z
- Build: ? v9.0.1616 run 41629123269
- Athom result: AggregateError with only this driver released, so it stays in config/publish-hold-drivers.json.
- Hypothesis (P3243): manifest-size-limit: 4 distinct never-published drivers refused alone (heiman_keyfob, heiman_siren, presence_radar_aoyan_ay204t, water_leak_aoyan_ay222z); shrink manifest before releasing more
- Next: check its driver.compose.json (fingerprints, capabilities, settings, images, flow cards) against a Test build; no Athom contact.
