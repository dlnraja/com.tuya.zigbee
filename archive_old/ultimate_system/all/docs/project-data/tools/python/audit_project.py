#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script d'audit complet du projet Tuya Zigbee
Analyse tous les fichiers et identifie les problèmes à corriger
"""

import os
import json
from pathlib import Path
import sys

def audit_project_structure():
    """Audite la structure complète du projet"""
    print("🔍 AUDIT COMPLET DU PROJET TUYA ZIGBEE...")
    print("=" * 60)
    
    # Vérifier les fichiers de configuration principaux
    print("\n📋 FICHIERS DE CONFIGURATION PRINCIPAUX:")
    
    config_files = [
        "homey.compose.json",
        "app.json", 
        "package.json",
        "homey.compose.json"
    ]
    
    for file in config_files:
        if os.path.exists(file):
            try:
                with open(file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    print(f"   ✅ {file}: {len(data)} propriétés")
                    
                    # Vérifier les champs critiques
                    if file == "homey.compose.json":
                        if "id" in data:
                            print(f"      🆔 ID: {data['id']}")
                        if "version" in data:
                            print(f"      📦 Version: {data['version']}")
                        if "sdk" in data:
                            print(f"      🛠️ SDK: {data['sdk']}")
                            
            except Exception as e:
                print(f"   ❌ {file}: Erreur de lecture - {e}")
        else:
            print(f"   ❌ {file}: FICHIER MANQUANT")
    
    # Vérifier la structure des drivers
    print("\n🚗 STRUCTURE DES DRIVERS:")
    drivers_dir = Path("drivers")
    if drivers_dir.exists():
        driver_count = 0
        missing_assets = 0
        missing_compose = 0
        
        for driver_path in drivers_dir.rglob("*"):
            if driver_path.is_dir():
                driver_name = driver_path.name
                compose_file = driver_path / "driver.compose.json"
                assets_dir = driver_path / "assets"
                
                if compose_file.exists():
                    driver_count += 1
                    if not assets_dir.exists():
                        missing_assets += 1
                        print(f"   ⚠️ {driver_name}: Dossier assets manquant")
                else:
                    missing_compose += 1
                    print(f"   ❌ {driver_name}: driver.compose.json manquant")
        
        print(f"   📊 Total drivers: {driver_count}")
        print(f"   ⚠️ Assets manquants: {missing_assets}")
        print(f"   ❌ Compose manquants: {missing_compose}")
    else:
        print("   ❌ Dossier drivers manquant")
    
    # Vérifier les assets principaux
    print("\n🎨 ASSETS PRINCIPAUX:")
    assets_dir = Path("assets")
    if assets_dir.exists():
        required_files = ["small.svg", "large.svg", "icon.svg"]
        for file in required_files:
            file_path = assets_dir / file
            if file_path.exists():
                print(f"   ✅ {file}")
            else:
                print(f"   ❌ {file}: MANQUANT")
    else:
        print("   ❌ Dossier assets manquant")
    
    # Vérifier les dépendances
    print("\n📦 DÉPENDANCES:")
    if os.path.exists("package.json"):
        try:
            with open("package.json", 'r', encoding='utf-8') as f:
                pkg_data = json.load(f)
                if "dependencies" in pkg_data:
                    print(f"   📋 Dépendances: {len(pkg_data['dependencies'])}")
                if "devDependencies" in pkg_data:
                    print(f"   🛠️ DevDependencies: {len(pkg_data['devDependencies'])}")
        except Exception as e:
            print(f"   ❌ Erreur lecture package.json: {e}")
    
    print("\n" + "=" * 60)
    print("🎯 AUDIT TERMINÉ - ANALYSE DES PROBLÈMES EN COURS...")

def identify_critical_issues():
    """Identifie les problèmes critiques à corriger"""
    print("\n🚨 PROBLÈMES CRITIQUES IDENTIFIÉS:")
    
    issues = []
    
    # Vérifier l'ID de l'application
    if os.path.exists("homey.compose.json"):
        try:
            with open("homey.compose.json", 'r', encoding='utf-8') as f:
                data = json.load(f)
                if "id" in data:
                    app_id = data["id"]
                    if app_id != "com.tuya.zigbee":
                        issues.append(f"ID incorrect: {app_id} (devrait être com.tuya.zigbee)")
                else:
                    issues.append("ID de l'application manquant")
        except Exception as e:
            issues.append(f"Erreur lecture homey.compose.json: {e}")
    
    # Vérifier la version
    if os.path.exists("homey.compose.json"):
        try:
            with open("homey.compose.json", 'r', encoding='utf-8') as f:
                data = json.load(f)
                if "version" in data:
                    version = data["version"]
                    if version != "1.0.0":
                        issues.append(f"Version incorrecte: {version} (devrait être 1.0.0)")
                else:
                    issues.append("Version manquante")
        except Exception as e:
            issues.append(f"Erreur lecture version: {e}")
    
    # Vérifier les images
    if not os.path.exists("assets/small.svg"):
        issues.append("Image small.svg manquante")
    if not os.path.exists("assets/large.svg"):
        issues.append("Image large.svg manquante")
    
    # Afficher les problèmes
    if issues:
        for i, issue in enumerate(issues, 1):
            print(f"   {i}. ❌ {issue}")
    else:
        print("   ✅ Aucun problème critique identifié")
    
    return issues

def main():
    """Fonction principale"""
    print("🚀 DÉMARRAGE DE L'AUDIT COMPLET...")
    
    # Audit de la structure
    audit_project_structure()
    
    # Identification des problèmes critiques
    critical_issues = identify_critical_issues()
    
    print(f"\n📊 RÉSUMÉ:")
    print(f"   Problèmes critiques: {len(critical_issues)}")
    
    if critical_issues:
        print("\n🎯 PROCHAINES ÉTAPES:")
        print("   1. Corriger l'ID de l'application")
        print("   2. Corriger la version")
        print("   3. Créer les images manquantes")
        print("   4. Valider avec homey app validate")
        print("   5. Pousser les corrections")
    
    print("\n✅ Audit terminé avec succès !")

if __name__ == "__main__":
    main()
