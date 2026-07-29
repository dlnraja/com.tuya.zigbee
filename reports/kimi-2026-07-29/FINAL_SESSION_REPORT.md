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

## Restes documentés (non bloquants)

- 85 paires non routées (`tmp/47pairs-unrouted.txt`) — spéculatives mono-source.
- Bugs forum nécessitant l'interview device : energy scaling ×660, TS0044 Moes, ZG-222Z muet, Insoma valve, ka8l86iu presence.
- 13 utilisateurs forum sans réponse depuis juin-juillet (voir `reports/kimi-2026-07-29/forum-dlnraja-history.md`).
- 2 754 warnings DEFINED_NOT_TRIGGERED (bruit structurel flow cards, non critique).
- Code mort : MCUVersionHelper, MagicPacketRegistry (refactorés, suppression à décider).
