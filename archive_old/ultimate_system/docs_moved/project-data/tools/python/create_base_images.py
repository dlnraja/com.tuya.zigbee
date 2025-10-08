#!/usr/bin/env python3
import os

def create_base_images():
    """Crée des images de base pour Homey"""
    print("🎨 CRÉATION DES IMAGES DE BASE...")
    
    # Créer le dossier assets
    if not os.path.exists("assets"):
        os.makedirs("assets")
        print("📁 Dossier assets créé")
    
    # Créer small.svg (75x75)
    small_svg = '''<?xml version="1.0" encoding="UTF-8"?>
<svg width="75" height="75" viewBox="0 0 75 75" xmlns="http://www.w3.org/2000/svg">
  <rect width="75" height="75" fill="#FF6B35"/>
  <text x="37.5" y="37.5" text-anchor="middle" dy=".3em" font-family="Arial" font-size="8" fill="white" font-weight="bold">TUYA</text>
</svg>'''
    
    with open("assets/small.svg", "w", encoding="utf-8") as f:
        f.write(small_svg)
    print("✅ small.svg créé (75x75)")
    
    # Créer large.svg (256x256)
    large_svg = '''<?xml version="1.0" encoding="UTF-8"?>
<svg width="256" height="256" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
  <rect width="256" height="256" fill="#FF6B35"/>
  <text x="128" y="128" text-anchor="middle" dy=".3em" font-family="Arial" font-size="24" fill="white" font-weight="bold">TUYA</text>
  <text x="128" y="160" text-anchor="middle" font-family="Arial" font-size="16" fill="white">ZIGBEE</text>
</svg>'''
    
    with open("assets/large.svg", "w", encoding="utf-8") as f:
        f.write(large_svg)
    print("✅ large.svg créé (256x256)")
    
    print("🎯 Images de base créées avec succès !")

if __name__ == "__main__":
    create_base_images()
