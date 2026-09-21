# Pairing & Discovery SSOT (P2498)

**Machine:** [`config/architecture/pairing-discovery-ssot.json`](../../config/architecture/pairing-discovery-ssot.json)  
**Gate:** `npm run check:p2498`  
**Classify:** BOTH (learnmode + Zigbee Athom rules = reliability UX)

## Verdict (Homey Athom docs)

| Connectivity | Who owns pair UI? | What we control |
|---|---|---|
| **Zigbee** | Homey core only | `manufacturerName` + `productId`, endpoints/bindings, **`zigbee.learnmode`** |
| **Wi‑Fi / LAN** | App `pair[]` templates | `list_devices` / `add_devices` / credentials + Homey Discovery |
| **IR custom** | App custom views OK | IR wizard (P2487 MASTER_ONLY) |

Athom: *“Homey already knows how to pair Zigbee… it is not possible to implement your own pairing for those devices.”*  
Interview Model ID in Zigbee tools = compose **`productId`** (see P2496).

## Alternative apps — what to copy

| Source | Discovery / pair | UX takeaway for us |
|---|---|---|
| Johan Bendz Tuya Zigbee | Static FP + learnmode | Dense couples; clear learnmode text |
| Homey Generic Zigbee | Fallback if no app claims couple | Cover sacred couples → avoid Unknown |
| Tuya Local (Homey) | UDP 6666/6667 + TCP 6668 + cloud key | Our WiFi `maxDiscover` + credentials |
| Athom Wi‑Fi Discovery | mDNS / SSDP / MAC | Prefer `.homeycompose/discovery/*` |
| Z2M / ZHA | Interview converters | Silent enrich DP/clusters after pair |
| IKEA Tradfri example | Official Zigbee pattern | learnmode + endpoints reference |

## Our structures

### Zigbee (primary)
1. User picks driver class in Homey → Homey opens learnmode (our instruction).
2. Homey matches `(manufacturerName, productId)` to compose.
3. Runtime: protocol detect, IAS enroll, button charter, enrichment.

**Do not add** new `pair/select_driver.html` on Zigbee drivers (legacy debt ~133). Homey owns that UI.

### Wi‑Fi
- Discovery: `tuya_wifi.json`, `ewelink_mdns.json`
- Orchestrator: `TuyaPairingOrchestrator` + TCP force scan (P2411)
- Templates: Homey system views + configure where needed
- Style: Homey Style Library — avoid purple-gradient custom CSS

### Post-pair UX
- `HomeyButtonUiCharter` (P2492)
- `PrePairingCompatibilityCheck` (soft advisories)
- Device Finder (GitHub Pages) — catalog helper, not Homey radio pair

## Learnmode templates

Helper: `lib/pairing/LearnmodeTemplates.js`  
Priority prefixes listed in the machine SSOT must keep `zigbee.learnmode`.

## Sleepy remotes (P2645 complementary)

TS004x battery remotes often sleep during Homey configureReporting → `Impossible de joindre` + mute buttons.

- **Code:** skip battery configureReporting / getOnStart on button drivers — see [`SLEEPY_REMOTE_PAIRING_SSOT.md`](./SLEEPY_REMOTE_PAIRING_SSOT.md)
- **UX:** wake-tap every 2–3 s for the whole pair window (Homey still owns Zigbee UI)
- **Routing:** wall 1-btn = TS0041 only; 3-ch = `button_wireless_3` (not wall)

## Contre quoi
- Custom Zigbee pair wizards that fight Athom
- Missing learnmode on high-traffic drivers
- Inventing `productId` / using `productName` for match
- WiFi asking for IP when discovery exists
- Battery configureReporting storms on sleepy remotes (P2645)
- `remote_button_wireless_wall` claiming TS0042/43/44
