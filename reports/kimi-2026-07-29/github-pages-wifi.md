# GitHub Pages — Section WiFi & métriques (2026-07-29)

> Périmètre : contenu GitHub Pages (`.github/pages-build/`, générateurs `.github/scripts/device-finder-*` / `generate-wifi-page.js`) + `reports/`.
> Non touché (chantiers concurrents) : `scripts/`, `lib/`, `data/`, `.github/workflows/`. Aucun commit/push.

## 1. Structure du site (étude)

- **Stack** : site **statique 100% généré**, pas de Jekyll. Source = `.github/scripts/generate-device-finder.js`
  → écrit `.github/pages-build/` → uploadé comme artifact Pages par `.github/workflows/deploy-pages.yml`
  (`actions/upload-pages-artifact` + `deploy-pages`, cron quotidien 09:00 UTC + push sur drivers).
- **Branche `gh-pages`** : obsolète (dernier deploy 2025-11-10, ancien mécanisme) — le déploiement actuel est
  **artifact-based** depuis master, la branche n'est plus utilisée.
- **Contenu avant ma mission** : une seule page SPA « Device Finder » (`index.html`, ~1,2 Mo, style dark
  Tailwind CDN + CSS custom, cards par driver, recherche/filtres JS) + fichiers statiques leftovers
  (`README.md`, `CHANGELOG.md`, `app.json`, `package.json`) avec métriques périmées (152/215 drivers, v1.0.x,
  URLs placeholder `tuya/tuya-zigbee`).
- Les 6 dashboards de `scripts/dashboard/*.html` ne sont **pas** publiés sur Pages (hors artifact).
- **Référentiel alimenté automatiquement** : `devices.json` + `index.html` uniquement, régénérés à chaque
  deploy depuis `drivers/*/driver.compose.json` + `app.json`.

## 2. Page WiFi créée — `.github/pages-build/wifi.html` (37 Ko)

Même style que le Device Finder (mêmes variables CSS, hero, stats, cards). Lien ajouté dans le hero et le
footer de `index.html`. **3 volets** :

- **👤 For Users** : grille des 50 drivers `wifi_*` (badge de connectivité : 28 Tuya LAN / eWeLink / Sonoff DIY /
  caméra), « local-first, cloud-optional », pairing en 4 étapes (Smart Life → `local_key` une fois via cloud,
  opt-in → 100% LAN ensuite), FAQ 5 entrées (cloud requis ? pourquoi le cloud au pairing ? changement d'IP ?
  device offline ? fallback cloud ?).
- **🔧 Under the Hood** : 6 cards composants avec specs réelles — `TuyaLocalClient` (TCP 6668, AES,
  auto-protocole 3.3→3.4→3.5→3.2→3.1, heartbeat 15 s, backoff 5 s→60 s, file 200 ms/10 s/2 retries, offline
  50 cmd/5 min), `LocalFirstResolver` (logique pure, lan→cloud→none + `reason` loguée), `TuyaUDPDiscovery`
  (UDP 6666/6667/6668, IP self-healing), `WiFiConnectionPolicy` (`cloudFallback:false` par défaut), fallback
  cloud opt-in (snapshot diagnostique rate-limité 1/10 min, jamais appliqué, retry LAN 5 min),
  `LocalWiFiTuyaBridge`.
- **🏗 Architecture** : schéma ASCII du flux (device ↔ TCP 6668 ↔ client ↔ resolver ↔ fallback cloud opt-in,
  UDP discovery en IP self-healing), table composants/fichiers/rôles, stats DP tuya-local (995 devices
  catalogués, 519 manufacturers, 16 193 DP mappings ; 500 exportés dans le snapshot JSON).

Contenu sourcé depuis `reports/kimi-2026-07-28/wifi-local-first.md`, `lib/wifi/LocalFirstResolver.js`,
`lib/tuya-local/` et `data/scanners/tuya-local-results.json`.

## 3. Générateur + automation

