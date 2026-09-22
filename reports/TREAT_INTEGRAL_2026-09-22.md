# TREAT INTEGRAL — 2026-09-22 (L99)

Silent only. No forum POST (T157628). Lock mfr+pid only. Dual-app BOTH reliability.

## Live Homey Test tips (Gmail confirm)

| Track | App ID | Tip | Build | Status |
|-------|--------|-----|------:|--------|
| Universal | `com.dlnraja.tuya.zigbee` | **9.0.1182** | #3331 | testing |
| Stable | `com.dlnraja.tuya.zigbee.stable` | **5.12.300** | #215 | testing |
| Bastien | `com.dlnraja.tuya.zigbee.bastien` | **1.0.58** | #68 | testing |

## Diag / crash map (right app)

| Signal | App @ mail | Root cause | Verdict | User action |
|--------|------------|------------|---------|-------------|
| **149bc1a5** | Universal **9.0.1165** | HEAP OOM `JSON.parse` broad fingerprints | **FIXED** P2674+P2678 tip ≥**9.0.1182** | Update Test + reboot app |
| **cb3c0c87** (+ Bastien diags ≤1.0.51) | Bastien ≤**1.0.51** | `MODULE_NOT_FOUND` homey-zigbeedriver | **FIXED** P2676 tip ≥**1.0.55** (prefer **1.0.58**) | Update Bastien; drop Homey Virtual tiles; re-pair |
| Stable crash **5.12.288/290** | Stable | Tip-lag radar / soft-require | Tip **5.12.300** already | Update Stable Test |
| Soft couple `kfu8zapd`+TS0044 | — | Was mis-routed in soft-hypotheses | **P2679** → `button_wireless_4` only | Re-pair Wireless 4-Button if wrong tile |
| Soft couple `wkai4ga5`+TS0044 | — | Was mis-routed in soft-hypotheses | **P2679** → `scene_switch_4` only | Re-pair Scene 4-gang if wrong tile |
| GH #550 `gkfbdvyx`+TS0601 | ≤9.0.1059 | Presence RX / phantom onoff | Tip-lag | Update + re-pair |
| GH #551 `famkxci2`+TS0043 | ≤9.0.1086 | Wrong Generic tile | Compose OK | Update + re-pair Wireless 3-Button |
| GH #553 | tip-lag | Already coded on tip | No invent | Update Test |

## Ships this integral cycle

### Master (Universal) — BOTH where noted
1. **P2674/P2675/P2678** — boot JsonParse OOM harden + curated FP + dynamic `fp-shards` (Buffer parse, batched load)
2. **P2676** — soft-require `homey-zigbeedriver` (also Bastien)
3. **P2677** — HOBEIAN Athom case forms + OCR `heobian` → runtime caseless
4. **P2679** — lock sacred couples:
   - `_TZ3000_kfu8zapd`+`TS0044` → `button_wireless_4` (forbid scene)
   - `_TZ3000_wkai4ga5`+`TS0044` → `scene_switch_4` (forbid button_wireless_4)
5. Soft-hypotheses SSOT corrected (was inverted)
6. Gates: `npm run check:p2674`…`p2679` / `check:p267x`

### Stable — surgical BOTH
1. HOBEIAN multi-case mfs keys synced
2. `align-mfs-db-intelligent` P2671 brand-multi intentional skip + preserve case brands
3. Compose couples mirrored (kfu8 / wkai)
4. `align-mfs-db-intelligent --check` **green** (was high-severity Heobian orphan)

### Bastien
1. P2676 soft-require already on tip **1.0.58** #68
2. Tip-lag for MODULE_NOT_FOUND diags @ ≤1.0.51 — user update only

## Forum / inbox

- SHADOW only — processor + compensate reports under `reports/compensate-2026-09-22/`, `reports/l99-inbox-2026-09-22/`
- No Discourse POST / PM reply
- NEED_INTERVIEW kept for MISSING_PID posts (never invent pid)

## User checklist

1. **Universal Test** → install **≥9.0.1182** (after Auto-Publish if a new bump ships)
2. **Stable Test** → **≥5.12.300**
3. **Bastien** → **≥1.0.58**; remove Homey Virtual devices; re-pair under Bastien
4. Wrong button tile after soft-couple fix → remove + re-pair (Homey cannot hot-swap drivers)
5. Do **not** spam Stable republish while #215 testing healthy

## Dual-app classify

| Change | Class |
|--------|-------|
| OOM / zigbeedriver soft-require / HOBEIAN caseless / sacred couples / mfs multi-brand | **BOTH** |
| fp-shards dynamic / Daylight / IR UX | MASTER_ONLY (fp-shards on master; stable gets surgical OOM-safe paths already tip) |
