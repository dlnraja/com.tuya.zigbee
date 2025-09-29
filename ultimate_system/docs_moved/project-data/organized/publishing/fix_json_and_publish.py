import json
import subprocess
import os
from pathlib import Path

def fix_json_and_update():
    """Corrige le JSON et met à jour la version"""
    
    # Lire et nettoyer le JSON (enlever BOM)
    with open('.homeycompose/app.json', 'rb') as f:
        content = f.read()
    
    # Enlever BOM UTF-8 si présent
    if content.startswith(b'\xef\xbb\xbf'):
        content = content[3:]
    
    # Parser et mettre à jour
    app_data = json.loads(content.decode('utf-8'))
    
    # Nouvelle version
    version_parts = app_data['version'].split('.')
    version_parts[2] = str(int(version_parts[2]) + 1)
    new_version = '.'.join(version_parts)
    app_data['version'] = new_version
    
    # Réécrire proprement
    with open('.homeycompose/app.json', 'w', encoding='utf-8') as f:
        json.dump(app_data, f, indent=2, ensure_ascii=False)
    
    print(f"JSON corrige - Version: {new_version}")
    return new_version

def create_changelog(version):
    """Crée changelog pour cette version"""
    return f"""v{version}: Professional Device Categorization Complete

DEVICE REORGANIZATION:
- All drivers renamed to professional categories: motion_sensor, contact_sensor, smart_light, smart_plug
- Removed all manufacturer prefixes for clean professional structure  
- Organized by device function following Johan Benz standards
- SDK3 compliant architecture with proper endpoints

SUPPORTED CATEGORIES:
SENSORS: motion_sensor, contact_sensor, temperature_humidity_sensor, presence_sensor, multisensor
DETECTORS: air_quality_sensor, co_detector, smoke_detector, water_leak_detector
LIGHTS: smart_light, rgb_light, light_switch, dimmer_switch  
PLUGS: smart_plug, energy_plug
MOTORS: curtain_motor
CLIMATE: thermostat
SWITCHES: scene_switch

FEATURES:
- 850+ device models from 50+ manufacturers
- Local Zigbee 3.0 operation, zero cloud dependencies
- Enhanced metadata and professional descriptions
- Comprehensive manufacturer compatibility

BRANDS: Tuya, Aqara, IKEA, Philips Hue, Xiaomi, Sonoff, Blitzwolf, Lidl, and 40+ more

Professional unbranded structure ready for App Store"""

def automated_publish():
    """Publication entièrement automatisée"""
    
    print("PUBLICATION AUTOMATISEE CORRIGEE")
    print("=" * 40)
    
    # Correction et mise à jour
    version = fix_json_and_update()
    changelog = create_changelog(version)
    
    # Nettoyage cache
    if os.path.exists('.homeybuild'):
        import shutil
        shutil.rmtree('.homeybuild')
    
    # Validation d'abord
    print("Validation...")
    try:
        result = subprocess.run("homey app validate --level publish", 
                              shell=True, capture_output=True, text=True, timeout=60)
        if result.returncode != 0:
            print(f"Validation echouee: {result.stdout} {result.stderr}")
            return False, version
        else:
            print("Validation OK")
    except:
        print("Validation timeout ou erreur")
        return False, version
    
    # Publication avec réponses
    responses = [
        "y",           # Uncommitted changes
        "n",           # Version (déjà mise à jour)
        changelog,     # Changelog complet
        "",            # Fin changelog
        "",            # Ligne vide
        "y",           # Confirmations
        "yes",         # Format alternatif
        "Y"            # Majuscule
    ]
    
    input_file = "final_responses.txt"
    with open(input_file, 'w', encoding='utf-8') as f:
        for response in responses:
            f.write(response + "\n")
    
    print("Publication en cours...")
    try:
        # Méthode CMD robuste
        result = subprocess.run(
            f'type "{input_file}" | homey app publish',
            shell=True,
            capture_output=True,
            text=True,
            timeout=300
        )
        
        output = result.stdout + result.stderr
        print("Sortie publication:")
        print(output)
        
        # Vérification succès
        success_keywords = ['published', 'uploaded', 'success', 'complete', 'build uploaded']
        success = any(keyword in output.lower() for keyword in success_keywords)
        
        if success:
            print("*** PUBLICATION REUSSIE! ***")
        else:
            print("Publication partielle - verifiez dashboard")
        
        return success, version
        
    except Exception as e:
        print(f"Erreur publication: {e}")
        return False, version
    
    finally:
        if os.path.exists(input_file):
            os.remove(input_file)

def verify_dashboard():
    """Vérifie le dashboard"""
    try:
        result = subprocess.run("homey app manage", shell=True, 
                              capture_output=True, text=True, timeout=30)
        return "developer.homey.app" in result.stdout
    except:
        return False

def main():
    """Processus complet automatisé"""
    
    print("CORRECTION ET PUBLICATION AUTOMATIQUE COMPLETE")
    print("=" * 50)
    
    success, version = automated_publish()
    
    if success:
        print(f"\nSUCCES! Ultimate Zigbee Hub v{version} publie")
        
        if verify_dashboard():
            print("Dashboard accessible - verifiez la version")
        
        print("Publication automatique terminee avec succes!")
    else:
        print(f"\nPublication incomplete - v{version}")
        print("Verifiez manuellement le dashboard Homey")
    
    return success

if __name__ == "__main__":
    main()
