#!/usr/bin/env python3
import os
import json

def create_proper_svg_placeholder(content, filename):
    """Crée un fichier SVG avec la bonne taille pour Homey"""
    # Homey exige 75x75 pour small et 256x256 pour large
    if 'small' in filename:
        width, height = 75, 75
        font_size = 10
    else:
        width, height = 256, 256
        font_size = 16
    
    svg_content = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg width="{width}" height="{height}" viewBox="0 0 {width} {height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="{width}" height="{height}" fill="#f0f0f0" stroke="#ccc" stroke-width="2"/>
  <text x="{width//2}" y="{height//2}" text-anchor="middle" dy=".3em" font-family="Arial" font-size="{font_size}" fill="#666">
    {content}
  </text>
</svg>'''
    
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(svg_content)

def fix_image_sizes():
    """Corrige toutes les tailles d'images pour être conformes à Homey"""
    print("🔧 CORRECTION DES TAILLES D'IMAGES...")
    
    fixed_count = 0
    
    # Parcourir tous les dossiers de drivers
    for root, dirs, files in os.walk("drivers"):
        for file in files:
            if file == "driver.compose.json":
                driver_folder = os.path.basename(root)
                assets_dir = os.path.join(root, "assets")
                
                if os.path.exists(assets_dir):
                    small_img = os.path.join(assets_dir, "small.png")
                    large_img = os.path.join(assets_dir, "large.png")
                    
                    # Créer les images avec les bonnes tailles
                    if os.path.exists(small_img):
                        create_proper_svg_placeholder(driver_folder[:8], small_img.replace('.png', '.svg'))
                        os.remove(small_img)  # Supprimer l'ancien fichier
                        os.rename(small_img.replace('.png', '.svg'), small_img)
                        print(f"   ✅ {driver_folder}/small.png corrigé (75x75)")
                        fixed_count += 1
                    
                    if os.path.exists(large_img):
                        create_proper_svg_placeholder(driver_folder[:8], large_img.replace('.png', '.svg'))
                        os.remove(large_img)  # Supprimer l'ancien fichier
                        os.rename(large_img.replace('.png', '.svg'), large_img)
                        print(f"   ✅ {driver_folder}/large.png corrigé (256x256)")
                        fixed_count += 1
    
    print(f"\n📊 RÉSULTATS: {fixed_count} images corrigées")
    print("✅ Correction des tailles terminée !")

if __name__ == "__main__":
    fix_image_sizes()
