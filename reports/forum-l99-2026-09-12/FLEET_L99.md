# Forum L99 fleet — 2026-09-12 (silent)

Highest T140352: **#2235**. Athom Test tip confirmed: **v9.0.902** (build #3171, P2481 preempt soft-fail).  
Stable Publish **5.12.174** promotion failed Athom tiers (P139 — do not spam).  
Forum POST: **never** (T157628).

## Hot posts — treat matrix

| Post | User | Tip seen | Symptom | Couple | Verdict | User action |
|------|------|----------|---------|--------|---------|-------------|
| **#2235** | Peter | **9.0.895** (OCR crash UI) | App **Gecrasht**; all tiles “Geen reactie”; diag `375def7f-…` | n/a (serializer) | **RESOLVED in tip** — Gmail crashes 9.0.891/895 = `Driver Not Initialized` / `Invalid Driver ID: **motionsensor**` → P2480/P2481 | Update Universal Tuya Test **≥9.0.902**, restart app |
| #2234 | Peter | 9.0.881 | Smartbutton clicks OK; battery `?`; no History | `_TZ3000_mrpevh8p`+`TS0041` | P2470 shipped ≥9.0.888; History = Homey Insights empty until paint / no button activity log | Update ≥9.0.902; press button once after update |
| #2233 | Peter | 9.0.882 | Reinstall Smartbutton; battery `?`; diag `8afffc76` | same | same P2470 | Update ≥9.0.902 |
| #2232 | VicHY | — | “can you see that?” (refs **#2231 deleted**) | `_TZE204_clrdrnya`+`TS0601` | Image gone; class = phantom battery / curtain UI → P2472a/P2477 | Update ≥9.0.902; re-pair only if still curtain tile |
| #2230 | Peter | — | Smartbutton flicker | mrpevh8p+TS0041 | P2461/P2440 tip lag | Update ≥9.0.902 |
| #2228 | Eduard | — | tubular motor | `_TZE284_fodv6bkr`+`TS0601` | LOCKED `curtain_motor` | Update + re-pair |
| #2229 | MIAMO | — | AM43 | `_TZE200_icka1clh`+`TS0601` | LOCKED `curtain_motor` P2461 | Update + re-pair |
| #2224–27 | VicHY | 9.0.791→newer | curtain UI + low battery flood | clrdrnya+TS0601 | P2340/P2472a tip lag | Update ≥9.0.902 |
| #2218 | Joep | — | irrigation Unknown | `_TZE284_fhvpaltk`+`TS0601` | P2473 EF00-only | Update ≥9.0.902 + re-pair |
| #2213 | meter91 | — | TS0044 unknown | `_TZ3000_zgyzgdua`+`TS0044` | LOCKED `scene_switch_4` | Update + remove/re-pair; never paste networkKey |

## Satellite topics (silent)

| Topic | Notes |
|-------|--------|
| T158757 Gabriel | HomeSuite author thread — NovaDigital couples already sacred-kept; no invent Cartesian; tip lag |
| T156967 #68 salvagr | Moes `_TZE204_5slehgeo`+`TS0601` → P2478 mid-% / DP2; tip lag. Later #74–78 = **SergeP MOES app**, not Universal |
| T157859 / T157628 | RF/education + AI-paste policy — read-only |
| Silent scan junk FP | `_TZE2841000000_3MZB0SDZ` — **do not apply** |

## Evidence

- Crash Gmail thread (Homey Pro 2026): `motionsensor` on **9.0.891** + **9.0.895** (same stack as Peter screenshot tip).
- OCR #2235: Universal Tuya **9.0.895** + Experimental + **Gecrasht**.
- OCR #2233/#2234: battery `?` on Smartbutton; SOS Fariba/Peter % visible.
- Diag UUID `375def7f` not yet in local Gmail diag dump (crash mail path only) — treat from crash class + OCR tip.

## Code status

| Patch | Status |
|-------|--------|
| P2481 preempt `isForeignDriverId` before Homey getDriver | **Live Test 9.0.902** + stable backport attempted |
| P2470 Smartbutton battery paint | Live ≥9.0.888 |
| P2472a/P2477 VicHY mains radar | Live ≥9.0.889 |
| P2473 EF00-only interview | Live ≥9.0.890 |
| P2478 Moes ZTS | In tip chain |

## Do not

- Forum / PM reply
- Invent pid for #2190 / VicHY deleted #2231 / Stefan junk
- Force Stable republish loop (P139)

Artifacts: `FLEET_LAST80.json`, `LATEST_2231-2235.json`, `images/post-223*-orig-*.jpg`, `../forum-verify-2026-09-12/PROCESS.md`
