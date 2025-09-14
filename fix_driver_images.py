import json
import os
from pathlib import Path

def fix_all_driver_images():
    """Corrige tous les chemins d'images dans les drivers renommés"""
    
    print("CORRECTION DES CHEMINS D'IMAGES DANS TOUS LES DRIVERS")
    print("=" * 55)
    
    drivers_path = Path('drivers')
    fixed_count = 0
    
    for driver_dir in drivers_path.iterdir():
        if driver_dir.is_dir():
            compose_file = driver_dir / 'driver.compose.json'
            
            if compose_file.exists():
                # Lire le fichier
                with open(compose_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                # Vérifier si images contient encore anciens chemins
                if 'images' in data:
                    old_small = data['images'].get('small', '')
                    old_large = data['images'].get('large', '')
                    
                    # Si contient "tuya_" dans le chemin, corriger
                    if 'tuya_' in old_small or 'tuya_' in old_large:
                        new_driver_name = driver_dir.name
                        
                        # Nouveaux chemins corrects
                        data['images']['small'] = f"/drivers/{new_driver_name}/assets/images/small.png"
                        data['images']['large'] = f"/drivers/{new_driver_name}/assets/images/large.png"
                        
                        # Sauvegarder
                        with open(compose_file, 'w', encoding='utf-8') as f:
                            json.dump(data, f, indent=2, ensure_ascii=False)
                        
                        print(f"Corrige: {new_driver_name}")
                        print(f"  Ancien: {old_small}")
                        print(f"  Nouveau: {data['images']['small']}")
                        fixed_count += 1
    
    print(f"\nCORRECTION TERMINEE: {fixed_count} drivers corriges")
    return fixed_count

def verify_all_images_exist():
    """Vérifie que tous les fichiers d'images existent"""
    
    print("\nVERIFICATION EXISTENCE DES IMAGES")
    print("=" * 35)
    
    drivers_path = Path('drivers')
    missing_images = []
    
    for driver_dir in drivers_path.iterdir():
        if driver_dir.is_dir():
            small_img = driver_dir / 'assets' / 'images' / 'small.png'
            large_img = driver_dir / 'assets' / 'images' / 'large.png'
            
            if not small_img.exists():
                missing_images.append(str(small_img))
                print(f"MANQUE: {small_img}")
            
            if not large_img.exists():
                missing_images.append(str(large_img))
                print(f"MANQUE: {large_img}")
    
    if not missing_images:
        print("TOUTES LES IMAGES EXISTENT!")
    else:
        print(f"\n{len(missing_images)} images manquantes trouvees")
    
    return missing_images

def create_missing_images():
    """Crée les images manquantes avec PIL"""
    
    try:
        from PIL import Image, ImageDraw
        
        print("\nCREATION DES IMAGES MANQUANTES")
        print("=" * 32)
        
        drivers_path = Path('drivers')
        created_count = 0
        
        # Couleurs par catégorie
        colors = {
            'motion_sensor': (255, 152, 0),      # Orange
            'contact_sensor': (76, 175, 80),     # Vert
            'smart_light': (255, 235, 59),       # Jaune
            'smart_plug': (33, 150, 243),        # Bleu
            'temperature_humidity_sensor': (156, 39, 176),  # Violet
            'air_quality_sensor': (96, 125, 139), # Gris bleu
            'smoke_detector': (244, 67, 54),      # Rouge
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
                
                # Créer small.png (75x75)
                if not small_img.exists():
                    img = Image.new('RGBA', (75, 75), (*color, 255))
                    img.save(small_img)
                    created_count += 1
                    print(f"Cree: {small_img}")
                
                # Créer large.png (500x500)
                if not large_img.exists():
                    img = Image.new('RGBA', (500, 500), (*color, 255))
                    img.save(large_img)
                    created_count += 1
                    print(f"Cree: {large_img}")
        
        print(f"\n{created_count} images creees avec succes")
        return True
        
    except ImportError:
        print("PIL non disponible - creation manuelle necessaire")
        return False

def main():
    """Processus complet de correction"""
    
    print("CORRECTION COMPLETE DES CHEMINS ET IMAGES")
    print("=" * 45)
    
    # 1. Corriger les chemins dans driver.compose.json
    fixed_drivers = fix_all_driver_images()
    
    # 2. Vérifier les images manquantes
    missing = verify_all_images_exist()
    
    # 3. Créer les images manquantes si possible
    if missing:
        create_missing_images()
        
        # Re-vérifier
        remaining = verify_all_images_exist()
        if not remaining:
            print("\nTOUTES LES IMAGES SONT MAINTENANT PRESENTES!")
    
    print(f"\nCORRECTION TERMINEE:")
    print(f"- {fixed_drivers} drivers corriges")
    print(f"- Images verifiees et creees si necessaire")
    print("\nPret pour publication!")

if __name__ == "__main__":
    main()
