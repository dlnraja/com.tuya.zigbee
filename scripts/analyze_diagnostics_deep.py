#!/usr/bin/env python3
"""
Analyse approfondie des diagnostics, logs et erreurs dans les PDFs
Extrait tous les problèmes pour correction dans les drivers
"""

import os
import re
import json
from pathlib import Path
from collections import defaultdict

try:
    import PyPDF2
except ImportError:
    print("❌ PyPDF2 non installé. Installation...")
    import subprocess
    subprocess.check_call(['pip', 'install', 'PyPDF2'])
    import PyPDF2

print("🔍 ANALYSE APPROFONDIE DES DIAGNOSTICS PDFs\n")

# Configuration
pdf_dir = Path("D:/Download/pdfhomey")
output_dir = Path(__file__).parent / "diagnostic_analysis"
output_dir.mkdir(exist_ok=True)

# Patterns de détection d'erreurs et problèmes
error_patterns = {
    'errors': [
        r'Error:\s*(.+)',
        r'ERROR\s*[:\-]\s*(.+)',
        r'Failed to\s+(.+)',
        r'Cannot\s+(.+)',
        r'Unable to\s+(.+)',
        r'❌\s*(.+)',
        r'Exception:\s*(.+)',
        r'Timeout\s+(.+)',
        r'Invalid\s+(.+)',
    ],
    'warnings': [
        r'Warning:\s*(.+)',
        r'WARN\s*[:\-]\s*(.+)',
        r'⚠️\s*(.+)',
        r'deprecated\s+(.+)',
    ],
    'crashes': [
        r'crash',
        r'fatal',
        r'segfault',
        r'core dump',
    ],
    'device_issues': [
        r'device\s+not\s+responding',
        r'device\s+unavailable',
        r'pairing\s+failed',
        r'connection\s+lost',
        r'offline',
        r'unreachable',
    ],
    'cluster_errors': [
        r'cluster\s+0x[0-9a-fA-F]+\s+(?:not\s+available|failed|error)',
        r'Cluster\s+\w+\s+not\s+found',
    ],
    'capability_errors': [
        r'setCapabilityValue\s+FAILED',
        r'capability\s+not\s+found',
        r'capability\s+error',
    ],
    'zigbee_errors': [
        r'Zigbee\s+error',
        r'ZCL\s+error',
        r'endpoint\s+not\s+found',
        r'attribute\s+read\s+failed',
        r'command\s+failed',
    ],
    'flow_issues': [
        r'flow\s+card\s+not\s+(?:found|working)',
        r'trigger\s+failed',
        r'flow\s+not\s+triggering',
    ]
}

# Patterns d'extraction de données
data_patterns = {
    'manufacturer': r'_TZ[E0-9]{4}_[a-z0-9]{8,10}',
    'model': r'TS\d{4}',
    'cluster': r'(?:cluster|Cluster)\s*(?:ID\s*)?:?\s*0x([0-9a-fA-F]{4})',
    'datapoint': r'(?:DP|dp|datapoint)\s*(\d{1,3})',
    'endpoint': r'endpoint\s*(\d+)',
    'error_code': r'error\s*code\s*:\s*(\d+|0x[0-9a-fA-F]+)',
    'battery': r'battery\s*:?\s*(\d{1,3})\s*%',
    'signal': r'(?:signal|rssi|lqi)\s*:?\s*(-?\d+)',
}

# Structure de résultats
results = {
    'summary': {
        'total_pdfs': 0,
        'pdfs_with_errors': 0,
        'total_errors': 0,
        'total_warnings': 0,
        'devices_affected': set(),
        'manufacturers_affected': set(),
        'models_affected': set(),
    },
    'errors_by_category': defaultdict(list),
    'errors_by_device': defaultdict(list),
    'critical_issues': [],
    'bugs_to_fix': [],
    'driver_improvements': defaultdict(list),
}

def extract_text_from_pdf(pdf_path):
    """Extrait le texte d'un PDF"""
    try:
        with open(pdf_path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            text = ""
            for page in reader.pages:
                text += page.extract_text() + "\n"
            return text
    except Exception as e:
        print(f"   ⚠️  Erreur lecture PDF: {e}")
        return None

def analyze_errors(text, pdf_name):
    """Analyse les erreurs dans le texte"""
    errors_found = {
        'errors': [],
        'warnings': [],
        'crashes': [],
        'device_issues': [],
        'cluster_errors': [],
        'capability_errors': [],
        'zigbee_errors': [],
        'flow_issues': [],
    }

    for category, patterns in error_patterns.items():
        for pattern in patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE | re.MULTILINE)
            for match in matches:
                error_text = match.group(0)
                context_start = max(0, match.start() - 100)
                context_end = min(len(text), match.end() + 100)
                context = text[context_start:context_end].replace('\n', ' ').strip()

                errors_found[category].append({
                    'error': error_text,
                    'context': context,
                    'pdf': pdf_name
                })

    return errors_found

