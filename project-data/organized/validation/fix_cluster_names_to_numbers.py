#!/usr/bin/env python3
import os
import json
import glob

def fix_cluster_names_to_numbers():
    """Convert cluster names to numeric IDs for Homey validation"""
    
    # Mapping of cluster names to numeric IDs
    cluster_mapping = {
        "basic": 0,
        "powerConfiguration": 1,
        "deviceTemperatureConfiguration": 2,
        "identify": 3,
        "groups": 4,
        "scenes": 5,
        "onOff": 6,
        "onOffSwitchConfiguration": 7,
        "levelControl": 8,
        "alarms": 9,
        "time": 10,
        "rssiLocation": 11,
        "analogInput": 12,
        "analogOutput": 13,
        "analogValue": 14,
        "binaryInput": 15,
        "binaryOutput": 16,
        "binaryValue": 17,
        "multistate": 18,
        "ota": 25,
        "powerProfile": 26,
        "applianceControl": 27,
        "pollControl": 32,
        "shadecfg": 256,
        "doorLock": 257,
        "windowCovering": 258,
        "pumpConfigurationControl": 512,
        "thermostat": 513,
        "thermostatUi": 516,
        "colorControl": 768,
        "ballastConfiguration": 769,
        "illuminanceMeasurement": 1024,
        "illuminanceLevelSensing": 1025,
        "temperatureMeasurement": 1026,
        "pressureMeasurement": 1027,
        "flowMeasurement": 1028,
        "relativeHumidity": 1029,
        "occupancySensing": 1030,
        "iasZone": 1280,
        "iasWd": 1281,
        "iasAce": 1282,
        "electricalMeasurement": 2820,
        "diagnostics": 2821,
        "meteringIdentification": 2822,
        "meteringThresholds": 2823,
        "meteringFormatting": 2824,
        "meteringNotification": 2825,
        "meteringSupply": 2826,
        "meteringPrice": 2827,
        "meteringMessage": 2828,
        "meteringTunneling": 2829,
        "meteringPrepayment": 2830,
        "meteringEnergyManagement": 2831,
        "meteringCalendar": 2832,
        "meteringDeviceManagement": 2833,
        "meteringEvents": 2834,
        "meteringHAN": 2835,
        "keyEstablishment": 2836,
        "touchlink": 4096,
        "genAnalogInput": 12,
        "genAnalogOutput": 13,
        "genAnalogValue": 14,
        "genBinaryInput": 15,
        "genBinaryOutput": 16,
        "genBinaryValue": 17,
        "genMultistateInput": 18,
        "genMultistateOutput": 19,
        "genMultistateValue": 20,
        "genCommissioning": 21,
        "genPartition": 22,
        "genPowerProfile": 26,
        "genApplianceControl": 27,
        "genApplianceEventAlerts": 2818,
        "genApplianceLogging": 2819,
        "genApplianceStatistics": 2816,
        "genPollControl": 32,
        "genGreenPowerProxy": 33,
        "genGreenPowerCluster": 33,
        "genKeepAlive": 34,
        "closuresShadeCfg": 256,
        "closuresDoorLock": 257,
        "closuresWindowCovering": 258,
        "hvacPumpConfigControl": 512,
        "hvacThermostat": 513,
        "hvacFan": 514,
        "hvacDehumidificationControl": 515,
        "hvacUserInterfaceConfig": 516,
        "lightingColorCtrl": 768,
        "lightingBallastCfg": 769,
        "msIlluminanceMeasurement": 1024,
        "msIlluminanceLevelSensing": 1025,
        "msTemperatureMeasurement": 1026,
        "msPressureMeasurement": 1027,
        "msFlowMeasurement": 1028,
        "msRelativeHumidity": 1029,
        "msOccupancySensing": 1030,
        "ssIasZone": 1280,
        "ssIasWd": 1281,
        "ssIasAce": 1282,
        "piGenericTunnel": 1536,
        "piBacNet": 1537,
        "sePrice": 1792,
        "seDemandResponseAndLoadControl": 1793,
        "seMetering": 1794,
        "seMessaging": 1795,
        "seTunneling": 1796,
        "sePrepayment": 1797,
        "seEnergyManagement": 1798,
        "seCalendar": 1799,
        "seDeviceManagement": 1800,
        "seEvents": 1801,
        "seMduPairing": 1802,
        "seKeyEstablishment": 1803,
        "haElectricalMeasurement": 2820,
        "haDiagnostics": 2821,
        "touchlinkCommissioning": 4096,
        "manuSpecificCluster": 57344,
        "manuSpecificUbisys": 64716,
        "manuSpecificPhilips": 64512,
        "manuSpecificPhilips2": 64513,
        "manuSpecificSinope": 65281,
        "manuSpecificLegrand": 64672,
        "manuSpecificLegrand2": 64673,
        "manuSpecificNetvox": 64731,
        "manuSpecificTuya": 57344
    }
    
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
                                # Convert string cluster name to number
                                if cluster in cluster_mapping:
                                    new_clusters.append(cluster_mapping[cluster])
                                    modified = True
                                    print(f"  - Converted '{cluster}' to {cluster_mapping[cluster]}")
                                else:
                                    # Try to convert directly to int if it's a string number
                                    try:
                                        new_clusters.append(int(cluster))
                                        modified = True
                                        print(f"  - Converted string '{cluster}' to number {int(cluster)}")
                                    except ValueError:
                                        # Unknown cluster name, keep as is but warn
                                        print(f"  - WARNING: Unknown cluster '{cluster}', keeping as string")
                                        new_clusters.append(cluster)
                            else:
                                new_clusters.append(cluster)
                        
                        endpoint_data['clusters'] = new_clusters
            
            if modified:
                with open(file_path, 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
                
                print(f"  [FIXED] Updated cluster IDs in {file_path}")
                fixes_made += 1
            else:
                print(f"  - No cluster changes needed in {file_path}")
                
        except Exception as e:
            print(f"  [ERROR] Failed to process {file_path}: {e}")
    
    print(f"\n[SUCCESS] Fixed cluster names in {fixes_made} driver files")

if __name__ == "__main__":
    fix_cluster_names_to_numbers()
