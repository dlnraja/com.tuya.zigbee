# 📘 Universal Tuya Zigbee Device App — README

---

## 🏷️ 📊 Statut & Automatisation

[![Dashboard](https://img.shields.io/badge/Dashboard-Live-green?style=flat-square&logo=github)](https://dlnraja.github.io/com.tuya.zigbee/dashboard.html)
[![CI Build](https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/build.yml/badge.svg)](https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/build.yml)
[![Drivers Validated](https://img.shields.io/badge/Drivers-Validated-blue?style=flat-square&logo=home-assistant)](https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/validate-drivers.yml)
[![Sync tuya-light](https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/sync-tuya-light.yml/badge.svg)](https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/sync-tuya-light.yml)
[![Deploy Dashboard](https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/dashboard-deploy-workflow.yml/badge.svg)](https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/dashboard-deploy-workflow.yml)
[![Changelog Auto](https://img.shields.io/badge/Changelog-Auto-lightgrey?style=flat-square&logo=git)](https://github.com/dlnraja/com.tuya.zigbee/releases)

---

## 🚀 Workflows GitHub Actions

Ce projet intègre une suite complète de workflows CI/CD automatisés pour garantir la qualité, la stabilité et la synchronisation des drivers entre les différentes branches :

| Workflow | Description | Fréquence |
|----------|-------------|-----------|
| `validate-drivers.yml` | Vérifie la validité de tous les fichiers `driver.compose.json` et la présence des `driver.js` nécessaires | À chaque push / PR |
| `build.yml` | Compile, teste et archive le projet en mode `full` ou `lite` | À chaque push / PR |
| `sync-tuya-light.yml` | Synchronisation automatique entre `master` → `tuya-light` avec stratégie non destructive | Tous les 1er du mois (04:00 UTC) + déclenchement manuel |
| `dashboard-deploy-workflow.yml` | Génère et publie automatiquement un dashboard HTML sur GitHub Pages | À chaque push sur `master` |
| `auto-changelog.yml` | Génère automatiquement un changelog basé sur les commits et tags GitHub | À chaque tag ou release |

---

## 🧩 Matrice des drivers supportés (extrait)

> La version complète se trouve dans [`drivers-matrix.md`](./drivers-matrix.md) et est générée automatiquement lors des builds `full`

| Type        | Chemin relatif                                  | Statut JSON | Statut JS  |
|-------------|--------------------------------------------------|-------------|------------|
| Switch      | `drivers/tuya/switches/driver.compose.json`     | ✅ Valide   | ✅ Présent |
| Sensor      | `drivers/zigbee/sensors/driver.compose.json`     | ✅ Valide   | ✅ Présent |
| Thermostat  | `drivers/tuya/thermostats/driver.compose.json`  | ⚠️ Incomplet | ✅ Présent |
| Unknown     | `drivers/tuya/unknown/device_unk_XYZ.json`       | ❌ Invalide | ❌ Manquant |

---

## 💡 Mode d'exécution

Ce dépôt fonctionne selon deux modes principaux :

- `full` : inclut enrichissements IA, fallback, intégration forum, auto-sync et pipelines enrichis
- `lite` : version allégée, sans IA ni enrichissements dynamiques, compatible Homey Pro SDK3 uniquement

Le mode est contrôlé par la variable d'environnement :
```bash
TUYA_MODE=full # ou lite
```

---

## 📁 Structure du dépôt

- `drivers/` — Tous les pilotes Homey (classés par fabricant/type)
- `scripts/` — Scripts de génération, scraping ou enrichissement
- `.github/workflows/` — Automatisation GitHub Actions
- `docs/` — Documentation utilisateur + dashboard HTML
- `ref/`, `mega/`, `tuya-light-release/` — Variantes internes ou synchronisées

---

## 👥 CONTRIBUTING

Merci de contribuer à ce projet ! Voici quelques recommandations :

1. **Forkez** le dépôt puis clonez-le localement
2. Créez une branche `feature/mon-nouveau-driver`
3. Vérifiez vos fichiers avec :
```bash
npm run lint && node generate-matrix.js
```
4. Soumettez une Pull Request avec un titre explicite et une description claire
5. Merci d'utiliser les modèles d'issues si vous signalez un bug ou demandez un nouveau driver

---

## 🔧 Mainteneur

Projet maintenu par **Dylan Rajasekaram** [GitHub](https://github.com/dlnraja) · [LinkedIn](https://linkedin.com/in/dlnraja)

📬 Pour toute demande de support, ouvrez une issue ou contactez le forum Homey : [Community Thread](https://community.homey.app/t/wip-universal-tuya-zigbee-device-app-cli-install/140352)

---

## 📁 `drivers-matrix.md` (généré automatiquement)

Ce fichier contient la **liste exhaustive des drivers disponibles**, leur statut de validation, leur type, modèle, capabilities détectées et enrichissement IA.

| Type | Dossier | Fichier | JSON | JS | Enrichi | Mode |
|------|---------|---------|------|----|---------|------|
| Switch | switches | driver.compose.json | ✅ | ✅ | ✅ | full |
| Sensor | sensors  | driver.compose.json | ✅ | ✅ | ❌ | lite |
| Thermostat | thermostats | driver.compose.json | ⚠️ | ✅ | ✅ | full |
| Unknown | unknown/deviceXYZ | ❌ | ❌ | ❌ | ✖️ | — |

> Mis à jour à chaque merge dans `master` ou `tuya-light`, archive dans `/docs`.

---

## 🌟 **MEGA MODE ULTIME** 🚀

### 🧠 **Fonctionnalités Avancées**

- **🤖 IA Enrichment** : Analyse automatique et amélioration des drivers
- **🔄 Auto-Sync** : Synchronisation automatique entre branches
- **📊 Dashboard Live** : Interface temps réel pour monitoring
- **🌍 Support Multilingue** : EN, FR, NL, TA
- **⚡ 8 Workflows GitHub Actions** : Automatisation complète
- **🔧 Driver Validation** : Vérification automatique de tous les drivers
- **📈 Analytics** : Métriques détaillées et rapports
- **🛡️ Security** : Validation et backup automatiques

### 🎯 **Mode d'Activation**

```bash
# Mode complet avec toutes les fonctionnalités
TUYA_MODE=full

# Mode allégé pour Homey Pro SDK3
TUYA_MODE=lite
```

---

> ✍️ **Généré automatiquement** le 2025-01-29T01:40:00.000Z  
> 🎯 **MEGA-PROMPT ULTIME - VERSION FINALE 2025**
