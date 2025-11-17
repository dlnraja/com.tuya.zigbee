# GitHub & Forum Scraper for Tuya Zigbee Devices

## 📋 Description

Script Python automatique pour extraire TOUS les manufacturerNames, clusters, et data points depuis:

- ✅ **GitHub Issues** (JohanBendz/com.tuya.zigbee + dlnraja/com.tuya.zigbee)
- ✅ **GitHub Pull Requests** (open + closed)
- ℹ️  **Forum Homey** (nécessite scraping manuel ou selenium)

## 🚀 Installation

```powershell
# Install Python dependencies
pip install requests beautifulsoup4
```

## ▶️ Utilisation

```powershell
# Run scraper
cd "c:\Users\HP\Desktop\homey app\tuya_repair\scripts"
python github_scraper.py
```

## 📊 Outputs

Le script génère dans `scraped_data/`:

1. **`devices_YYYYMMDD_HHMMSS.json`** - Tous les devices trouvés avec détails complets
2. **`manufacturers_YYYYMMDD_HHMMSS.json`** - Liste unique de manufacturerNames
3. **`clusters_YYYYMMDD_HHMMSS.json`** - Clusters par manufacturer
4. **`datapoints_YYYYMMDD_HHMMSS.json`** - Data points par manufacturer
5. **`summary_YYYYMMDD_HHMMSS.json`** - Statistiques résumées
6. **`REPORT_YYYYMMDD_HHMMSS.md`** - Rapport markdown lisible

## 📦 Format de données

### Device Entry
```json
{
  "source": "github:JohanBendz/com.tuya.zigbee",
  "issue_number": 1139,
  "title": "Device Request - Tuya Zigbee PIR Bewegingssensor",
  "url": "https://github.com/JohanBendz/com.tuya.zigbee/issues/1139",
  "state": "open",
  "created_at": "2024-01-15T10:30:00Z",
  "manufacturers": ["_TZ3000_o4mkahkc"],
  "models": ["TS0202"],
  "clusters": {
    "input": [1, 1280, 3, 0],
    "output": [4096, 6, 25, 10]
  },
  "datapoints": [1, 2, 3, 101]
}
```

### Clusters by Manufacturer
```json
{
  "_TZ3000_o4mkahkc": [
    {
      "issue": 1139,
      "clusters": {
        "input": [1, 1280, 3, 0],
        "output": [4096, 6, 25, 10]
      }
    }
  ]
}
```

### Datapoints by Manufacturer
```json
{
  "_TZE200_kb5noeto": [1, 2, 3, 4, 101, 102, 103]
}
```

## 🔍 Extraction Patterns

Le scraper utilise des regex pour extraire:

### ManufacturerNames
```regex
_TZ[E]?\d{3,4}_[a-zA-Z0-9]+
```
Exemples: `_TZ3000_o4mkahkc`, `_TZE200_kb5noeto`, `_TZE204_khx7nnka`

### Model IDs
```regex
TS\d{4}
```
Exemples: `TS0601`, `TS0202`, `TS0003`, `TS011F`

### Clusters
```json
"inputClusters": [1, 1280, 3, 0],
"outputClusters": [4096, 6, 25, 10]
```

### Datapoints
```regex
(?:dp|datapoint)[":]?\s*[:=]?\s*(\d+)
```
Exemples: `"dp":1`, `datapoint: 101`, `DP = 2`

## 📈 Rate Limiting

- GitHub API: 60 req/hour sans auth
- Délai 1s entre requêtes pour être poli
- Auto-retry après rate limit (60s wait)

## 🔧 Améliorations Futures

- [ ] Authentification GitHub pour 5000 req/hour
- [ ] Scraping forum avec Selenium
- [ ] Extraction des firmware versions
- [ ] Déduplication intelligente
- [ ] Export vers SQLite pour queries avancées
- [ ] Auto-update des driver manifests

## 📝 Notes

- Script lit issues ET pull requests (fermés inclus)
- Traite tous les repos: JohanBendz + dlnraja
- Génère rapports horodatés pour historique
- Safe: lecture seule, pas de modifications GitHub

## 🎯 Utilisation des données

Une fois scrapé, utiliser les manufacturerNames pour:

1. **Ajouter dans drivers** → `driver.compose.json`
2. **Vérifier clusters supportés** → Adapter capabilities
3. **Implémenter data points** → Tuya EF00 handlers
4. **Croiser avec devices existants** → Détecter manquants

## ⚡ Quick Stats

Après exécution complète:
- ~1000+ issues/PRs analysés
- ~500+ manufacturerNames uniques
- ~100+ model IDs
- ~50+ clusters différents
- ~200+ data points identifiés
