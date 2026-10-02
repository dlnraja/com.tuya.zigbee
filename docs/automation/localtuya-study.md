# Tuya LAN behaviour study (local control)

Status: notes written in our own words after reading the public behaviour of
the localtuya integration for Home Assistant and its maintained forks
(GPL-3.0). **No code was copied.** Everything here describes observable
device and protocol behaviour; our implementation in `lib/tuya-local/` is
independent (MIT). Credit: see `CREDITS.md`.

## 1. Protocol versions and session setup

| Version | Transport / crypto | Session setup | Notes |
|---|---|---|---|
| 3.1 | 55AA frames, AES-128-ECB with the local key; only *set* payloads are encrypted, prefixed with version + an MD5-derived signature | none | Status queries go out in clear JSON. |
| 3.2 | as 3.3 | none | Behaves like 3.3 for framing but most units only answer status queries that list DP ids explicitly (the "type 0d" query style). |
| 3.3 | 55AA, AES-128-ECB of every payload, version header (3 bytes + 12 zero bytes) on everything except the status query | none | The most common firmware. Some units answer a plain status query with a "data unvalid" error: they need the explicit DP-id query. |
| 3.4 | 55AA, AES-128-ECB with a **per-session key**, HMAC-SHA256 trailer instead of CRC | three-step negotiation (below) | The starting sequence number is taken from the device's negotiation reply. |
| 3.5 | 6699 frames, AES-128-GCM (12-byte IV + 16-byte tag) with a per-session key | same three steps | Replies carry a 4-byte return code before the payload. |

**Session key negotiation (3.4 / 3.5):**

