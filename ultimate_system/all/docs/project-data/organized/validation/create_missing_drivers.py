import json
import os
from pathlib import Path
from PIL import Image, ImageDraw

def create_scene_remote_drivers():
    """Crée les drivers scene remote manquants"""
    print("CREATION DRIVERS SCENE REMOTE MANQUANTS")
    print("=" * 40)
    
    # Créer répertoires et images pour 2gang et 4gang
    drivers = ['scene_remote_2gang', 'scene_remote_4gang']
    
    for driver in drivers:
        driver_path = Path(f'drivers/{driver}')
        assets_path = driver_path / 'assets' / 'images'
        assets_path.mkdir(parents=True, exist_ok=True)
        
        # Créer device.js basique
        device_js = f'''const {{ ZigBeeDevice }} = require('homey-zigbeedriver');

class SceneRemoteDevice extends ZigBeeDevice {{
  
  async onNodeInit() {{
    await super.onNodeInit();
    
    this.printNode();
    
    // Enable debugging
    this.enableDebug();
    
    // Register button capabilities
    {''.join([f'''
    if (this.hasCapability('button.{i}')) {{
      this.registerCapability('button.{i}', 'genOnOff', {{
        endpoint: {i}
      }});
    }}''' for i in range(1, 5 if '4gang' in driver else 3)])}
  }}
  
}}

module.exports = SceneRemoteDevice;
'''
        
        with open(driver_path / 'device.js', 'w', encoding='utf-8') as f:
            f.write(device_js)
        
        # Créer images 75x75 et 500x500
        # Couleur violette pour les remotes
        color = (103, 58, 183)
        
        # Small image (75x75)
        img_small = Image.new('RGBA', (75, 75), (*color, 255))
        draw_small = ImageDraw.Draw(img_small)
        
        # Dessiner boutons
        if '2gang' in driver:
            draw_small.rectangle([15, 20, 30, 35], fill=(255, 255, 255, 200))
            draw_small.rectangle([45, 20, 60, 35], fill=(255, 255, 255, 200))
        else:  # 4gang
            draw_small.rectangle([10, 15, 20, 25], fill=(255, 255, 255, 200))
            draw_small.rectangle([25, 15, 35, 25], fill=(255, 255, 255, 200))
            draw_small.rectangle([10, 30, 20, 40], fill=(255, 255, 255, 200))
            draw_small.rectangle([25, 30, 35, 40], fill=(255, 255, 255, 200))
        
        img_small.save(assets_path / 'small.png')
        
        # Large image (500x500)
        img_large = Image.new('RGBA', (500, 500), (*color, 255))
        draw_large = ImageDraw.Draw(img_large)
        
        # Dessiner cadre et boutons
        draw_large.rectangle([100, 100, 400, 400], outline=(255, 255, 255, 255), width=5)
        
        if '2gang' in driver:
            draw_large.rectangle([150, 180, 220, 220], fill=(255, 255, 255, 200))
            draw_large.rectangle([280, 180, 350, 220], fill=(255, 255, 255, 200))
        else:  # 4gang
            draw_large.rectangle([130, 150, 180, 180], fill=(255, 255, 255, 200))
            draw_large.rectangle([200, 150, 250, 180], fill=(255, 255, 255, 200))
            draw_large.rectangle([130, 200, 180, 230], fill=(255, 255, 255, 200))
            draw_large.rectangle([200, 200, 250, 230], fill=(255, 255, 255, 200))
        
        img_large.save(assets_path / 'large.png')
        
        print(f"Cree: {driver} avec images et device.js")

def verify_johan_bendz_compatibility():
    """Vérifie et ajoute les manufacturer IDs de Johan Bendz"""
    print("\nVERIFICATION COMPATIBILITE JOHAN BENDZ")
    print("=" * 38)
    
    # Liste étendue des manufacturer IDs de Johan Bendz
    johan_bendz_ids = {
        'scene_switch': [
            '_TZ3000_kjfzuycl', '_TZ3000_czuyt8lz', '_TZ3000_ee8s8jj2',
            '_TZ3000_wkai4ga5', '_TZ3000_dfgbtub0', '_TZ3000_xkap8wtb'
        ],
        'scene_remote_2gang': [
            '_TZ3000_dfgbtub0', '_TZ3000_czuyt8lz', '_TZ3000_ee8s8jj2'
        ],
        'scene_remote_4gang': [
            '_TZ3000_wkai4ga5', '_TZ3000_ee8s8jj2', '_TZ3000_czuyt8lz'
        ],
        'motion_sensor': [
            '_TZ3000_mmtwjmaq', '_TZ3040_bb6xaihh', '_TZ3000_otvn3lne'
        ],
        'contact_sensor': [
            '_TZ3000_n2egfsli', '_TZ3000_2mbfxlzr', '_TZ3000_26fmupbb'
        ]
    }
    
    updated_count = 0
    
    for driver_name, extra_ids in johan_bendz_ids.items():
        driver_path = Path(f'drivers/{driver_name}')
        compose_file = driver_path / 'driver.compose.json'
        
        if compose_file.exists():
            with open(compose_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Ajouter manufacturer IDs manquants
            current_ids = data.get('zigbee', {}).get('manufacturerName', [])
            
            for new_id in extra_ids:
                if new_id not in current_ids:
                    current_ids.append(new_id)
                    updated_count += 1
            
            data['zigbee']['manufacturerName'] = current_ids
            
            with open(compose_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            
            print(f"Mis a jour: {driver_name} ({len(current_ids)} IDs)")
    
    print(f"Total: {updated_count} nouveaux manufacturer IDs ajoutes")

def main():
    """Processus complet"""
    create_scene_remote_drivers()
    verify_johan_bendz_compatibility()
    print("\nDRIVERS SCENE REMOTE CREES ET COMPATIBILITE JOHAN BENDZ AJOUTEE")

if __name__ == "__main__":
    main()
