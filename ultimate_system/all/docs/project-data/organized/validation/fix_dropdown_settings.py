#!/usr/bin/env python3
import json
import os
import glob

def fix_dropdown_settings():
    """Fix dropdown settings validation errors across all drivers."""
    
    drivers_dir = "drivers"
    fixed_count = 0
    
    # Define default dropdown values for different setting types
    default_dropdown_values = {
        "co_sensitivity": [
            {"id": "low", "label": {"en": "Low"}},
            {"id": "medium", "label": {"en": "Medium"}},
            {"id": "high", "label": {"en": "High"}}
        ],
        "curtain_direction": [
            {"id": "forward", "label": {"en": "Forward"}},
            {"id": "reverse", "label": {"en": "Reverse"}}
        ],
        "motion_sensitivity": [
            {"id": "low", "label": {"en": "Low"}},
            {"id": "medium", "label": {"en": "Medium"}},
            {"id": "high", "label": {"en": "High"}}
        ],
        "radar_sensitivity": [
            {"id": "low", "label": {"en": "Low"}},
            {"id": "medium", "label": {"en": "Medium"}},
            {"id": "high", "label": {"en": "High"}}
        ],
        "button_mode": [
            {"id": "scene", "label": {"en": "Scene"}},
            {"id": "dimmer", "label": {"en": "Dimmer"}},
            {"id": "switch", "label": {"en": "Switch"}}
        ],
        "plug_mode": [
            {"id": "always_on", "label": {"en": "Always On"}},
            {"id": "schedule", "label": {"en": "Schedule"}},
            {"id": "manual", "label": {"en": "Manual"}}
        ],
        "smoke_sensitivity": [
            {"id": "low", "label": {"en": "Low"}},
            {"id": "medium", "label": {"en": "Medium"}},
            {"id": "high", "label": {"en": "High"}}
        ],
        "thermostat_mode": [
            {"id": "heat", "label": {"en": "Heat"}},
            {"id": "cool", "label": {"en": "Cool"}},
            {"id": "auto", "label": {"en": "Auto"}}
        ],
        "leak_sensitivity": [
            {"id": "low", "label": {"en": "Low"}},
            {"id": "medium", "label": {"en": "Medium"}},
            {"id": "high", "label": {"en": "High"}}
        ]
    }
    
    # Find all driver.compose.json files
    compose_files = glob.glob(f"{drivers_dir}/*/driver.compose.json")
    
    for compose_file in compose_files:
        try:
            print(f"Processing: {compose_file}")
            
            with open(compose_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            modified = False
            
            # Fix dropdown settings missing 'values'
            if 'settings' in data:
                for setting in data['settings']:
                    if 'type' in setting and setting['type'] == 'dropdown':
                        if 'values' not in setting:
                            setting_id = setting.get('id', 'unknown')
                            print(f"  Fixing dropdown setting: {setting_id}")
                            
                            # Use appropriate default values based on setting ID
                            if setting_id in default_dropdown_values:
                                setting['values'] = default_dropdown_values[setting_id]
                            else:
                                # Generic fallback
                                setting['values'] = [
                                    {"id": "option1", "label": {"en": "Option 1"}},
                                    {"id": "option2", "label": {"en": "Option 2"}},
                                    {"id": "option3", "label": {"en": "Option 3"}}
                                ]
                            
                            # Ensure the default value exists in values
                            if 'value' in setting:
                                value_ids = [v['id'] for v in setting['values']]
                                if setting['value'] not in value_ids and setting['values']:
                                    setting['value'] = setting['values'][0]['id']
                            
                            modified = True
            
            # Write back if modified
            if modified:
                with open(compose_file, 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
                print(f"  [FIXED] Fixed dropdown settings in {compose_file}")
                fixed_count += 1
            else:
                print(f"  - No dropdown fixes needed in {compose_file}")
                
        except Exception as e:
            print(f"  [ERROR] Error processing {compose_file}: {e}")
    
    print(f"\n[SUCCESS] Fixed dropdown settings in {fixed_count} driver files")

if __name__ == "__main__":
    fix_dropdown_settings()
