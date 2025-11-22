#!/usr/bin/env python3
"""
Suppression de la deuxième accolade orpheline
"""

files = [
    'drivers/thermostat_smart/device.js',
    'drivers/thermostat_temperature_control/device.js',
    'drivers/water_valve_controller/device.js'
]

print("🔧 SUPPRESSION DEUXIÈME ACCOLADE ORPHELINE\n")

for filepath in files:
    print(f"📝 {filepath}")

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Pattern: \n  }\n\n  }\n\n  // ========================================
    # À remplacer par: \n  }\n\n  // ========================================

    pattern = """  }

  }

  // ========================================"""

    replacement = """  }

  // ========================================"""

    if pattern in content:
        content = content.replace(pattern, replacement)
        print("   ✅ Accolade orpheline supprimée")
    else:
        print("   ℹ️  Pattern non trouvé (peut-être déjà corrigé)")

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

    print()

print("✨ TERMINÉ!\n")
