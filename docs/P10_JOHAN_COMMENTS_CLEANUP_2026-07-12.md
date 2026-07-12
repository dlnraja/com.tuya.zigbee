# P10 Johan Comments Cleanup Report
**Date** : 2026-07-12
**Auteur** : Mavis
**Sprint** : P10 — Cleanup commentaires sur JohanBendz/com.tuya.zigbee

---

## Résumé exécutif

Audit complet des commentaires postés par **dlnraja + ses robots** sur les issues/PRs du repo upstream `JohanBendz/com.tuya.zigbee`. **1171 commentaires** identifiés sur **627 issues/PRs**, tous à supprimer.

**Status final** :
- ✅ **1171 commentaires** identifiés pour suppression
- ✅ **627 issues/PRs** touchées
- ✅ JSON + CSV + script de suppression générés
- ✅ Mode DRY_RUN par défaut (sécurité)
- ✅ Filtre par issue + max deletions supportés
- ✅ Suppression effective nécessite GH_TOKEN (fourni par l'utilisateur)

---

## Données extraites

### Total : 1171 commentaires sur 627 issues

| Auteur | Commentaires |
| --- | --- |
| dlnraja | 1171 (100%) |
| _inclut les posts des robots via le compte dlnraja_ | |

### Top 10 issues avec le plus de commentaires dlnraja

| Issue | Commentaires |
| --- | --- |
| #113 | 2 |
| #121 | 2 |
| #145 | 2 |
| #209 | 2 |
| #210 | 2 |
| #212 | 2 |
| #213 | 2 |
| #217 | 2 |
| #220 | 2 |
| #223 | 2 |

(La plupart des issues ont 1-2 commentaires dlnraja.)

### Auteurs "robots" détectés dans les commentaires

| Bot | Marqueur | Commentaires |
| --- | --- | --- |
| diag-resolver | `<!-- diag-resolver -->` | 800+ |
| tuya-triage-bot | `<!-- tuya-triage-bot -->` | 100+ |
| auto-responder | (texte) | 50+ |

_Tous ces robots postent sous le compte dlnraja — ils sont comptés comme "dlnraja" dans l'audit GitHub._

---

## Fichiers générés

| Fichier | Taille | Contenu |
| --- | --- | --- |
| `.github/state/johan-comments-to-delete.json` | 491 KB | Liste complète (commentId, issueNumber, author, createdAt, url, excerpt) |
| `.github/state/johan-comments-to-delete.csv` | 265 KB | Version CSV pour review rapide |
| `tools/ci/delete-johan-comments.js` | 7 KB | Script Node.js de suppression (DRY_RUN par défaut) |
| `tools/ci/delete-johan-comments.sh` | 4 KB | Alternative bash (nécessite jq) |
| `tools/ci/collect-johan-comments-to-delete.js` | 7 KB | Script de collecte (re-génère la liste) |
| `.github/state/johan-comments-deletion-report.json` | - | Report du dernier run |

---

## Comment lancer la suppression

### Étape 1 : Preview (DRY_RUN=true, default)

```bash
# Voir tous les commentaires qui seront supprimés
node tools/ci/delete-johan-comments.js

# Preview d'une seule issue
ISSUE_FILTER=1269 node tools/ci/delete-johan-comments.js

# Preview des 10 premiers
DRY_RUN=true node tools/ci/delete-johan-comments.js | head -20
```

### Étape 2 : Suppression effective (avec confirmation)

```bash
# Définir le token
export GH_TOKEN=ghp_***your_token_here***

# Supprimer TOUS les 1171 commentaires
node tools/ci/delete-johan-comments.js --confirm

# Supprimer seulement les 10 premiers (test)
node tools/ci/delete-johan-comments.js --confirm --max=10

# Supprimer seulement l'issue #1269
ISSUE_FILTER=1269 node tools/ci/delete-johan-comments.js --confirm
```

### Étape 3 : Vérification

```bash
# Re-lister pour voir ce qui reste
node tools/ci/collect-johan-comments-to-delete.js

# Voir le report
cat .github/state/johan-comments-deletion-report.json | head -50
```

---

## Sécurité du script

| Mesure | Détail |
| --- | --- |
| **DRY_RUN par défaut** | `true` — aucun appel API destructif par défaut |
| **--confirm obligatoire** | Sans ce flag, refuse de procéder même avec DRY_RUN=false |
| **Token check** | Vérifie GH_TOKEN ou GITHUB_TOKEN avant tout appel API |
| **Rate limit** | Sleep 250ms entre chaque DELETE (4 req/s, bien sous la limite GH de 5000/h) |
| **404 handled** | Commentaire déjà supprimé → "Already gone", pas d'erreur |
| **403/401 handled** | Token sans scope ou commentaire pas de l'auteur → logged, continue |
| **Filtre par issue** | ISSUE_FILTER=1269 pour ne toucher qu'une issue spécifique |
| **Max deletions** | --max=10 pour tester sur 10 commentaires d'abord |
| **Report JSON** | Chaque run génère un report avec status par commentaire |

---

## Structure du JSON (input)

```json
{
  "timestamp": "2026-07-12T...",
  "target": "JohanBendz/com.tuya.zigbee",
  "ourAuthors": ["dlnraja", "Mavis", "github-actions[bot]", "tuya-triage-bot", "diag-resolver", "auto-responder", "dln-bot"],
  "summary": {
    "totalComments": 1171,
    "issuesTouched": 627,
    "byAuthor": { "dlnraja": 1171 }
  },
  "comments": [
    {
      "commentId": 3976267322,
      "issueNumber": 1229,
      "author": "dlnraja",
      "url": "https://github.com/JohanBendz/com.tuya.zigbee/issues/1229#issuecomment-3976267322",
      "createdAt": "2026-02-28T03:44:45Z",
      "signal": "...",
      "excerpt": "Fixed in dlnraja fork: PM2.5 (DP20) and formaldehyde (DP22) now properly mapped for _TZE200_8ygsuhe1"
    },
    ...
  ]
}
```

## Structure du report (output)

```json
{
  "timestamp": "2026-07-12T...",
  "target": "JohanBendz/com.tuya.zigbee",
  "mode": "delete",
  "issueFilter": "",
  "max": null,
  "results": [
    { "commentId": 3976267322, "status": "deleted", ... },
    { "commentId": 4887804840, "status": "not-found", ... },
    { "commentId": 1234, "status": "failed", "httpStatus": 403, ... }
  ]
}
```

---

## Estimation temps

- **1171 commentaires × 250ms = 4 min 53 s** de wall time
- Rate limit GH : 5000 req/h → 1171 est 23% de la limite horaire
- 1 appel = 1 suppression (pas de batch)
- 1 seul job Node, pas de parallel (pour éviter rate limit)

---

## Auteurs identifiés

L'audit regarde ces auteurs (case-insensitive) :

| Auteur | Pattern |
| --- | --- |
| dlnraja | (Dylan Rajasekaram, le user) |
| Mavis | (ton agent IA) |
| mavis | (variante lowercase) |
| github-actions[bot] | (bot GH standard) |
| tuya-triage-bot | (bot custom) |
| diag-resolver | (bot diagnostic) |
| auto-responder | (bot auto) |
| dln-bot | (bot custom) |

**Note** : tous les commentaires dlnraja comptés incluent ceux postés par ses robots (qui utilisent son compte). Pour filtrer, modifier `OUR_AUTHORS` dans `collect-johan-comments-to-delete.js`.

---

## Vérification des prérequis

```bash
# Node.js 18+ (pour fetch built-in)
node --version  # v24.14.0 ✓

# Token GH avec scope 'repo'
echo $GH_TOKEN | head -c 7  # doit afficher "ghp_***" ou "github_pat_***"

# Test sur 1 commentaire d'abord
node tools/ci/delete-johan-comments.js --confirm --max=1
```

---

## Plan d'exécution recommandé

1. **Audit** : `node tools/ci/collect-johan-comments-to-delete.js` (déjà fait)
2. **Review** : ouvre `.github/state/johan-comments-to-delete.csv` dans Excel/VSCode
3. **Test** : `node tools/ci/delete-johan-comments.js --confirm --max=5` (test 5 commentaires)
4. **Verify** : va sur GitHub et vérifie que 5 commentaires ont disparu
5. **Full** : `node tools/ci/delete-johan-comments.js --confirm` (les 1171)
6. **Re-collect** : `node tools/ci/collect-johan-comments-to-delete.js` (vérifier que c'est 0)
7. **Cleanup tools** : `rm .github/state/johan-comments-*.json` (optionnel)

---

## Insights

1. **1462 URLs uniques** mais **1171 commentaires uniques** (291 doublons dans l'audit)
2. **627 issues** touchées (probablement 1-2 commentaires dlnraja par issue)
3. **Marqueur `<!-- diag-resolver -->`** est le pattern dominant (~70% des commentaires)
4. **GH API permet à l'auteur** de supprimer ses propres commentaires (confirmé par docs)
5. **Rate limit safe** : 4 req/s << 5000/h, 1171 est 23% de la limite
6. **DRY_RUN** : aucune action destructive sans --confirm explicite
7. **Article** : suppression commentaires est irréversible — GH ne garde pas de backup accessible

---

## Outils créés P10 (cleanup)

| Outil | Lignes | Rôle |
| --- | --- | --- |
| `tools/ci/collect-johan-comments-to-delete.js` | 165 | Génère JSON/CSV/script depuis audit data |
| `tools/ci/delete-johan-comments.js` | 145 | Script Node.js de suppression (DRY_RUN, --confirm, --max, ISSUE_FILTER) |
| `tools/ci/delete-johan-comments.sh` | 121 | Alternative bash pour ceux qui ont jq/bash |

Total : 431 lignes / 100% NEW.

---

**Status final** : ✅ Liste générée. La suppression effective est en attente du `GH_TOKEN` de l'utilisateur pour exécution.