def extract_device_info(text):
    """Extrait les informations du device"""
    info = {
        'manufacturers': set(),
        'models': set(),
        'clusters': set(),
        'datapoints': set(),
        'endpoints': set(),
        'error_codes': set(),
    }

    for key, pattern in data_patterns.items():
        matches = re.finditer(pattern, text, re.IGNORECASE)
        for match in matches:
            value = match.group(1) if match.groups() else match.group(0)
            if key == 'manufacturer':
                info['manufacturers'].add(match.group(0))
            elif key == 'model':
                info['models'].add(match.group(0))
            elif key == 'cluster':
                info['clusters'].add(f"0x{value}")
            elif key == 'datapoint':
                info['datapoints'].add(value)
            elif key == 'endpoint':
                info['endpoints'].add(value)
            elif key == 'error_code':
                info['error_codes'].add(value)

    return info

def identify_critical_issues(errors, device_info, pdf_name):
    """Identifie les problèmes critiques nécessitant corrections"""
    critical = []

    # Flow cards not triggering
    for err in errors.get('flow_issues', []):
        critical.append({
            'severity': 'CRITICAL',
            'category': 'Flow Cards',
            'issue': err['error'],
            'context': err['context'],
            'pdf': pdf_name,
            'device_info': device_info,
            'fix_required': 'Check flow card registration and trigger methods'
        })

    # Capability errors
    for err in errors.get('capability_errors', []):
        critical.append({
            'severity': 'HIGH',
            'category': 'Capabilities',
            'issue': err['error'],
            'context': err['context'],
            'pdf': pdf_name,
            'device_info': device_info,
            'fix_required': 'Verify capability registration and setCapabilityValue calls'
        })

    # Device unavailable/offline
    for err in errors.get('device_issues', []):
        if any(keyword in err['error'].lower() for keyword in ['unavailable', 'offline', 'not responding']):
            critical.append({
                'severity': 'HIGH',
                'category': 'Device Connectivity',
                'issue': err['error'],
                'context': err['context'],
                'pdf': pdf_name,
                'device_info': device_info,
                'fix_required': 'Check IAS Zone enrollment or device initialization'
            })

    # Cluster not available
    for err in errors.get('cluster_errors', []):
        critical.append({
            'severity': 'MEDIUM',
            'category': 'Zigbee Clusters',
            'issue': err['error'],
            'context': err['context'],
            'pdf': pdf_name,
            'device_info': device_info,
            'fix_required': 'Add cluster support or handle missing cluster gracefully'
        })

    return critical

def suggest_driver_improvements(errors, device_info):
    """Suggère des améliorations pour les drivers"""
    improvements = []

    # Manufacturer ID manquant
    for mfr in device_info['manufacturers']:
        improvements.append({
            'type': 'manufacturer_support',
            'action': f'Add manufacturer ID {mfr} to appropriate driver',
            'priority': 'HIGH'
        })

    # Clusters utilisés
    for cluster in device_info['clusters']:
        improvements.append({
            'type': 'cluster_support',
            'action': f'Ensure cluster {cluster} is properly handled',
            'priority': 'MEDIUM'
        })

    # Datapoints Tuya
    if device_info['datapoints']:
        improvements.append({
            'type': 'tuya_datapoints',
            'action': f"Map datapoints {', '.join(sorted(device_info['datapoints']))} in Tuya driver",
            'priority': 'MEDIUM'
        })

    # Error handling
    if any(err.get('errors') for err in [errors]):
        improvements.append({
            'type': 'error_handling',
            'action': 'Improve error handling and logging',
            'priority': 'LOW'
        })

    return improvements

# Traiter tous les PDFs
pdf_files = sorted(pdf_dir.glob("*.pdf"))
results['summary']['total_pdfs'] = len(pdf_files)

print(f"📄 {len(pdf_files)} PDFs trouvés\n")
print("=" * 60)
print()

for i, pdf_path in enumerate(pdf_files, 1):
    pdf_name = pdf_path.name
    print(f"📝 [{i}/{len(pdf_files)}] {pdf_name}")

    # Extraire texte
    text = extract_text_from_pdf(pdf_path)
    if not text:
        continue

    # Analyser erreurs
    errors = analyze_errors(text, pdf_name)

    # Extraire info device
    device_info = extract_device_info(text)

    # Compter erreurs
    total_errors = sum(len(errs) for errs in errors.values())

    if total_errors > 0:
        results['summary']['pdfs_with_errors'] += 1
        results['summary']['total_errors'] += total_errors
        print(f"   ⚠️  {total_errors} problème(s) détecté(s)")

        # Identifier problèmes critiques
        critical = identify_critical_issues(errors, device_info, pdf_name)
        results['critical_issues'].extend(critical)

        if critical:
            print(f"   🔴 {len(critical)} problème(s) CRITIQUE(s)")

        # Stocker par catégorie
        for category, err_list in errors.items():
            if err_list:
                results['errors_by_category'][category].extend(err_list)

        # Suggérer améliorations
        improvements = suggest_driver_improvements(errors, device_info)
        for imp in improvements:
            results['driver_improvements'][imp['type']].append(imp)
    else:
        print(f"   ✅ Aucun problème détecté")

    # Mettre à jour summary
    results['summary']['manufacturers_affected'].update(device_info['manufacturers'])
    results['summary']['models_affected'].update(device_info['models'])

    # Sauvegarder analyse individuelle
    analysis_file = output_dir / f"{pdf_path.stem}_diagnostic.json"
    with open(analysis_file, 'w', encoding='utf-8') as f:
        json.dump({
            'pdf': pdf_name,
            'errors': errors,
            'device_info': {k: list(v) if isinstance(v, set) else v for k, v in device_info.items()},
            'critical_issues': critical,
            'improvements': improvements,
        }, f, indent=2, ensure_ascii=False)

    print()

