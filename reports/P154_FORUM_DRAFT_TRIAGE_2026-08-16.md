# P154 — Forum draft triage (do NOT paste full pack) — 2026-08-16

## Already posted / OK to keep
First block (“Hey all… Thanks for sticking with this”) ≈ #2165 — honest, human, fine.

## Do NOT publish the rest as-is

| Claim in the draft | Reality |
|--------------------|---------|
| Homey picks by mfr + modelId, not pairing tile | **True** (keep if you ever add a short note) |
| Same couple on different products is hard | **True** |
| “Smart fallback: try multiple drivers after pair” | **False / impossible** on Homey SDK3 — refuse |
| “Manual change driver in device settings” | **Not an app feature we can ship as standard** — refuse promise |
| “Universal fallback templates already” | Over-sell; we do sacred couples + registry + re-pair |
| Emoji roadmap / community-management wall | T157628 — refuse |

## If Dylan wants ONE short follow-up later (optional)

Use `reports/P153_OPTIONAL_FORUM_NOTE.txt` Mike section only — or the block below. No auto-post.

```text
Quick note on pairing: Homey does not use the tile you tap to pick the final driver. It matches manufacturerName + productId from the device against the app. If a socket ends up as motion, that couple was listed on the wrong driver in the manifest — we fix those locks in the Test builds and you usually need to remove + re-pair once after the update. There is no way for the app to “try five drivers” after pair like some other hubs.

Please keep sending Homey diagnostic codes + _TZ… + TS… . Test: https://homey.app/a/com.dlnraja.tuya.zigbee/test/
```

## Ship instead (silent)
Pairing locks, dual-claim cleanup, Peter soak on Test, CONTRIBUTING already documents Homey picker mechanics.
