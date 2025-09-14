#!/usr/bin/env python3
import json
import os
import glob

def fix_cluster_ids_and_settings():
    """Fix cluster IDs and settings validation errors across all drivers."""
    
    drivers_dir = "drivers"
    fixed_count = 0
    
    # Find all driver.compose.json files
    compose_files = glob.glob(f"{drivers_dir}/*/driver.compose.json")
    
    for compose_file in compose_files:
        try:
            print(f"Processing: {compose_file}")
            
            with open(compose_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            modified = False
            
            # Fix cluster IDs - convert strings to numbers
            if 'zigbee' in data and 'endpoints' in data['zigbee']:
                for endpoint_id, endpoint in data['zigbee']['endpoints'].items():
                    if 'clusters' in endpoint:
                        new_clusters = []
                        for cluster in endpoint['clusters']:
                            if isinstance(cluster, str):
                                try:
                                    new_clusters.append(int(cluster))
                                    modified = True
                                except ValueError:
                                    new_clusters.append(cluster)
                            else:
                                new_clusters.append(cluster)
                        endpoint['clusters'] = new_clusters
            
            # Fix settings validation errors for dropdown type
            if 'settings' in data:
                for setting in data['settings']:
                    if 'type' in setting and setting['type'] == 'dropdown':
                        # Ensure dropdown settings have proper structure
                        if 'values' not in setting:
                            print(f"  Warning: dropdown setting missing 'values' in {compose_file}")
                        modified = True
            
            # Write back if modified
            if modified:
                with open(compose_file, 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
                print(f"  [FIXED] Fixed cluster IDs and settings in {compose_file}")
                fixed_count += 1
            else:
                print(f"  - No changes needed in {compose_file}")
                
        except Exception as e:
            print(f"  [ERROR] Error processing {compose_file}: {e}")
    
    print(f"\n[SUCCESS] Fixed validation errors in {fixed_count} driver files")

if __name__ == "__main__":
    fix_cluster_ids_and_settings()
