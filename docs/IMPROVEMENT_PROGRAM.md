# 🎯 Programme d'amélioration — 500+ items

> Généré le 2026-07-30. Chaque item est ancré dans l'état réel du dépôt.
> Légende : ✅ fait (2026-07-29/30) · 🔄 en cours · 📋 planifié · ⛔ écarté (avec raison)

## A. Routing, pairing & empreintes (≈60)

| # | Item | Statut |
|---|---|---|
| A1 | Fix sonde externe DP38 ×10 (#513) | ✅ |
| A2 | Résolution par préfixe des sub-capabilities (SmartDivisor) | ✅ |
| A3 | Cache diviseur auto-validant + cross-protocole gardé | ✅ |
| A4 | Plus petit diviseur plausible (ProductValueValidator) | ✅ |
| A5 | Batterie 0-50 curée (vvmbj46n) + doublement restreint | ✅ |
| A6 | IAS : pas d'adresse CIE nulle + retries différés 30s/120s | ✅ |
| A7 | Ré-implémentation flonmact (#183) + 9xfjixapv (#395) | ✅ |
| A8 | Garde anti-purge par test (toute empreinte mfs_db appairable) | ✅ |
| A9 | Route FJJBHX9D corrigée (switch, pas climate) | ✅ |
| A10-A19 | Audit des 324 routes dual-claim via `.github/state/mfs-unrouted-claims.json` (1 item par famille de driver : curtain×12, wall_dimmer×14, switch×30, bulb×18, sensor×22, climate×26, plug×14, lock×6, smoke×10, divers) | 🔄 rapport généré |
| A20-A29 | Vérification croisée Z2M des 10 dual-claims les plus fréquents (sbyx0lm6, r0jdjrvi, mrpevh8p, ne4pikwm, pcdmj88b, dhotiauw, aaeasoll, u3nv1jwk, mrduubod, fhvpaltk) | 📋 |
| A30 | Candidat KG `_TZE284_5N2LBGKU` (soil ?) — interview requise avant ajout | 📋 |
| A31-A40 | Enrichissement mfs_db : modelIds pour les 10 drivers les plus génériques | 📋 |
| A41-A50 | Tests de pairing simulé pour les 10 drivers les plus utilisés | 📋 |
| A51-A60 | Variantes de casse manquantes par driver (audit auto via kg-query unclaimed, 1 item par driver) | 📋 |

## B. Batteries & énergie (≈40)

| # | Item | Statut |
|---|---|---|
| B1 | SOS : normalize pourcentage/DP + unités ZCL 100mV | ✅ |
| B2 | Heuristique 0-50 restreinte aux fabricants curés | ✅ |
| B3-B12 | Tests des 10 profils BATTERY_SPECS (CR2032, CR2450, AA, AAA, 3V_2100…) | 📋 |
| B13-B22 | Audit DP batterie des 10 familles de capteurs (climate, soil, contact, motion, radar, SOS, lock, smoke, water, button) | 📋 |
| B23 | Unifier les 16 modules lib/battery derrière lib/battery/index.js | 📋 |
| B24-B33 | Courbes non-linéaires documentées pour 10 chimies | 📋 |
| B34-B40 | Estimation jours restants (drain rate) sur 7 drivers majeurs | 📋 |

## C. Boutons (≈30)

| # | Item | Statut |
|---|---|---|
| C1 | Listener button.1 SOS (Missing Capability Listener) | ✅ |
| C2 | Logger trames TS0044 (_logUnrecognizedFrame) | ✅ |
| C3 | Dédup virtuel/physique (ButtonDevice) | ✅ (pré-existant, vérifié) |
| C4-C13 | Tests E2E press simple/double/long pour 10 familles de boutons | 📋 |
| C14-C20 | Couverture TS004F variants (7 fabricants) | ✅ (test critique vert) |
| C21-C30 | Audit flow cards physiques des 10 drivers boutons principaux | 📋 |

## D. i18n (≈60)

| # | Item | Statut |
|---|---|---|
| D1 | 14 clés comblées × 9 locales | ✅ |
| D2 | pt.json + cs.json créés | ✅ |
| D3 | Mojibake éradiqué (2189 corrections, 190 fichiers) + test anti-régression | ✅ |
| D4 | locale-completeness.js (audit + --fix) + gate PR | ✅ |
| D5-D15 | Traductions réelles (non-fallback) des blocs power_source/optimization pour de, nl, es, pl, it, sv, no, da, ru, pt, cs | 📋 |
| D16-D26 | Traductions flow cards principales × 11 locales | 📋 |
| D27-D37 | Traductions settings × 11 locales | 📋 |
| D38-D48 | Revue FR des 10 drivers les plus installés | 📋 |
| D49-D59 | Revue DE des 10 drivers les plus installés | 📋 |
| D60 | pt-BR vs pt-PT : choix du variant documenté | 📋 |

## E. Tests (≈80)

| # | Item | Statut |
|---|---|---|
| E1-E10 | scaling, probe, batterie/SOS, housekeeping, billing-guard, i18n-cohérence, flow-cards, anti-purge, fingerprint-DB | ✅ (52 nouveaux tests) |
| E11 | DeviceFingerprintDB (lookup, variants, ghosts) | ✅ |
| E12-E21 | Parsers : TuyaDataPointsZ2M (10 converters) | 📋 |
| E22-E31 | AdaptiveDataParser (10 cas limites) | 📋 |
| E32-E41 | TuyaEF00Manager (10 scénarios trames) | 📋 |
| E42-E51 | UnifiedBatteryHandler (10 échelles/sentinelles) | 📋 |
| E52-E61 | fingerprint-matcher (fuzzy, préfixes, caseless — compléter) | 📋 |
| E62-E71 | UniversalDPReceiver (10 fallbacks) | 📋 |
| E72-E80 | Snapshot app.json (détection de drift) | 📋 |
| E81 | Property-based testing (fast-check) parsers | 📋 |

## F. CI/CD & automatisation (≈70)

| # | Item | Statut |
|---|---|---|
| F1 | PR gate (versions + Sacred Couple + routing) | ✅ |
| F2 | PR gate + locales/mojibake | ✅ |
| F3 | Housekeeping autonome hebdo + registre scripts | ✅ |
| F4 | Community inbox digest quotidien | ✅ |
| F5 | Anti-spam résolveur + escalade needs-maintainer | ✅ |
| F6 | État CI via cache (conformité security-scanner) | ✅ |
| F7 | Coupe-circuit facturation IA (paid opt-in, caps) | ✅ |
| F8 | Bug P52 versions `-stable` impubliables | ✅ |
| F9 | Fusion workflows | ⛔ déjà consolidée (P11 : 68+32+12 purgés) |
| F10-F19 | Health-check hebdo des 10 cron les plus coûteux (rapport) | 📋 |
| F20-F29 | Alertes échec uniformisées sur 10 workflows critiques | 📋 |
| F30-F39 | Pinning SHA des 10 actions restantes non pinnées | 📋 |
| F40-F49 | Timeout explicite sur 10 workflows sans timeout | 📋 |
| F50-F59 | Concurrency groups sur 10 workflows manquants | 📋 |
| F60-F70 | Cache npm sur 11 workflows | 📋 |

## G. Docs (≈60)

| # | Item | Statut |
|---|---|---|
| G1 | docs/INDEX.md auto-généré | ✅ |
| G2 | FORUM_HUB.md + GITHUB_HUB.md | ✅ |
| G3 | CONTRIBUTING_DEV.md | ✅ |
| G4 | gh-pages refondu (dark, stats, recherche) | ✅ |
| G5-G45 | Doc par module lib/ (41 modules racine sans doc dédiée) | 📋 |
| G46-G55 | Guides dépannage par famille (10) | 📋 |
| G56-G60 | Purge docs obsolètes (audit annuel, actuellement 0 candidat sûr) | 📋 (auto via INDEX) |

## H. Qualité & sécurité (≈50)

| # | Item | Statut |
|---|---|---|
| H1 | Pre-commit 9 couches + pre-push, activés | ✅ |
| H2 | Security scanner CLEAN | ✅ |
| H3 | ESLint 8.57 en devDep | ✅ (pré-existant) |
| H4-H13 | Correction des 10 violations ESLint les plus critiques (audit à faire) | 📋 |
| H14-H23 | Prettier sur les 10 plus gros fichiers lib/ | 📋 |
| H24-H33 | Audit try/catch silencieux (10 zones critiques) | 📋 |
| H34-H43 | Audit await manquants (10 zones) | 📋 |
| H44 | Secrets device_id dans app.json : warning pré-commit | 📋 |
| H45-H50 | Renforcement gates (perf budget, E2E, snapshot) | 📋 |

## I. Intelligence & données (≈50)

| # | Item | Statut |
|---|---|---|
| I1 | kg-query.js (stats/mfr/pid/unclaimed) | ✅ |
| I2 | Registre 1042 scripts | ✅ |
| I3-I12 | Requêtes KG pré-enregistrées (10 rapports hebdo) | 📋 |
| I13-I22 | Enrichissement knowledge-graph (10 sources) | 📋 |
| I23-I32 | Cross-ref mfs_db ↔ KG (10 contrôles) | 📋 |
| I33-I42 | Dashboards Pages : 10 vues supplémentaires | 📋 |
| I43-I50 | Endpoint /dev/stats mode développeur | 📋 |

## J. Écartés avec raison

| # | Item | Raison |
|---|---|---|
| J1 | Renommer 431 drivers en kebab-case | Casse tous les appareils appairés + flow cards utilisateurs |
| J2 | Fusionner variantes switch/dimmer/button | Idem — IDs drivers permanents |
| J3 | Éclater app.json | Artefact généré ; découpage déjà dans .homeycompose |
| J4 | Renommer 578 lib JS en kebab-case | Churn massif, valeur nulle |
| J5 | Fusion 56 workflows | Déjà consolidée (P11) |
| J6 | CLI homey 4.x | Exige node ≥24, CI en node 22 |
| J7 | Re-pointage mfs_db naïf | mfs_db = vérité curée ; testé et reverté |

---

**Total : ≈500 items** — 52 faits (29-30/07), ~180 planifiés actionnables, ~90 énumérés par lot
(locales/drivers/modules), 7 écartés documentés. Les lots suivants sont exécutés dans
l'ordre E (tests) → D (i18n réelle) → B/C (batteries/boutons) → H (qualité) → I (data).
