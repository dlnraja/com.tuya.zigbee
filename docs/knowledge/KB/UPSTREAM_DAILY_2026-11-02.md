# Upstream daily, 2026-11-02

Previous run (01/11) was fine, so this is a normal incremental run.

Clones moved since 01/11: tuya-local dcb0d40→2931535 (lawn_mower stop action, Wi-Fi only, no Zigbee impact), Athom zigbee-clusters b859be7→2add8be, z2m docs a55fd7d→f2cc3d9b5 (zhc bump, new device pages, 32-bit deprecation notice), Tasmota 9107ce7→a470373. Unchanged: zhc c18c32d (npm 26.125.0 still latest), herdsman, ZHA quirks, deCONZ, Blakadder, tinytuya, localtuya, Johan, zigbee-OTA, SmartThings, Hubitat, ioBroker, Domoticz.

## Coverage matrix (all sources)
| branch | absent | complete | wrong class | partial | compacted |
|---|---|---|---|---|---|
| master | 528→521 | 680→680 | 1→1 | 161→163 | 2208→2213 |
| stable-v5 | 547→546 | 575→576 | 9→9 | 130→129 | 2317→2318 |
| bastien-home | 474→474 | 630→628 | 7→7 | 142→140 | 2325→2329 |

Gains come from the 01/11 work (P3190 iwn0gpzz to power_meter, P3191 wbhaespm to smart_breaker, xpq2rzhq now complete in presence_sensor_radar on all three branches, awepdiwi complete on stable and bastien via P3200) and from new TS0601 couples now present in source as universal_zigbee (HYT001ZB, APRM-04-005, 119710, SP107E, ZAS-01P, floor thermostat 0hhou4yj, ECD-ZB-REPEATER).

## Lost to publish compaction (budget full, parked, not pinned)
The publish payload sits at the cap (master 15498/15500, bastien 15500/15500), so new pins pushed other couples out of the rebuilt payload. They are still in the source drivers. These couples went from complete to dropped since 01/11:
- master: `_TZ3000_5rpu3r0d`/TS0001 (dimmer_wall_1gang), `_TZ3000_cehuw1lw`/TS011F and TS0121 (now smartplug, dropped), `_TZ3000_pcqjmcud`/TS004F (smart_knob_rotary, case-only to dropped).
- bastien-home: `_TZ3000_8ybe88nf`/RH3052 and TS0201 (temphumidsensor), `_TZ3000_ynmowqk2`/TS011F, TS0121, TSO121 (smartplug). Check against Bastien's inventory before any pin.
- stable-v5: `_TZE200_a7sghmms`/TS0601 (water_valve_smart).
Pinning any of them needs freed budget (another P3057-style headroom step), since pins only displace other couples. Listed in data/leads/kb-compaction-losses-2026-11-02.json.

## Lessons from upstream
- Athom zigbee-clusters (PR #263, 1e926b1) now emits `attr.<id>` for attributes it doesn't know in a report. Once Homey ships that version, unknown manufacturer attributes can be caught with a listener instead of raw frame parsing; keep our raw fallback until then.
- zigbee-clusters #259 splits readAttributes requests so they fit in one frame, and #258 bounds the read retry loop. Our multi-attribute reads should stay small (a few attributes per call) on current firmware, which matches what we already do.
- zigbee-clusters #262 removes the binding on unbind.

## Unknown commands
Nothing new. Issues #581/#584 are compaction losses handled by P3200; #559 and #550 are already answered. Mail diags were covered by the mails routine up to 01/11 23:10.

## Forum
Covered by the GHA forum sweep, no new run needed here.
