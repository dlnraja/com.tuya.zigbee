#!/usr/bin/env python3
import json
import os
import glob
from datetime import datetime

class ExistingDriverUpdater:
    def __init__(self):
        self.scraped_db_path = 'data/enhanced_sources/enhanced_device_database.json'
        self.drivers_dir = 'drivers'
        self.updated_drivers = []
        
        # Load scraped device database
        with open(self.scraped_db_path, 'r', encoding='utf-8') as f:
            self.device_db = json.load(f)
    
    def find_existing_drivers(self):
        """Find all existing driver.compose.json files"""
        driver_files = []
        for root, dirs, files in os.walk(self.drivers_dir):
            if 'driver.compose.json' in files:
                driver_files.append(os.path.join(root, 'driver.compose.json'))
        return driver_files
    
    def update_driver_with_community_data(self, driver_path):
        """Update existing driver with community data"""
        try:
            with open(driver_path, 'r', encoding='utf-8') as f:
                driver_data = json.load(f)
            
            driver_name = driver_data.get('name', {}).get('en', '')
            driver_id = driver_data.get('id', '')
            
            # Find matching device in scraped database
            matching_device = self.find_matching_device(driver_name, driver_id)
            
            if matching_device:
                print(f"Updating driver: {driver_name}")
                
                # Update manufacturerName and productId if available
                if 'zigbee_info' in matching_device:
                    zigbee_info = matching_device['zigbee_info']
                    
                    if 'manufacturerName' in zigbee_info:
                        driver_data['zigbee']['manufacturerName'] = zigbee_info['manufacturerName']
                    
                    if 'productId' in zigbee_info:
                        driver_data['zigbee']['productId'] = zigbee_info['productId']
                
                # Add enhanced capabilities if not present
                if 'capabilities' in matching_device:
                    existing_caps = set(driver_data.get('capabilities', []))
                    new_caps = set(matching_device['capabilities'])
                    
                    # Add new capabilities that don't exist
                    additional_caps = new_caps - existing_caps
                    if additional_caps:
                        driver_data['capabilities'].extend(list(additional_caps))
                        print(f"  Added capabilities: {list(additional_caps)}")
                
                # Ensure energy.batteries is present for battery devices
                if 'measure_battery' in driver_data.get('capabilities', []):
                    if 'energy' not in driver_data:
                        driver_data['energy'] = {}
                    if 'batteries' not in driver_data['energy']:
                        driver_data['energy']['batteries'] = ["CR2032", "AA"]
                        print(f"  Added energy.batteries array")
                
                # Fix numeric cluster IDs
                self.fix_cluster_ids(driver_data)
                
                # Write updated driver
                with open(driver_path, 'w', encoding='utf-8') as f:
                    json.dump(driver_data, f, indent=2, ensure_ascii=False)
                
                self.updated_drivers.append({
                    'driver_id': driver_id,
                    'driver_name': driver_name,
                    'path': driver_path,
                    'updates_applied': True
                })
                
                return True
            
        except Exception as e:
            print(f"Error updating driver {driver_path}: {e}")
            return False
        
        return False
    
    def find_matching_device(self, driver_name, driver_id):
        """Find matching device in scraped database"""
        # Try exact name match first
        for device_key, device_info in self.device_db.items():
            if device_info['name'].lower() == driver_name.lower():
                return device_info
        
        # Try partial name match
        for device_key, device_info in self.device_db.items():
            if any(word in device_info['name'].lower() for word in driver_name.lower().split()):
                return device_info
        
        # Try driver_id match with device_key
        for device_key, device_info in self.device_db.items():
            if driver_id in device_key or device_key in driver_id:
                return device_info
        
        return None
    
    def fix_cluster_ids(self, driver_data):
        """Convert string cluster IDs to numeric"""
        cluster_map = {
            'basic': 0, 'powerConfiguration': 1, 'deviceTemperatureConfiguration': 2,
            'identify': 3, 'groups': 4, 'scenes': 5, 'onOff': 6, 'onOffConfiguration': 7,
            'levelControl': 8, 'alarms': 9, 'time': 10, 'rssiLocation': 11,
            'analogInput': 12, 'analogOutput': 13, 'analogValue': 14, 'binaryInput': 15,
            'binaryOutput': 16, 'binaryValue': 17, 'multiStateInput': 18, 'multiStateOutput': 19,
            'multiStateValue': 20, 'ota': 25, 'powerProfile': 26, 'applianceControl': 27,
            'pollControl': 32, 'greenPower': 33, 'keepAlive': 37, 'colorControl': 768,
            'ballastConfiguration': 769, 'illuminanceMeasurement': 1024, 'illuminanceLevelSensing': 1025,
            'temperatureMeasurement': 1026, 'pressureMeasurement': 1027, 'flowMeasurement': 1028,
            'relativeHumidity': 1029, 'occupancySensing': 1030, 'leafWetness': 1031,
            'soilMoisture': 1032, 'phMeasurement': 1033, 'electricalConductivityMeasurement': 1034,
            'windSpeedMeasurement': 1035, 'concentrationMeasurement': 1036, 'soilTemperature': 1037,
            'soilpH': 1038, 'seismicIntensity': 1039, 'seismicMagnitude': 1040, 'uvIndex': 1041,
            'atmosphericPressure': 1042, 'leafTemperature': 1043, 'soilHumidity': 1044,
            'rainFallRate': 1045, 'windDirection': 1046, 'barometricPressure': 1047,
            'solarIrradiance': 1048, 'particulateMatter': 1049, 'formaldehydeConcentration': 1050,
            'iasZone': 1280, 'iasWd': 1281, 'doorLock': 257, 'windowCovering': 258,
            'pumpConfigurationAndControl': 512, 'thermostat': 513, 'fan': 514,
            'dehumidificationControl': 515, 'thermostatUi': 516, 'hvacSystemInformation': 517,
            'meterIdentification': 1793, 'electricalMeasurement': 2820, 'diagnostics': 2821,
            'touchlink': 4096, 'manuSpecificCluster': 64672, 'manuSpecificCluster2': 64704
        }
        
        if 'zigbee' in driver_data and 'endpoints' in driver_data['zigbee']:
            for endpoint_id, endpoint_data in driver_data['zigbee']['endpoints'].items():
                if 'clusters' in endpoint_data:
                    updated_clusters = []
                    for cluster in endpoint_data['clusters']:
                        if isinstance(cluster, str):
                            if cluster in cluster_map:
                                updated_clusters.append(cluster_map[cluster])
                                print(f"  Fixed cluster: {cluster} -> {cluster_map[cluster]}")
                            else:
                                # Try to convert string number to int
                                try:
                                    updated_clusters.append(int(cluster))
                                except ValueError:
                                    print(f"  Warning: Unknown cluster '{cluster}', keeping as-is")
                                    updated_clusters.append(cluster)
                        else:
                            updated_clusters.append(cluster)
                    
                    endpoint_data['clusters'] = updated_clusters
    
    def process_all_existing_drivers(self):
        """Process all existing drivers"""
        driver_files = self.find_existing_drivers()
        print(f"Found {len(driver_files)} existing drivers to update...")
        
        for driver_file in driver_files:
            self.update_driver_with_community_data(driver_file)
        
        return self.updated_drivers
    
    def generate_update_report(self):
        """Generate update report"""
        report = {
            'timestamp': datetime.now().isoformat(),
            'total_drivers_processed': len(self.find_existing_drivers()),
            'drivers_updated': len(self.updated_drivers),
            'updated_drivers': self.updated_drivers
        }
        
        os.makedirs('data/driver_updates', exist_ok=True)
        with open('data/driver_updates/update_report.json', 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        print(f"\nUpdate Summary:")
        print(f"Total existing drivers: {report['total_drivers_processed']}")
        print(f"Drivers updated: {report['drivers_updated']}")
        print(f"Report saved to data/driver_updates/update_report.json")
        
        return report

if __name__ == "__main__":
    updater = ExistingDriverUpdater()
    updated_drivers = updater.process_all_existing_drivers()
    report = updater.generate_update_report()
