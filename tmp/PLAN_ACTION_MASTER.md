# PLAN D'ACTION MASTER - TUYA REPAIR PROJECT
**Créé:** 2026-04-19 23:18
**Objectif:** Mettre à jour le projet, corriger les GitHub Actions, traiter PR/Issues/Forums, publier en test

## 📋 PHASE 1: INVESTIGATION ET COMPREHENSION
- [ ] 1.1 Explorer la structure complète du projet
- [ ] 1.2 Lire app.json et comprendre la configuration
- [ ] 1.3 Lire tous les fichiers de documentation clés
- [ ] 1.4 Analyser les GitHub Actions (workflows) échoués
- [ ] 1.5 Comprendre la logique fonctionnelle du driver Hybrid

## 📋 PHASE 2: ANALYSE DES SOURCES D'INFORMATION
- [ ] 2.1 Analyser les URLs partagées:
  - https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352/
  - https://gemini.google.com/share/2e9ddd156d41
  - https://gemini.google.com/share/d171f0e50c40
  - https://gemini.google.com/share/618d5dac3516
- [ ] 2.2 Extraire les issues et PR GitHub
- [ ] 2.3 Extraire les messages forums pertinents
- [ ] 2.4 Identifier les patterns de bugs

## 📋 PHASE 3: CORRECTIONS ET ENRICHISSEMENTS
- [ ] 3.1 Corriger les GitHub Actions échoués
- [ ] 3.2 Mettre à jour les drivers Hybrid avec les derniers correctifs
- [ ] 3.3 Enrichir les workflows YAML
- [ ] 3.4 Ajouter les nouvelles capacités/patterns
- [ ] 3.5 Vérifier la compatibilité et éviter les régressions

## 📋 PHASE 4: PUBLICATION EN TEST
- [ ] 4.1 Préparer la version test
- [ ] 4.2 Générer les changelogs
- [ ] 4.3 Mettre à jour version dans app.json
- [ ] 4.4 Publier sur GitHub

## 🎯 RESSOURCES CLÉS À ANALYSER
- docs/ANTIGRAVITY_V7_MASTER_SPEC.md
- docs/ARCHITECTURAL_RULES.md
- docs/ATHOM_BEST_PRACTICES.md
- docs/HOMEY_SDK_BEST_PRACTICES.md
- docs/MEGA_PROMPT_WINDSURF.md
- docs/V7_RELEASE_NOTES.md
- .github/workflows/
- drivers/*_hybrid/

## 🔑 PRINCIPES CLÉS
- NE PAS créer de fichiers dump ou rapports pour publication
- Créer des fichiers tmp pour le contexte et réflexion
- Deep thinking à chaque étape
- Éviter les régressions
- Prioriser les corrections de bugs critiques
