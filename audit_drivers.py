#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script d'audit des drivers pour identifier les fichiers manquants
"""

import os
import json
from pathlib import Path

def audit_drivers():
    """Audit complet des drivers et identification des manquants"""
    print("🔍 AUDIT COMPLET DES DRIVERS...")
    
    drivers_dir = Path("drivers")
    missing_files = []
    total_drivers = 0
    drivers_with_issues = []
    
    # Parcourir tous les dossiers de drivers
    for driver_path in drivers_dir.rglob("driver.compose.json"):
        total_drivers += 1
        driver_folder = driver_path.parent
        assets_dir = driver_folder / "assets"
        
        print(f"📁 Vérification: {driver_folder.name}")
        
        # Vérifier le dossier assets
        if not assets_dir.exists():
            missing_files.append(f"{driver_folder}/assets")
            drivers_with_issues.append(driver_folder.name)
            print(f"   ❌ Dossier assets manquant")
            continue
            
        # Vérifier les images
        small_img = assets_dir / "small.png"
        large_img = assets_dir / "large.png"
        
        if not small_img.exists() or not large_img.exists():
            missing_files.append(f"{driver_folder}/assets/images")
            drivers_with_issues.append(driver_folder.name)
            print(f"   ❌ Images manquantes")
        else:
            print(f"   ✅ Images OK")
    
    print(f"\n📊 RÉSULTATS DE L'AUDIT:")
    print(f"   Total drivers: {total_drivers}")
    print(f"   Fichiers manquants: {len(missing_files)}")
    print(f"   Drivers avec problèmes: {len(drivers_with_issues)}")
    
    if missing_files:
        print(f"\n🚨 FICHIERS MANQUANTS:")
        for f in missing_files:
            print(f"   - {f}")
    
    if drivers_with_issues:
        print(f"\n⚠️ DRIVERS AVEC PROBLÈMES:")
        for d in drivers_with_issues:
            print(f"   - {d}")
    
    print("\n✅ Audit terminé !")
    return missing_files, drivers_with_issues

if __name__ == "__main__":
    audit_drivers()
