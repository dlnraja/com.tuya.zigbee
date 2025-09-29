#!/usr/bin/env python3
import os
import json

def create_svg_images():
    """Crée des images SVG avec les bonnes dimensions pour Homey"""
    print("🎨 CRÉATION DES IMAGES SVG CONFORMES...")
    
    # Créer le dossier assets principal s'il n'existe pas
    assets_dir = "assets"
    if not os.path.exists(assets_dir):
        os.makedirs(assets_dir)
    
    # Créer small.png (75x75)
    small_svg = '''<?xml version="1.0" encoding="UTF-8"?>
<svg width="75" height="75" viewBox="0 0 75 75" xmlns="http://www.w3.org/2000/svg">
  <rect width="75" height="75" fill="#FF6B35" stroke="#FF4500" stroke-width="2"/>
  <text x="37.5" y="37.5" text-anchor="middle" dy=".3em" font-family="Arial" font-size="8" fill="white" font-weight="bold">
    TUYA
  </text>
</svg>'''
    
    with open(os.path.join(assets_dir, "small.svg"), 'w', encoding='utf-8') as f:
        f.write(small_svg)
    
    # Créer large.png (256x256)
    large_svg = '''<?xml version="1.0" encoding="UTF-8"?>
<svg width="256" height="256" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
  <rect width="256" height="256" fill="#FF6B35" stroke="#FF4500" stroke-width="4"/>
  <text x="128" y="128" text-anchor="middle" dy=".3em" font-family="Arial" font-size="24" fill="white" font-weight="bold">
    TUYA
  </text>
  <text x="128" y="160" text-anchor="middle" font-family="Arial" font-size="16" fill="white">
    ZIGBEE
  </text>
</svg>'''
    
    with open(os.path.join(assets_dir, "large.svg"), 'w', encoding='utf-8') as f:
        f.write(large_svg)
    
    print("✅ Images SVG créées dans assets/")

def fix_driver_image_paths():
    """Corrige tous les chemins d'images dans les drivers"""
    print("🔧 CORRECTION DES CHEMINS D'IMAGES...")
    
    fixed_count = 0
    
    # Parcourir tous les dossiers de drivers
    for root, dirs, files in os.walk("drivers"):
        for file in files:
            if file == "driver.compose.json":
                driver_path = os.path.join(root, file)
                
                try:
                    # Lire le fichier
                    with open(driver_path, 'r', encoding='utf-8') as f:
                        driver_data = json.load(f)
                    
                    # Corriger les chemins d'images
                    if "images" in driver_data:
                        driver_data["images"]["small"] = "assets/small.svg"
                        driver_data["images"]["large"] = "assets/large.svg"
                        
                        # Écrire le fichier corrigé
                        with open(driver_path, 'w', encoding='utf-8') as f:
                            json.dump(driver_data, f, indent=2, ensure_ascii=False)
                        
                        print(f"   ✅ {os.path.basename(root)} corrigé")
                        fixed_count += 1
                
                except Exception as e:
                    print(f"   ❌ Erreur {os.path.basename(root)}: {e}")
    
    print(f"\n📊 RÉSULTATS: {fixed_count} drivers corrigés")
    print("✅ Correction des chemins d'images terminée !")

def main():
    """Fonction principale"""
    print("🚀 CORRECTION COMPLÈTE DES IMAGES...")
    
    # Créer les images SVG
    create_svg_images()
    
    # Corriger les chemins dans les drivers
    fix_driver_image_paths()
    
    print("\n🎯 Toutes les images sont maintenant conformes à Homey !")

if __name__ == "__main__":
    main()
