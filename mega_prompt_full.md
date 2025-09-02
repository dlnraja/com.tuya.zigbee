# Mega Prompt – Reconstruction & Amélioration Totale du Projet Tuya Zigbee (Homey)

**Objectif** :
Reprendre l’intégralité du projet dlnraja/com.tuya.zigbee, vérifier, corriger, enrichir et finaliser tous les drivers, pipelines, docs et workflows.
Garantir la cohérence, la complétude, la testabilité et l’autonomie du projet via GitHub Actions et enrichissement multi-sources.

## Phase 1 – Audit initial & Préparation
1. Analyser le dernier push GitHub du repo dlnraja/com.tuya.zigbee.
2. Scanner tout l’historique des commits (messages anglais/français inclus).
3. Extraire et centraliser les drivers existants et leur état actuel.
4. Comparer avec les issues ouvertes et PR liées au projet.
5. Vérifier la cohérence avec le fork original com.tuya.zigbee de Johan Benz.
6. Identifier les doublons, conflits ou drivers manquants.
7. Lister toutes les sources externes déjà citées dans le projet.
8. Identifier les liens GitHub et forum Homey mentionnés par Dylan Rajasekaram.
9. Construire une matrice de correspondance : Appareils Tuya ↔ Drivers présents ↔ Drivers manquants.
10. Préparer un plan de refactorisation globale.

## Phase 2 – Normalisation & Nettoyage
1. Revoir toute la structure du repo : /drivers, /docs, /scripts, /assets.
2. Supprimer les redondances et fichiers inutiles.
3. Harmoniser le nommage pour éviter conflits avec johanb/tuya (préfix dlnraja_).
4. Vérifier les fichiers app.json, driver.compose.json, manifest.json.
5. Corriger la localisation multi-langues (anglais par défaut, FR/NL/Tamil en fallback).
6. Vérifier la cohérence des capabilities Homey (switch, dim, measure_power, etc.).
7. Standardiser les logs (anglais d’abord, français en doublon).
8. Vérifier l’encodage UTF-8 partout.
9. Réorganiser les fichiers Markdown (README.md, CHANGELOG.md).
10. Préparer un guide clair pour contributeurs.

## Phase 3 – Documentation & Sources
1. Recompiler un README global en 4 langues (EN/FR/NL/Tamil).
2. Lister toutes les sources communautaires :
   - Homey Community Forum – Universal Tuya Zigbee
   - Issues GitHub de projets similaires (ex. Koenkk/zigbee-herdsman-converters)
   - Contributions sur ton compte GitHub (dlnraja, Dylan Rajasekaram)
   - Pages techniques Tuya (Tuya IoT docs)
3. Intégrer les liens des autres dépôts liés.
4. Construire une matrice comparative drivers vs. sources.
5. Ajouter un tableau des devices confirmés/testés par la communauté.
6. Documenter les limitations actuelles.
7. Expliquer la stratégie d’évolution prévue.
8. Centraliser les TODO listées dans les anciens commits.
9. Vérifier que les commits traduits respectent le format EN+FR.
10. Créer un plan de communication contributive (PR, issues).

## Phase 4 – Drivers & Couverture fonctionnelle
1. Revoir un par un tous les drivers dans /drivers.
2. Vérifier compatibilité avec Homey v10 et v11.
3. Ajouter drivers manquants détectés dans les sources.
4. Étendre les drivers génériques (switch, dim, plug, sensor).
5. Vérifier la cohérence avec les clusters Zigbee (ZCL).
6. Vérifier les onoff vs state.
7. Support des multi-endpoints Tuya.
8. Ajouter drivers thermostats (climate cluster).
9. Ajouter drivers curtain/blinds.
10. Ajouter drivers energy metering.
11. Ajouter drivers humidity/temperature sensors.
12. Vérifier compatibilité appareils 3rd-party Tuya (ex. Lidl).
13. Implémenter fallback drivers génériques.
14. Documenter chaque driver avec son origine et source.
15. Créer un script de vérification automatique des drivers.
16. Associer chaque driver à une référence produit Tuya (_TZE200_…).
17. Vérifier les capabilities spécifiques Homey.
18. Ajouter drivers "unknown devices" → log + PR suggestion.
19. Gérer la compatibilité backwards (anciens clusters Tuya).
20. Tester les drivers sur simulateur Homey.

