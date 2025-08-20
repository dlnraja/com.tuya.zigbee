// 📚 Sources de Données - Organisation et Structure

#// 🗂️ Structure des Dossiers

##// `sources/` - Dossier principal des sources
- `external/` - Sources externes (GitHub, forums, documentation)
- `local/` - Sources locales (backups, logs, commits)
- `databases/` - Bases de données de référence
- `parsers/` - Scripts de parsing et extraction
- `enrichers/` - Scripts d'enrichissement des données
- `scrapers/` - Scripts de scraping web
- `validators/` - Scripts de validation des données
- `exporters/` - Scripts d'export et de génération de rapports

#// 🔄 Flux de Données

1. **Extraction** : Récupération des données depuis les sources
2. **Parsing** : Analyse et structuration des données brutes
3. **Enrichissement** : Ajout de métadonnées et validation
4. **Validation** : Vérification de la cohérence et qualité
5. **Export** : Génération des rapports et métadonnées enrichies

#// 📊 Types de Sources

##// Sources Externes
- **GitHub** : Repositories communautaires, issues, discussions
- **Forums** : Homey Community, Tuya Developer Forum
- **Documentation** : Tuya IoT Platform, Zigbee Alliance
- **Bases de données** : Zigbee Device Library, Home Assistant

##// Sources Locales
- **Backups** : Archives ZIP des versions précédentes
- **Logs** : Fichiers de logs et d'erreurs
- **Commits** : Historique Git et changements
- **Métadonnées** : Fichiers de configuration existants

#// 🚀 Utilisation

```bash
// Lancer l'extraction complète des sources
npm run sources-extract

// Parser les données extraites
npm run sources-parse

// Enrichir les drivers avec les nouvelles données
npm run sources-enrich

// Générer les rapports de sources
npm run sources-report
```

#// 📈 Métriques et Suivi

- Nombre de sources analysées
- Taux de succès d'extraction
- Qualité des données extraites
- Temps de traitement
- Erreurs et avertissements
