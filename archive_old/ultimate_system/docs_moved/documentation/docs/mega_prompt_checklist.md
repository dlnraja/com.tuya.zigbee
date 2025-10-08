# Checklist du Méga-Prompt

## Phase 1 - Audit initial & Préparation
- [x] 1. Analyser le dernier push GitHub
- [x] 2. Scanner l'historique des commits
- [x] 3. Centraliser les drivers existants
- [x] 4. Comparer avec issues/PR
- [x] 5. Vérifier cohérence avec fork Johan Benz
- [x] 6. Identifier doublons/conflits
- [x] 7. Lister sources externes
- [x] 8. Identifier liens GitHub/forum
- [x] 9. Construire matrice appareils
- [x] 10. Préparer plan de refactorisation

## Phase 2 - Normalisation & Nettoyage
- [x] 1. Revoir structure repo
- [x] 2. Supprimer redondances
- [x] 3. Harmoniser nommage (dlnraja_)
- [x] 4. Vérifier app.json/driver.compose.json
- [x] 5. Corriger localisation
- [x] 6. Vérifier capabilities
- [x] 7. Standardiser logs (EN/FR)
- [x] 8. Vérifier encodage UTF-8
- [x] 9. Réorganiser Markdown
- [x] 10. Préparer guide contributeurs

## Phase 3 - Documentation & Sources
- [ ] 1. Recompiler README multilingue
- [ ] 2. Lister sources communautaires
- [ ] 3. Intégrer liens dépôts
- [ ] 4. Construire matrice drivers/sources
- [ ] 5. Ajouter tableau devices testés
- [ ] 6. Documenter limitations
- [ ] 7. Expliquer stratégie d'évolution
- [ ] 8. Centraliser TODOs
- [ ] 9. Vérifier format commits EN+FR
- [ ] 10. Créer plan communication

## Phase 4 - Drivers & Couverture fonctionnelle
- [ ] 1. Revoir tous les drivers
- [ ] 2. Vérifier compatibilité Homey v10/v11
- [ ] 3. Ajouter drivers manquants
- [ ] 4. Étendre drivers génériques
- [ ] 5. Vérifier cohérence clusters ZCL
- [ ] 6. Vérifier onoff vs state
- [ ] 7. Support multi-endpoints
- [ ] 8. Ajouter thermostats
- [ ] 9. Ajouter stores/blinds
- [ ] 10. Ajouter energy metering
- [ ] 11. Ajouter sensors
- [ ] 12. Vérifier compatibilité appareils 3rd-party
- [ ] 13. Implémenter fallback
- [ ] 14. Documenter origine drivers
- [ ] 15. Créer script vérification
- [ ] 16. Associer référence produit
- [ ] 17. Vérifier capabilities Homey
- [ ] 18. Ajouter drivers "unknown"
- [ ] 19. Gérer compatibilité backwards
- [ ] 20. Tester sur simulateur

## Phase 5 - Automatisation & Intelligence
- [ ] 1. Scraper forums Homey
- [ ] 2. Scraper issues GitHub
- [ ] 3. Scraper API Tuya
- [ ] 4. Extraire signatures _TZE200_
- [ ] 5. Déduire capabilities manquantes
- [ ] 6. Implémenter module IA
- [ ] 7. Générer rapport mensuel
- [ ] 8. Prévoir fallback API
- [ ] 9. Documenter enrichissement
- [ ] 10. Intégrer dans GitHub Actions

## Phase 6 - CI/CD GitHub Actions
- [ ] 1. Créer workflow full-ci.yml
- [ ] 2. Linting JSON/JS/YAML
- [ ] 3. Build Homey
- [ ] 4. Tests unitaires + e2e
- [ ] 5. Validation drivers
- [ ] 6. Enrichissement auto
- [ ] 7. Génération docs
- [ ] 8. Publication GH Pages
- [ ] 9. Fallback tuya-light
- [ ] 10. Tagging auto
- [ ] 11. PR auto nouveaux drivers
- [ ] 12. Merge auto si tests OK
- [ ] 13. Rapport Markdown PR
- [ ] 14. Logs bilingues
- [ ] 15. Auto-close issues
- [ ] 16. Détection régression
- [ ] 17. Planification cron mensuelle
- [ ] 18. Workflow tuya-light
- [ ] 19. Dashboard GH Pages
- [ ] 20. Badges CI

## Phase 7 - Tests intensifs
- [ ] 1. Créer simulateur
- [ ] 2. Tester tous drivers
- [ ] 3. Bench compatibilité
- [ ] 4. Tester edge-cases
- [ ] 5. Vérifier feedback
- [ ] 6. Écrire tests unitaires
- [ ] 7. Couvrir conversions
- [ ] 8. Vérifier temps réponse <500ms
- [ ] 9. Tester dimming
- [ ] 10. Tester valeurs extrêmes
- [ ] 11. Simuler perte réseau
- [ ] 12. Vérifier fallback
- [ ] 13. Simuler appareils inconnus
- [ ] 14. Vérifier compatibilité Homey Pro
- [ ] 15. Vérifier absence crash
- [ ] 16. Automatiser tests
- [ ] 17. Rapport couverture
- [ ] 18. Publier rapport
- [ ] 19. Comparer couverture
- [ ] 20. Feedback utilisateurs

## Phase 8 - Livraison & Maintenance
- [ ] 1. Publier sur App Store
- [ ] 2. Maintenir tuya-light
- [ ] 3. Synchroniser master ↔ lite
- [ ] 4. Documenter release
- [ ] 5. Ajouter matrice README
- [ ] 6. Créer changelog multilingue
- [ ] 7. Répertorier contributeurs
- [ ] 8. Planifier roadmap
- [ ] 9. Ouvrir thread forum
- [ ] 10. Badge "community driven"
- [ ] 11. Gouvernance contributive
- [ ] 12. Scoring drivers
- [ ] 13. Établir priorités
- [ ] 14. Préparer migration Matter
- [ ] 15. Vérifier licence
- [ ] 16. Compatibilité clusters
- [ ] 17. Fallback SDK Homey
- [ ] 18. Maintenir doc
- [ ] 19. Vérifier logs bilingues
- [ ] 20. Consolider référence
