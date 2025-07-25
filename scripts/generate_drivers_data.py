import os
import json

# Dossiers à scanner
DRIVERS_DIRS = {
    'sdk3': 'drivers/sdk3',
    'in_progress': 'drivers/in_progress',
    'legacy': 'drivers/legacy'
}

# Fichier de sortie
OUTPUT_FILE = 'dashboard/drivers_data.json'

# Langues supportées
LANGS = ['fr', 'en', 'ta', 'nl']

def extract_driver_metadata(driver_path, status):
    compose_path = os.path.join(driver_path, 'driver.compose.json')
    if not os.path.isfile(compose_path):
        return None
    try:
        with open(compose_path, encoding='utf-8-sig') as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        print(f"⚠️ Erreur JSON dans {compose_path}: {e}")
        return None
    except Exception as e:
        print(f"❌ Erreur lecture {compose_path}: {e}")
        return None
    # Nom multilingue
    name_data = data.get('name', {})
    if isinstance(name_data, str):
        name = {lang: name_data for lang in LANGS}
    else:
        name = {lang: name_data.get(lang, name_data.get('en', '')) for lang in LANGS}
    # Instruction multilingue
    zigbee_data = data.get('zigbee', {})
    learnmode_data = zigbee_data.get('learnmode', {})
    instruction_data = learnmode_data.get('instruction', {})
    if isinstance(instruction_data, str):
        instruction = {lang: instruction_data for lang in LANGS}
    else:
        instruction = {lang: instruction_data.get(lang, instruction_data.get('en', '')) for lang in LANGS}
    # Fabricant(s)
    manufacturers = data.get('zigbee', {}).get('manufacturerName', [])
    # Modèle(s)
    models = data.get('zigbee', {}).get('productId', [])
    # Classe/catégorie
    category = data.get('class', '')
    # Capacités principales
    capabilities = data.get('capabilities', [])
    # Image/icône
    image = data.get('images', {}).get('large', '')
    # Statut
    driver_status = status
    # ID
    driver_id = data.get('id', os.path.basename(driver_path))
    return {
        'id': driver_id,
        'name': name,
        'category': category,
        'manufacturers': manufacturers,
        'models': models,
        'capabilities': capabilities,
        'status': driver_status,
        'instruction': instruction,
        'image': image
    }

def main():
    all_drivers = []
    for status, base_dir in DRIVERS_DIRS.items():
        if not os.path.isdir(base_dir):
            continue
        for driver in os.listdir(base_dir):
            driver_path = os.path.join(base_dir, driver)
            if os.path.isdir(driver_path):
                meta = extract_driver_metadata(driver_path, status)
                if meta:
                    all_drivers.append(meta)
    # Organisation par catégorie
    categorized = {}
    for driver in all_drivers:
        cat = driver['category'] or 'autre'
        if cat not in categorized:
            categorized[cat] = []
        categorized[cat].append(driver)
    # Sauvegarde
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump({'categories': categorized, 'all': all_drivers}, f, ensure_ascii=False, indent=2)
    print(f"✅ Fichier généré : {OUTPUT_FILE} ({len(all_drivers)} drivers)")

if __name__ == '__main__':
    main() 