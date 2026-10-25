# Upstream watch — daily KB refresh (25/10/2026)

Our own summary of what moved upstream since the 24/10 run. Nothing is copied; each point cites its source.

## Sources that changed

- **make-all/tuya-local** [7169307…c6ea798](https://github.com/make-all/tuya-local/compare/71693077336f2386873b35e1402341e1db069b63...c6ea7984d6) (24–25/10/2026). Wi-Fi only, so these are leads for the Wi-Fi/LAN layer, not Zigbee couples:
  - New product ids: Vibrix PureFlow30 purifier `igqljfdcj6hwjjir` (DPs 1, 2, 3, 5, 6, 7, 8, 18; PR #6308, ozgurclcc); Pro Breeze PB-D-18W-WF dehumidifier `006lnrrrsa2sayck` (DPs 1–7, 11–13, 101; PR #6067, surfnterd); smart plug energy v3 `rhvvzh71kuirphg2` (Wipro 16A) and `jwv5jtbscfluha0g` (10A); Aziot IR remotes `s6zyykmyh6xmfwzq`, `key54vrth5askhsj`; Siguro purifier `57rwsy9izugk0ts7`; Simpal TY-WD thermostat `hqvhlveyqzrncz9w`.
  - Parsing lesson (commit 0002e83, K-Rain KRX8 irrigation): a signal-strength value packed as the first byte of a long raw DP must be read as a **signed** int8 (RSSI is negative). Same rule applies to any raw Tuya block that carries RSSI.
  - Behaviour fixes only (no new DP): Arlec fan 1 h timer option, Smartmi circulator preset/speed range, Vonroc heater preset case.
- **Koenkk/zigbee-OTA** [b050897…df5e8e1](https://github.com/Koenkk/zigbee-OTA/commit/df5e8e13f0) (25/10/2026 02:49 Europe/Paris): automatic download run that only touched the stack-info index and two vendor caches. `index.json` is unchanged, so no new OTA image for our devices.
- **esphome/esphome** [b90e1e4](https://github.com/esphome/esphome/pull/18525) (PR #18525, bkbartk, merged 24/10/2026 01:52 Europe/Paris): Tuya fan "optimistic" mode. Idea for us: when a DP has never been reported, a write can fall back to the type implied by its function (speed → value, oscillation → bool) and the UI state can be updated optimistically until the device answers. Recorded in CROSS_APP_METHODS; not implemented (our fallback chain already re-reads after a write).
- **zigpy/zha** (6decce1, 24/10/2026): dependency bumps only (zigpy 2.4.0, bellows 1.2.1, zigpy-deconz 1.1.0). No quirk change.
- **SmartThingsEdgeDrivers** (3c3946e, 23/10/2026): Matter fingerprint only. Nothing for Zigbee/Tuya.

## Sources checked and unchanged

zigbee-herdsman-converters (still eb823146c7, PR #13583 is a coordinator-detection fix, no Tuya device), zigbee-herdsman (c1dcb11), Zigbee2MQTT docs (2d9af8d), ZHA quirks (1d6598c), deCONZ DDF (a4c17ad), Blakadder (d96e8aa), tinytuya (3c0a687), localtuya (59c95cd), Johan's app code (328d24e), Athom zigbee-clusters (b859be7, 3.9.0), kkossev/Hubitat (pushed 20/10), ioBroker.zigbee (16/10), Domoticz (19/10), Domoticz-Zigbee stable9 and Tasmota Zigbee driver files (no commit since 24/10). The old Homey SDK docs repo (athombv/homey-apps-sdk-v3-docs) is gone; SDK facts are now taken from apps.developer.homey.app (links only).

## Couples added (one reliable source each)

| couple | driver | source |
|---|---|---|
| `_TZ3000_pd9mpyh4` / `TS0044` | scene_switch_4 | Device interview in [JohanBendz/com.tuya.zigbee#1534](https://github.com/JohanBendz/com.tuya.zigbee/issues/1534) (motren, 24/10/2026): battery remote, 4 endpoints, EP1 clusters 0x0000/0x0001/0x0006/0xE000, EP2–4 genOnOff. Same layout as the `zgyzgdua`/`wkai4ga5` TS0044 scene remotes already on that driver. |

## Unknown-command harvest

No new unknown command, cluster or DP this run: no diagnostic mail since 24/10 (only Athom build notices), no new post in forum topics 140352 (last post #2267) and 26439 (#5537), no new issue on dlnraja/com.tuya.zigbee besides the digest, and the fetch-diags ledger entry of 25/10 was a GitHub notice with nothing to act on. No decoder was added because no source confirmed a new Zigbee semantic.
