#!/usr/bin/env python3
import os
import json

def fix_driver(driver_path):
    """Corrige un driver simple"""
    try:
        driver_folder = os.path.basename(os.path.dirname(driver_path))
        
        # Déterminer la classe basée sur le nom
        if 'light' in driver_folder.lower():
            driver_class = "light"
            capabilities = ["onoff", "dim"]
        elif 'switch' in driver_folder.lower():
            driver_class = "switch"
            capabilities = ["onoff"]
        elif 'plug' in driver_folder.lower():
            driver_class = "socket"
            capabilities = ["onoff", "measure_power"]
        elif 'sensor' in driver_folder.lower():
            driver_class = "sensor"
            capabilities = ["measure_temperature"]
        elif 'lock' in driver_folder.lower():
            driver_class = "lock"
            capabilities = ["lock_state"]
        elif 'cover' in driver_folder.lower():
            driver_class = "cover"
            capabilities = ["windowcoverings_state"]
        elif 'fan' in driver_folder.lower():
            driver_class = "fan"
            capabilities = ["onoff", "fan_speed"]
        elif 'climate' in driver_folder.lower():
            driver_class = "climate"
            capabilities = ["target_temperature"]
        else:
            driver_class = "other"
            capabilities = ["onoff"]
        
        # Créer le driver corrigé
        fixed_driver = {
            "id": f"tuya_{driver_folder.lower()}",
            "title": {
                "en": f"{driver_folder.replace('_', ' ').title()} Control",
                "fr": f"Contrôle {driver_folder.replace('_', ' ').title()}"
            },
            "class": driver_class,
            "capabilities": capabilities,
            "images": {
                "small": "assets/small.png",
                "large": "assets/large.png"
            },
            "name": {
                "en": driver_folder.replace('_', ' ').title(),
                "fr": driver_folder.replace('_', ' ').title()
            },
            "zigbee": {
                "manufacturerName": ["Tuya"],
                "productId": ["TS0601"],
                "endpoints": {
                    "1": {
                        "clusters": [0, 6]
                    }
                }
            }
        }
        
        # Sauvegarder et écrire
        backup_path = driver_path + '.backup'
        if not os.path.exists(backup_path):
            os.rename(driver_path, backup_path)
        
        with open(driver_path, 'w', encoding='utf-8') as f:
            json.dump(fixed_driver, f, indent=2, ensure_ascii=False)
        
        print(f"✅ {driver_folder} corrigé")
        return True
        
    except Exception as e:
        print(f"❌ Erreur {driver_folder}: {e}")
        return False

def main():
    """Fonction principale"""
    print("🚀 CORRECTION SIMPLE DES DRIVERS...")
    
    fixed = 0
    errors = 0
    
    # Parcourir tous les drivers
    for root, dirs, files in os.walk("drivers"):
        for file in files:
            if file == "driver.compose.json":
                driver_path = os.path.join(root, file)
                if fix_driver(driver_path):
                    fixed += 1
                else:
                    errors += 1
    
    print(f"\n📊 RÉSULTATS: {fixed} corrigés, {errors} erreurs")
    print("✅ Terminé !")

if __name__ == "__main__":
    main()
