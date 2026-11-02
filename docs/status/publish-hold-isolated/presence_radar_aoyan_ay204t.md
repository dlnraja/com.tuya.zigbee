# presence_radar_aoyan_ay204t: isolated by the P3095 hold bisect

- Date (UTC): 2026-11-02T23:44:08.280Z
- Build: ? v9.0.1614 run 41544529677
- Athom result: AggregateError with only this driver released, so it stays in config/publish-hold-drivers.json.
- Hypothesis (P3243): manifest-size-limit: 3 distinct never-published drivers refused alone (heiman_keyfob, heiman_siren, presence_radar_aoyan_ay204t); shrink manifest before releasing more
- Next: check its driver.compose.json (fingerprints, capabilities, settings, images, flow cards) against a Test build; no Athom contact.
