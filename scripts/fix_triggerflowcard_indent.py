#!/usr/bin/env python3
"""
Correction UNIQUEMENT de l'indentation de triggerFlowCard
Ajoute 2 espaces à chaque ligne à l'intérieur de la méthode
"""

files = [
    'drivers/thermostat_advanced/device.js',
    'drivers/thermostat_smart/device.js',
    'drivers/thermostat_temperature_control/device.js',
    'drivers/water_valve_controller/device.js'
]

print("🔧 CORRECTION INDENTATION triggerFlowCard\n")

for filepath in files:
    print(f"📝 {filepath}")

    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    new_lines = []
    in_trigger = False
    method_start_line = -1

    for i, line in enumerate(lines, 1):
        # Détecter début de triggerFlowCard
        if '  async triggerFlowCard(cardId, tokens = {}) {' in line:
            in_trigger = True
            method_start_line = i
            new_lines.append(line)
            print(f"   Trouvé triggerFlowCard ligne {i}")
            continue

        # Si dans triggerFlowCard
        if in_trigger:
            # Détecter fin de la méthode (ligne commençant par '}' après try/catch)
            if line.strip() == '}' and i > method_start_line + 5:
                # Vérifier que c'est bien la fermeture de la méthode
                # La ligne précédente devrait être '  }'
                prev_line = lines[i-2].rstrip()
                if prev_line == '  }':
                    # C'est la fermeture de la méthode
                    new_lines.append('  }\n')
                    in_trigger = False
                    print(f"   Fin triggerFlowCard ligne {i}")
                    continue

            # Ajouter 2 espaces à la ligne (sauf si vide)
            if line.strip():
                new_lines.append('  ' + line)
            else:
                new_lines.append(line)
        else:
            new_lines.append(line)

    # Sauvegarder
    with open(filepath, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)

    print(f"   ✅ Corrigé\n")

print("✨ TERMINÉ!\n")