1. Client sends a random 16-byte local nonce (encrypted with the local key).
2. Device replies with its own 16-byte remote nonce plus an HMAC of the local nonce, which lets the client check the device knows the same key.
3. Client answers with an HMAC of the remote nonce. Both sides then derive the session key by XOR-ing the two nonces and encrypting the result with the local key (ECB on 3.4, GCM with the local nonce's first 12 bytes as IV on 3.5, keeping only the first 16 bytes).

A wrong key typically shows up as a negotiation reply that fails HMAC
verification or as the socket being closed right after step 1. That is an
"auth error", not a network error, so it should not trigger fast reconnect loops.

## 2. Heartbeats

- The client sends a heartbeat roughly every 8–10 s. The device answers with an empty heartbeat frame.
- About 5 s is a sensible reply timeout. After two consecutive missed heartbeats the link is treated as dead and closed, which is quicker than waiting for TCP to notice.
- Gateways (3.4+) that host sub-devices can use a "sub-device online status" query as the heartbeat. 3.3 gateways don't answer it, so they need the plain heartbeat.
- Our client keeps a 15 s schema-refresh heartbeat with three allowed misses (more tolerant on busy Homey hubs). `TuyaReconnectPolicy.isHeartbeatDead()` exposes the two-miss rule for callers that want faster detection.

## 3. DP detection / discovery

- After connecting, ask for status. If nothing usable arrives, or the device returns "data unvalid", fall back to an **explicit DP-id query**: a status request whose `dps` map lists ids with `null` values.
- Unknown devices are probed in ranges, typically 1–10, 11–20, 21–30 and 100–110. **DP 1 goes in every batch**, because some firmwares ignore a request without it. Keep each request well under ~255 bytes of payload, because small device buffers drop larger frames.
- The "refresh" command (0x12) asks a device to re-measure specific DPs. It is mostly useful for plug metering: current, power and voltage (DPs 18/19/20, or 4/5/6 on older plugs). It applies to 3.2+ firmwares.
- The DP type is inferred from the value: boolean → switch, integer → value, short string → enum, 12/14 hex chars → colour, base64 → raw.

Implemented in `TuyaDpDetector.js` (planner, merge, type inference, error
recognition, resilient probe runner). `TuyaLocalClient.detectAvailableDps()`
uses it without blocking: probes bypass the command queue and each one is
time-limited. `TuyaLocalDevice` runs it once per session, 20 s after connect,
**only if no DP arrived at all**. Results are stored in `detected_dps` and
then fed through the normal DP pipeline.

## 4. UDP broadcast discovery

- Devices broadcast on UDP **6666** (clear 3.1-era JSON) and **6667** (AES-ECB with a fixed, publicly known key: MD5 of a constant string). 3.5 devices use **7000** with GCM and an extra 4-byte return code before the payload.
- The JSON carries `gwId`, `ip`, `productKey` and `version`. Use the version as the first protocol to try and the IP as a hint that beats a stale stored IP.
- Already implemented in `UdpDiscoveryKeys.js` / app UDP discovery, including the 3.5 return-code tolerance.

## 5. Reconnect and backoff

- Retry quickly (about 5 s) while the outage is fresh, since most drops are Wi-Fi blips or the device rebooting.
- After a long outage (about 5 minutes) slow down by doubling the interval, so a device that is switched off at the wall does not keep the hub and the router busy.
- Sub-devices should not reconnect on their own while their gateway is down.
- **Sleepy devices** (battery Wi-Fi sensors) disconnect between reports by design. Allow a configurable window since the last report before marking them unavailable.
- Add jitter, so twenty devices on a rebooted router don't all reconnect at the same moment.

Implemented in `TuyaReconnectPolicy.js`. The client keeps its 5 s base, ×1.5
growth and 60 s cap, and now adds ±10 % jitter and counts attempts per outage.
`isWithinSleepGrace()` is available for sleepy-device availability.

## 6. Device templates

**Covers.** The control DP uses one of several vocabularies:
open/close/stop, open/close/continue, on/off/stop, fz/zz/stop and the
reversed zz/fz/stop, 1/2/3, and 0/1/2. Positioning can be absent, an explicit
set-position DP, or time-based (estimated from full travel time, with a small
tolerance). Some motors report position inverted. `wifi_cover` now learns the
vocabulary from the values the device reports, stores it in
`cover_command_set`, and answers in the same vocabulary.

**Climate.** HVAC modes are often encoded as auto/cold/hot/heat/wet/wind
(auto, cool, heat, heat_cool, dry, fan_only), or as manual/auto or
Manual/Program on simple thermostats. The valve or relay "action" DP often
reads opened/closed. Temperatures come as integers with a precision of 1, 0.5,
0.1 or 0.01. Current and target temperature can use different precisions, and
units may be °C or °F. Helpers are in `TuyaDeviceTemplates.js` (mode maps,
action map, scaling, precision guess).

**Lights.**

- *Modern layout:* DPs 20–24. Switch, mode (white/colour/scene/music), brightness 10–1000, colour temperature 0–1000 (0 = warm), and colour as 12 hex chars HHHHSSSSVVVV (H 0–360, S/V 0–1000).
- *Legacy layout:* DPs 1–5. Brightness 25–255, temperature 0–255, and colour as 14 hex chars, where an RGB triplet is followed by hue (4 hex) and saturation/value (2 hex each, 0–255).
- Some units report colour temperature reversed, and the Kelvin span is usually 2700–6500 K.

`wifi_light` now detects the layout, translates legacy payloads to the modern
layout internally, and writes back in the device's own layout and colour
encoding. Both are stored (`light_schema`, `light_color_format`).

**Fans.** Speed is either an ordered list of tokens (low/middle/high, or 1..n
as strings) or a numeric range. Both map to a percentage, where the top speed
is 100 % and 0 % means off. Direction is usually forward/reverse. Helpers are
in `TuyaDeviceTemplates.js`.

## 7. Known quirks

- "data unvalid" (sic) reply → switch to explicit DP-id queries.
- Protocol 3.2 → frame as 3.3 but use explicit DP-id queries.
- A plain status query on some 3.3 firmwares returns nothing until a DP changes. Use the refresh command or explicit DP ids.
- Plugs only update power figures after a refresh command on DPs 18/19/20 (or 4/5/6).
- Gateways: sub-device status needs the `cid` field, and the 3.3 heartbeat style differs from 3.4+.
- Devices accept only one LAN client. If the vendor app or another hub holds the socket, connects time out. This is not a key problem.
- Battery Wi-Fi sensors are reachable only for a few seconds after an event.
- Local keys change when a device is re-paired in the vendor app.

## 8. Not (yet) implemented here

- Gateway sub-device (`cid`) local control and the gateway-specific heartbeat.
- Time-based cover positioning (needs per-device travel time settings).
- A user-facing "sleep window" setting wired to availability (the helper exists).
- Driver-level use of the climate and fan helpers (the existing Wi-Fi drivers keep their mappings; the helpers are ready for opt-in).
