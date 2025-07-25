#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de Génération Automatique d'Issues GitHub
Phase 11 : Système complet pour drivers incomplets
"""

import os
import json
import re
from datetime import datetime
from pathlib import Path

# Configuration
LANGS = ['fr', 'en', 'ta', 'nl']
ISSUE_TEMPLATES = {
    'fr': {
        'title': 'Driver incomplet détecté : {driver_id}',
        'body': '''## 🚨 Driver Incomplet Détecté

**Driver ID :** `{driver_id}`
**Nom :** {driver_name}
**Statut :** {status}
**Date de détection :** {timestamp}

### 📋 Informations du Driver
- **Fabricant :** {manufacturer}
- **Modèle :** {model}
- **Capacités :** {capabilities}
- **Catégorie :** {category}

### 🔍 Problèmes Identifiés
{issues_list}

### 🎯 Actions Requises
- [ ] Compléter les métadonnées manquantes
- [ ] Ajouter les capacités manquantes
- [ ] Vérifier la compatibilité SDK3
- [ ] Tester le driver
- [ ] Mettre à jour la documentation

### 📝 Notes
{notes}

---
*Généré automatiquement par GPT-4, Cursor, PowerShell*
'''
    },
    'en': {
        'title': 'Incomplete driver detected: {driver_id}',
        'body': '''## 🚨 Incomplete Driver Detected

**Driver ID :** `{driver_id}`
**Name :** {driver_name}
**Status :** {status}
**Detection Date :** {timestamp}

### 📋 Driver Information
- **Manufacturer :** {manufacturer}
- **Model :** {model}
- **Capabilities :** {capabilities}
- **Category :** {category}

### 🔍 Identified Issues
{issues_list}

### 🎯 Required Actions
- [ ] Complete missing metadata
- [ ] Add missing capabilities
- [ ] Verify SDK3 compatibility
- [ ] Test the driver
- [ ] Update documentation

### 📝 Notes
{notes}

---
*Generated automatically by GPT-4, Cursor, PowerShell*
'''
    },
    'ta': {
        'title': 'முழுமையற்ற driver கண்டறியப்பட்டது : {driver_id}',
        'body': '''## 🚨 முழுமையற்ற Driver கண்டறியப்பட்டது

**Driver ID :** `{driver_id}`
**பெயர் :** {driver_name}
**நிலை :** {status}
**கண்டறியப்பட்ட தேதி :** {timestamp}

### 📋 Driver தகவல்கள்
- **உற்பத்தியாளர் :** {manufacturer}
- **மாடல் :** {model}
- **திறன்கள் :** {capabilities}
- **வகை :** {category}

### 🔍 கண்டறியப்பட்ட பிரச்சினைகள்
{issues_list}

### 🎯 தேவையான செயல்கள்
- [ ] காணாமல் போன metadata முடிக்கவும்
- [ ] காணாமல் போன திறன்களை சேர்க்கவும்
- [ ] SDK3 பொருந்தக்கூடிய தன்மையை சரிபார்க்கவும்
- [ ] Driver ஐ சோதிக்கவும்
- [ ] ஆவணப்படுத்தலை புதுப்பிக்கவும்

### 📝 குறிப்புகள்
{notes}

---
*GPT-4, Cursor, PowerShell மூலம் தானாக உருவாக்கப்பட்டது*
'''
    },
    'nl': {
        'title': 'Onvolledige driver gedetecteerd: {driver_id}',
        'body': '''## 🚨 Onvolledige Driver Gedetecteerd

**Driver ID :** `{driver_id}`
**Naam :** {driver_name}
**Status :** {status}
**Detectiedatum :** {timestamp}

### 📋 Driver Informatie
- **Fabrikant :** {manufacturer}
- **Model :** {model}
- **Mogelijkheden :** {capabilities}
- **Categorie :** {category}

### 🔍 Geïdentificeerde Problemen
{issues_list}

### 🎯 Vereiste Acties
- [ ] Ontbrekende metadata voltooien
- [ ] Ontbrekende mogelijkheden toevoegen
- [ ] SDK3 compatibiliteit controleren
- [ ] Driver testen
- [ ] Documentatie bijwerken

### 📝 Notities
{notes}

---
*Automatisch gegenereerd door GPT-4, Cursor, PowerShell*
'''
    }
}

def analyze_driver_completeness(driver_path):
    """Analyse la complétude d'un driver"""
    compose_path = os.path.join(driver_path, 'driver.compose.json')
    
    if not os.path.isfile(compose_path):
        return {
            'is_incomplete': True,
            'issues': ['Fichier driver.compose.json manquant'],
            'severity': 'high'
        }
    
    try:
        with open(compose_path, encoding='utf-8-sig') as f:
            data = json.load(f)
    except Exception as e:
        return {
            'is_incomplete': True,
            'issues': [f'Erreur de parsing JSON: {str(e)}'],
            'severity': 'high'
        }
    
    issues = []
    severity = 'low'
    
    # Vérifier les champs requis
    required_fields = ['id', 'name', 'class', 'capabilities']
    for field in required_fields:
        if field not in data:
            issues.append(f'Champ requis manquant: {field}')
            severity = 'medium'
    
    # Vérifier les noms multilingues
    if 'name' in data:
        name_data = data['name']
        if isinstance(name_data, dict):
            for lang in LANGS:
                if lang not in name_data or not name_data[lang]:
                    issues.append(f'Nom manquant pour la langue: {lang}')
        else:
            issues.append('Noms multilingues manquants')
    
    # Vérifier les capacités
    if 'capabilities' in data and not data['capabilities']:
        issues.append('Aucune capacité définie')
        severity = 'medium'
    
    # Vérifier les métadonnées Zigbee
    if 'zigbee' not in data:
        issues.append('Métadonnées Zigbee manquantes')
        severity = 'medium'
    else:
        zigbee_data = data['zigbee']
        if 'manufacturerName' not in zigbee_data or not zigbee_data['manufacturerName']:
            issues.append('Fabricant(s) manquant(s)')
        if 'productId' not in zigbee_data or not zigbee_data['productId']:
            issues.append('ID(s) produit manquant(s)')
    
    # Vérifier les instructions
    if 'zigbee' in data and 'learnmode' in data['zigbee']:
        learnmode = data['zigbee']['learnmode']
        if 'instruction' not in learnmode:
            issues.append('Instructions d\'appairage manquantes')
    
    return {
        'is_incomplete': len(issues) > 0,
        'issues': issues,
        'severity': severity,
        'data': data
    }

