#!/usr/bin/env python3
"""
Auto-Enrichment from Scraped Data
Enrichit automatiquement les drivers avec les manufacturerNames, clusters et datapoints
trouvés dans le scraping GitHub/Forum
"""

import json
import re
from pathlib import Path
from typing import Dict, List, Set
from collections import defaultdict

class DriverEnricher:
    def __init__(self):
        self.project_root = Path(__file__).parent.parent
        self.scraped_dir = self.project_root / "scraped_data"
        self.drivers_dir = self.project_root / "drivers"

        # Charger données scrapées
        self.load_scraped_data()

        # Statistiques
        self.stats = {
            "drivers_updated": 0,
            "manufacturers_added": 0,
            "clusters_enriched": 0,
            "datapoints_added": 0
        }

    def load_scraped_data(self):
        """Charge les données scrapées les plus récentes"""
        # Trouver les fichiers les plus récents
        latest_files = sorted(self.scraped_dir.glob("devices_*.json"), reverse=True)

        if not latest_files:
            print("❌ No scraped data found!")
            return

        # Extract timestamp from filename: devices_20251117_125253.json → 20251117_125253
        filename = latest_files[0].stem  # devices_20251117_125253
        timestamp = '_'.join(filename.split('_')[1:])  # 20251117_125253

        # Charger tous les fichiers
        with open(self.scraped_dir / f"devices_{timestamp}.json", 'r', encoding='utf-8') as f:
            self.devices = json.load(f)

        with open(self.scraped_dir / f"manufacturers_{timestamp}.json", 'r', encoding='utf-8') as f:
            self.manufacturers = json.load(f)

        with open(self.scraped_dir / f"clusters_{timestamp}.json", 'r', encoding='utf-8') as f:
            self.clusters = json.load(f)

        with open(self.scraped_dir / f"datapoints_{timestamp}.json", 'r', encoding='utf-8') as f:
            self.datapoints = json.load(f)

        print(f"✅ Loaded scraped data from {timestamp}")
        print(f"   📦 Devices: {len(self.devices)}")
        print(f"   🏭 Manufacturers: {len(self.manufacturers)}")
        print(f"   🔧 Clusters tracked: {len(self.clusters)}")
        print(f"   📊 Datapoints tracked: {len(self.datapoints)}")

    def categorize_manufacturers_by_model(self) -> Dict[str, List[str]]:
        """Catégorise les manufacturers par model ID"""
        by_model = defaultdict(list)

        for device in self.devices:
            models = device.get('models', [])
            manufacturers = device.get('manufacturers', [])

            for model in models:
                by_model[model].extend(manufacturers)

        # Dédupliquer
        return {k: list(set(v)) for k, v in by_model.items()}

    def find_matching_drivers(self, model_id: str) -> List[Path]:
        """Trouve les drivers qui utilisent ce model ID"""
        matching = []

        for driver_dir in self.drivers_dir.iterdir():
            if not driver_dir.is_dir():
                continue

            compose_file = driver_dir / "driver.compose.json"
            if not compose_file.exists():
                continue

            try:
                with open(compose_file, 'r', encoding='utf-8') as f:
                    driver_data = json.load(f)

                # Chercher model ID dans productId
                product_ids = driver_data.get('zigbee', {}).get('productId', [])
                if isinstance(product_ids, str):
                    product_ids = [product_ids]

                if model_id in product_ids:
                    matching.append(compose_file)

            except Exception as e:
                continue

        return matching

    def enrich_driver(self, driver_file: Path, new_manufacturers: List[str]):
        """Enrichit un driver avec de nouveaux manufacturer IDs"""
        try:
            with open(driver_file, 'r', encoding='utf-8') as f:
                driver_data = json.load(f)

            # Récupérer manufacturerName existants
            existing = driver_data.get('zigbee', {}).get('manufacturerName', [])
            if isinstance(existing, str):
                existing = [existing]

            # Fusionner sans doublons
            merged = list(set(existing + new_manufacturers))
            merged.sort()

            # Mettre à jour
            if 'zigbee' not in driver_data:
                driver_data['zigbee'] = {}

            driver_data['zigbee']['manufacturerName'] = merged

            # Sauvegarder
            with open(driver_file, 'w', encoding='utf-8') as f:
                json.dump(driver_data, f, indent=2, ensure_ascii=False)

            added_count = len(merged) - len(existing)
            if added_count > 0:
                self.stats['drivers_updated'] += 1
                self.stats['manufacturers_added'] += added_count
                print(f"   ✅ {driver_file.parent.name}: +{added_count} manufacturers ({len(merged)} total)")

        except Exception as e:
            print(f"   ❌ Error enriching {driver_file}: {e}")

    def enrich_all_drivers(self):
        """Enrichit tous les drivers compatibles"""
        print("\n🔧 Enriching drivers with scraped data...\n")

        # Catégoriser par model
        by_model = self.categorize_manufacturers_by_model()

        # Pour chaque model ID trouvé
        for model_id, manufacturers in by_model.items():
            if not model_id:
                continue

            # Trouver drivers correspondants
            matching_drivers = self.find_matching_drivers(model_id)

            if matching_drivers:
                print(f"📦 Model {model_id}: {len(manufacturers)} manufacturers → {len(matching_drivers)} drivers")

                for driver_file in matching_drivers:
                    self.enrich_driver(driver_file, manufacturers)

    def add_cluster_documentation(self):
        """Crée documentation des clusters par manufacturer"""
        output_file = self.project_root / "docs" / "SCRAPED_CLUSTERS.md"
        output_file.parent.mkdir(exist_ok=True)

        with open(output_file, 'w', encoding='utf-8') as f:
            f.write("# Cluster Information from GitHub Issues\n\n")
            f.write("**Auto-generated from scraped GitHub issues**\n\n")

            for mfr, cluster_refs in sorted(self.clusters.items()):
                if not cluster_refs:
                    continue

                f.write(f"## {mfr}\n\n")

                for ref in cluster_refs:
                    issue = ref.get('issue', 'unknown')
                    clusters = ref.get('clusters', {})

                    f.write(f"**Issue #{issue}:**\n\n")

                    if 'input' in clusters:
                        f.write(f"- Input Clusters: {clusters['input']}\n")
                    if 'output' in clusters:
                        f.write(f"- Output Clusters: {clusters['output']}\n")

                    f.write("\n")

        print(f"\n📄 Cluster documentation: {output_file}")
        self.stats['clusters_enriched'] = len(self.clusters)

    def add_datapoint_documentation(self):
        """Crée documentation des datapoints par manufacturer"""
        output_file = self.project_root / "docs" / "SCRAPED_DATAPOINTS.md"

        with open(output_file, 'w', encoding='utf-8') as f:
            f.write("# Tuya Datapoints from GitHub Issues\n\n")
            f.write("**Auto-generated from scraped GitHub issues**\n\n")

            for mfr, dps in sorted(self.datapoints.items()):
                if not dps:
                    continue

                f.write(f"## {mfr}\n\n")
                f.write(f"Datapoints: {sorted(dps)}\n\n")

        print(f"📄 Datapoint documentation: {output_file}")
        self.stats['datapoints_added'] = sum(len(dps) for dps in self.datapoints.values())

    def generate_summary(self):
        """Génère rapport final"""
        summary_file = self.project_root / "ENRICHMENT_SUMMARY.md"

        with open(summary_file, 'w', encoding='utf-8') as f:
            f.write("# Driver Enrichment Summary\n\n")
            f.write("**Auto-generated from GitHub/Forum scraping**\n\n")

            f.write("## 📊 Statistics\n\n")
            f.write(f"- **Drivers Updated:** {self.stats['drivers_updated']}\n")
            f.write(f"- **Manufacturers Added:** {self.stats['manufacturers_added']}\n")
            f.write(f"- **Clusters Documented:** {self.stats['clusters_enriched']}\n")
            f.write(f"- **Datapoints Found:** {self.stats['datapoints_added']}\n")

            f.write("\n## 📦 Source Data\n\n")
            f.write(f"- **Total Devices Analyzed:** {len(self.devices)}\n")
            f.write(f"- **Unique Manufacturers:** {len(self.manufacturers)}\n")

            f.write("\n## 🔍 Top Manufacturers Added\n\n")
            top_mfr = sorted(self.manufacturers)[:50]
            for mfr in top_mfr:
                f.write(f"- `{mfr}`\n")

        print(f"\n📄 Summary: {summary_file}")

    def run(self):
        """Exécute l'enrichissement complet"""
        print("🚀 Starting Driver Enrichment...\n")
        print("=" * 60)

        self.enrich_all_drivers()
        self.add_cluster_documentation()
        self.add_datapoint_documentation()
        self.generate_summary()

        print("\n" + "=" * 60)
        print("✅ Enrichment Complete!")
        print(f"\n📊 Final Statistics:")
        print(f"   - Drivers updated: {self.stats['drivers_updated']}")
        print(f"   - Manufacturers added: {self.stats['manufacturers_added']}")
        print(f"   - Clusters documented: {self.stats['clusters_enriched']}")
        print(f"   - Datapoints tracked: {self.stats['datapoints_added']}")

def main():
    enricher = DriverEnricher()
    enricher.run()

if __name__ == "__main__":
    main()