# Convertir sets en listes pour JSON
results['summary']['manufacturers_affected'] = list(results['summary']['manufacturers_affected'])
results['summary']['models_affected'] = list(results['summary']['models_affected'])

# Rapport final
print("=" * 60)
print("\n📊 RAPPORT FINAL D'ANALYSE\n")

print(f"📄 PDFs analysés: {results['summary']['total_pdfs']}")
print(f"⚠️  PDFs avec problèmes: {results['summary']['pdfs_with_errors']}")
print(f"❌ Total erreurs: {results['summary']['total_errors']}")
print(f"🔴 Problèmes critiques: {len(results['critical_issues'])}")
print()

print("📈 ERREURS PAR CATÉGORIE:")
for category, err_list in sorted(results['errors_by_category'].items()):
    if err_list:
        print(f"   {category}: {len(err_list)}")
print()

print("🔴 TOP 5 PROBLÈMES CRITIQUES:")
for i, issue in enumerate(results['critical_issues'][:5], 1):
    print(f"\n{i}. [{issue['severity']}] {issue['category']}")
    print(f"   Issue: {issue['issue']}")
    print(f"   PDF: {issue['pdf']}")
    print(f"   Fix: {issue['fix_required']}")
print()

print(f"🏭 Manufacturers affectés: {len(results['summary']['manufacturers_affected'])}")
for mfr in sorted(results['summary']['manufacturers_affected'])[:10]:
    print(f"   - {mfr}")
print()

print(f"📱 Models affectés: {len(results['summary']['models_affected'])}")
for model in sorted(results['summary']['models_affected']):
    print(f"   - {model}")
print()

# Sauvegarder rapport complet
report_file = output_dir / "DIAGNOSTIC_ANALYSIS_COMPLETE.json"
with open(report_file, 'w', encoding='utf-8') as f:
    json.dump(results, f, indent=2, ensure_ascii=False)

print(f"💾 Rapport sauvegardé: {report_file}")

# Générer rapport Markdown
md_report = output_dir / "DIAGNOSTIC_ANALYSIS_REPORT.md"
with open(md_report, 'w', encoding='utf-8') as f:
    f.write("# 🔍 RAPPORT D'ANALYSE DES DIAGNOSTICS\n\n")
    f.write(f"**Date:** {Path(__file__).stat().st_mtime}\n\n")
    f.write("---\n\n")

    f.write("## 📊 RÉSUMÉ\n\n")
    f.write(f"- **PDFs analysés:** {results['summary']['total_pdfs']}\n")
    f.write(f"- **PDFs avec problèmes:** {results['summary']['pdfs_with_errors']}\n")
    f.write(f"- **Total erreurs détectées:** {results['summary']['total_errors']}\n")
    f.write(f"- **Problèmes critiques:** {len(results['critical_issues'])}\n\n")

    f.write("## 🔴 PROBLÈMES CRITIQUES\n\n")
    for i, issue in enumerate(results['critical_issues'], 1):
        f.write(f"### {i}. [{issue['severity']}] {issue['category']}\n\n")
        f.write(f"**Issue:** {issue['issue']}\n\n")
        f.write(f"**PDF:** `{issue['pdf']}`\n\n")
        f.write(f"**Fix Required:** {issue['fix_required']}\n\n")
        if issue['device_info']['manufacturers']:
            f.write(f"**Manufacturers:** {', '.join(issue['device_info']['manufacturers'])}\n\n")
        if issue['device_info']['models']:
            f.write(f"**Models:** {', '.join(issue['device_info']['models'])}\n\n")
        f.write("---\n\n")

    f.write("## 📈 ERREURS PAR CATÉGORIE\n\n")
    for category, err_list in sorted(results['errors_by_category'].items()):
        if err_list:
            f.write(f"### {category.upper()} ({len(err_list)})\n\n")
            for err in err_list[:5]:  # Top 5 par catégorie
                f.write(f"- **{err['error']}** (`{err['pdf']}`)\n")
            if len(err_list) > 5:
                f.write(f"- ... et {len(err_list) - 5} autre(s)\n")
            f.write("\n")

    f.write("## 🏭 MANUFACTURERS AFFECTÉS\n\n")
    for mfr in sorted(results['summary']['manufacturers_affected']):
        f.write(f"- `{mfr}`\n")
    f.write("\n")

    f.write("## 📱 MODELS AFFECTÉS\n\n")
    for model in sorted(results['summary']['models_affected']):
        f.write(f"- `{model}`\n")
    f.write("\n")

print(f"📄 Rapport Markdown: {md_report}")
print()
print("✨ ANALYSE TERMINÉE!")
