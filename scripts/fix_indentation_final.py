#!/usr/bin/env python3
"""
Correction finale et définitive des erreurs d'indentation
Corrige TOUTES les lignes des méthodes problématiques
"""

import os
import re
from pathlib import Path

print("🔧 CORRECTION FINALE DES INDENTATIONS\n")

# Configuration des fixes
fixes_config = [
    {
        'file': 'drivers/contact_sensor_vibration/device.js',
        'method': 'setupIASZone',
        'start_line': 225,
        'end_line': 295,
        'description': 'Fix contact_sensor_vibration setupIASZone indentation'
    },
    {
        'file': 'drivers/doorbell_button/device.js',
        'method': 'setupIASZone',
        'start_line': 368,
        'end_line': 406,
        'description': 'Fix doorbell_button setupIASZone indentation'
    },
    {
        'file': 'drivers/thermostat_advanced/device.js',
        'method': 'triggerFlowCard',
        'start_line': 188,
        'end_line': 197,
        'description': 'Fix thermostat_advanced triggerFlowCard indentation'
    },
    {
        'file': 'drivers/thermostat_smart/device.js',
        'method': 'triggerFlowCard',
        'start_line': 188,
        'end_line': 197,
        'description': 'Fix thermostat_smart triggerFlowCard indentation'
    },
    {
        'file': 'drivers/thermostat_temperature_control/device.js',
        'method': 'triggerFlowCard',
        'start_line': 189,
        'end_line': 198,
        'description': 'Fix thermostat_temperature_control triggerFlowCard indentation'
    },
    {
        'file': 'drivers/water_valve_controller/device.js',
        'method': 'triggerFlowCard',
        'start_line': 189,
        'end_line': 198,
        'description': 'Fix water_valve_controller triggerFlowCard indentation'
    }
]

def fix_method_indentation(file_path, start_line, end_line, description):
    """
    Corrige l'indentation d'une méthode complète
    Règle: Tout le corps de la méthode doit être indenté de 4 espaces
    """
    print(f"📝 {description}")
    print(f"   Fichier: {file_path}")
    print(f"   Lignes: {start_line}-{end_line}")

    if not os.path.exists(file_path):
        print(f"   ⚠️  Fichier introuvable")
        return False

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()

        modified = False
        fixes_applied = 0

        # Parcourir les lignes de la méthode (1-indexed to 0-indexed)
        for i in range(start_line, min(end_line + 1, len(lines))):
            line = lines[i]

            # Ignorer lignes vides
            if not line.strip():
                continue

            # Calculer l'indentation actuelle
            current_indent = len(line) - len(line.lstrip())

            # Si la ligne n'est pas commentée et commence par 2 espaces exactement
            # au niveau du corps de méthode, ajouter 2 espaces
            if current_indent == 2 and line.strip() and not line.strip().startswith('//'):
                # Cas 1: Début du corps de méthode (this.log, const, if, try, etc.)
                lines[i] = '  ' + line
                modified = True
                fixes_applied += 1
            elif current_indent < 4 and line.strip() and i > start_line:
                # Cas 2: Lignes sous-indentées dans le corps
                needed_indent = 4  # Base indentation

                # Déterminer le niveau d'indentation correct basé sur le contexte
                # En regardant les accolades ouvertes avant cette ligne
                open_braces = 0
                for j in range(start_line, i):
                    prev_line = lines[j].strip()
                    if prev_line.endswith('{'):
                        open_braces += 1
                    if prev_line.startswith('}'):
                        open_braces -= 1

                # Chaque niveau de bloc = +2 espaces
                needed_indent = 4 + (open_braces * 2)

                if current_indent < needed_indent:
                    spaces_to_add = needed_indent - current_indent
                    lines[i] = (' ' * spaces_to_add) + line
                    modified = True
                    fixes_applied += 1

        if modified:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.writelines(lines)
            print(f"   ✅ {fixes_applied} lignes corrigées")
            return True
        else:
            print(f"   ℹ️  Aucune correction nécessaire")
            return False

    except Exception as e:
        print(f"   ❌ Erreur: {e}")
        return False

# Statistiques
results = {
    'success': [],
    'skipped': [],
    'errors': []
}

print("🔄 DÉBUT DES CORRECTIONS\n")
print("=" * 60)
print()

# Traiter chaque fichier
base_dir = Path(__file__).parent

for config in fixes_config:
    file_path = base_dir / config['file']

    success = fix_method_indentation(
        str(file_path),
        config['start_line'] - 1,  # Convert to 0-indexed
        config['end_line'] - 1,
        config['description']
    )

    if success:
        results['success'].append(config['file'])
    else:
        results['skipped'].append(config['file'])

    print()

# Rapport final
print("=" * 60)
print("\n📊 RAPPORT FINAL\n")

print(f"✅ Succès: {len(results['success'])}")
for f in results['success']:
    print(f"   - {f}")
print()

print(f"⊗ Ignorés: {len(results['skipped'])}")
for f in results['skipped']:
    print(f"   - {f}")
print()

print(f"❌ Erreurs: {len(results['errors'])}")
for e in results['errors']:
    print(f"   - {e}")
print()

if len(results['success']) > 0:
    print("✅ CORRECTIONS APPLIQUÉES!")
    print()
    print("⏭️  PROCHAINES ÉTAPES:")
    print("   1. Vérifier: npm run lint")
    print("   2. Valider: npx homey app validate --level publish")
    print("   3. Si OK: git add . && git commit")
elif len(results['skipped']) > 0:
    print("ℹ️  Tous les fichiers semblent déjà corrigés")
else:
    print("⚠️  Aucune correction appliquée")

print()
print("✨ FIN DU TRAITEMENT")
