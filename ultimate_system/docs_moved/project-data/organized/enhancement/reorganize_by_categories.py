import os
import shutil
import json
from pathlib import Path

# Mapping des drivers actuels vers les nouvelles catégories
category_mapping = {
    # SENSORS
    'tuya_motion_sensor': 'motion_sensor',
    'tuya_door_window_sensor': 'contact_sensor', 
    'tuya_temperature_humidity_sensor': 'temperature_humidity_sensor',
    'tuya_presence_illuminance_sensor': 'presence_sensor',
    'tuya_radar_sensor': 'presence_sensor',
    'tuya_air_quality_sensor': 'air_quality_sensor',
    'tuya_co_detector': 'co_detector',
    'tuya_smoke_sensor': 'smoke_detector',
    'tuya_water_leak_sensor': 'water_leak_detector',
    'hobeian_multisensor': 'multisensor',
    
    # LIGHTS
    'tuya_smart_light': 'smart_light',
    'tuya_rgb_controller': 'rgb_light',
    'tuya_light_switch': 'light_switch',
    'tuya_dimmer_switch': 'dimmer_switch',
    
    # PLUGS & ENERGY
    'tuya_smart_plug': 'smart_plug',
    'tuya_energy_plug': 'energy_plug',
    
    # COVERS & MOTORS
    'tuya_curtain_motor': 'curtain_motor',
    
    # CLIMATE
    'tuya_thermostat': 'thermostat',
    
    # SWITCHES
    'tuya_scene_switch': 'scene_switch'
}

def reorganize_drivers():
    drivers_path = Path('drivers')
    
    print("REORGANISATION COMPLETE PAR CATEGORIES")
    print("=" * 50)
    
    for old_name, new_name in category_mapping.items():
        old_path = drivers_path / old_name
        new_path = drivers_path / new_name
        
        if old_path.exists():
            print(f"-> {old_name} --> {new_name}")
            
            # Renommer le dossier
            if new_path.exists():
                shutil.rmtree(new_path)
            old_path.rename(new_path)
            
            # Mettre à jour driver.compose.json
            compose_file = new_path / 'driver.compose.json'
            if compose_file.exists():
                with open(compose_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                data['id'] = new_name
                with open(compose_file, 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
            
            print(f"   OK: Renomme et configure")
    
    print(f"\nREORGANISATION TERMINEE")
    print(f"Total: {len(category_mapping)} drivers organises par categories")

if __name__ == "__main__":
    reorganize_drivers()
