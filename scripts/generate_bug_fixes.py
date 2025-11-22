#!/usr/bin/env python3
"""
Génère un rapport consolidé des bugs à corriger et les solutions
"""

import json
import os
from pathlib import Path
from collections import defaultdict

print("=== GENERATION RAPPORT BUGS A CORRIGER ===\n")

diagnostic_dir = Path(__file__).parent / "diagnostic_analysis"

# Catégories de bugs avec solutions
bug_fixes = {
    'IASZoneManager_undefined_resolve': {
        'pattern': 'Cannot read properties of undefined (reading \'resolve\')',
        'severity': 'CRITICAL',
        'file': 'lib/IASZoneManager.js:105',
        'description': 'IASZoneManager.enrollIASZone crashes avec undefined promise',
        'fix': 'Vérifier que la promise est initialisée avant d\'appeler resolve',
        'solution': '''
// Dans lib/IASZoneManager.js ligne ~105
async enrollIASZone(device) {
  return new Promise((resolve, reject) => {  // Assurer que resolve/reject sont définis
    // Code enrollment...
    if (success) {
      resolve();
    } else {
      reject(new Error('Enrollment failed'));
    }
  });
}
''',
        'count': 0,
        'pdfs': set()
    },

    'IEEE_address_failure': {
        'pattern': 'ALL methods failed to get IEEE address',
        'severity': 'CRITICAL',
        'file': 'IAS Zone enrollment',
        'description': 'Impossible de récupérer l\'adresse IEEE du device',
        'fix': 'Améliorer les méthodes de récupération IEEE ou ajouter fallback',
        'solution': '''
// Ajouter méthode alternative dans IASZoneManager.js
async getIEEEAddress(device) {
  try {
    // Méthode 1: Via zclNode
    if (device.zclNode?.ieeeAddress) {
      return device.zclNode.ieeeAddress;
    }

    // Méthode 2: Via getData
    const data = device.getData();
    if (data?.ieeeAddress) {
      return data.ieeeAddress;
    }

    // Méthode 3: Via getDevice
    const homeyDevice = await device.homey.zigbee.getDevice(device);
    if (homeyDevice?.ieeeAddress) {
      return homeyDevice.ieeeAddress;
    }

    throw new Error('No method succeeded to get IEEE address');
  } catch (err) {
    device.error('Failed to get IEEE address:', err);
    return null;
  }
}
''',
        'count': 0,
        'pdfs': set()
    },

    'Flow_Card_Invalid_ID': {
        'pattern': 'Invalid Flow Card ID:',
        'severity': 'HIGH',
        'file': 'Flow card registration',
        'description': 'Flow card ID invalide (espaces dans ID)',
        'fix': 'Corriger les IDs de flow cards (enlever espaces)',
        'solution': '''
// Dans le driver, vérifier les IDs de flow cards
// MAUVAIS:
this.homey.flow.getDeviceTriggerCard('button_wireless_3_button_ pressed')

// BON:
this.homey.flow.getDeviceTriggerCard('button_wireless_3_button_pressed')

// Vérifier dans .homeycompose/flow/triggers/*.json
{
  "id": "button_wireless_3_button_pressed",  // PAS d'espace!
  "title": { "en": "Button pressed" }
}
''',
        'count': 0,
        'pdfs': set()
    },

    'zclNode_undefined_destructure': {
        'pattern': 'Cannot destructure property \'zclNode\' of \'undefined\'',
        'severity': 'CRITICAL',
        'file': 'Device onNodeInit',
        'description': 'zclNode undefined lors de l\'initialisation',
        'fix': 'Vérifier que le paramètre est passé correctement',
        'solution': '''
// Dans device.js
async onNodeInit({ zclNode }) {  // Déstructuration peut échouer si argument undefined
  // AJOUTER VERIFICATION:
  if (!zclNode) {
    this.error('onNodeInit called without zclNode!');
    return;
  }

  // Ou utiliser paramètre direct:
  async onNodeInit(args) {
    const { zclNode } = args || {};
    if (!zclNode) {
      this.error('onNodeInit called without zclNode!');
      return;
    }
    // ...
  }
}
''',
        'count': 0,
        'pdfs': set()
    },

    'Syntax_Error_Unexpected_Token': {
        'pattern': 'Unexpected token',
        'severity': 'CRITICAL',
        'file': 'Device JS files',
        'description': 'Erreurs de syntaxe JavaScript',
        'fix': 'Corriger la syntaxe (accolades, virgules, etc.)',
        'solution': '''
// Patterns d'erreurs fréquentes:

// 1. Virgule manquante dans objet
const config = {
  attribute: 'measuredValue'
  report: 'measuredValue'  // ERREUR: virgule manquante
};

// CORRECT:
const config = {
  attribute: 'measuredValue',
  report: 'measuredValue'
};

// 2. Point au début de ligne (continuation incorrecte)
this.log('[WARN] Config failed')
.catch(err => ...);  // ERREUR si pas sur même ligne ou avec await

// CORRECT:
this.log('[WARN] Config failed:', err.message);
''',
        'count': 0,
        'pdfs': set()
    },

    'Zigbee_Startup_Error': {
        'pattern': 'Zigbee est en cours de démarrage',
        'severity': 'MEDIUM',
        'file': 'Zigbee initialization',
        'description': 'Tentative d\'accès Zigbee avant initialisation complète',
        'fix': 'Ajouter retry logic ou attendre fin initialisation',
        'solution': '''
// Dans device.js, ajouter retry pour opérations Zigbee
async initializeZigbee() {
  const maxRetries = 3;
  const retryDelay = 2000;

  for (let i = 0; i < maxRetries; i++) {
    try {
      await this.configureReporting(this.zclNode);
      return; // Success
    } catch (err) {
      if (err.message.includes('en cours de démarrage')) {
        this.log(`Zigbee not ready, retry ${i + 1}/${maxRetries}...`);
        await this.delay(retryDelay);
      } else {
        throw err; // Other error, don't retry
      }
    }
  }

  this.error('Zigbee initialization failed after retries');
}

delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
''',
        'count': 0,
        'pdfs': set()
    }
}