def generate_issue_content(driver_id, analysis, lang='fr'):
    """Génère le contenu de l'issue pour une langue donnée"""
    template = ISSUE_TEMPLATES[lang]
    
    # Extraire les données du driver
    driver_data = analysis.get('data', {})
    
    # Gérer le cas où name est une string au lieu d'un dict
    name_data = driver_data.get('name', {})
    if isinstance(name_data, str):
        driver_name = name_data
    else:
        driver_name = name_data.get(lang, name_data.get('en', driver_id))
    
    # Préparer les données pour le template
    template_data = {
        'driver_id': driver_id,
        'driver_name': driver_name,
        'status': 'incomplete',
        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'manufacturer': ', '.join(driver_data.get('zigbee', {}).get('manufacturerName', ['Unknown'])),
        'model': ', '.join(driver_data.get('zigbee', {}).get('productId', ['Unknown'])),
        'capabilities': ', '.join(driver_data.get('capabilities', [])),
        'category': driver_data.get('class', 'unknown'),
        'issues_list': '\n'.join([f'- {issue}' for issue in analysis['issues']]),
        'notes': f'Sévérité: {analysis["severity"]}\nNombre de problèmes: {len(analysis["issues"])}'
    }
    
    return {
        'title': template['title'].format(**template_data),
        'body': template['body'].format(**template_data)
    }

