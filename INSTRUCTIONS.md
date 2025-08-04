# 🚀 TUYA ZIGBEE UNIVERSAL — REFORMULATION CURSOR COMPLETE

## 🧭 Objectif global

Consolider et finaliser **le projet `com.tuya.zigbee`**, en séparant proprement les branches `master` (universelle, AI-powered) et `tuya-light` (version allégée), avec une **pipeline intelligente**, des **drivers organisés**, une **documentation multilingue** et un **déploiement autonome**.

> 🎯 Objectif : rendre le dépôt **auto-suffisant, modulaire, maintenable, exhaustif et validé Homey Pro SDK3**.

---

## ✅ Étapes de travail pour Cursor

### 1. Vérification du fonctionnement global

* Identifier les bugs actifs via `homey app validate` et `homey app install`
* Corriger les erreurs remontées sur le [forum Homey (page 31)](https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-lite-version/140352/31)
* Récupérer tous les jobs bloqués ou non exécutés (ex : queue GitHub Actions sautée)

### 2. Nettoyage du dépôt

* Supprimer tous les scripts PowerShell (`*.ps1`)
* Convertir en `.js` si nécessaire
* Réorganiser comme suit :

```
/drivers/
  ├── tuya/
  │   └── subtypes/
  └── zigbee/
    
/scripts/
  └── auto/
```

* Tous les drivers doivent être :

  * Fonctionnels ✅
  * Compatibles Homey Pro SDK3 ✅
  * Reliés dans `app.js`, `drivers.json`, `manifest.json`

### 3. Génération automatique

* Générer les fichiers :

  * `app.js`
  * `app.json`
  * `drivers.json`
  * `manifest.json`
* Valider l'application localement :

```bash
homey app validate
homey app install
```

### 4. Scraping intelligent

Intégrer les données de :

* GitHub : `JohanBendz/com.tuya.zigbee` (issues/PRs)
* Forum Homey (topics mentionnant Tuya)
* Zigbee2MQTT
* ZHA (Home Assistant)
* SmartLife (Samsung)
* Domoticz
* Enki (Legrand)
* doctor64/tuyaZigbee (DP, clusters)

### 5. Branchement `tuya-light`

Maintenir une version allégée stable :

* Uniquement les drivers dans `/drivers/tuya/`
* Pas de pipeline, pas d'IA, pas d'automatisation
* `README.md` dédié à cette version
* Synchronisation manuelle depuis `master` à chaque release stable

### 6. Documentation multilingue

Générer automatiquement :

* `README.md` → 🇬🇧 EN → 🇫🇷 FR → 🇳🇱 NL → 🇱🇰 தமிழ்
* `CHANGELOG.md`
* `drivers-matrix.md` (nom, DP, clusters, statut, source)
* `GitHub Pages dashboard` (HTML dynamique généré)

---

## 🔧 Améliorations recommandées

| Fonction / Script      | Description                                                                |
| ---------------------- | -------------------------------------------------------------------------- |
| `auto-i18n.js`         | Traduction multilingue automatique des fichiers `.md`                      |
| `monthly-sync.js`      | Synchronisation mensuelle avec Z2M/ZHA/SmartLife pour enrichir les drivers |
| `fallback-local.js`    | Fallback AI en local sans dépendance OpenAI                                |
| `validate-all.js`      | Valide en masse tous les fichiers de configuration                         |
| `watch-issues.js`      | GitHub Action qui importe automatiquement les nouveaux devices demandés    |
| `dashboard.js`         | Génère le GitHub Pages auto avec état des drivers                          |
| `drivers-sec-check.js` | Vérifie les clusters dangereux ou permissions mal définies                 |
| Tests unitaires        | À écrire pour valider les DP/EP/Clusters générés                           |

---

## 📌 Critères de succès

* [x] Application 100% fonctionnelle et validée
* [x] `app.js` complet et sans doublons
* [x] Pipelines intelligentes opérationnelles
* [x] Dashboard et fichiers `.md` générés automatiquement
* [x] Deux branches maintenues (`master` et `tuya-light`)
* [x] Intégration des sources communautaires

---

## 🧠 Notes du mainteneur

**Auteur** : Dylan Rajasekaram
📍 Projet : `com.tuya.zigbee`
📬 GitHub : [github.com/dlnraja](https://github.com/dlnraja)
🔗 LinkedIn : [linkedin.com/in/dlnraja](https://linkedin.com/in/dlnraja)

---

## 🌍 Ordre des langues

Tous les fichiers générés doivent respecter cet ordre :

1. 🇬🇧 English
2. 🇫🇷 Français
3. 🇳🇱 Nederlands
4. 🇱🇰 தமிழ் (Sri Lanka)

---

## ✅ Résultat attendu

* Projet **complet**, **documenté**, **multi-source**, **multilingue**
* Drivers testés, classés, enrichis
* Pipeline prête à relancer automatiquement
* Dashboard visible sur GitHub Pages
* Synchronisation simple de `tuya-light` depuis `master`

---

> 🔁 Ce document est conçu pour guider Cursor dans la consolidation complète du projet. Tu peux l'utiliser dans `INSTRUCTIONS.md`, dans un README interne, ou comme référence de maintenance.

---





 