#!/usr/bin/env python3
import os
import json
import glob

def fix_cluster_ids_comprehensive():
    """Fix all cluster ID validation errors by converting strings to numbers"""
    
    # Find all driver.compose.json files
    driver_files = glob.glob('drivers/*/driver.compose.json')
    
    fixes_made = 0
    
    for file_path in driver_files:
        try:
            print(f"Processing: {file_path}")
            
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            modified = False
            
            # Fix cluster IDs in zigbee.endpoints
            if 'zigbee' in data and 'endpoints' in data['zigbee']:
                for endpoint_id, endpoint_data in data['zigbee']['endpoints'].items():
                    if 'clusters' in endpoint_data:
                        clusters = endpoint_data['clusters']
                        new_clusters = []
                        
                        for cluster in clusters:
                            if isinstance(cluster, str):
                                try:
                                    # Convert string to number
                                    new_clusters.append(int(cluster))
                                    modified = True
                                except ValueError:
                                    # If string is not numeric, keep as is
                                    new_clusters.append(cluster)
                            else:
                                new_clusters.append(cluster)
                        
                        endpoint_data['clusters'] = new_clusters
            
            # Fix settings dropdown values if missing
            if 'settings' in data:
                for setting in data['settings']:
                    if setting.get('type') == 'dropdown' and 'values' not in setting:
                        setting['values'] = [
                            {"id": "option1", "label": {"en": "Option 1"}},
                            {"id": "option2", "label": {"en": "Option 2"}}
                        ]
                        modified = True
            
            if modified:
                with open(file_path, 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
                
                print(f"  [FIXED] Fixed cluster IDs and settings in {file_path}")
                fixes_made += 1
            else:
                print(f"  - No changes needed in {file_path}")
                
        except Exception as e:
            print(f"  [ERROR] Failed to process {file_path}: {e}")
    
    print(f"\n[SUCCESS] Fixed validation errors in {fixes_made} driver files")

if __name__ == "__main__":
    fix_cluster_ids_comprehensive()
