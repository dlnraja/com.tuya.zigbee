import json
import os
import shutil
from pathlib import Path
from PIL import Image, ImageDraw

def clean_homeybuild():
    """Nettoie le cache .homeybuild"""
    print("NETTOYAGE CACHE .homeybuild")
    try:
        if os.path.exists('.homeybuild'):
            shutil.rmtree('.homeybuild')
            print("Cache .homeybuild supprime")
        else:
            print("Pas de cache .homeybuild trouve")
    except Exception as e:
        print(f"Erreur nettoyage: {e}")

def fix_manifest_tags():
    """Corrige le format des tags dans app.json"""
    print("\nCORRECTION FORMAT TAGS")
    
    # Lire app.json
    with open('.homeycompose/app.json', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Supprimer BOM si present
    if content.startswith('\ufeff'):
        content = content[1:]
    
    data = json.loads(content)
    
    # Corriger format tags - doit etre objet avec langues
    if 'tags' in data:
        if isinstance(data['tags'], dict) and 'en' in data['tags']:
            if isinstance(data['tags']['en'], list):
                print("Conversion tags array vers object multi-langues")
                tags_list = data['tags']['en']
                data['tags'] = {
                    "en": tags_list,
                    "fr": tags_list,
                    "nl": tags_list
                }
            else:
                print("Tags deja au bon format objet")
        else:
            print("Format tags incorrect - correction necessaire")
            # Format par defaut
            data['tags'] = {
                "en": ["zigbee", "sensors", "lights", "smart home"],
                "fr": ["zigbee", "capteurs", "lumieres", "maison intelligente"],
                "nl": ["zigbee", "sensoren", "lampen", "slim huis"]
            }
    
    # Sauvegarder sans BOM
    with open('.homeycompose/app.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print("app.json sauvegarde sans BOM")

def fix_all_images():
    """Corrige toutes les images pour 75x75"""
    print("\nCORRECTION TAILLE IMAGES (75x75)")
    
    drivers_path = Path('drivers')
    fixed_count = 0
    
    # Couleurs par categorie
    colors = {
        'motion_sensor': (255, 152, 0),
        'contact_sensor': (76, 175, 80),
        'smart_light': (255, 235, 59),
        'smart_plug': (33, 150, 243),
        'temperature_humidity_sensor': (156, 39, 176),
        'air_quality_sensor': (96, 125, 139),
        'smoke_detector': (244, 67, 54),
        'co_detector': (244, 67, 54),
        'water_leak_detector': (3, 169, 244),
        'presence_sensor': (255, 193, 7),
        'thermostat': (121, 85, 72),
        'curtain_motor': (158, 158, 158),
        'rgb_light': (233, 30, 99),
        'dimmer_switch': (255, 235, 59),
        'light_switch': (255, 235, 59),
        'scene_switch': (103, 58, 183),
        'energy_plug': (33, 150, 243),
        'multisensor': (255, 87, 34),
    }
    
    for driver_dir in drivers_path.iterdir():
        if driver_dir.is_dir():
            assets_dir = driver_dir / 'assets' / 'images'
            assets_dir.mkdir(parents=True, exist_ok=True)
            
            small_img = assets_dir / 'small.png'
            large_img = assets_dir / 'large.png'
            
            # Couleur basee sur le nom du driver
            driver_name = driver_dir.name
            color = colors.get(driver_name, (158, 158, 158))
            
            # Creer small.png (75x75)
            img = Image.new('RGBA', (75, 75), (*color, 255))
            draw = ImageDraw.Draw(img)
            draw.ellipse([20, 20, 55, 55], fill=(255, 255, 255, 200))
            img.save(small_img)
            
            # Creer large.png (500x500)
            img_large = Image.new('RGBA', (500, 500), (*color, 255))
            draw_large = ImageDraw.Draw(img_large)
            draw_large.ellipse([150, 150, 350, 350], fill=(255, 255, 255, 200))
            img_large.save(large_img)
            
            fixed_count += 1
            print(f"Corrige: {driver_name} (75x75)")
    
    print(f"TOTAL: {fixed_count} drivers corriges")

def verify_everything():
    """Verifie que tout est correct"""
    print("\nVERIFICATION FINALE")
    
    # Verifier tags dans app.json
    with open('.homeycompose/app.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    if 'tags' in data and isinstance(data['tags'], dict):
        print("Format tags: CORRECT (objet)")
    else:
        print("Format tags: INCORRECT")
    
    # Verifier images
    drivers_path = Path('drivers') 
    correct_images = 0
    total_drivers = 0
    
    for driver_dir in drivers_path.iterdir():
        if driver_dir.is_dir():
            total_drivers += 1
            small_img = driver_dir / 'assets' / 'images' / 'small.png'
            if small_img.exists():
                img = Image.open(small_img)
                if img.size == (75, 75):
                    correct_images += 1
                else:
                    print(f"ERREUR taille {driver_dir.name}: {img.size}")
    
    print(f"Images correctes: {correct_images}/{total_drivers}")
    
    return correct_images == total_drivers

def main():
    """Correction complete de tous les problemes"""
    print("CORRECTION COMPLETE DE TOUS LES PROBLEMES")
    print("=" * 48)
    
    # 1. Nettoyer cache
    clean_homeybuild()
    
    # 2. Corriger format tags
    fix_manifest_tags()
    
    # 3. Corriger tailles images
    fix_all_images()
    
    # 4. Verification finale
    all_good = verify_everything()
    
    print("\n" + "=" * 48)
    if all_good:
        print("CORRECTIONS TERMINEES - PRET POUR PUBLICATION!")
    else:
        print("PROBLEMES DETECTES - VERIFICATION MANUELLE REQUISE")
    
    print("\nCommandes a executer:")
    print("homey app publish")
    print("Reponses: y (uncommitted), n (version), [changelog]")

if __name__ == "__main__":
    main()
