import os
import json
from pathlib import Path
from datetime import datetime

print("=" * 60)
print("  ANALYSE DES DRIVERS TUYA ZIGBEE")
print("=" * 60)
print()

# Configuration
DRIVERS_DIR = Path("drivers")
REPORT_FILE = "driver-analysis-report.txt"

# Compteurs
stats = {
    "total_drivers": 0,
    "valid_drivers": 0,
    "missing_config": 0,
    "missing_icons": 0,
    "drivers": []
}

# Vérifier si le dossier des drivers existe
if not DRIVERS_DIR.exists() or not DRIVERS_DIR.is_dir():
    print(f"ERREUR: Le dossier des drivers est introuvable: {DRIVERS_DIR.absolute()}")
    exit(1)

print("Analyse en cours...\n")

# Parcourir les dossiers de drivers
for driver_dir in sorted(DRIVERS_DIR.iterdir()):
    if not driver_dir.is_dir():
        continue
        
    stats["total_drivers"] += 1
    driver_name = driver_dir.name
    driver_data = {
        "name": driver_name,
        "has_config": False,
        "has_icons": False,
        "issues": []
    }
    
    print(f"Analyse de: {driver_name}")
    
    # Vérifier le fichier de configuration
    config_file = driver_dir / "driver.compose.json"
    if config_file.exists():
        driver_data["has_config"] = True
        try:
            with open(config_file, 'r', encoding='utf-8') as f:
                config = json.load(f)
                # Vérifier les champs obligatoires
                if not config.get("id"):
                    driver_data["issues"].append("ID manquant")
                if not config.get("class"):
                    driver_data["issues"].append("Classe manquante")
                if not config.get("name"):
                    driver_data["issues"].append("Nom manquant")
        except json.JSONDecodeError as e:
            driver_data["issues"].append(f"Erreur de configuration: {str(e)}")
    else:
        driver_data["issues"].append("Fichier de configuration manquant")
        stats["missing_config"] += 1
    
    # Vérifier les icônes
    icon_svg = driver_dir / "assets" / "icon.svg"
    icon_png = driver_dir / "assets" / "images" / "large.png"
    
    if icon_svg.exists() and icon_png.exists():
        driver_data["has_icons"] = True
    else:
        driver_data["issues"].append("Icônes manquantes")
        stats["missing_icons"] += 1
    
    # Vérifier si le driver est valide
    if not driver_data["issues"]:
        stats["valid_drivers"] += 1
    
    stats["drivers"].append(driver_data)

# Calculer les pourcentages
if stats["total_drivers"] > 0:
    stats["percent_valid"] = (stats["valid_drivers"] / stats["total_drivers"]) * 100
    stats["percent_invalid"] = 100 - stats["percent_valid"]
else:
    stats["percent_valid"] = 0
    stats["percent_invalid"] = 0

# Générer le rapport
with open(REPORT_FILE, 'w', encoding='utf-8') as f:
    f.write("=" * 60 + "\n")
    f.write(f"  RAPPORT D'ANALYSE DES DRIVERS - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    f.write("=" * 60 + "\n\n")
    
    # Détails par driver
    f.write("DÉTAILS PAR DRIVER\n")
    f.write("-" * 60 + "\n\n")
    
    for driver in stats["drivers"]:
        status = "✅ VALIDE" if not driver["issues"] else "❌ PROBLÈMES"
        f.write(f"{status} - {driver['name']}\n")
        
        if driver["issues"]:
            for issue in driver["issues"]:
                f.write(f"  - {issue}\n")
        f.write("\n")
    
    # Résumé
    f.write("\n" + "=" * 60 + "\n")
    f.write("  RÉSUMÉ\n")
    f.write("=" * 60 + "\n\n")
    
    f.write(f"Nombre total de drivers analysés: {stats['total_drivers']}\n")
    f.write(f"Drivers valides: {stats['valid_drivers']} ({stats['percent_valid']:.1f}%)\n")
    f.write(f"Drivers avec problèmes: {stats['total_drivers'] - stats['valid_drivers']} ({stats['percent_invalid']:.1f}%)\n\n")
    
    f.write("Problèmes détectés:\n")
    f.write(f"- Fichiers de configuration manquants: {stats['missing_config']}\n")
    f.write(f"- Icônes manquantes: {stats['missing_icons']}\n\n")
    
    f.write("Recommandations:\n")
    f.write("1. Corriger les fichiers de configuration manquants ou invalides\n")
    f.write("2. Ajouter les icônes manquantes (SVG + PNG)\n")
    f.write("3. Vérifier que tous les champs obligatoires sont présents\n")
    f.write("4. Standardiser la structure des dossiers\n")
    f.write("\n" + "=" * 60 + "\n")
    f.write("  FIN DU RAPPORT\n")
    f.write("=" * 60 + "\n")

# Afficher le résumé
print("\n" + "=" * 60)
print("  RÉSUMÉ DE L'ANALYSE")
print("=" * 60)
print(f"\nTotal des drivers analysés: {stats['total_drivers']}")
print(f"Drivers valides: {stats['valid_drivers']} ({stats['percent_valid']:.1f}%)")
print(f"Drivers avec problèmes: {stats['total_drivers'] - stats['valid_drivers']} ({stats['percent_invalid']:.1f}%)")
print(f"\nRapport complet enregistré dans: {Path(REPORT_FILE).absolute()}")

# Essayer d'ouvrir le rapport
try:
    if os.name == 'nt':  # Windows
        os.startfile(REPORT_FILE)
    elif os.name == 'posix':  # macOS, Linux
        import subprocess
        opener = 'open' if sys.platform == 'darwin' else 'xdg-open'
        subprocess.call([opener, REPORT_FILE])
except:
    pass