# Analyser tous les fichiers JSON
json_files = list(diagnostic_dir.glob("*_diagnostic.json"))
print(f"Analyse de {len(json_files)} fichiers JSON...\n")

for json_file in json_files:
    try:
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)

        pdf_name = data.get('pdf', 'unknown')
        errors = data.get('errors', {})

        # Parcourir toutes les erreurs
        for category, err_list in errors.items():
            for err in err_list:
                error_text = err.get('error', '') + ' ' + err.get('context', '')

                # Matcher avec les patterns de bugs
                for bug_id, bug_info in bug_fixes.items():
                    if bug_info['pattern'].lower() in error_text.lower():
                        bug_info['count'] += 1
                        bug_info['pdfs'].add(pdf_name)

    except Exception as e:
        print(f"Erreur lecture {json_file.name}: {e}")

# Générer rapport
print("=" * 70)
print("\n📊 RAPPORT DES BUGS À CORRIGER\n")
print("=" * 70)
print()

# Trier par sévérité et count
severity_order = {'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3}
sorted_bugs = sorted(
    bug_fixes.items(),
    key=lambda x: (severity_order.get(x[1]['severity'], 99), -x[1]['count'])
)

bug_count = 0
for bug_id, info in sorted_bugs:
    if info['count'] > 0:
        bug_count += 1
        print(f"### BUG #{bug_count}: {bug_id}")
        print(f"**Sévérité:** {info['severity']}")
        print(f"**Occurrences:** {info['count']} (dans {len(info['pdfs'])} PDF(s))")
        print(f"**Fichier:** {info['file']}")
        print(f"**Description:** {info['description']}")
        print(f"**Fix requis:** {info['fix']}")
        print(f"\n**Solution:**")
        print(info['solution'])
        print("\n" + "-" * 70 + "\n")

# Statistiques
print("=" * 70)
print("\n📈 STATISTIQUES\n")
print("=" * 70)
print()

critical = sum(1 for _, info in bug_fixes.items() if info['count'] > 0 and info['severity'] == 'CRITICAL')
high = sum(1 for _, info in bug_fixes.items() if info['count'] > 0 and info['severity'] == 'HIGH')
medium = sum(1 for _, info in bug_fixes.items() if info['count'] > 0 and info['severity'] == 'MEDIUM')

print(f"Total bugs identifiés: {bug_count}")
print(f"  - CRITICAL: {critical}")
print(f"  - HIGH: {high}")
print(f"  - MEDIUM: {medium}")
print()

print("Bugs par occurrences:")
for bug_id, info in sorted_bugs:
    if info['count'] > 0:
        print(f"  {bug_id}: {info['count']} occurrences")
print()

# Sauvegarder rapport
report_file = diagnostic_dir / "BUGS_TO_FIX.md"
with open(report_file, 'w', encoding='utf-8') as f:
    f.write("# 🐛 BUGS À CORRIGER - RAPPORT COMPLET\n\n")
    f.write("**Source:** Analyse de 30 PDFs de diagnostics\n\n")
    f.write("---\n\n")

    f.write("## 📊 RÉSUMÉ\n\n")
    f.write(f"- **Total bugs identifiés:** {bug_count}\n")
    f.write(f"- **CRITICAL:** {critical}\n")
    f.write(f"- **HIGH:** {high}\n")
    f.write(f"- **MEDIUM:** {medium}\n\n")
    f.write("---\n\n")

    bug_num = 0
    for bug_id, info in sorted_bugs:
        if info['count'] > 0:
            bug_num += 1
            f.write(f"## BUG #{bug_num}: {bug_id}\n\n")
            f.write(f"**Sévérité:** 🔴 {info['severity']}\n\n")
            f.write(f"**Occurrences:** {info['count']} (dans {len(info['pdfs'])} PDF(s))\n\n")
            f.write(f"**Fichier affecté:** `{info['file']}`\n\n")
            f.write(f"**Description:** {info['description']}\n\n")
            f.write(f"**Fix requis:** {info['fix']}\n\n")
            f.write(f"### Solution\n\n```javascript{info['solution']}\n```\n\n")
            f.write(f"**PDFs concernés:** {', '.join(sorted(list(info['pdfs']))[:10])}\n\n")
            if len(info['pdfs']) > 10:
                f.write(f"... et {len(info['pdfs']) - 10} autre(s)\n\n")
            f.write("---\n\n")

print(f"✅ Rapport sauvegardé: {report_file}")
print("\n✨ ANALYSE TERMINÉE!")
