#!/usr/bin/env python3
import os
import json
import glob

def fix_battery_energy_arrays():
    """Add energy.batteries arrays to drivers with measure_battery capability"""
    
    # Find all driver.compose.json files
    driver_files = glob.glob('drivers/*/driver.compose.json')
    
    fixes_made = 0
    
    for file_path in driver_files:
        try:
            print(f"Processing: {file_path}")
            
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            modified = False
            
            # Check if driver has measure_battery capability
            if 'capabilities' in data and 'measure_battery' in data['capabilities']:
                # Check if energy.batteries array exists
                if 'energy' not in data:
                    data['energy'] = {}
                    modified = True
                
                if 'batteries' not in data['energy']:
                    data['energy']['batteries'] = ["CR2032", "AA"]
                    modified = True
                    print(f"  - Added energy.batteries array")
            
            if modified:
                with open(file_path, 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
                
                print(f"  [FIXED] Added energy.batteries to {file_path}")
                fixes_made += 1
            else:
                print(f"  - No battery energy changes needed in {file_path}")
                
        except Exception as e:
            print(f"  [ERROR] Failed to process {file_path}: {e}")
    
    print(f"\n[SUCCESS] Added energy.batteries arrays to {fixes_made} driver files")

if __name__ == "__main__":
    fix_battery_energy_arrays()
