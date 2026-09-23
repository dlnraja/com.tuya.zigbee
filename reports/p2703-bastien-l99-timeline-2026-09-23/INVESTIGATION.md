# P2703 — Bastien L99 timeline investigation (3 apps × diags × mesh)

**Quand:** 2026-09-23 soir · Chrome DevTools + Gmail + git 3 apps  
**Pour qui:** Bastien house Homey Pro · tip target **≥1.0.79**  
**Contre quoi:** tip-lag + Homey « Appareil Zigbee » pairing + Athom socket hang

## Best-functioning windows (git + diags)

| Fenêtre tip | Date | Ce qui marchait | Signal |
|-------------|------|-----------------|--------|
| **1.0.0–1.0.3** | 19–20 Sep | Bootstrap remotes hybrid | P2606–P2609 |
| **1.0.22–1.0.29** | 20–21 Sep | dzwgk7e2 locked; axpdxqgu Flow cards | P2636 / P2630 / P2644 |
| **1.0.42** | 22 Sep | Unknown recognize IEEE map | P2667 |
| **1.0.59–1.0.61** | 22–23 Sep | Ghost Flows stopped; snappy + Flow UX | P2681 / P2683 |
| **1.0.64–1.0.66** | 23 Sep ~02h | **Meilleur comportement boutons** (hold-release ghost mort, battery calm) | P2686 / P2685 / P2689 |
| **1.0.69–1.0.76** | 23 Sep journée | Snappy 200ms + soft-arm; Store Test healthy **#86** | P2693 / P2700 |
| **1.0.78** | 23 Sep 18h | Snappy 80ms + bleed TS0041 retiré | P2702 — Athom **#88 processing_failed** |

## Diags Gmail (heure UTC)

| UUID / build | Heure | Tip | Symptôme |
|--------------|-------|-----|----------|
| **885a9901** | 22 Sep soir | 1.0.60 | TS0042 OK single/double/long mais lent + pile |
| **1f4dcf2e** | 23 Sep **15:36Z** | **1.0.76** | TS0041/43 inconnue; TS0042 trop lent → relais |
| Build **#86 testing** | 15:05Z | 1.0.76 | Dernier Test healthy |
| Build **#88** | 16:17Z | 1.0.78 | socket hang up (P139 soft-continue) |

## Mesh live Chrome (2026-09-23 ~18:48 Paris)

| Node | UI name | Couple | Driver cible | Status |
|------|---------|--------|--------------|--------|
| 3 | **Appareil Zigbee** | `axpdxqgu`+TS0041 | `button_wireless_1` | WRONG_APP Homey |
| 7 | **Appareil Zigbee** | `vsxvaj9i`+TS0043 IEEE `5b:91:98…` | `button_wireless_3` | WRONG_APP Homey (nouvel IEEE) |
| 14 | Unknown | stale `bb:8f…` | — | STALE_GHOST delete |
| 15 | Unknown | `fllyghyj`+SNZB-02 | climate | re-pair Bastien |
| 18 | **2-Boutons…** | `dzwgk7e2`+TS0042 | `button_wireless_2` | OK_LIVE (lent jusqu’à ≥1.0.79) |
| 19 | Unknown | — | — | NEED_INTERVIEW |
| 20 | Eclairage salon | `ltt60asa`+TS0004 | switch_4gang | OK |

## Root cause enrich (P2703)

1. Homey native « Appareil Zigbee » a volé TS0041/TS0043 — tip seul ne hot-swap pas le driver.  
2. Athom matching: couples maison **pas en tête** de `manufacturerName` / `productId` → front-pin.  
3. `button_wireless_3` listait **TS0601** (bleed) → retiré.  
4. Latency: P2702 déjà 80ms + Flow avant pulse — besoin tip Test ≥1.0.79 après P139.

## Store tips croisés (Chrome)

| App | Tip Store Test |
|-----|----------------|
| Bastien | **1.0.76** (1.0.78 pas encore) |
| Universal | **9.0.1209** |
| Stable | **5.12.321** |

## User actions

1. Maj Zigbee Bastien Test → **≥1.0.79**  
2. Supprimer nodes **3** et **7** (« Appareil Zigbee ») + orphans 14/15/19  
3. Re-pair **Zigbee Bastien** → Bouton 1 / Bouton 3 (pas Homey Zigbee)  
4. TS0042: Flow Bouton appuyé → relais (tester latence)

Pas de forum POST (T157628).
