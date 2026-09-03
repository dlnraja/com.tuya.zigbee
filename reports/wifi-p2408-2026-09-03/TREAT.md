# P2408 — WiFi discovery + all protocol versions + key types (2026-09-03)

## Classification
**BOTH** — LAN discovery / connect reliability (master + stable-v5)

## Inspiration
TinyTuya PROTOCOL.md, tuyapi message-parser 6699, tuya-local / LocalTuya local_key handling.

## Shipped
| Area | Change |
|------|--------|
| UDP decrypt cascade | plaintext → 6699 GCM → 55AA+ECB (MD5/raw/hex keys) → raw GCM |
| 3.5 solicitation | `packDiscoverySolicitation` cmd `0x25` on UDP/7000 (+6667), multi-NIC |
| Protocol chain | `3.5→3.4→3.3→3.2→3.1` starting from UDP hint |
| local_key types | ascii16, hex32, quoted — `normalizeLocalKey` / `TuyaKeyTypes` |
| Local-first | probeNow before TCP; preferredVersion from discovery |
| Pairing scan | TuyaDeviceDiscovery same cascade + GCM probe |

## Key types documented
`local_key`, `device_key` (alias), `uuid` (pairing only), `gateway_key` (subdevice), `udp_broadcast` (well-known MD5)

## Verify
```bash
node tools/ci/harden-wifi-local.js
node --test test/critical/p2408-wifi-discovery-keys.test.js
```
→ **PASS**
