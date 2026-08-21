# FORUM LATEST — topic 140352 #2183 through newest

READ ONLY. No Homey Community post / like / reply. No invented pid.

| | |
|--|--|
| Topic | [APP][Pro] Universal TUYA Zigbee Device App - test |
| URL | https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352 |
| Topic id | 140352 |
| Scan PT | **2026-08-22 00:03 PT** (Europe/Paris UTC+2) |
| Scan UTC | 2026-08-21T22:03Z |
| Sources | WebFetch HTML `/2190` `/2191` `/2192` `/2183` `/2184` `/2185` `/2186` `/2188` `/2189`; Discourse JSON `/t/140352.json`, `/t/140352/last.json`, `/t/140352/2190.json`, `/t/140352/2191.json`, `/t/140352/2192.json`, `/t/140352.json?page=110`; WebSearch `site:community.homey.app 140352 after:2026-08-20` |
| Cross | `/workspace/ingest-2026-08-21/FULL_SOURCE_SWEEP.md` (23:05 PT 21/08) · `forum-new.md` (21:50 PT 21/08) |
| **highest_post_number** | **2190** |
| last_posted_at UTC | 2026-08-21T19:22:42.668Z |
| last_posted_at PT | **21/08 21:22 PT** |
| last_poster | Peter_van_Werkhoven |
| last stream id | **770651** = #2190 |
| Live Test seen by users | **v9.0.617** Experimental (Peter #2190 screenshot 1000041137, phone 21:07) |

## Verdict vs prior ingest

**0 posts NEW since `forum-new.md` / FULL_SOURCE_SWEEP.** Thread has not moved.

- `forum-new.md` already had #2190 as the single new post after #2189.
- FULL_SOURCE_SWEEP already had `highest_post_number **2190** (no #2191+)`.
- This scan (≈2.5 h later, now 00:03 PT 22/08) re-fetched live JSON: still **2190**. Stream still ends `770651`. `last_posted_at` unchanged.

**#2191 and #2192 do not exist.** Fetching `/140352/2191`, `/2192`, `/2191.json`, `/2192.json` is Discourse fallback: returns the last-page chunk starting at **#2171** (dlnraja Zemismart ZB-L03C-H / TS0043). `current_post_number` in those JSON responses is **2190**, not 2191. Do **not** treat the fallback HTML as a new post.

WebSearch `after:2026-08-20` did not surface any 2191+; results were stale pages (page 100 / #2139 / #2075).

Page `?page=110` JSON exists and is the last chunk: posts **#2179–#2190**. HTML `?page=110` timed out; JSON is authoritative.

Couple rule (unchanged): manufacturerName + productId **only if written in the post**. Peter posts **lack mfr**. Do **not** fill `_TZ3000_k4ej3ww2`+TS0207 or `_TZ3000_mrpevh8p`+TS0041 from compose onto Peter tiles.

---

## Tonight patch status (from FULL_SOURCE_SWEEP — still valid)

Users’ live evidence is **9.0.617**. Git later tonight stamped 9.0.618 (TS0044 0xFD) then 9.0.619 (version stamp). **No user post after 21:22 PT confirming they updated.**

| Patch | In git tonight? | On live 9.0.617? | Affects which post |
|--|--|--|--|
| **TS0044 0xFD + skip 0x8004** | YES master `1f18cb336` / Auto-Publish → Test **9.0.618** | **NO** | meter91 #2189 |
| **IAS zoneStatus coerce** | YES master `8e46a953f` | **NO** | Peter #2190 contact pulse (`0x[object Object]` in Gmail `0cea6870`) |
| **Leftover EF00 / HYBRID skip (IAS-only)** | DRAFT on box only. Not HEAD. | **NO** | Peter water + smartbutton #2184/#2190 |
| **SOS battery glitchy** | **Not** a dedicated tonight patch | **NO** | Peter #2190 NEW vs #2184 |
| **Contact luminance plateau** | **Not** a dedicated tonight patch | **NO** | Peter #2190 |
| **k4ej `_TZ3000_k4ej3ww2`+TS0207** | NOT tonight. STABLE_ONLY compose hole. | n/a — **Peter never cites this couple** | **DO NOT LOCK FROM FORUM** |

---

## Posts #2183 → #2190 (and 2191+ absence)

### #2183 — Peter_van_Werkhoven — 18/08 **17:47 PT**

| | |
|--|--|
| post id | 769110 |
| created_at UTC | 2026-08-18T15:47:48.694Z |
| url | https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352/2183 |
| app version cited | **none in text**. Screenshots 1000040728/0729 (FULL_SOURCE_SWEEP A4 / local `reports/forum-2183/`) show Universal Tuya **v9.0.589** Experimental |
| diagnostic UUID | **`e181bc15-ebb8-4a6f-a08a-b00b5fe71552`** and **`4577486f-4233-4106-9dcf-dc1fe4dc43ab`** |
| mfr | **ABSENT** |
| pid | **ABSENT** (TS0207 **not** in post) |
| couple | **NON — do not invent** |

**Screenshots:** 1000040729 + 1000040728 — Homey tiles + RAM companion. FULL_SOURCE_SWEEP: Raam×3 lux, Smartbutton, SOS Peter 54%, Waterdetector 80%. **No mfr/pid in images.**

**Symptom:** App using too much memory; Flows don’t run; devices hard to start. SOS, Smartbutton, Waterdetector, Door/Window sensors all not functioning normally.

**Already patched tonight?** Lineage of IAS coerce + leftover skip. Coerce **in git**, leftover **draft**, **not** on later 9.0.617 live. Gmail only, **no local dump** (FULL_SOURCE_SWEEP A3).

---

### #2184 — Peter_van_Werkhoven — 19/08 **12:37 PT**

| | |
|--|--|
| post id | 769404 |
| created_at UTC | 2026-08-19T10:37:14.180Z |
| url | https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352/2184 |
| app version cited | **9.0.596** (text: “updated the app to version 9.0.596”). Screenshot 1000040782 (`forum-scan/peter-2184.jpeg`) confirms **v9.0.596 Experimental** |
| diagnostic UUID | **`1cf775a2-be97-4b3c-88c4-c29c83bf11d4`** |
| mfr | **ABSENT** |
| pid | **ABSENT** (TS0207 **NOT cited** — same as FULL_SOURCE_SWEEP / forum-new.md) |
| couple | **NON** |

**Screenshot 1000040782 (phone 12:31):** Universal Tuya v9.0.596 Experimental. Tiles: Raam Computerkamer (Contact), Raam onze slpkamer, Raam Slpkamer voor, Smartbutton **100%**, SOS Fariba **18% red**, SOS Peter **54%**, Waterlek Sensor **80%**. Flows: Alarm Waterlekkage / Ramen 1e Verdieping…. **No fingerprint.**

**Symptom:** SOS buttons work again after delete + Homey restart + re-add on 9.0.596. Waterleak + Smartbutton still not. Night before: had to disable the app because Flows didn’t run and devices couldn’t be switched off manually.

**Already patched tonight?** SOS recovery is the #2184 win (pre-tonight). Water leftover 11 DP + smartbutton HYBRID none — leftover skip **draft, not HEAD**. Local dump YES (`1cf775a2`). Couple still ABSENT in dump (FULL_SOURCE_SWEEP).

---

### #2185 — Zemismart_Official — 20/08 **11:49 PT**

| | |
|--|--|
| post id | 769872 |
| created_at UTC | 2026-08-20T09:49:25.260Z |
| app version | **none** |
| diagnostic UUID | **none** |
| mfr | **ABSENT** |
| pid | **ABSENT** |
| commercial name in text | ZMS-206 (“the one with screen”) — **not** a `_TZ`/`TS` couple |

**Symptom / content:** Asks Gabriel whether the 4-gang ZCL is Zemismart module ZMS-206.

**Already patched tonight?** n/a — Zemismart/Gabriel thread, not a Universal Tuya Test bug. TB25 steal is STABLE_ONLY in NEXT_PATCHES, **not patched tonight**.

---

### #2186 — Gabriel_Pedrosa_Mach — 20/08 **14:33 PT**

| | |
|--|--|
| post id | 769958 |
| created_at UTC | 2026-08-20T12:33:50.392Z |
| app version | **none** (his app `com.gpm.homesuite`, not Universal Tuya) |
| diagnostic UUID | **none** |
| mfr **written** | **`_TZ3000_lwthnp7j`** (GitHub interview filename in URL) |
| pid | **ABSENT in post text** — filename is `_TZ3000_lwthnp7j.txt` only. **Do not invent TS0004** onto this post (FULL_SOURCE_SWEEP item 11 / DEVICE_TRUTH wants TS0004 + `wall_switch_4gang_1way` — catalog ≠ this post) |
| couple | **INCOMPLETE** — mfr only |

**Screenshot:** none on this post. Interview link: `gpmachado/com.gpm.homesuite` `Homey_Interview/4G touch/_TZ3000_lwthnp7j.txt`.

**Symptom / content:** 4-gang ZCL = Brazil Novadigital 4-key touch, not ZMS-206. Shared ZCL lib for Novadigital 1/2/3 and 4gang touch; Novadigital 4 and 6 gang are Tuya EF00.

**Already patched tonight?** No. Not a Universal Tuya user-filed UUID.

---

### #2187 — smarthomesven (Sven) — 20/08 **14:47 PT**

| | |
|--|--|
| post id | 769968 |
| created_at UTC | 2026-08-20T12:47:09.604Z |
| app version | none |
| diagnostic UUID | none |
| mfr / pid | **ABSENT** (quotes Gabriel’s broken URL) |

**Symptom / content:** Gabriel’s first interview URL 404s. Points to `…/tree/main/Homey_Interview`.

**Already patched tonight?** n/a — link hygiene.

---

### #2188 — Gabriel_Pedrosa_Mach — 20/08 **16:28 PT**

| | |
|--|--|
| post id | 770066 |
| created_at UTC | 2026-08-20T14:28:04.112Z |
| app version | none |
| diagnostic UUID | none |
| mfr **written** | **`_TZ3000_lwthnp7j`** (same filename) |
| pid | **ABSENT** |

**Screenshot:** none. Corrected GitHub blob URL.

**Already patched tonight?** No. Same as #2186.

---

### #2189 — meter91 — 21/08 **14:51 PT** — NEW vs #2183 lineage / first of 21/08

| | |
|--|--|
| post id | 770534 |
| created_at UTC | 2026-08-21T12:51:38.641Z |
| url | https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352/2189 |
| app version cited | **none in post text**. Gmail diag `55e3e591` = **9.0.617** Homey Early 2019 (FULL_SOURCE_SWEEP) |
| diagnostic UUID **in post** | **none** (forum post has no code). Gmail correlate **`55e3e591-2d4d-4230-a8b6-d521a6ab5b18`** (12:56 PT same day) |
| mfr **written** | **`_TZ3000_zgyzgdua`** |
| pid **written** | **`TS0044`** |
| couple | **YES — both cited** `_TZ3000_zgyzgdua` + `TS0044` |
| commercial | MOES 4-way switch / Homey Pro 2019 |

**Screenshot (toast PNG, 435×250):** Homey nag — Device **"Scèneschakelaar 4-voudig" needs driver change!** Current: **`scene_switch_4`**. Recommended: **`button_wireless_4`**. “Please re-pair with the correct driver for full functionality.” Timestamp “een minuut geleden”. **No mfr/pid in the PNG** (couple is in post text). Same file on box: `forum-scan/toast-2189.png`.

**Symptom:** Physical buttons dead; in-app control works. Toast appears **regardless of which device type is selected during pairing**.

**Already patched tonight?** **0xFD + skip 0x8004 IN GIT** (master `1f18cb336`, Auto-Publish → Test **9.0.618**). User still on **9.0.617** at post/diag time. **NOT CONFIRMED ON USER.** No follow-up post after 14:51 PT. Write `32772` invalid / FLOW 1gang-on-4gang is Gmail dump, not in the forum text.

---

### #2190 — Peter_van_Werkhoven — 21/08 **21:22 PT** — newest live post

| | |
|--|--|
| post id | **770651** |
| created_at UTC | 2026-08-21T19:22:42.668Z |
| url | https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352/2190 |
| reply_to | none |
| app version cited | **none in text**. Screenshot 1000041137 (phone **21:07**) = Universal Tuya **v9.0.617 Experimental** |
| diagnostic UUID | **`0cea6870-69dd-4a98-abdd-e35273699e7d`** (NEW vs #2184 `1cf775a2`) |
| mfr | **ABSENT** (no `_TZxxxx` / `_TZExxx` in post) |
| pid | **ABSENT** (no `TSxxxx`. **TS0207 NOT in the post**) |
| couple | **NON — do not invent. Do not glue k4ej / mrpevh8p / 0dumfk2z from compose or from older Peter posts (#2066 era) onto these tiles.** |
| toast | none |

**Verbatim (text only):**

> Hi Dylan Good evening, SOS button’s still working fine, only Battery is very Nervous/Glitchy
>
> Contact sensors are not switching open/close but only acting as puls contact, also Luminance is not correct 1st picture is this contact Lum and 2nd picture is as it should be from another type contact/Luminance sensor.
>
> Waterdetector and Smartbutton still not working.
>
> Diagnostic code 0cea6870-69dd-4a98-abdd-e35273699e7d
>
> Good luck and thanks again for your effort Peter.

**Screenshots (box `ingest-2026-08-21/images/`; none show mfr/pid):**

| File | What |
|--|--|
| **1000041136** (Tijdlijn, ~20:55) | SOS Fariba / SOS Peter battery flip **bijna leeg ↔ weer OK** all day (07:11, 11:11, 13:06 same-minute OK then empty for Peter, 15:11…). Flows doorbell / zon / jacuzzi OK. |
| **1000041137** (Universal Tuya **21:07**) | **v9.0.617 Experimental**. Tiles: Raam Computerkamer **206 lx** · Raam onze slpkamer **236 lx** · Raam Slpkamer voor **121 lx** · Smartbutton (no status) · SOS Fariba **15% red** · SOS Peter **15% red** · Waterdetector **75% green**. **No fingerprint.** |
| **1000041134** “1st picture this contact Lum” | Device **Raam onze slpkamer** / Helderheid 24h — plateau ~60–100 lx, late spike. Stuck vs day/night. |
| **1000041135** “as it should be” | Device **2e Verdieping Wasruimteraam** / Helderheid — night ~0, day 400–1000+ lx. Other type; **Universal Tuya not cited** on this tile. |

**Symptoms (cited only):**

1. **SOS** — buttons still OK (same as #2184). **NEW vs #2184:** battery nervous/glitchy (both SOS tiles 15% red; timeline low↔OK). #2184 had Fariba 18% / Peter 54% — not described as glitchy then.
2. **Contact** — **NEW vs #2184:** not open/close latch, **pulse only**. Luminance wrong on Tuya contact (plateau) vs other-type window (OK).
3. **Waterdetector + Smartbutton** — **still dead** (same as #2184). No mfr. No pid.

**Already patched tonight?**

| Symptom | Patch | On 9.0.617? |
|--|--|--|
| Contact pulse (`0x[object Object]` in Gmail `0cea6870`) | IAS zoneStatus coerce **in git** | **NO** |
| Water + smartbutton dead | leftover EF00/HYBRID skip **draft only** | **NO** |
| SOS battery glitchy | no dedicated tonight item | **NO** |
| Contact lux plateau | no dedicated tonight item | **NO** |

Gmail `0cea6870` is **9.0.617 Homey Pro 2023**, couple **ABSENT** in dump. Local dump **ABSENT** (FULL_SOURCE_SWEEP A3).

---

### #2191 / #2192 / 2193+ — **DO NOT EXIST**

| Probe | Result |
|--|--|
| HTML `/2191` `/2192` | Fallback page titled as those numbers but body is **#2171** dlnraja (ZB-L03C-H / **TS0043** pid only, mfr ABSENT) — Discourse last-chunk render |
| JSON `/2191.json` `/2192.json` | Same last-page posts #2171–#2190. `highest_post_number`: **2190**. `current_post_number`: **2190**. Stream last: **770651** |
| `/last.json` | Same. `last_posted_at` 2026-08-21T19:22:42.668Z |
| Topic root JSON | `highest_post_number`: **2190** |
| `?page=110` JSON | Posts #2179–#2190; ends at Peter #2190 |

Do **not** catalog #2171’s TS0043 / ZB-L03C-H as a 2191+ bug. That post is 17/08.

---

## Cross-check table vs FULL_SOURCE_SWEEP + forum-new.md

| Post | This scan vs prior | Couple this scan | UUID | Patched tonight? |
|--|--|--|--|--|
| #2183 Peter | unchanged | ABSENT | e181bc15, 4577486f | lineage; coerce git / not live |
| #2184 Peter | unchanged | ABSENT | 1cf775a2 | leftover **draft** |
| #2185 Zemismart | unchanged | none | none | n/a |
| #2186 Gabriel | unchanged | `_TZ3000_lwthnp7j` pid **ABSENT** | none | do not invent TS0004 |
| #2187 Sven | unchanged | none | none | n/a |
| #2188 Gabriel | unchanged | `_TZ3000_lwthnp7j` pid **ABSENT** | none | same |
| #2189 meter91 | unchanged; still no follow-up | **`_TZ3000_zgyzgdua`+`TS0044`** | post none; Gmail `55e3e591` | 0xFD **git**; user **9.0.617** |
| #2190 Peter | **still newest** | **ABSENT** | `0cea6870` | coerce git / skip draft / batt+lux **unpatched** |
| #2191+ | **confirmed absent** (was already “no #2191” in both prior files) | — | — | — |

No disagreement with `forum-new.md` or FULL_SOURCE_SWEEP on fingerprints. This file adds: live re-confirm at 00:03 PT 22/08, page-110 JSON, 2191/2192 fallback documented, #2185/#2187/#2188 rows, screenshot re-read of 1000041134–1137 + toast + peter-2184.

---

## Unreplied (do not reply)

community-inbox (FULL_SOURCE_SWEEP, 21:34 PT) listed 11 unreplied including **#2190 Peter** and **#2189 meter91**. Still unreplied at this scan (`reply_count`: 0 on both). **0 forum actions this agent.**

---

## Non-actions (honored)

- 0 Homey Community posts / likes / replies
- 0 invented productId (Peter water/button/contact/SOS still unmarked)
- 0 compose k4ej/`TS0207` locked onto Peter
- 0 treating Discourse `/2191` fallback as a new post
