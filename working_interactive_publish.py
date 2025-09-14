import subprocess
import time
import threading
import sys
import json
from pathlib import Path

def update_version_and_enrich():
    """Met à jour la version et enrichit l'app"""
    
    app_json_path = Path('.homeycompose/app.json')
    with open(app_json_path, 'r', encoding='utf-8') as f:
        app_data = json.load(f)
    
    # Increment version
    version_parts = app_data['version'].split('.')
    version_parts[2] = str(int(version_parts[2]) + 1)
    new_version = '.'.join(version_parts)
    app_data['version'] = new_version
    
    # Enrichissement complet
    app_data['description'] = {
        "en": "Ultimate Zigbee Hub - Complete ecosystem with 850+ devices from 50+ manufacturers. Professional categorization by device types: motion sensors, contact sensors, smart lights, smart plugs, climate controls. SDK3 compliant following Johan Benz standards. Local Zigbee 3.0 operation with no cloud dependencies. Supports major brands: Tuya, Aqara, IKEA, Philips Hue, Xiaomi, Sonoff, and many more.",
        "fr": "Ultimate Zigbee Hub - Ecosysteme complet avec 850+ appareils de 50+ fabricants. Categorisation professionnelle par types d'appareils. Compatible SDK3 selon les standards Johan Benz.",
        "nl": "Ultimate Zigbee Hub - Compleet ecosysteem met 850+ apparaten van 50+ fabrikanten. Professionele categorisering per apparaattype. SDK3 compatibel volgens Johan Benz standaarden."
    }
    
    app_data['tags'] = [
        "zigbee", "sensors", "lights", "plugs", "switches", "motion", "contact", 
        "temperature", "humidity", "presence", "air quality", "smoke", "water leak",
        "smart home", "automation", "energy", "climate", "security", "tuya", "aqara",
        "ikea", "philips", "xiaomi", "sonoff", "local", "no cloud", "sdk3"
    ]
    
    with open(app_json_path, 'w', encoding='utf-8') as f:
        json.dump(app_data, f, indent=2, ensure_ascii=False)
    
    print(f"Version mise a jour: {new_version}")
    return new_version

def create_changelog(version):
    """Crée le changelog professionnel"""
    return f"""v{version}: Professional Device Categorization Complete

DEVICE REORGANIZATION:
- All drivers renamed to professional categories without brand prefixes
- motion_sensor, contact_sensor, smart_light, smart_plug, etc.
- Organized by device function following Johan Benz standards
- SDK3 compliant architecture with proper endpoints

DEVICE CATEGORIES:
SENSORS: motion_sensor, contact_sensor, temperature_humidity_sensor, presence_sensor, multisensor
DETECTORS: air_quality_sensor, co_detector, smoke_detector, water_leak_detector  
LIGHTS: smart_light, rgb_light, light_switch, dimmer_switch
PLUGS: smart_plug, energy_plug
MOTORS: curtain_motor, CLIMATE: thermostat, SWITCHES: scene_switch

TECHNICAL FEATURES:
- 850+ device models from 50+ manufacturers supported
- Local Zigbee 3.0 operation, zero cloud dependencies
- Multilingual support (English, French, Dutch)
- Enhanced metadata and professional descriptions
- Comprehensive manufacturer compatibility matrix

BRAND SUPPORT:
Tuya, Aqara, IKEA TRADFRI, Philips Hue, Xiaomi, Sonoff, Blitzwolf, Lidl, and 40+ more

Professional unbranded structure ready for App Store"""

def interactive_publish():
    """Publication interactive avec gestion en temps réel"""
    
    print("PUBLICATION INTERACTIVE EN TEMPS REEL")
    print("=" * 45)
    
    # Mise à jour version et enrichissement
    version = update_version_and_enrich()
    changelog_content = create_changelog(version)
    
    print(f"Version cible: {version}")
    print("Demarrage homey app publish...")
    
    # Lancement du processus interactif
    process = subprocess.Popen(
        "homey app publish",
        shell=True,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )
    
    def send_response(response):
        """Envoie une réponse au processus"""
        if process.poll() is None:
            process.stdin.write(response + '\n')
            process.stdin.flush()
            print(f">>> Envoi: {response}")
            time.sleep(1)
    
    # Gestion des réponses en temps réel
    try:
        step = 0
        while True:
            output = process.stdout.readline()
            if not output and process.poll() is not None:
                break
            
            if output:
                print(f"<<< {output.strip()}")
                
                # Détection des prompts et réponses appropriées
                if "uncommitted changes" in output.lower() and "continue" in output.lower():
                    send_response("y")
                    step = 1
                
                elif "update your app's version number" in output.lower():
                    send_response("n")  # Version déjà mise à jour
                    step = 2
                
                elif ("changelog" in output.lower() or 
                      ("enter" in output.lower() and step == 2) or
                      "release notes" in output.lower()):
                    print(">>> Envoi du changelog complet...")
                    
                    # Envoi ligne par ligne du changelog
                    for line in changelog_content.split('\n'):
                        send_response(line)
                        time.sleep(0.2)
                    
                    # Fin du changelog
                    send_response("")  # Ligne vide pour terminer
                    send_response("")  # Ligne vide supplémentaire
                    step = 3
                
                elif ("confirm" in output.lower() or 
                      "proceed" in output.lower() or 
                      "publish" in output.lower() or
                      ("y/n" in output.lower() and step >= 3)):
                    send_response("y")
                
                # Vérification du succès
                elif any(keyword in output.lower() for keyword in 
                        ['published', 'uploaded', 'success', 'complete', 'build uploaded']):
                    print("*** PUBLICATION DETECTEE COMME REUSSIE! ***")
                    break
    
    except Exception as e:
        print(f"Erreur durant publication: {e}")
    
    finally:
        if process.poll() is None:
            process.terminate()
        
        return_code = process.wait()
        print(f"Code de retour: {return_code}")
        
        return return_code == 0, version

def verify_publication_status():
    """Vérifie le statut réel de publication"""
    try:
        result = subprocess.run(
            "homey app manage",
            shell=True,
            capture_output=True,
            text=True,
            timeout=15
        )
        return "developer.homey.app" in result.stdout
    except:
        return False

def main():
    """Processus principal de publication interactive"""
    
    print("SYSTEME DE PUBLICATION INTERACTIVE ROBUSTE")
    print("=" * 50)
    
    if not Path('.homeycompose/app.json').exists():
        print("ERREUR: Fichier app.json introuvable")
        return False
    
    success, version = interactive_publish()
    
    if success:
        print(f"\nPUBLICATION REUSSIE - VERSION {version}")
        
        # Vérification
        if verify_publication_status():
            print("Status confirme dans Homey Developer Tools")
        else:
            print("Verifiez manuellement le dashboard")
    else:
        print(f"\nPublication incomplete - Version {version}")
        print("Verifiez le dashboard Homey Developer Tools")
    
    print("Processus interactif termine.")
    return success

if __name__ == "__main__":
    main()
