# FAQ — recurring problems and fixes

- **Device pairs as "Zigbee Device"/generic socket** → the exact manufacturerName+productId is missing from the right driver; add it (one couple one driver). See leads.md.
- **Buttons/flows don't fire** → remote in scene vs dimmer mode, missing BoundCluster, or dedup too aggressive; handled by ButtonEventRouter (P2926).
- **Clock wrong on LCD sensors/TRVs** → device asks time via EF00 0x24 on wake; answered with UTC+local (time sync module).
- **App crashes / out of memory** → bounded caches and queues, no full-manifest loads at runtime (Peter 10/10, Bastien v1.0.161 fixes).
- **Publish fails with socket hang up / processing_failed** → Athom-side; see athom-build.md.
- **Sleepy sensor settings never apply** → writes are queued and flushed on wake.
- **Soil sensor humidity wrong (ZG-303Z / AY-303Z)** → native 0x0405 = soil moisture, DP109 = air humidity.
- **Temp/humidity sensor paired as switch** → couple was in a switch driver; moved to sensor driver, devices self-heal class (_TZ3000_bjawzodf).