- **Nouveau** : `.github/scripts/generate-wifi-page.js` (autonome + module). Collecte les données réelles :
  `device-finder-collect` (drivers), classification de connectivité par scan de `device.js`
  (`TuyaLocalDevice`/`TuyaLocalClient` → Tuya LAN), `data/scanners/tuya-local-results.json` (summary),
  `data/mfs_db.json` (`stats.totalEntries`), `app.json` (version).
- **Câblage sans toucher aux workflows** : `generate-device-finder.js` appelle désormais
  `require('./generate-wifi-page')()` (try/catch non-fatal). Comme `deploy-pages.yml` exécute déjà
  `generate-device-finder.js` à chaque deploy, `wifi.html` **se régénère automatiquement** — aucune ligne à
  ajouter au workflow. `.github/workflows/deploy-pages.yml` **non modifié** (chantier concurrent actif sur
  `.github/workflows/` : 9 workflows déjà modifiés dans le working tree).
- Placé dans `.github/scripts/` (dossier de génération du site) plutôt que `scripts/dashboard/` pour rester
  hors du chantier concurrent `scripts/`.

## 4. Métriques mises à jour

| Fichier | Avant | Après |
|---|---|---|
| `pages-build/README.md` | 152 drivers, 19 URLs `tuya/tuya-zigbee` | 431 drivers, `dlnraja/com.tuya.zigbee` |
| `pages-build/CHANGELOG.md` | badge Version-1.0.0, 8 URLs placeholder | Version-9.0.348, URLs corrigées |
| `pages-build/package.json` | v1.1.0, « 215 drivers » | v9.0.348, « 431 drivers » |
| `pages-build/app.json` | v1.0.1 | v9.0.348 |
| `pages-build/index.html` | régénéré : v9.0.348, **431 drivers, 5 734 fingerprints** | ✅ live |

Note : la mission annonçait ~5 471 fingerprints ; le compte **réel** au 2026-07-29 est **5 734**
(431 drivers / 4 313 entrées mfs_db confirmés, `stats.totalEntries`). Le générateur utilise toujours les
données live, donc plus de dérive possible pour `index.html`/`wifi.html`.

## 5. Vérifications

- `node --check` OK : `generate-wifi-page.js`, `generate-device-finder.js`, `device-finder-html.js`.
- Exécution : `node .github/scripts/generate-device-finder.js` →
  `431 drivers, 5734 fingerprints` + `WiFi page generated: 50 wifi drivers (28 Tuya LAN), 995 tuya-local
  devices, 4313 mfs_db entries`.
- Rendu `wifi.html` vérifié par parsing : 3 sections (`#user`, `#technical`, `#architecture`), 56 cards,
  5 FAQ, `<pre class="schema">` présent, divs ouvrantes/fermantes balancées (226/226), toutes les chaînes
  clés présentes ; `index.html` contient 2 liens vers `wifi.html` et les stats live.

## 6. Fichiers touchés

- ➕ `.github/scripts/generate-wifi-page.js` (générateur)
- ➕ `.github/pages-build/wifi.html` (page générée)
- ✏️ `.github/scripts/generate-device-finder.js` (+1 ligne : appel du générateur WiFi)
- ✏️ `.github/scripts/device-finder-html.js` (+2 liens vers `wifi.html`)
- ✏️ `.github/pages-build/{README.md,CHANGELOG.md,package.json,app.json}` (métriques/URLs)
- 🔄 `.github/pages-build/{index.html,devices.json}` (régénérés)

## 7. Reste à faire / suivi

- La branche `gh-pages` (2025-11-10) est morte : à archiver/supprimer côté repo si confirmé inutilisée.
- Les 6 dashboards `scripts/dashboard/*.html` ne sont pas sur Pages ; si souhaité, les copier dans
  `pages-build/dashboards/` au deploy (nécessite une ligne dans `deploy-pages.yml` → à coordonner avec
  l'agent workflows).
- Snapshot tuya-local tronqué (500/995 devices exportés) : relancer le crawl (déjà noté au rapport du 28).
