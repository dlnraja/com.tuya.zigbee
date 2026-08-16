# App quality vision + forum synthesis (P142) — 2026-08-16

Silent enrichment only (T157628). No forum posts.

## What users mean by “AI slop / messy”

| Signal | Evidence | Response this session |
|--------|----------|------------------------|
| Fake product name | Store showed **Unified Smart Home Engine**; forum quotes it (#2131) | Renamed to **Universal Tuya Zigbee** |
| Marketing soup tags | eWeLink / SmartThings / Sonoff on a Zigbee Tuya app | Tags → tuya, zigbee, local, switch, sensor… |
| Nonsense pairing list | `Air Purifier Soil/Contact/Dimmer…` with `_NEEDS_DEVICE_ASSIGNMENT` / `_dummy*` / `_GENERIC_*` | **12 hybrid drivers `deprecated: true`**, phantom `onoff`/`dim`/`pm25` stripped, placeholders removed |
| Hype README | “Bulletproof”, “Hue-style”, badge wall | README generator de-hyped |
| Chatty bot logs | Emoji spam in radar/contact diags | Emoji stripped from `this.log` / `this.error` lines |
| Hybrid MF revive | `restore-master-only-hybrid-mfs.js` refilled junk FPs | Script **skips** deprecated `air_purifier_*` |

## Forum themes (fresh silent scan, max 80–100/topic)

Scan: `.github/state/forum/multi-silent-digest.json` — **0 new FPs**. Pain is reliability + wrong driver, not missing fingerprints.

### Still open / soak (do not spam republish)

1. **Peter #2137** — crashes + SOS mute on some units → stay on Test ≥9.0.532 / stable ≥5.12.82; IAS/SOS path soak
2. **ZT08 #513** — P140 DP17 + unix_1970 — retest after Test >9.0.531
3. **Contact lux / polarity** (#2121–#2122) — settings invert exists; further reporting soak
4. **Water leak ZG-222Z** (#2111) — pair OK, wet silent → IAS follow-up
5. **PresentSky dimmer** — FP on `wall_dimmer_tuya`; **re-pair** if still climate
6. **Smart Life cloud** (T146735) — out of Zigbee scope

### Already shipped recently (credit silently)

- TYZB01 TS001x → switch_2/3/4gang + ZCL-only + no phantom watts (P141)
- Kanbros `_TZ3000_w5xztuy7` ZCL-only (P139)
- P139 Athom: do not cancel mid-publish
- Soil `nt4pquef` DP2 = light not moisture

## Product vision (keep this)

```
Universal Tuya Zigbee
├── master  → soak features + new FPs (Test channel)
└── stable-v5 → crash-only backports (Live / LTS)
Sacred Couple = (manufacturerName + productId)
Forum = scan everything → fix code → almost never reply
Pairing list = real devices only (no hybrid templates)
Store copy = plain English, no Engine / Unified / multi-brand soup
```

## Files touched (P142)

- `.homeycompose/app.json` + `app.json` — name, description, tags
- `drivers/air_purifier_*/driver.compose.json` (12) — deprecated + cleanup
- `drivers/air_purifier/driver.compose.json` — drop `xxxxxxxx` placeholders
- `scripts/restore-master-only-hybrid-mfs.js` — skip hybrids
- `.github/scripts/generate-readme.js` + `README.md`
- `drivers/sensor_presence_radar/device.js`, `drivers/sensor_contact_motion/device.js` — quieter logs

## Next soak checklist

- [ ] Homey Test build after push shows **Universal Tuya Zigbee**
- [ ] Pairing UI: no “Air Purifier Soil/Contact/…” for new adds
- [ ] Peter retest SOS/contact on tip
- [ ] Finnamu ZT08 retest (#513)
- [ ] PresentSky re-pair dimmer
