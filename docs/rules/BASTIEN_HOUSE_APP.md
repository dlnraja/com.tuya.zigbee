# Bastien House App — private Zigbee track (P2606)

> **Zigbee Bastien** = Homey Pro **maison Bastien uniquement**.  
> Enrichit **master** + **stable-v5** — **jamais** l’inverse en masse.

## Identity

| | Bastien house | master (public Test) | stable-v5 (LTS) |
|---|---|---|---|
| **Branch** | `bastien-home` | `master` | `stable-v5` |
| **Clone** | `Documents/homey/bastien` | `Documents/homey/master` | `Documents/homey/stable` |
| **App ID** | `com.dlnraja.tuya.zigbee.bastien` | `com.dlnraja.tuya.zigbee` | `com.dlnraja.tuya.zigbee.stable` |
| **Store name** | Zigbee Bastien | Universal Tuya | Tuya Unified (Stable) |
| **Version** | `1.0.x` | `9.0.x` | `5.12.x` |
| **Purpose** | House-only soak + install | Public preview | Public LTS |

Machine SSOT: [`config/architecture/bastien-house-ssot.json`](../../config/architecture/bastien-house-ssot.json)  
Triple tracks: [`config/architecture/dual-app-tracks.json`](../../config/architecture/dual-app-tracks.json) → `tracks.bastien`

## Enrichment direction (hard rule)

```
Bastien box (live) ──promote surgical──► master ──BOTH reliability──► stable-v5
         ▲                                      │
         └── selective cherry-pick ONLY ─────────┘
              (device he needs — never wholesale)
```

| Allowed | Forbidden |
|---------|-----------|
| Promote sacred couple / DP / crash guard from Bastien → master | Copy Bastien App ID / version onto master or stable |
| Selective cherry-pick from master onto Bastien for a device Bastien owns | Dump master features / mega enrich / IR UX wholesale into Bastien |
| BOTH reliability master → stable after soak | Auto-Publish Bastien onto Universal Tuya Test slot |

## On-site install (chez Bastien)

1. Homey Pro neuve + `homey login` / developer.
2. Clone `Documents/homey/bastien` (branch `bastien-home`).
3. `npm ci` puis `homey app install` (sideload) — **pas** le slot Test Universal.
4. Pour chaque device: noter `zb_manufacturer_name` + `zb_model_id`, pair, valider RX/TX/flows.
5. Fixes ici d’abord → `npm run bastien:promote -- --dry-run` → `--apply` sur master quand soak OK.

## Commands

```bash
# From master clone
npm run check:p2606
npm run bastien:promote -- --dry-run
npm run bastien:promote -- --apply   # surgical only; human review

# From bastien clone
homey app install
```

## WHY (P215)

- **Pourquoi** — une box maison réelle pour apprendre sans risquer les users forum / LTS.
- **Comment** — 3e App ID + branche + promote CI one-way.
- **Pour qui** — Bastien (install) + Dylan (promote upstream).
- **Quand** — install on-site + cron promote dry-run.
- **Contre quoi** — fuite d’identité App ID / publish Bastien sur le mauvais slot / sync inverse wholesale.

## Forum

Silent only (T157628). Never paste Bastien inventory or network keys.
