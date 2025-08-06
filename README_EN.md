# 📘 Universal Tuya Zigbee Device App — README

---

## 🇬🇧 English — Main Version

### 🏷️ Status & Automation

[![Dashboard](https://img.shields.io/badge/Dashboard-Live-green?style=flat-square&logo=github)](https://dlnraja.github.io/com.tuya.zigbee/dashboard.html)
[![CI Build](https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/build.yml/badge.svg)](https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/build.yml)
[![Drivers Validated](https://img.shields.io/badge/Drivers-Validated-blue?style=flat-square&logo=home-assistant)](https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/validate-drivers.yml)
[![Sync tuya-light](https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/sync-tuya-light.yml/badge.svg)](https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/sync-tuya-light.yml)
[![Deploy Dashboard](https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/dashboard-deploy-workflow.yml/badge.svg)](https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/dashboard-deploy-workflow.yml)
[![Changelog Auto](https://img.shields.io/badge/Changelog-Auto-lightgrey?style=flat-square&logo=git)](https://github.com/dlnraja/com.tuya.zigbee/releases)

---

### 🚀 GitHub Workflows

This project includes full CI/CD automation to validate, synchronize, and maintain compatibility of Zigbee devices:

| Workflow | Description | Frequency |
|----------|-------------|-----------|
| `validate-drivers.yml` | Validate all `driver.compose.json` and presence of `driver.js` | On every push / PR |
| `build.yml` | Build, test, and archive the app in both `full` and `lite` mode | On every push / PR |
| `sync-tuya-light.yml` | Monthly sync from `master` to `tuya-light` with safe strategy | 1st of each month (04:00 UTC) + manual |
| `dashboard-deploy-workflow.yml` | Generate and publish dashboard on GitHub Pages | On every push to `master` |
| `release-changelog.yml` | Auto-generate CHANGELOG from commits & tags | On every release |

---

### 🧩 Supported Drivers Matrix (preview)

> See [`drivers-matrix.md`](./drivers-matrix.md) for full list

| Type | Path | JSON | JS |
|------|------|------|----|
| Switch | `drivers/tuya/switches/driver.compose.json` | ✅ | ✅ |
| Sensor | `drivers/zigbee/sensors/driver.compose.json` | ✅ | ✅ |
| Thermostat | `drivers/tuya/thermostats/driver.compose.json` | ⚠️ | ✅ |
| Unknown | `drivers/tuya/unknown/device_unk_XYZ.json` | ❌ | ❌ |

---

### 💡 Execution Modes

- `full`: includes AI enrichment, fallbacks, forum sync, GitHub pipelines
- `lite`: stripped-down version without automation or AI

Use the `TUYA_MODE` environment variable:
```bash
TUYA_MODE=full # or lite
```

---

### 📁 Repository Structure

- `drivers/` — Homey drivers, by type
- `scripts/` — Generation and enrichment tools
- `.github/workflows/` — CI/CD definitions
- `docs/` — Dashboard + changelogs
- `ref/`, `mega/`, `tuya-light-release/` — Alternate variants

---

### 👥 CONTRIBUTING

Please see [`CONTRIBUTING.md`](./CONTRIBUTING.md) for pull request instructions.

---

### 🔧 Maintainer

Maintained by **Dylan Rajasekaram** · [GitHub](https://github.com/dlnraja) · [LinkedIn](https://linkedin.com/in/dlnraja)  
📬 For support: open a GitHub Issue or use [Community Thread](https://community.homey.app/t/wip-universal-tuya-zigbee-device-app-cli-install/140352)

---

## 🇫🇷 Français — Version traduite

### 🏷️ Statut et Automatisation

[![Dashboard](https://img.shields.io/badge/Dashboard-Live-green?style=flat-square&logo=github)](https://dlnraja.github.io/com.tuya.zigbee/dashboard.html)
[![CI Build](https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/build.yml/badge.svg)](https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/build.yml)
[![Drivers Validated](https://img.shields.io/badge/Drivers-Validated-blue?style=flat-square&logo=home-assistant)](https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/validate-drivers.yml)
[![Sync tuya-light](https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/sync-tuya-light.yml/badge.svg)](https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/sync-tuya-light.yml)
[![Deploy Dashboard](https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/dashboard-deploy-workflow.yml/badge.svg)](https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/dashboard-deploy-workflow.yml)
[![Changelog Auto](https://img.shields.io/badge/Changelog-Auto-lightgrey?style=flat-square&logo=git)](https://github.com/dlnraja/com.tuya.zigbee/releases)

---

### 🚀 Workflows GitHub

Ce projet intègre une suite complète de workflows CI/CD automatisés pour garantir la qualité, la stabilité et la synchronisation des drivers entre les différentes branches :

| Workflow | Description | Fréquence |
|----------|-------------|-----------|
| `validate-drivers.yml` | Vérifie la validité de tous les fichiers `driver.compose.json` et la présence des `driver.js` nécessaires | À chaque push / PR |
| `build.yml` | Compile, teste et archive le projet en mode `full` ou `lite` | À chaque push / PR |
| `sync-tuya-light.yml` | Synchronisation automatique entre `master` → `tuya-light` avec stratégie non destructive | Tous les 1er du mois (04:00 UTC) + déclenchement manuel |
| `dashboard-deploy-workflow.yml` | Génère et publie automatiquement un dashboard HTML sur GitHub Pages | À chaque push sur `master` |
| `release-changelog.yml` | Génère automatiquement un changelog basé sur les commits et tags GitHub | À chaque tag ou release |

---

### 🧩 Matrice des drivers supportés (extrait)

> La version complète se trouve dans [`drivers-matrix.md`](./drivers-matrix.md) et est générée automatiquement lors des builds `full`

| Type        | Chemin relatif                                  | Statut JSON | Statut JS  |
|-------------|--------------------------------------------------|-------------|------------|
| Switch      | `drivers/tuya/switches/driver.compose.json`     | ✅ Valide   | ✅ Présent |
| Sensor      | `drivers/zigbee/sensors/driver.compose.json`     | ✅ Valide   | ✅ Présent |
| Thermostat  | `drivers/tuya/thermostats/driver.compose.json`  | ⚠️ Incomplet | ✅ Présent |
| Unknown     | `drivers/tuya/unknown/device_unk_XYZ.json`       | ❌ Invalide | ❌ Manquant |

---

### 💡 Mode d'exécution

Ce dépôt fonctionne selon deux modes principaux :

- `full` : inclut enrichissements IA, fallback, intégration forum, auto-sync et pipelines enrichis
- `lite` : version allégée, sans IA ni enrichissements dynamiques, compatible Homey Pro SDK3 uniquement

Le mode est contrôlé par la variable d'environnement :
```bash
TUYA_MODE=full # ou lite
```

---

### 📁 Structure du dépôt

- `drivers/` — Tous les pilotes Homey (classés par fabricant/type)
- `scripts/` — Scripts de génération, scraping ou enrichissement
- `.github/workflows/` — Automatisation GitHub Actions
- `docs/` — Documentation utilisateur + dashboard HTML
- `ref/`, `mega/`, `tuya-light-release/` — Variantes internes ou synchronisées

---

### 👥 CONTRIBUTING.md

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

### 🔧 Mainteneur

Projet maintenu par **Dylan Rajasekaram** [GitHub](https://github.com/dlnraja) · [LinkedIn](https://linkedin.com/in/dlnraja)

📬 Pour toute demande de support, ouvrez une issue ou contactez le forum Homey : [Community Thread](https://community.homey.app/t/wip-universal-tuya-zigbee-device-app-cli-install/140352)

---

## 🇳🇱 Nederlands — Vertaald versie

### 🏷️ Status en Automatisering

[![Dashboard](https://img.shields.io/badge/Dashboard-Live-green?style=flat-square&logo=github)](https://dlnraja.github.io/com.tuya.zigbee/dashboard.html)
[![CI Build](https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/build.yml/badge.svg)](https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/build.yml)
[![Drivers Validated](https://img.shields.io/badge/Drivers-Validated-blue?style=flat-square&logo=home-assistant)](https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/validate-drivers.yml)
[![Sync tuya-light](https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/sync-tuya-light.yml/badge.svg)](https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/sync-tuya-light.yml)
[![Deploy Dashboard](https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/dashboard-deploy-workflow.yml/badge.svg)](https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/dashboard-deploy-workflow.yml)
[![Changelog Auto](https://img.shields.io/badge/Changelog-Auto-lightgrey?style=flat-square&logo=git)](https://github.com/dlnraja/com.tuya.zigbee/releases)

---

### 🚀 GitHub Workflows

Dit project bevat volledige CI/CD automatisering om de kwaliteit, stabiliteit en synchronisatie van drivers tussen verschillende branches te garanderen:

| Workflow | Beschrijving | Frequentie |
|----------|-------------|-----------|
| `validate-drivers.yml` | Valideert alle `driver.compose.json` bestanden en aanwezigheid van `driver.js` | Bij elke push / PR |
| `build.yml` | Bouwt, test en archiveert het project in `full` of `lite` modus | Bij elke push / PR |
| `sync-tuya-light.yml` | Maandelijkse synchronisatie van `master` naar `tuya-light` met veilige strategie | 1e van elke maand (04:00 UTC) + handmatig |
| `dashboard-deploy-workflow.yml` | Genereert en publiceert dashboard op GitHub Pages | Bij elke push naar `master` |
| `release-changelog.yml` | Genereert automatisch CHANGELOG van commits en tags | Bij elke release |

---

### 🧩 Ondersteunde Drivers Matrix (voorbeeld)

> Zie [`drivers-matrix.md`](./drivers-matrix.md) voor volledige lijst

| Type | Pad | JSON | JS |
|------|-----|------|----|
| Switch | `drivers/tuya/switches/driver.compose.json` | ✅ | ✅ |
| Sensor | `drivers/zigbee/sensors/driver.compose.json` | ✅ | ✅ |
| Thermostat | `drivers/tuya/thermostats/driver.compose.json` | ⚠️ | ✅ |
| Unknown | `drivers/tuya/unknown/device_unk_XYZ.json` | ❌ | ❌ |

---

### 💡 Uitvoeringsmodi

- `full`: inclusief AI verrijking, fallbacks, forum synchronisatie, GitHub pipelines
- `lite`: gestripte versie zonder automatisering of AI

Gebruik de `TUYA_MODE` omgevingsvariabele:
```bash
TUYA_MODE=full # of lite
```

---

### 📁 Repository Structuur

- `drivers/` — Homey drivers, per type
- `scripts/` — Generatie en verrijkingsgereedschappen
- `.github/workflows/` — CI/CD definities
- `docs/` — Dashboard + changelogs
- `ref/`, `mega/`, `tuya-light-release/` — Alternatieve varianten

---

### 👥 BIJDRAGEN

Zie [`CONTRIBUTING.md`](./CONTRIBUTING.md) voor pull request instructies.

---

### 🔧 Onderhouder

Onderhouden door **Dylan Rajasekaram** · [GitHub](https://github.com/dlnraja) · [LinkedIn](https://linkedin.com/in/dlnraja)  
📬 Voor ondersteuning: open een GitHub Issue of gebruik [Community Thread](https://community.homey.app/t/wip-universal-tuya-zigbee-device-app-cli-install/140352)

---

## 🇱🇰 தமிழ் — தமிழாக்கம்

### 🏷️ நிலை மற்றும் தானியக்கம்

[![Dashboard](https://img.shields.io/badge/Dashboard-Live-green?style=flat-square&logo=github)](https://dlnraja.github.io/com.tuya.zigbee/dashboard.html)
[![CI Build](https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/build.yml/badge.svg)](https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/build.yml)
[![Drivers Validated](https://img.shields.io/badge/Drivers-Validated-blue?style=flat-square&logo=home-assistant)](https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/validate-drivers.yml)
[![Sync tuya-light](https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/sync-tuya-light.yml/badge.svg)](https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/sync-tuya-light.yml)
[![Deploy Dashboard](https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/dashboard-deploy-workflow.yml/badge.svg)](https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/dashboard-deploy-workflow.yml)
[![Changelog Auto](https://img.shields.io/badge/Changelog-Auto-lightgrey?style=flat-square&logo=git)](https://github.com/dlnraja/com.tuya.zigbee/releases)

---

### 🚀 GitHub Workflows

இந்த திட்டம் Zigbee சாதனங்களின் பொருந்தக்கூடிய தன்மையை சரிபார்க்க, ஒத்திசைக்க மற்றும் பராமரிக்க முழுமையான CI/CD தானியக்கத்தை உள்ளடக்கியது:

| Workflow | விளக்கம் | அதிர்வெண் |
|----------|-------------|-----------|
| `validate-drivers.yml` | அனைத்து `driver.compose.json` மற்றும் `driver.js` இருப்பை சரிபார்க்கிறது | ஒவ்வொரு push / PR இல் |
| `build.yml` | `full` மற்றும் `lite` பயன்முறையில் பயன்பாட்டை உருவாக்க, சோதிக்க மற்றும் காப்பு வைக்கிறது | ஒவ்வொரு push / PR இல் |
| `sync-tuya-light.yml` | பாதுகாப்பான உத்தியுடன் `master` இலிருந்து `tuya-light` க்கு மாதாந்திர ஒத்திசைவு | ஒவ்வொரு மாதத்தின் 1ம் தேதி (04:00 UTC) + கைமுறை |
| `dashboard-deploy-workflow.yml` | GitHub Pages இல் dashboard ஐ உருவாக்கி வெளியிடுகிறது | `master` க்கு ஒவ்வொரு push இல் |
| `release-changelog.yml` | commits மற்றும் tags இலிருந்து CHANGELOG ஐ தானாக உருவாக்குகிறது | ஒவ்வொரு release இல் |

---

### 🧩 ஆதரிக்கப்படும் Drivers Matrix (முன்னோட்டம்)

> முழு பட்டியலுக்கு [`drivers-matrix.md`](./drivers-matrix.md) பார்க்கவும்

| வகை | பாதை | JSON | JS |
|------|------|------|----|
| Switch | `drivers/tuya/switches/driver.compose.json` | ✅ | ✅ |
| Sensor | `drivers/zigbee/sensors/driver.compose.json` | ✅ | ✅ |
| Thermostat | `drivers/tuya/thermostats/driver.compose.json` | ⚠️ | ✅ |
| Unknown | `drivers/tuya/unknown/device_unk_XYZ.json` | ❌ | ❌ |

---

### 💡 செயல்படுத்தல் பயன்முறைகள்

- `full`: AI செழிப்பாக்கம், fallbacks, forum ஒத்திசைவு, GitHub pipelines உட்பட
- `lite`: தானியக்கம் அல்லது AI இல்லாத குறைக்கப்பட்ட பதிப்பு

`TUYA_MODE` சுற்றுப்புற மாறியைப் பயன்படுத்தவும்:
```bash
TUYA_MODE=full # அல்லது lite
```

---

### 📁 Repository கட்டமைப்பு

- `drivers/` — வகை வாரியாக Homey drivers
- `scripts/` — உருவாக்கம் மற்றும் செழிப்பாக்க கருவிகள்
- `.github/workflows/` — CI/CD வரையறைகள்
- `docs/` — Dashboard + changelogs
- `ref/`, `mega/`, `tuya-light-release/` — மாற்று வகைகள்

---

### 👥 பங்களிப்பு

Pull request வழிமுறைகளுக்கு [`CONTRIBUTING.md`](./CONTRIBUTING.md) பார்க்கவும்.

---

### 🔧 பராமரிப்பாளர்

**Dylan Rajasekaram** ஆல் பராமரிக்கப்படுகிறது · [GitHub](https://github.com/dlnraja) · [LinkedIn](https://linkedin.com/in/dlnraja)  
📬 ஆதரவுக்கு: GitHub Issue திறக்கவும் அல்லது [Community Thread](https://community.homey.app/t/wip-universal-tuya-zigbee-device-app-cli-install/140352) பயன்படுத்தவும்

---

> ✍️ Les traductions FR/NL/TA sont maintenant complètes et intégrées dans le README multilingue.

---
**📅 Généré**: ${new Date().toISOString()}
**🎯 Objectif**: README multilingue complet
**✅ Statut**: **DOCUMENTATION MULTILINGUE COMPLÈTE**
**🚀 MEGA-PROMPT ULTIME - VERSION FINALE 2025** 