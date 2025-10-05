# Protocole d’Exécution Consolidé Final N5 (V38.0)

Objectif: Unbranding universel + cohérence absolue, limite stricte 200 manufacturerName/driver, Règle Mono‑Type TS, audit global multi‑protocole (SmartThings, Enki, ZHA, Z2M, deCONZ), conformité SDK3 publish.

---

## 1) Phase 0 — Audit N5 & Découverte (IA/NLP + BDU)

- 0.1 Audit local (état initial)
  - Commande: `node tools/fs_scan.js`
  - Sortie: `project-data/fs_scan_report.json`

- 0.2 Audit historique Git & communauté
  - Commande: `node tools/git_history_scan.js`
  - Sortie: `project-data/git_history_scan_v38.json`

- 0.3 Collecte bases majeures (si endpoints OK)
  - Commandes:
    - `node tools/fetch_zigbee2mqtt_database.js`
    - `node tools/parse_koenkk_converters.js`
    - `node tools/scrape_blakadder.js`
  - Sortie: `references/addon_enrichment_data/*.json`

- 0.4 IA/NLP multi‑langues (N5)
  - Commande: `node tools/ai_nlp_global_search.js --protocols="SmartThings, Enki, ZHA" --languages="en,fr,de,es,it,nl,zh,ru,pl,ja"`
  - Sortie: `project-data/ai_nlp_global_sources_report.json`

- 0.5 Consolidation BDU (N4/N5) + CGL
  - Commande: `node tools/bdu_consolidate.js`
  - Sorties: `references/BDU_v38_n4.json`, `references/BDU_v38_n5.json`, `references/CGL_catalogue_links.txt`

---

## 2) Phases 1 & 2 — Tri Critique, Migration, Standardisation

- Tri & Purge (cap 200 + limites par type)
  - Commande: `node tools/ultimate_coherence_checker_with_all_refs.js`
  - Contraintes: cap absolu 200 + limites dynamiques par type (60/45/30/25/20)

- Migration/Injections ciblées (si nécessaire)
  - `node tools/migrate_ids.js --max-ids-limit 200`
  - `node tools/inject_id_to_target.js`

- Unbranding & Fallback N5
  - `node tools/add_product_ids.js` (productId UPPERCASE)
  - `node tools/configure_zigbee.js` (clusters numériques, EF00 si TS0601, bindings [1])
  - `node tools/update_manifest.js` (DP/capabilities)

- Drivers/éco‑systèmes spécifiques (si divergence)
  - `node tools/generate_ecosystem_drivers.js`
  - `node tools/create_category.js --name enki_devices --add-driver enki_leroy_merlin_generic`

---

## 3) Phase 3 — Validation & Publication

- Normalisation & audits
  - `node tools/check_each_driver_individually.js`
  - `node tools/normalize_compose_arrays_v38.js`
  - `node tools/verify_driver_assets_v38.js`

- Validation SDK3 publish
  - `node tools/homey_validate.js`

- Commit & Push → Auto‑publish
  - `node tools/git_add.js`
  - `node tools/git_commit.js --message "N5: cap 200 + Tri Critique + Publish"`
  - `node tools/git_push.js --remote origin --branch master`
  - Workflow: `.github/workflows/homey.yml` (HOMEY_TOKEN requis)

---

## 4) Règle Mono‑Type TS & Limites

- Cap absolu: 200 manufacturerName/driver (jamais 1200)
- Limites dynamiques par type:
  - switch 60; dimmer/bulb 45; sensor/climate/air_quality/motion/contact 30; plug/curtain/thermostat/lock/water_leak 25; smoke/valve/other 20
- Mono‑Type TS:
  - productId en MAJUSCULES; EF00(61184) si TS0601; clusters numériques; bindings [1]; energy.batteries cohérent

---

## 5) Sources Globales (extrait)

- Z2M: https://www.zigbee2mqtt.io/supported-devices/
- Blakadder: https://zigbee.blakadder.com/
- Koenkk converters: https://github.com/Koenkk/zigbee-herdsman-converters
- ZHA handlers: https://github.com/zigpy/zha-device-handlers/
- SmartThings: https://community.smartthings.com/c/developers/drivers
- deCONZ: https://github.com/dresden-elektronik/deconz-rest-plugin
- Enki (LM): https://www.leroymerlin.fr/produits/marques/enki
- CSA: https://csa-iot.org/csa-iot_products/

---

## 6) One‑liner N5

```bash
node tools/ai_nlp_global_search.js --protocols="SmartThings,Enki,ZHA" --languages="en,fr,de,es,it,nl,zh,ru,pl,ja" && node tools/addon_global_enrichment_orchestrator.js && node tools/integrate_addon_sources.js && node tools/generate_ecosystem_drivers.js && node tools/ultimate_coherence_checker_with_all_refs.js && node tools/check_each_driver_individually.js && node tools/normalize_compose_arrays_v38.js && node tools/verify_driver_assets_v38.js && node tools/homey_validate.js && node tools/git_add.js && node tools/git_commit.js --message "N5: cap 200 + Tri Critique + Publish" && node tools/git_push.js --remote origin --branch master
```
