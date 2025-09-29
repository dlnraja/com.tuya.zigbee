#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de création automatique de tous les assets manquants
"""

import os
import json
from pathlib import Path
import shutil

def create_svg_placeholder(content, filename):
    """Crée un fichier SVG placeholder basique"""
    svg_content = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <rect width="64" height="64" fill="#f0f0f0" stroke="#ccc" stroke-width="1"/>
  <text x="32" y="32" text-anchor="middle" dy=".3em" font-family="Arial" font-size="8" fill="#666">
    {content}
  </text>
</svg>'''
    
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(svg_content)

def create_png_placeholder(content, filename):
    """Crée un fichier PNG placeholder (en fait SVG pour l'instant)"""
    # Pour l'instant, on crée des SVG car PNG nécessite des bibliothèques externes
    svg_filename = str(filename).replace('.png', '.svg')
    create_svg_placeholder(content, svg_filename)

def create_missing_assets():
    """Crée tous les assets manquants"""
    print("🚀 CRÉATION AUTOMATIQUE DE TOUS LES ASSETS MANQUANTS...")
    
    drivers_dir = Path("drivers")
    created_count = 0
    error_count = 0
    
    # Parcourir tous les dossiers de drivers
    for driver_path in drivers_dir.rglob("driver.compose.json"):
        try:
            driver_folder = driver_path.parent
            assets_dir = driver_folder / "assets"
            
            # Créer le dossier assets s'il n'existe pas
            if not assets_dir.exists():
                assets_dir.mkdir(parents=True, exist_ok=True)
                print(f"📁 Créé: {assets_dir}")
            
            # Créer les images manquantes
            small_img = assets_dir / "small.png"
            large_img = assets_dir / "large.png"
            
            if not small_img.exists():
                create_png_placeholder(driver_folder.name[:8], small_img)
                print(f"   ✅ small.png créé")
                created_count += 1
                
            if not large_img.exists():
                create_png_placeholder(driver_folder.name[:8], large_img)
                print(f"   ✅ large.png créé")
                created_count += 1
                
        except Exception as e:
            print(f"❌ Erreur pour {driver_folder}: {e}")
            error_count += 1
    
    print(f"\n📊 RÉSULTATS:")
    print(f"   Assets créés: {created_count}")
    print(f"   Erreurs: {error_count}")
    print("✅ Création terminée !")

if __name__ == "__main__":
    create_missing_assets()
