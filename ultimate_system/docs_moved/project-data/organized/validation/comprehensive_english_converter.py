#!/usr/bin/env python3
"""
Comprehensive English Converter for Ultimate Zigbee Hub
Converts all text, device names, and content to English
"""

import os
import json
import re
from pathlib import Path

class EnglishConverter:
    def __init__(self, project_path):
        self.project_path = Path(project_path)
        self.conversions = {
            # French to English translations
            'fr': {
                'capteur': 'sensor',
                'détecteur': 'detector', 
                'commutateur': 'switch',
                'éclairage': 'light',
                'prise': 'plug',
                'thermostat': 'thermostat',
                'moteur': 'motor',
                'rideau': 'curtain',
                'télécommande': 'remote',
                'scène': 'scene',
                'mouvement': 'motion',
                'présence': 'presence',
                'température': 'temperature',
                'humidité': 'humidity',
                'luminosité': 'brightness',
                'contact': 'contact',
                'fumée': 'smoke',
                'monoxyde': 'monoxide',
                'carbone': 'carbon',
                'fuite': 'leak',
                'eau': 'water',
                'air': 'air',
                'qualité': 'quality',
                'intelligent': 'smart',
                'variateur': 'dimmer',
                'énergie': 'energy',
                'multi': 'multi',
                'capteurs': 'sensors',
                'rgb': 'rgb',
                'gang': 'gang'
            },
            # Device name patterns
            'device_patterns': {
                r'tuya_(.+)': r'\1',  # Remove tuya_ prefix
                r'hobeian_(.+)': r'\1',  # Remove hobeian_ prefix
                r'_ts\d+[a-z]*': '',  # Remove TS model numbers
                r'capteur_(.+)': r'\1_sensor',
                r'detecteur_(.+)': r'\1_detector',
                r'commutateur_(.+)': r'\1_switch',
                r'prise_(.+)': r'\1_plug'
            },
            # Capability translations
            'capabilities': {
                'alarme_mouvement': 'alarm_motion',
                'alarme_contact': 'alarm_contact', 
                'alarme_fumee': 'alarm_smoke',
                'alarme_co': 'alarm_co',
                'alarme_eau': 'alarm_water',
                'mesure_temperature': 'measure_temperature',
                'mesure_humidite': 'measure_humidity',
                'mesure_luminosite': 'measure_luminance',
                'mesure_batterie': 'measure_battery',
                'mesure_puissance': 'measure_power',
                'compteur_energie': 'meter_power'
            }
        }
    
    def convert_json_file(self, file_path):
        """Convert JSON file content to English"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Convert French text patterns
            for fr_text, en_text in self.conversions['fr'].items():
                content = re.sub(fr_text, en_text, content, flags=re.IGNORECASE)
            
            # Convert capability names
            for fr_cap, en_cap in self.conversions['capabilities'].items():
                content = re.sub(f'"{fr_cap}"', f'"{en_cap}"', content)
            
            # Parse and reformat JSON
            try:
                data = json.loads(content)
                
                # Recursively convert dictionary values
                data = self._convert_dict_values(data)
                
                # Write back formatted JSON
                with open(file_path, 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
                
                return True, "Converted successfully"
                
            except json.JSONDecodeError:
                # If not valid JSON, just save the text conversions
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                return True, "Text converted (not JSON)"
                
        except Exception as e:
            return False, str(e)
    
    def _convert_dict_values(self, obj):
        """Recursively convert dictionary values to English"""
        if isinstance(obj, dict):
            converted = {}
            for key, value in obj.items():
                # Convert key if needed
                new_key = self._convert_text(key)
                converted[new_key] = self._convert_dict_values(value)
            return converted
        elif isinstance(obj, list):
            return [self._convert_dict_values(item) for item in obj]
        elif isinstance(obj, str):
            return self._convert_text(obj)
        else:
            return obj
    
    def _convert_text(self, text):
        """Convert individual text strings to English"""
        if not isinstance(text, str):
            return text
            
        converted = text
        
        # Apply French to English conversions
        for fr_text, en_text in self.conversions['fr'].items():
            converted = re.sub(r'\b' + fr_text + r'\b', en_text, converted, flags=re.IGNORECASE)
        
        # Apply device name pattern conversions
        for pattern, replacement in self.conversions['device_patterns'].items():
            converted = re.sub(pattern, replacement, converted)
        
        # Clean up multiple underscores and spaces
        converted = re.sub(r'_+', '_', converted)
        converted = re.sub(r'\s+', ' ', converted)
        converted = converted.strip('_').strip()
        
        return converted
    
    def convert_driver_names(self):
        """Convert driver directory names and references"""
        results = {
            'renamed_drivers': [],
            'updated_references': [],
            'errors': []
        }
        
        # Get list of current drivers
        drivers_path = self.project_path / "drivers"
        if not drivers_path.exists():
            results['errors'].append("Drivers directory not found")
            return results
        
        # Convert driver directory names
        for driver_dir in drivers_path.iterdir():
            if driver_dir.is_dir() and not driver_dir.name.startswith('.'):
                original_name = driver_dir.name
                converted_name = self._convert_text(original_name)
                
                if converted_name != original_name:
                    new_path = drivers_path / converted_name
                    
                    try:
                        # Rename directory
                        driver_dir.rename(new_path)
                        results['renamed_drivers'].append({
                            'from': original_name,
                            'to': converted_name
                        })
                        
                        # Update driver.compose.json references
                        compose_file = new_path / "driver.compose.json"
                        if compose_file.exists():
                            self.convert_json_file(compose_file)
                            results['updated_references'].append(str(compose_file))
                        
                    except Exception as e:
                        results['errors'].append(f"Failed to rename {original_name}: {str(e)}")
        
        return results
    
    def convert_all_json_files(self):
        """Convert all JSON files in the project"""
        results = {
            'converted_files': [],
            'errors': []
        }
        
        # Find all JSON files
        json_files = list(self.project_path.rglob("*.json"))
        
        for json_file in json_files:
            # Skip node_modules and .git directories
            if any(part.startswith('.') or part == 'node_modules' for part in json_file.parts):
                continue
            
            success, message = self.convert_json_file(json_file)
            
            if success:
                results['converted_files'].append({
                    'file': str(json_file.relative_to(self.project_path)),
                    'status': message
                })
            else:
                results['errors'].append({
                    'file': str(json_file.relative_to(self.project_path)),
                    'error': message
                })
        
        return results
    
    def create_english_locales(self):
        """Create comprehensive English locale files"""
        locales_dir = self.project_path / "locales"
        locales_dir.mkdir(exist_ok=True)
        
        # Enhanced English locale with comprehensive device support
        en_locale = {
            "settings": {
                "debug_logging": "Enable Debug Logging",
                "debug_logging_description": "Enable detailed logging for troubleshooting device issues",
                "auto_discovery": "Auto Device Discovery", 
                "auto_discovery_description": "Automatically discover and suggest drivers for new Zigbee devices",
                "polling_interval": "Polling Interval (seconds)",
                "polling_interval_description": "How often to poll devices for status updates",
                "batch_updates": "Batch Updates",
                "batch_updates_description": "Group multiple device updates to improve performance",
                "zigbee_channel": "Preferred Zigbee Channel",
                "zigbee_channel_description": "Set preferred Zigbee channel for new device pairing",
                "experimental_features": "Enable Experimental Features",
                "experimental_features_description": "Enable beta features and experimental device support"
            },
            "drivers": {
                "air_quality_sensor": {
                    "name": "Air Quality Sensor",
                    "description": "Monitor air quality with comprehensive environmental sensing",
                    "settings": {
                        "reporting_interval": "Reporting Interval (minutes)",
                        "air_quality_threshold": "Air Quality Alert Threshold"
                    }
                },
                "co_detector": {
                    "name": "Carbon Monoxide Detector", 
                    "description": "Detect dangerous carbon monoxide levels with instant alerts",
                    "settings": {
                        "sensitivity": "Detection Sensitivity",
                        "alarm_duration": "Alarm Duration (seconds)"
                    }
                },
                "contact_sensor": {
                    "name": "Contact Sensor",
                    "description": "Monitor door/window open/close status with magnetic detection",
                    "settings": {
                        "invert_contact": "Invert Contact State",
                        "tamper_detection": "Enable Tamper Detection"
                    }
                },
                "curtain_motor": {
                    "name": "Curtain Motor",
                    "description": "Smart motorized curtain control with position feedback",
                    "settings": {
                        "motor_speed": "Motor Speed",
                        "calibration_mode": "Calibration Mode"
                    }
                },
                "dimmer_switch": {
                    "name": "Dimmer Switch", 
                    "description": "Smart dimming control with smooth brightness adjustment",
                    "settings": {
                        "min_brightness": "Minimum Brightness (%)",
                        "fade_duration": "Fade Duration (seconds)"
                    }
                },
                "energy_plug": {
                    "name": "Energy Monitoring Smart Plug",
                    "description": "Smart plug with comprehensive energy monitoring and control",
                    "settings": {
                        "energy_reporting": "Energy Reporting Interval (minutes)", 
                        "overload_protection": "Overload Protection Threshold (W)"
                    }
                },
                "light_switch": {
                    "name": "Light Switch",
                    "description": "Smart wall switch for lighting control with scene support",
                    "settings": {
                        "switch_type": "Switch Type (momentary/toggle)",
                        "led_indicator": "LED Status Indicator"
                    }
                },
                "motion_sensor": {
                    "name": "Motion Sensor",
                    "description": "PIR motion detection with adjustable sensitivity and timeout",
                    "settings": {
                        "motion_sensitivity": "Motion Sensitivity",
                        "occupancy_timeout": "Occupancy Timeout (seconds)",
                        "pet_immunity": "Pet Immunity Mode"
                    }
                },
                "multisensor": {
                    "name": "Multi-Sensor",
                    "description": "All-in-one sensor with motion, temperature, humidity, and illuminance",
                    "settings": {
                        "motion_sensitivity": "Motion Sensitivity",
                        "temp_offset": "Temperature Offset (°C)",
                        "humidity_offset": "Humidity Offset (%)",
                        "illuminance_threshold": "Illuminance Threshold (lux)"
                    }
                },
                "presence_sensor": {
                    "name": "Presence Sensor",
                    "description": "Advanced presence detection with human activity monitoring",
                    "settings": {
                        "detection_range": "Detection Range (meters)",
                        "presence_timeout": "Presence Timeout (minutes)"
                    }
                },
                "rgb_light": {
                    "name": "RGB Light",
                    "description": "Color-changing LED light with full spectrum control",
                    "settings": {
                        "color_temperature_range": "Color Temperature Range",
                        "transition_time": "Color Transition Time (seconds)"
                    }
                },
                "scene_remote_2gang": {
                    "name": "2-Gang Scene Remote", 
                    "description": "Wireless 2-button scene controller with customizable actions",
                    "settings": {
                        "button_mode": "Button Mode (single/double/long press)",
                        "led_feedback": "LED Feedback on Press"
                    }
                },
                "scene_remote_4gang": {
                    "name": "4-Gang Scene Remote",
                    "description": "Wireless 4-button scene controller with advanced scene management",
                    "settings": {
                        "button_layout": "Button Layout Configuration", 
                        "scene_memory": "Scene Memory Slots"
                    }
                },
                "scene_switch": {
                    "name": "Scene Switch",
                    "description": "Smart scene switch with multiple scene activation modes",
                    "settings": {
                        "scene_count": "Available Scene Count",
                        "activation_method": "Scene Activation Method"
                    }
                },
                "smart_light": {
                    "name": "Smart Light",
                    "description": "Intelligent LED light with adaptive brightness and scheduling",
                    "settings": {
                        "adaptive_brightness": "Adaptive Brightness Mode",
                        "circadian_rhythm": "Circadian Rhythm Support"
                    }
                },
                "smart_plug": {
                    "name": "Smart Plug",
                    "description": "Wireless smart plug with remote control and scheduling",
                    "settings": {
                        "power_on_behavior": "Power-On Behavior",
                        "manual_override": "Manual Button Override"
                    }
                },
                "smoke_detector": {
                    "name": "Smoke Detector",
                    "description": "Fire safety smoke detection with instant emergency alerts",
                    "settings": {
                        "smoke_sensitivity": "Smoke Detection Sensitivity",
                        "test_mode": "Self-Test Mode Interval"
                    }
                },
                "temperature_humidity_sensor": {
                    "name": "Temperature & Humidity Sensor",
                    "description": "Precision environmental monitoring with data logging",
                    "settings": {
                        "temp_calibration": "Temperature Calibration Offset",
                        "humidity_calibration": "Humidity Calibration Offset",
                        "reporting_threshold": "Change Reporting Threshold"
                    }
                },
                "thermostat": {
                    "name": "Smart Thermostat",
                    "description": "Intelligent climate control with scheduling and energy optimization",
                    "settings": {
                        "heating_system": "Heating System Type",
                        "cooling_system": "Cooling System Type",
                        "eco_mode": "Energy Saving Mode",
                        "schedule_learning": "Adaptive Schedule Learning"
                    }
                },
                "water_leak_detector": {
                    "name": "Water Leak Detector",
                    "description": "Water damage prevention with instant leak detection and alerts",
                    "settings": {
                        "detection_sensitivity": "Water Detection Sensitivity",
                        "alarm_volume": "Alarm Volume Level",
                        "auto_shutoff": "Water Valve Auto-Shutoff"
                    }
                }
            },
            "flow": {
                "triggers": {
                    "motion_detected": "Motion detected",
                    "motion_cleared": "Motion cleared", 
                    "presence_detected": "Presence detected",
                    "presence_cleared": "Presence cleared",
                    "contact_opened": "Contact opened",
                    "contact_closed": "Contact closed",
                    "illuminance_changed": "Illuminance changed",
                    "temperature_changed": "Temperature changed",
                    "humidity_changed": "Humidity changed",
                    "water_leak_detected": "Water leak detected",
                    "smoke_detected": "Smoke detected",
                    "co_detected": "Carbon monoxide detected",
                    "air_quality_poor": "Poor air quality detected",
                    "button_pressed": "Button pressed",
                    "scene_activated": "Scene activated",
                    "power_changed": "Power consumption changed",
                    "energy_threshold": "Energy threshold reached"
                },
                "conditions": {
                    "is_motion_active": "Motion is active",
                    "is_presence_active": "Presence is active", 
                    "is_contact_open": "Contact is open",
                    "illuminance_above": "Illuminance is above",
                    "illuminance_below": "Illuminance is below",
                    "temperature_above": "Temperature is above",
                    "temperature_below": "Temperature is below",
                    "humidity_above": "Humidity is above",
                    "humidity_below": "Humidity is below",
                    "power_above": "Power consumption is above",
                    "is_device_online": "Device is online"
                },
                "actions": {
                    "turn_on_light": "Turn light on",
                    "turn_off_light": "Turn light off",
                    "set_brightness": "Set brightness level",
                    "set_color": "Set color",
                    "set_color_temperature": "Set color temperature", 
                    "set_sensitivity": "Set sensor sensitivity",
                    "activate_scene": "Activate scene",
                    "open_curtain": "Open curtain",
                    "close_curtain": "Close curtain",
                    "set_thermostat_target": "Set thermostat target temperature",
                    "enable_eco_mode": "Enable eco mode",
                    "send_notification": "Send notification",
                    "trigger_alarm": "Trigger alarm"
                }
            },
            "capabilities": {
                "alarm_motion": "Motion",
                "alarm_contact": "Contact", 
                "alarm_water": "Water Leak",
                "alarm_smoke": "Smoke",
                "alarm_co": "Carbon Monoxide",
                "alarm_generic": "Alarm",
                "measure_temperature": "Temperature",
                "measure_humidity": "Humidity", 
                "measure_luminance": "Illuminance",
                "measure_battery": "Battery",
                "measure_power": "Power",
                "measure_current": "Current",
                "measure_voltage": "Voltage",
                "meter_power": "Energy",
                "onoff": "Power",
                "dim": "Brightness",
                "light_hue": "Hue",
                "light_saturation": "Saturation",
                "light_temperature": "Color Temperature",
                "light_mode": "Light Mode",
                "windowcoverings_set": "Position",
                "windowcoverings_tilt_set": "Tilt",
                "target_temperature": "Target Temperature",
                "thermostat_mode": "Thermostat Mode"
            }
        }
        
        # Write English locale
        en_file = locales_dir / "en.json"
        with open(en_file, 'w', encoding='utf-8') as f:
            json.dump(en_locale, f, indent=2, ensure_ascii=False)
        
        return str(en_file)
    
    def run_full_conversion(self):
        """Run complete English conversion process"""
        results = {
            'driver_names': None,
            'json_files': None, 
            'locale_file': None,
            'summary': {
                'total_files_converted': 0,
                'total_drivers_renamed': 0,
                'errors': []
            }
        }
        
        print("Starting comprehensive English conversion...")
        
        # 1. Create English locales
        print("Creating English locale files...")
        results['locale_file'] = self.create_english_locales()
        
        # 2. Convert driver names
        print("Converting driver names...")
        results['driver_names'] = self.convert_driver_names()
        results['summary']['total_drivers_renamed'] = len(results['driver_names']['renamed_drivers'])
        results['summary']['errors'].extend(results['driver_names']['errors'])
        
        # 3. Convert all JSON files
        print("Converting JSON file content...")
        results['json_files'] = self.convert_all_json_files()
        results['summary']['total_files_converted'] = len(results['json_files']['converted_files'])
        results['summary']['errors'].extend([e['error'] for e in results['json_files']['errors']])
        
        # Save conversion report
        report_path = self.project_path / "english_conversion_report.json"
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        
        print(f"\nEnglish Conversion Complete!")
        print(f"Files converted: {results['summary']['total_files_converted']}")
        print(f"Drivers renamed: {results['summary']['total_drivers_renamed']}")
        print(f"Errors: {len(results['summary']['errors'])}")
        print(f"Report saved to: {report_path}")
        
        return results

def main():
    project_path = r"c:\Users\HP\Desktop\tuya_repair"
    converter = EnglishConverter(project_path)
    results = converter.run_full_conversion()
    
    if results['summary']['errors']:
        print("\nErrors encountered:")
        for error in results['summary']['errors'][:10]:  # Show first 10 errors
            print(f"  - {error}")

if __name__ == "__main__":
    main()
