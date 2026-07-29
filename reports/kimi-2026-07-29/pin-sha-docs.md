# Pin SHA `actions/*` + synchronisation docs — 2026-07-29

Périmètre : `.github/workflows/`, `.github/WORKFLOW_GUIDELINES.md`, `AGENTS.md`, `PROJECT_INDEX.md`, `reports/`. Aucun commit/push. `drivers/` et `app.json` non touchés.

## A. Pin SHA des actions officielles

Toutes les actions externes des 53 workflows actifs sont désormais pinnées en SHA complet (`owner/repo@<SHA> # vX.Y.Z`). Résolution via `git ls-remote https://github.com/actions/<repo> "refs/tags/<tag>*"` ; tags légers (pas de `^{}`), le SHA du tag = commit.

| Action | Tag | SHA | Tag précis | Occurrences |
|--------|-----|-----|-----------|-------------|
| actions/checkout | v5 | `fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09` | v5.1.0 | 55 |
| actions/setup-node | v5 | `a0853c24544627f65ddf259abe73b1d18a591444` | v5.0.0 | 46 |
| actions/upload-artifact | v5 | `330a01c490aca151604b8cf639adc76d48f6c5d4` | v5.0.0 | 22 |
| actions/cache | v5 | `caa296126883cff596d87d8935842f9db880ef25` | v5.1.0 | 2 |
| actions/github-script | v7 | `f28e40c7f34bde8b3046d885e986cb6290c5673b` | v7.1.0 | 2 |

**127 occurrences remplacées** dans 49 fichiers workflow. Les actions tierces et les autres `actions/*` (upload-pages-artifact, deploy-pages, stale, labeler…) étaient déjà pinnées (follow-up sécurité 2026-07-28).

Vérifications :
- `grep "uses:.*@[a-zA-Z]" *.yml | grep -vE "@[0-9a-f]{40}"` → 0 restant (hors `uses: ./.github` local).
- Syntaxe YAML validée avec `js-yaml` (node_modules) : **53/53 fichiers valides, 0 erreur**.

`.github/WORKFLOW_GUIDELINES.md` : règle Supply-Chain mise à jour (2 occurrences) — **TOUTES les actions en SHA, sans exception**, avec procédure de résolution.

## B. Documentation

Existence vérifiée sur disque avant écriture de chaque entrée.

### PROJECT_INDEX.md
- Titre section rapports → `INVESTIGATION REPORTS (2026-07-28/29)`.
- Table `reports/kimi-2026-07-29/` : ajout de `deep-harvest.md`, `forum-dlnraja-history.md`, `pin-sha-docs.md` (ce rapport). `flow-cards-59-fixes.md` **non créé** → non listé.
- §4 Fingerprint Matching : sous-section « Heuristic Matcher » (`lib/utils/fingerprint-matcher.js`, paliers scorés caseless, `TUYA_FP_VERBOSE` / `TUYA_FP_HEURISTIC`).
- §11 File Locations : compteurs réels mis à jour (lib/tuya 63, lib/utils 72, scripts/automation 119, scripts/ci 36, scripts/validation 33, scripts root 94, .github/scripts 166) ; lignes ajoutées : `lib/wifi/` (LocalFirstResolver, WiFiConnectionPolicy), `scripts/maintenance/` (sync-appjson-zigbee câblé dans `scripts/validation/auto-fix-all.js`, sanitize-manifest `normalizeFlowCardIds`, compact-zigbee-identifiers budgets `HOMEY_ZIGBEE_MAX_*`), `.github/pages-build/` (Device Finder, wifi.html, dashboards.html + 6 dashboards).

### AGENTS.md
- Table « Key Files » : +6 lignes (fingerprint-matcher, LocalFirstResolver + LocalWiFiTuyaBridge v2, scripts/maintenance, resolve-collisions baseline-aware, ULTIMATE_CHECK `--verbose`, générateurs Pages).

## Notes
- `flow-cards-59-fixes.md` n'existe pas dans `reports/kimi-2026-07-28/` ni `-29/` — ignoré comme prévu (« si créé »).
- `generate-wifi-page.js` / `generate-dashboards-page.js` existent dans `.github/scripts/` mais ne sont référencés par aucun workflow (seul `generate-device-finder.js` est exécuté par `deploy-pages.yml`) — génération manuelle ou hors CI.
- README.md non modifié : aucune section technique ne mentionnait ces modules.
