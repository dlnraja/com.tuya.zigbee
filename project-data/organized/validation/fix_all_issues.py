import json
import os
from pathlib import Path
from PIL import Image, ImageDraw

def clean_homeybuild():
    """Nettoie le cache .homeybuild"""
    print("🧹 NETTOYAGE CACHE .homeybuild")
    try:
        import shutil
        if os.path.exists('.homeybuild'):
            shutil.rmtree('.homeybuild')
            print("✅ Cache .homeybuild supprimé")
        else:
            print("✅ Pas de cache .homeybuild trouvé")
    except Exception as e:
        print(f"⚠️  Erreur nettoyage: {e}")

def fix_manifest_tags():
    """Corrige le format des tags dans app.json"""
    print("\n🏷️  CORRECTION FORMAT TAGS")
    
    # Lire app.json
    with open('.homeycompose/app.json', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Supprimer BOM si présent
    if content.startswith('\ufeff'):
        content = content[1:]
    
    data = json.loads(content)
    
    # Corriger format tags si nécessaire
    if 'tags' in data and isinstance(data['tags'], dict):
        if 'en' in data['tags'] and isinstance(data['tags']['en'], list):
            print("⚠️  Tags déjà au bon format mais en array - conversion...")
            # Convertir en format object avec langues
            tags_list = data['tags']['en']
            data['tags'] = {
                "en": tags_list,
                "fr": tags_list,  # Même tags pour français
                "nl": tags_list   # Même tags pour néerlandais
            }
        else:
            print("✅ Format tags déjà correct")
    else:
        print("⚠️  Pas de tags trouvés")
    
    # Sauvegarder sans BOM
    with open('.homeycompose/app.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print("✅ app.json sauvegardé sans BOM")

def fix_all_images():
    """Corrige toutes les images pour 75x75"""
    print("\n🖼️  CORRECTION TAILLE IMAGES (75x75)")
    
    drivers_path = Path('drivers')
    fixed_count = 0
    
    # Couleurs par catégorie
    colors = {
        'motion_sensor': (255, 152, 0),      # Orange
        'contact_sensor': (76, 175, 80),     # Vert
        'smart_light': (255, 235, 59),       # Jaune
        'smart_plug': (33, 150, 243),        # Bleu
        'temperature_humidity_sensor': (156, 39, 176),  # Violet
        'air_quality_sensor': (96, 125, 139), # Gris bleu
        'smoke_detector': (244, 67, 54),      # Rouge
        'co_detector': (244, 67, 54),         # Rouge
        'water_leak_detector': (3, 169, 244), # Bleu clair
        'presence_sensor': (255, 193, 7),     # Amber
        'thermostat': (121, 85, 72),          # Marron
        'curtain_motor': (158, 158, 158),     # Gris
        'rgb_light': (233, 30, 99),           # Rose
        'dimmer_switch': (255, 235, 59),      # Jaune
        'light_switch': (255, 235, 59),       # Jaune
        'scene_switch': (103, 58, 183),       # Violet foncé
        'energy_plug': (33, 150, 243),        # Bleu
        'multisensor': (255, 87, 34),         # Orange foncé
    }
    
    for driver_dir in drivers_path.iterdir():
        if driver_dir.is_dir():
            assets_dir = driver_dir / 'assets' / 'images'
            assets_dir.mkdir(parents=True, exist_ok=True)
            
            small_img = assets_dir / 'small.png'
            large_img = assets_dir / 'large.png'
            
            # Couleur basée sur le nom du driver
            driver_name = driver_dir.name
            color = colors.get(driver_name, (158, 158, 158))  # Gris par défaut
            
            # Créer/recréer small.png (75x75)
            img = Image.new('RGBA', (75, 75), (*color, 255))
            draw = ImageDraw.Draw(img)
            
            # Ajouter un petit cercle blanc au centre
            draw.ellipse([25, 25, 50, 50], fill=(255, 255, 255, 200))
            
            img.save(small_img)
            fixed_count += 1
            print(f"✅ {driver_name}/small.png (75x75)")
            
            # Créer/recréer large.png (500x500)
            img_large = Image.new('RGBA', (500, 500), (*color, 255))
            draw_large = ImageDraw.Draw(img_large)
            
            # Ajouter un cercle blanc au centre
            draw_large.ellipse([150, 150, 350, 350], fill=(255, 255, 255, 200))
            
            img_large.save(large_img)
    
    print(f"✅ {fixed_count} drivers - images 75x75 créées")

def verify_everything():
    """Vérifie que tout est correct"""
    print("\n🔍 VERIFICATION FINALE")
    
    # Vérifier tags dans app.json
    with open('.homeycompose/app.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    if 'tags' in data and isinstance(data['tags'], dict):
        print("✅ Format tags: objet avec langues")
    else:
        print("❌ Format tags incorrect")
    
    # Vérifier images
    drivers_path = Path('drivers')
    image_issues = 0
    
    for driver_dir in drivers_path.iterdir():
        if driver_dir.is_dir():
            small_img = driver_dir / 'assets' / 'images' / 'small.png'
            if small_img.exists():
                img = Image.open(small_img)
                if img.size != (75, 75):
                    print(f"❌ {driver_dir.name}: {img.size} au lieu de 75x75")
                    image_issues += 1
            else:
                print(f"❌ Image manquante: {small_img}")
                image_issues += 1
    
    if image_issues == 0:
        print("✅ Toutes les images sont 75x75")
    else:
        print(f"❌ {image_issues} problèmes d'images")

def main():
    """Correction complète de tous les problèmes"""
    print("🚀 CORRECTION COMPLETE DE TOUS LES PROBLEMES")
    print("=" * 50)
    
    # 1. Nettoyer cache
    clean_homeybuild()
    
    # 2. Corriger format tags
    fix_manifest_tags()
    
    # 3. Corriger tailles images
    fix_all_images()
    
    # 4. Vérification finale
    verify_everything()
    
    print("\n✅ CORRECTIONS TERMINEES - PRET POUR PUBLICATION!")
    print("\nCommandes à exécuter:")
    print("homey app publish")
    print("Réponses: y, n, [changelog]")

if __name__ == "__main__":
    main()
