# Bastien treat P2727 — 2026-09-25 ~03:10

## Verdict
Homey house still on **v1.0.93** (Test #103). Athom tip already **1.0.98** (#108 testing — Gmail OK). Remotes look dead because tip-lag: no P2720/P2723 on box + powerCfg TX storm (nodes 3/7/18 TX 40–60%). Switches OK.

## Evidence
| Source | Finding |
|--------|---------|
| my.homey Apps | Zigbee Bastien **v1.0.93** Active Test — no Mettre à jour |
| Athom Gmail | Build **#108** testing (1.0.98); #104–107 failed (socket / invalid_state / missing SVG) |
| Zigbee tools | axpdxqgu / vsxvaj9i / dzwgk7e2 high TX%; HOBEIAN switches last-seen minutes |
| App storage | Zigbee Bastien ~41 MB on Homey |

## Fix shipped (tip **1.0.99**)
- **P2727** sync `_purgeBastienHeapSettingsEarly()` at `onInit` start (before deferred LiveDataUpdater)
- Sets `bastien_skip_battery_tx` → PowerClusterPolicy / ButtonDevice / PhysicalButtonMixin skip powerCfg TX
- Contre quoi: `test/critical/p2727-*.test.js` (green)
- Keep P2724/P2726 house-fleet prune for Athom land

## After Athom #109 lands
1. Homey → Apps → Zigbee Bastien → **Mettre à jour** (or Installer Test 1.0.99)
2. **Redémarrer**
3. Press Bouton 1 / 2-Boutons / Bouton 3 once (wake)
4. Zigbee tools: TX% should drop on remotes

## 2026-09-25 publish result
- Push `bastien-home` OK · GHA `36083407317` **success**
- Athom **Build #109 testing** = tip **1.0.99** (Gmail)
- Homey maison still **v1.0.93** after Restart + auto-update ON
- Store install from senetmarne only lists Self-Hosted (**Offline**) + Homey (**incompatible**) — **not** Bastien Pro `65d495eb…`
- House update must be done **on Bastien Homey** (owner phone/my.homey): Apps → Zigbee Bastien → Afficher App Store → Installer Test **1.0.99**, then Redémarrer + press remotes