## Phase 5 – Automatisation & Intelligence
1. Développer un scraper des forums Homey (topics Tuya).
2. Scraper les issues GitHub Koenkk/zigbee-herdsman-converters.
3. Scraper les pages produits Tuya (public API).
4. Extraire les signatures _TZE200_ → compléter drivers.
5. Déduire automatiquement les capabilities manquantes.
6. Implémenter un module d’IA pour deviner le mapping clusters.
7. Générer un rapport comparatif chaque mois.
8. Prévoir fallback si API inaccessible.
9. Documenter chaque enrichissement automatique.
10. Intégrer dans GitHub Actions (scrape + enrich + PR auto).

## Phase 6 – CI/CD GitHub Actions
1. Créer un workflow global .github/workflows/full-ci.yml.
2. Étape linting : vérifier JSON, JS, YAML.
3. Étape build Homey : athom app build.
4. Étape test unitaires + e2e.
5. Étape validation drivers avec script.
6. Étape enrichissement auto (scraper + IA).
7. Étape génération docs multilingues.
8. Étape publication GitHub Pages (dashboard).
9. Étape fallback → push dans tuya-light en backup.
10. Étape tagging auto avec version incrémentale.
11. Étape PR auto si nouveaux drivers trouvés.
12. Étape merge auto si tests 100% OK.
13. Étape rapport Markdown dans PR.
14. Étape logs bilingues.
15. Étape auto-close des issues résolues.
16. Étape détection régression.
17. Planification cron : exécution chaque mois.
18. Workflow séparé pour tuya-light.
19. Dashboard GH Pages enrichi avec matrice drivers.
20. Support des badges CI (shields.io).

## Phase 7 – Tests intensifs
1. Créer un simulateur d’appareils Zigbee Tuya.
2. Tester tous les drivers en simulation.
3. Bench compatibilité firmware Homey v10/v11.
4. Tester comportements edge-cases (multi-endpoints, devices offline).
5. Vérifier les retours utilisateurs via forum.
6. Écrire tests unitaires pour chaque driver.
7. Couvrir les conversions cluster → capability.
8. Vérifier que tous les onoff répondent en <500ms.
9. Tester dimming progressif.
10. Tester sensors avec valeurs extrêmes.
11. Simuler perte réseau Zigbee.
12. Vérifier le fallback générique.
13. Simuler appareils inconnus → log correct.
14. Vérifier compatibilité avec Homey Pro 2023.
15. Vérifier absence de crash sur logs massifs.
16. Automatiser tests dans GitHub Actions.
17. Générer un rapport de couverture tests.
18. Publier le rapport dans GH Pages.
19. Comparer couverture tests vs drivers manquants.
20. Demander feedback utilisateurs sur forum.

## Phase 8 – Livraison & Maintenance
1. Publier une version stable Homey App Store.
2. Maintenir tuya-light comme version minimaliste.
3. Synchroniser master ↔ tuya-light chaque mois.
4. Documenter processus de release.
5. Ajouter matrice drivers dans README.
6. Créer changelog enrichi (EN/FR/NL/Tamil).
7. Répertorier contributeurs.
8. Planifier roadmap publique.
9. Ouvrir un thread forum Homey pour feedback.
10. Ajouter badge "community driven".
11. Prévoir gouvernance contributive (PR review, scoring).
12. Intégrer scoring drivers (qualité, test, doc).
13. Établir priorités (thermostats, blinds, sensors).
14. Préparer la migration future vers Matter/Thread.
15. Vérifier conformité avec licence (MIT/Apache).
16. Garantir compatibilité 100% Zigbee clusters.
17. Assurer fallback si Homey change SDK.
18. Maintenir doc à jour tous les mois.
19. Vérifier logs toujours bilingues.
20. Consolider le projet comme référence communautaire.

**Résultats attendus** :
- Projet propre, complet, cohérent et maintenable
- Drivers enrichis automatiquement (scraping + IA)
- Documentation multilingue exhaustive
- CI/CD autonome (build, tests, enrich, release, backup)
- Feedback communautaire intégré
- Version stable + version "lite" fallback
