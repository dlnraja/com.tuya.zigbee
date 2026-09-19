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
Bastien box (live) ──AUTO promote (P2607)──► master ──BOTH reliability──► stable-v5
         ▲                                      │
         └── selective cherry-pick ONLY ─────────┘
              (device he needs — never wholesale)
```

| Allowed | Forbidden |
|---------|-----------|
| Cron + enrich/forum hooks: AUTO_SAFE Bastien → master | Copy Bastien App ID / version onto master or stable |
| Complementary compose / sacred-keep / registry / Contre quoi tests | Dump master features / mega enrich / IR UX wholesale into Bastien |
| BOTH reliability lib + compose → stable after master | Auto-Publish Bastien onto Universal Tuya Test slot |
| Selective cherry-pick from master onto Bastien for a device Bastien owns | Overwrite existing `device.js` without human review |

### Autonomous schedule (P2607)

- Workflow **Bastien Promote Upstream**: `06:20` + `18:20` UTC daily (`--apply --commit`, stable BOTH).
- Soft hooks: `auto-enrich-closed-loop.yml`, `forum-poll.yml` → `npm run bastien:promote:apply` (continue-on-error).
- AUTO_SAFE = complementary `driver.compose.json`, misattribution cases, sacred-keep couples, `test/critical`, `docs/knowledge`, BOTH `lib/{tuya,zigbee,io,…}`.
- Manual review = existing `device.js` rewrites, mega `mfs_db`, non-allowlisted paths.

## Athom « Create a Homey App »

Si le portail Athom affiche *Create a Homey App* / `homey app publish`, l’App ID
`com.dlnraja.tuya.zigbee.bastien` **n’existe pas encore** côté store — c’est normal
au premier jour.

**Créer l’app Athom (une fois) :**

1. Depuis le clone `Documents/homey/bastien` (branche `bastien-home`), **ou**
2. GitHub Actions → workflow **Publish Zigbee Bastien** → `workflow_dispatch`
   (`force_publish=true`) — publie **uniquement** `com.dlnraja.tuya.zigbee.bastien`.

```bash
# Local (PC Dylan, Homey CLI installé)
cd Documents/homey/bastien
npm ci
homey login
homey app publish
# puis sur la box Bastien: installer le canal Test de cette App ID
# https://homey.app/a/com.dlnraja.tuya.zigbee.bastien/test/
```

Ne jamais lancer ce publish depuis `master` / `stable-v5` (mauvais App ID).

## On-site install (chez Bastien)

1. Homey Pro neuve + compte developer Dylan (ou Bastien avec droits).
2. Installer **Zigbee Bastien** Test (`com.dlnraja.tuya.zigbee.bastien`) — **pas** Universal Tuya / Stable.
   Alternatif sideload: clone `Documents/homey/bastien` → `npm ci` → `homey app install`.
3. Pour chaque device: noter `zb_manufacturer_name` + `zb_model_id`, pair, valider RX/TX/flows.
4. Fixes sur `bastien-home` d’abord → `npm run bastien:promote -- --dry-run` → `--apply` (master) quand soak OK.
5. BOTH reliability → backport chirurgical `stable-v5`.

## Commands

```bash
# From master clone
npm run check:p2606
npm run check:p2607
npm run bastien:promote              # dry-run report
npm run bastien:promote:apply        # write AUTO_SAFE into working tree
npm run bastien:promote:auto         # apply + commit + stable BOTH (CI)

# From bastien clone — first Athom create OR update
homey app publish
# Daily on-site iterate
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
