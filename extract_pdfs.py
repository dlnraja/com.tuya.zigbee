#!/usr/bin/env python3
"""
Script d'extraction et analyse de TOUS les PDFs
Extrait le texte, identifie les manufacturer IDs, diagnostic reports, et informations techniques
"""

import os
import json
import re
import subprocess
import sys
from pathlib import Path
from datetime import datetime

print("📄 EXTRACTION ET ANALYSE DE TOUS LES PDFs\n")

# Vérifier/installer PyPDF2
try:
    import PyPDF2
except ImportError:
    print("📦 Installation de PyPDF2...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "PyPDF2", "--quiet"])
    import PyPDF2

# Répertoires
pdf_dir = Path(__file__).parent / 'pdfhomey'
output_dir = Path(__file__).parent / 'pdf_analysis'
output_dir.mkdir(exist_ok=True)

# Trouver tous les PDFs
pdf_files = list(pdf_dir.glob('*.pdf'))
print(f"✅ {len(pdf_files)} PDFs trouvés\n")

# Patterns de recherche
patterns = {
    'manufacturerName': re.compile(r'_TZ[E0-9]{4}_[a-z0-9]{8,10}', re.IGNORECASE),
    'modelId': re.compile(r'TS\d{4}', re.IGNORECASE),
    'deviceId': re.compile(r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', re.IGNORECASE),
    'cluster': re.compile(r'cluster[:\s]+(?:0x)?([0-9a-f]{4})', re.IGNORECASE),
    'datapoint': re.compile(r'(?:DP|dp|datapoint)[:\s]+(\d{1,3})', re.IGNORECASE),
    'endpoint': re.compile(r'endpoint[:\s]+(\d+)', re.IGNORECASE),
    'battery': re.compile(r'battery[:\s]+(\d{1,3})%?', re.IGNORECASE),
    'temperature': re.compile(r'temperature[:\s]+(-?\d+\.?\d*)\s*°?C?', re.IGNORECASE),
    'humidity': re.compile(r'humidity[:\s]+(\d+\.?\d*)%?', re.IGNORECASE),
    'zigbeeId': re.compile(r'zigbeeId[:\s]+([0-9a-f]+)', re.IGNORECASE)
}

# Résultats globaux
global_results = {
    'totalPdfs': len(pdf_files),
    'processedPdfs': 0,
    'errors': 0,
    'manufacturerNames': set(),
    'modelIds': set(),
    'clusters': set(),
    'datapoints': set(),
    'diagnosticReports': [],
    'technicalInfo': [],
    'forumPosts': [],
    'suggestions': []
}

def extract_text_from_pdf(pdf_path):
    """Extrait le texte d'un PDF"""
    text = ""
    try:
        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
    except Exception as e:
        raise Exception(f"Erreur lecture PDF: {e}")
    return text

def analyze_text(text, filename):
    """Analyse le texte extrait"""
    result = {
        'filename': filename,
        'type': 'unknown',
        'manufacturerNames': [],
        'modelIds': [],
        'clusters': [],
        'datapoints': [],
        'endpoints': [],
        'deviceId': None,
        'battery': None,
        'temperature': None,
        'humidity': None,
        'zigbeeId': None,
        'rawTextPreview': text[:500]
    }

    # Déterminer le type de document
    if 'Diagnostics Report' in filename:
        result['type'] = 'diagnostic_report'
    elif 'suggestion' in filename:
        result['type'] = 'suggestion'
    elif 'Forum' in filename:
        result['type'] = 'forum_post'
    elif 'Technical issue' in filename:
        result['type'] = 'technical_inquiry'

    # Extraire les données
    result['manufacturerNames'] = list(set(patterns['manufacturerName'].findall(text)))
    result['modelIds'] = list(set(patterns['modelId'].findall(text)))
    result['clusters'] = list(set(patterns['cluster'].findall(text)))
    result['datapoints'] = list(set(patterns['datapoint'].findall(text)))
    result['endpoints'] = list(set(patterns['endpoint'].findall(text)))

    # Device ID
    device_match = patterns['deviceId'].search(text)
    if device_match:
        result['deviceId'] = device_match.group(0)

    # Battery
    battery_match = patterns['battery'].search(text)
    if battery_match:
        result['battery'] = int(battery_match.group(1))

    # Temperature
    temp_match = patterns['temperature'].search(text)
    if temp_match:
        result['temperature'] = float(temp_match.group(1))

    # Humidity
    hum_match = patterns['humidity'].search(text)
    if hum_match:
        result['humidity'] = float(hum_match.group(1))

    # Zigbee ID
    zigbee_match = patterns['zigbeeId'].search(text)
    if zigbee_match:
        result['zigbeeId'] = zigbee_match.group(1)

    # Ajouter aux résultats globaux
    for m in result['manufacturerNames']:
        global_results['manufacturerNames'].add(m)
    for m in result['modelIds']:
        global_results['modelIds'].add(m)
    for c in result['clusters']:
        global_results['clusters'].add(c)
    for d in result['datapoints']:
        global_results['datapoints'].add(d)

    # Catégoriser
    if result['type'] == 'diagnostic_report':
        global_results['diagnosticReports'].append(result)
    elif result['type'] == 'suggestion':
        global_results['suggestions'].append(result)
    elif result['type'] == 'forum_post':
        global_results['forumPosts'].append(result)
    elif result['type'] == 'technical_inquiry':
        global_results['technicalInfo'].append(result)

    return result

# Traiter tous les PDFs
results = []

for pdf_path in pdf_files:
    filename = pdf_path.name
    print(f"📄 Processing: {filename}")

    try:
        # Extraire le texte
        text = extract_text_from_pdf(pdf_path)

        # Analyser
        analysis = analyze_text(text, filename)
        results.append(analysis)

        # Sauvegarder le texte brut
        text_file = output_dir / filename.replace('.pdf', '.txt')
        with open(text_file, 'w', encoding='utf-8') as f:
            f.write(text)

        # Sauvegarder l'analyse
        json_file = output_dir / filename.replace('.pdf', '.json')
        with open(json_file, 'w', encoding='utf-8') as f:
            json.dump(analysis, f, indent=2, ensure_ascii=False)

        global_results['processedPdfs'] += 1
        print(f"  ✅ Extracted {len(text)} chars")
        if analysis['manufacturerNames']:
            print(f"     📦 Found {len(analysis['manufacturerNames'])} manufacturer IDs")

    except Exception as err:
        print(f"  ❌ Error: {err}")
        global_results['errors'] += 1

    print()

# Générer le rapport final
report = {
    'summary': {
        'totalPdfs': global_results['totalPdfs'],
        'processedPdfs': global_results['processedPdfs'],
        'errors': global_results['errors'],
        'manufacturerNamesFound': len(global_results['manufacturerNames']),
        'modelIdsFound': len(global_results['modelIds']),
        'clustersFound': len(global_results['clusters']),
        'datapointsFound': len(global_results['datapoints']),
        'diagnosticReports': len(global_results['diagnosticReports']),
        'suggestions': len(global_results['suggestions']),
        'forumPosts': len(global_results['forumPosts']),
        'technicalInfo': len(global_results['technicalInfo'])
    },
    'manufacturerNames': sorted(list(global_results['manufacturerNames'])),
    'modelIds': sorted(list(global_results['modelIds'])),
    'clusters': sorted(list(global_results['clusters'])),
    'datapoints': sorted(list(global_results['datapoints'])),
    'diagnosticReports': global_results['diagnosticReports'],
    'suggestions': global_results['suggestions'],
    'forumPosts': global_results['forumPosts'],
    'technicalInfo': global_results['technicalInfo'],
    'detailedResults': results
}

# Sauvegarder le rapport JSON
report_file = output_dir / 'COMPLETE_PDF_ANALYSIS.json'
# Convertir les sets en listes pour JSON
report_json = json.loads(json.dumps(report, default=list, indent=2, ensure_ascii=False))
with open(report_file, 'w', encoding='utf-8') as f:
    f.write(json.dumps(report_json, indent=2, ensure_ascii=False))

# Générer le rapport Markdown
markdown = '# 📄 RAPPORT COMPLET D\'ANALYSE DES PDFs\n\n'
markdown += f"**Date:** {datetime.now().isoformat()}\n\n"
markdown += '## 📊 RÉSUMÉ\n\n'
markdown += f"- **PDFs traités:** {report['summary']['processedPdfs']}/{report['summary']['totalPdfs']}\n"
markdown += f"- **Erreurs:** {report['summary']['errors']}\n"
markdown += f"- **Manufacturer IDs:** {report['summary']['manufacturerNamesFound']}\n"
markdown += f"- **Model IDs:** {report['summary']['modelIdsFound']}\n"
markdown += f"- **Clusters:** {report['summary']['clustersFound']}\n"
markdown += f"- **Datapoints:** {report['summary']['datapointsFound']}\n\n"

markdown += '## 📦 DOCUMENTS PAR TYPE\n\n'
markdown += f"- **Diagnostic Reports:** {report['summary']['diagnosticReports']}\n"
markdown += f"- **Suggestions:** {report['summary']['suggestions']}\n"
markdown += f"- **Forum Posts:** {report['summary']['forumPosts']}\n"
markdown += f"- **Technical Info:** {report['summary']['technicalInfo']}\n\n"

markdown += '## 🏭 MANUFACTURER IDs TROUVÉS\n\n'
if report['manufacturerNames']:
    markdown += '```\n'
    markdown += '\n'.join(report['manufacturerNames'])
    markdown += '\n```\n\n'
else:
    markdown += '*Aucun manufacturer ID trouvé*\n\n'

markdown += '## 📱 MODEL IDs TROUVÉS\n\n'
if report['modelIds']:
    markdown += '```\n'
    markdown += ', '.join(report['modelIds'])
    markdown += '\n```\n\n'
else:
    markdown += '*Aucun model ID trouvé*\n\n'

markdown += '## 🔧 CLUSTERS TROUVÉS\n\n'
if report['clusters']:
    markdown += '```\n'
    markdown += ', '.join([f'0x{c}' for c in report['clusters']])
    markdown += '\n```\n\n'
else:
    markdown += '*Aucun cluster trouvé*\n\n'

markdown += '## 📊 DATAPOINTS TROUVÉS\n\n'
if report['datapoints']:
    markdown += '```\n'
    markdown += ', '.join(report['datapoints'])
    markdown += '\n```\n\n'
else:
    markdown += '*Aucun datapoint trouvé*\n\n'

markdown += '## 📝 DÉTAILS PAR DOCUMENT\n\n'
for r in results:
    markdown += f"### {r['filename']}\n\n"
    markdown += f"**Type:** {r['type']}\n\n"
    if r['deviceId']:
        markdown += f"**Device ID:** `{r['deviceId']}`\n\n"
    if r['manufacturerNames']:
        markdown += f"**Manufacturer Names:** {', '.join(r['manufacturerNames'])}\n\n"
    if r['modelIds']:
        markdown += f"**Model IDs:** {', '.join(r['modelIds'])}\n\n"
    if r['clusters']:
        markdown += f"**Clusters:** {', '.join([f'0x{c}' for c in r['clusters']])}\n\n"
    if r['datapoints']:
        markdown += f"**Datapoints:** {', '.join(r['datapoints'])}\n\n"
    if r['battery'] is not None:
        markdown += f"**Battery:** {r['battery']}%\n\n"
    markdown += '---\n\n'

markdown_file = output_dir / 'COMPLETE_PDF_ANALYSIS.md'
with open(markdown_file, 'w', encoding='utf-8') as f:
    f.write(markdown)

print('\n📊 RAPPORT FINAL:\n')
print(f"✅ PDFs traités: {report['summary']['processedPdfs']}/{report['summary']['totalPdfs']}")
print(f"❌ Erreurs: {report['summary']['errors']}")
print(f"📦 Manufacturer IDs: {report['summary']['manufacturerNamesFound']}")
print(f"📱 Model IDs: {report['summary']['modelIdsFound']}")
print(f"🔧 Clusters: {report['summary']['clustersFound']}")
print(f"📊 Datapoints: {report['summary']['datapointsFound']}")
print('')
print(f"📁 Résultats sauvegardés dans: {output_dir}")
print(f"📄 Rapport: {markdown_file}")
print('')
print('✨ TRAITEMENT TERMINÉ!')
