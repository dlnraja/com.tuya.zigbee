# Session 2026-07-28/29 — Rapport final consolidé

## Production (vérifié sur le CDN Athom)

- **Build 2681 (v9.0.353) en Test** : 329 drivers, ~5 400 mfrs publiés (vs 286 / ~2 900 avant la session), 0 flow ID invalide.
- `_TZE284_hodyryli` (issue #513) présent ; `_TZ3000_mrpevh8p` dans button_wireless_1 ; les 5 promesses du forum livrées (SOS, rain TS0207, Loratap, IR via blaster_remote, Arteco).
- Les `processing_failed` récurrents = **flakiness serveur Athom** (4 contenus quasi identiques : 3 échecs, 1 succès). La pipeline réessaie jusqu'au succès.

## Correctifs structurants (master, P92 → P92.16)

1. **Compacteur publish priorisé** (`compact-zigbee-identifiers.cjs`) : préservation des mfrs observés mfs_db (5 395/5 395), réduction pids aux modelIds observés, rescue de drivers. Budgets workflows alignés (60k/10k).
2. **Flow IDs** : 831 renommés (hash sha1 déterministe) + `sanitize-manifest.cjs.normalizeFlowCardIds` = auto-guérison à chaque build + 59 issues d'audit corrigées (audit_all_flow_cards lui-même fixé).
3. **Guerre bot/humain terminée** : format canonique app.json compact partout (auto-fix-all, PRE-CLEAN workflow), `sync-appjson-zigbee.js` câblé dans auto-fix-all, `resolve-collisions.js` baseline-aware (428 dual-claims préservés).
4. **Crashs** : chaîne onDeleted (5 classes) + 37 gardes `_destroyed`, backportés stable-v5 ; soil overflow 0x04000000.
5. **Matching heuristique** : `lib/utils/fingerprint-matcher.js` (caseless, préfixes TZE200/204/284, fuzzy ≤2, verbose, 38 tests) intégré aux 3 couches d'identification.
6. **WiFi TuyaLocal-first** : LocalFirstResolver, bridge v2, handler connection-timeout, page WiFi sur GitHub Pages.
7. **Sécurité** : permissions minimales ×6, 2 injections corrigées, **127 actions pinnées en SHA** (46 workflows), smart-pr-merge same-repo, 0 secret commité.
8. **Données** : mfs_db 4 208 → 4 314+ (crawl 13 sources, cross-ref, 95 synthétiques résolus, forum 701 posts, issues/PR/forks).
9. **Docs** : PROJECT_INDEX (28 rapports), AGENTS.md (nouveaux modules), CHANGELOG, généalogie des 200 workflows, GitHub Pages (Device Finder + WiFi + Dashboards auto-générés).

## Stable-v5

Backports minimaux : onDeleted ×5, 37 gardes `_destroyed`, mrpevh8p, soil overflow, changelog 5.12.29 (M14), fix dashboard 4 220 FPs. 3/3 validateurs, 12/12 mocha, 53/53 jest.

## Restes documentés — TOUS CLOS (mise à jour 2026-07-29)

- ~~85 paires non routées~~ → **85/85 routées avec preuves** (P92.18, `85-pairs-routing.md`).
- ~~5 bugs forum nécessitant l'interview~~ → **tous corrigés** (P92.18 : EnergyJumpGuard, TS0044 logs, ZG-222Z IAS, Insoma confirmé, ka8l86iu ×2 fixes ; P92.21 : sonde externe DP38 pour #513).
- ~~13 utilisateurs forum sans réponse~~ → **triés** (`forum-13-users-triage.md`) : majorité résolus sur v9.0.353/357 (finnamu a confirmé #513 résolu), 1 bloqué sans interview (Nigel_Scott).
- 2 754 warnings DEFINED_NOT_TRIGGERED (bruit structurel flow cards, non critique).
- ~~Code mort : MCUVersionHelper, MagicPacketRegistry~~ → **supprimés** (P92.17).

Corrections post-rapport supplémentaires : bug de casse `resolve-collisions` (P92.20,
cause des purges récurrentes de mfrs), drivers fantômes `_DISABLED_` prunés du publish
(P92.22, mappings mfs_db périmés corrigés), self-heal publish sur processing_failed
(P92.18), TITAN v2 pattern (P92.19).
