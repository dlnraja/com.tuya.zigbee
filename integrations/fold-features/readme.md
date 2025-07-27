# 🧠 com.tuya.zigbee — Intégration Tuya Zigbee pour Homey avec IA

&#x20; [🌐 Dashboard Web](https://dlnraja.github.io/com.tuya.zigbee/)

---

## 🚀 Objectif

Reconstruire et automatiser l'intégration complète des appareils **Tuya Zigbee** dans **Homey** via :

- Drivers générés dynamiquement
- Support Home Assistant (optionnel)
- Parsing automatique de fichiers Z2M / Tuya / Homey
- Génération d’icônes avec DALL·E (fallback manuel)
- Benchmark et réplication automatique mensuelle (via GitHub Actions)

---

## 🛠️ Structure du projet

| Dossier/Fichier      | Description                                        |
| -------------------- | -------------------------------------------------- |
| `drivers/`           | Drivers Tuya Zigbee (ex: TS0001)                   |
| `dashboard/`         | Dashboard HTML GitHub Pages                        |
| `tools/`             | Scripts de parsing, IA, utilitaires, réparation    |
| `test/`              | Scripts de test Homey & CI                         |
| `.github/`           | Workflows CI/CD & benchmark IA                     |
| `deploy.ps1`         | Déploiement PowerShell sur Homey                   |
| `repair_project.ps1` | Restauration automatique du projet en cas de perte |

---

## 🤖 IA utilisées (automatisé via GitHub Actions)

| Tâche               | IA               | Gratuité  | Fallback     |
| ------------------- | ---------------- | --------- | ------------ |
| Parsing Z2M → Homey | OpenAI, Claude   | ✅ Oui     | ✔️ JSON brut |
| Génération d’icônes | DALL·E, SDXL     | ⚠️ Limité | ✔️ SVG stock |
| Analyse benchmark   | Claude 3, GPT-4o | ✅         | ✔️ Markdown  |

Tous les benchmarks sont mis à jour automatiquement [dans le dashboard](https://dlnraja.github.io/com.tuya.zigbee/) et archivés dans `/.github/benchmarks`. Ils sont re-générés automatiquement **tous les mois** sur `master` et `rebuild/ai-bootstrap` via `bench-ia.yml`.

---

## 🧰 Commandes utiles (PowerShell)

```powershell
# Lancer l'automatisation complète
./deploy.ps1

# Réparer/restaurer les fichiers critiques
./tools/repair_project.ps1
```

---

## 🙏 Crédits et Contributions

- 👤 [Dylan Rajasekaram (dlnraja)](https://github.com/dlnraja) – Auteur principal
- 🤖 Kimi.AI – Rebuild IA & automatisations (25%)
- 📦 Homey Community, Z2M, Home Assistant – ressources & bases open-source

---

> 📬 Pour contribuer, forkez le repo, testez les scripts dans `test/`, puis faites une PR 🙏

# Enhanced with Fold sources: readme.md
# Enhanced with Fold sources: readme.md
# Enhanced with Fold sources: readme.md
# Enhanced with Fold sources: readme.md
# Enhanced with Fold sources: readme.md
# Enhanced with Fold sources: readme.md
# Enhanced with Fold sources: readme.md
# Enhanced with Fold sources: readme.md
# Enhanced with Fold sources: readme.md
# Enhanced with Fold sources: readme.md
# Enhanced with Fold sources: readme.md
# Enhanced with Fold sources: readme.md
# Enhanced with Fold sources: readme.md
# Enhanced with Fold sources: readme.md
# Enhanced with Fold sources: readme.md
# Enhanced with Fold sources: readme.md
# Enhanced with Fold sources: readme.md
# Enhanced with Fold sources: readme.md
# Enhanced with Fold sources: readme.md
# Enhanced with Fold sources: readme.md
# Enhanced with Fold sources: readme.md
# Enhanced with Fold sources: readme.md
# Enhanced with Fold sources: readme.md
# Enhanced with Fold sources: readme.md
# Enhanced with Fold sources: readme.md
# Enhanced with Fold sources: readme.md
# Enhanced with Fold sources: readme.md
# Enhanced with Fold sources: readme.md
# Enhanced with Fold sources: readme.md
# Enhanced with Fold sources: readme.md
# Enhanced with Fold sources: readme.md
# Enhanced with Fold sources: readme.md
# Enhanced with Fold sources: readme.md
# Enhanced with Fold sources: readme.md
# Enhanced with Fold sources: readme.md
# Enhanced with Fold sources: readme.md
# Enhanced with Fold sources: readme.md
# Enhanced with Fold sources: readme.md
# Enhanced with Fold sources: readme.md
# Enhanced with Fold sources: readme.md
# Enhanced with Fold sources: readme.md
# Enhanced with Fold sources: readme.md
# Enhanced with Fold sources: readme.md
# Enhanced with Fold sources: readme.md
# Enhanced with Fold sources: readme.md
# Enhanced with Fold sources: readme.md
# Enhanced with Fold sources: readme.md
# Enhanced with Fold sources: readme.md
# Enhanced with Fold sources: readme.md
# Enhanced with Fold sources: readme.md
# Enhanced with Fold sources: readme.md
# Enhanced with Fold sources: readme.md
# Enhanced with Fold sources: readme.md