def scan_all_drivers():
    """Scanne tous les drivers et détecte les incomplets"""
    incomplete_drivers = []
    
    # Scanner les dossiers drivers
    driver_dirs = ['drivers/sdk3', 'drivers/in_progress', 'drivers/legacy']
    
    for base_dir in driver_dirs:
        if not os.path.isdir(base_dir):
            continue
            
        for driver_name in os.listdir(base_dir):
            driver_path = os.path.join(base_dir, driver_name)
            
            if os.path.isdir(driver_path):
                analysis = analyze_driver_completeness(driver_path)
                
                if analysis['is_incomplete']:
                    incomplete_drivers.append({
                        'id': driver_name,
                        'path': driver_path,
                        'analysis': analysis
                    })
    
    return incomplete_drivers

def generate_issues_for_all_languages(incomplete_drivers):
    """Génère les issues pour toutes les langues"""
    all_issues = {}
    
    for driver in incomplete_drivers:
        driver_id = driver['id']
        analysis = driver['analysis']
        
        driver_issues = {}
        for lang in LANGS:
            driver_issues[lang] = generate_issue_content(driver_id, analysis, lang)
        
        all_issues[driver_id] = driver_issues
    
    return all_issues

def save_issues_to_files(issues):
    """Sauvegarde les issues dans des fichiers"""
    os.makedirs('issues', exist_ok=True)
    
    for driver_id, driver_issues in issues.items():
        for lang, issue_content in driver_issues.items():
            filename = f'issues/{driver_id}_{lang}_issue.md'
            
            content = f"""# {issue_content['title']}

{issue_content['body']}
"""
            
            with open(filename, 'w', encoding='utf-8') as f:
                f.write(content)
    
    # Créer un rapport global
    report = {
        'timestamp': datetime.now().isoformat(),
        'total_incomplete_drivers': len(issues),
        'languages': LANGS,
        'drivers': list(issues.keys()),
        'summary': {
            'high_severity': sum(1 for d in issues.values() if any('high' in str(v) for v in d.values())),
            'medium_severity': sum(1 for d in issues.values() if any('medium' in str(v) for v in d.values())),
            'low_severity': sum(1 for d in issues.values() if any('low' in str(v) for v in d.values()))
        }
    }
    
    with open('issues/ISSUES_REPORT.json', 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

def main():
    """Fonction principale"""
    print("🚀 Début de la génération automatique d'issues GitHub...")
    
    # 1. Scanner tous les drivers
    print("🔍 Scan des drivers...")
    incomplete_drivers = scan_all_drivers()
    
    if not incomplete_drivers:
        print("✅ Aucun driver incomplet détecté!")
        return
    
    print(f"⚠️ {len(incomplete_drivers)} drivers incomplets détectés")
    
    # 2. Générer les issues pour toutes les langues
    print("📝 Génération des issues multilingues...")
    issues = generate_issues_for_all_languages(incomplete_drivers)
    
    # 3. Sauvegarder les issues
    print("💾 Sauvegarde des issues...")
    save_issues_to_files(issues)
    
    # 4. Afficher le résumé
    print("\n🎉 GÉNÉRATION D'ISSUES TERMINÉE!")
    print(f"📊 Résumé:")
    print(f"- {len(incomplete_drivers)} drivers incomplets")
    print(f"- {len(LANGS)} langues supportées")
    print(f"- {len(incomplete_drivers) * len(LANGS)} issues générées")
    print(f"- Fichiers sauvegardés dans le dossier 'issues/'")
    
    # Afficher les drivers incomplets
    print("\n📋 Drivers incomplets détectés:")
    for driver in incomplete_drivers:
        severity = driver['analysis']['severity']
        issues_count = len(driver['analysis']['issues'])
        print(f"- {driver['id']} ({severity}, {issues_count} problèmes)")

if __name__ == '__main__':
    main() 