#!/usr/bin/env python3
"""
Suppression de l'accolade orpheline et du catch orphelin
"""

files = [
    'drivers/thermostat_advanced/device.js',
    'drivers/thermostat_smart/device.js',
    'drivers/thermostat_temperature_control/device.js',
    'drivers/water_valve_controller/device.js'
]

print("🔧 SUPPRESSION ACCOLADE ORPHELINE\n")

for filepath in files:
    print(f"📝 {filepath}")

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Pattern: \n  catch(err) {\n    this.error('Battery change detection error:', err);\n  }\n}\n  // ========================================
    # À remplacer par: \n  }\n\n  // ========================================

    pattern1 = """
  catch(err) {
    this.error('Battery change detection error:', err);
  }
}
  // ========================================"""

    replacement1 = """
  }

  // ========================================"""

    if pattern1 in content:
        content = content.replace(pattern1, replacement1)
        print("   ✅ Accolade orpheline supprimée")
    else:
        print("   ℹ️  Pattern non trouvé")

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

    print()

print("✨ TERMINÉ!\n")
