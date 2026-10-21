# Forum patterns — topic 140352 (read 21/10/2026, posts #2204–#2265)

Source: Homey Community topic 140352 "[APP][Pro] Universal TUYA Zigbee Device App - test",
https://community.homey.app/t/140352 (read-only, public JSON). Summarised in our own words; no quotes, no personal data
(diagnostic ids, network keys and screenshots are deliberately left out).

## Recurring failure shapes
| Shape | What users see | What it meant for us | Posts |
|---|---|---|---|
| Unknown Zigbee Device | pairs but lands on Homey's generic driver | couple (mfr+pid) missing, or a long/padded mfr variant | #2207 #2218 #2228 #2263 #2264 #2265 |
| Wrong class after update | radar turns into "curtain"/blind | stored DP settings restored as cover caps; fixed by class lock + cache flush on Repair | #2219 #2222 #2225 #2227 #2241 #2249–#2252 |
| Recognised but dead | correct driver, no control | DP map of the variant missing (TRV ZG253, AM43 blind) | #2206 #2229 #2253 |
| Button flows silent / no battery | presses not reaching Flows, battery empty | button routing + battery DP/attr fallback | #2209 #2220 #2230–#2239 |
| App crash after update | app restarts | memory/timer regressions, fixed in later builds | #2235 #2259 #2260 |
| Whitelabel request | "same as X, add fingerprint" | exact couple to the sibling driver (AOYAN AY-303Z → soil_sensor) | #2258 |

## Lessons (applied)
- A user-visible "Repair" that flushes stored capabilities is part of the fix path for class drift — keep it documented in FAQ.
- Ask for: manufacturerName, modelId, interview, diagnostic id; warn people to redact the network key (#2214).
- Long manufacturer names (`_TZE2841000000_…`) are separate couples: add them exactly, never by prefix.

## Coverage check (21/10/2026, kb/import)
All couples requested in #2244–#2265 are now on exactly one driver:
`_TZE284_ogx8u5z6` device_radiator_valve · `_TZ3000_7y90pany` illuminance_sensor · `_TZE284_9ern5sfh` lcdtemphumidsensor ·
`_TZ3000_nrfkrgf4`/TS0046 button_wireless_6 · `_TZE2841000000_8se38w3c` climate_sensor · AOYAN AY-303Z soil_sensor.
