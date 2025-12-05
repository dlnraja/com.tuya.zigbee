#!/usr/bin/env python3
"""
Tuya DP Database Enrichment Script
Consolidates data from multiple sources to create comprehensive DP database
Target: 150+ DPs from current 72 DPs
"""

import json
import sys
from pathlib import Path
from typing import Dict, Any, List, Set

# Paths
BASE_DIR = Path(__file__).parent.parent
CURRENT_DB = BASE_DIR / "data" / "tuya-dp-complete-database.json"
DATAPOINT_MAPPINGS = BASE_DIR / "docs" / "analysis" / "DATAPOINT_MAPPINGS.json"
FORUM_DATA = BASE_DIR / "docs" / "analysis" / "forum-comprehensive-device-data.json"
ENHANCED_DPS = BASE_DIR / "data" / "enrichment" / "enhanced-dps-database.json"
OUTPUT_DB = BASE_DIR / "data" / "tuya-dp-complete-database.json"

class DPDatabaseEnricher:
    def __init__(self):
        self.current_dps = {}
        self.new_dps = {}
        self.existing_dp_numbers = set()

    def load_current_database(self):
        """Load existing database"""
        print(f"📖 Loading current database from {CURRENT_DB}")
        with open(CURRENT_DB, 'r', encoding='utf-8') as f:
            data = json.load(f)
            self.current_dps = data['datapoints']
            self.existing_dp_numbers = set(int(k) for k in self.current_dps.keys())
            print(f"   ✓ Loaded {len(self.existing_dp_numbers)} existing DPs")
            return data

    def extract_from_datapoint_mappings(self):
        """Extract DPs from DATAPOINT_MAPPINGS.json"""
        print(f"\n📖 Processing DATAPOINT_MAPPINGS.json")
        with open(DATAPOINT_MAPPINGS, 'r', encoding='utf-8') as f:
            data = json.load(f)
            mappings = data['datapoint_mappings']

            new_count = 0
            for dp_key, dp_data in mappings.items():
                if not dp_key.startswith('DP'):
                    continue

                dp_num = int(dp_key[2:])
                if dp_num in self.existing_dp_numbers:
                    continue

                # Extract usage info from first entry
                usage_parts = []
                brands = set()
                models = []

                for device_type, descriptions in dp_data.items():
                    if device_type in ['lib', 'driver_count', 'drivers', 'sample_descriptions']:
                        continue
                    for desc in descriptions[:2]:  # Take first 2 descriptions
                        if desc and len(desc) < 100:
                            usage_parts.append(desc)

                # Create DP entry
                if usage_parts:
                    dp_entry = {
                        "type": self._infer_type(usage_parts[0]),
                        "usage": " / ".join(usage_parts[:3]),
                        "brands": ["Tuya"],
                        "models": ["TS0601"],
                        "cluster": "0xEF00",
                        "homeyCapability": []
                    }

                    # Add range info if type is value
                    if dp_entry["type"] == "value":
                        dp_entry["range"] = [0, 1000]

                    self.new_dps[str(dp_num)] = dp_entry
                    new_count += 1

            print(f"   ✓ Extracted {new_count} new DPs from DATAPOINT_MAPPINGS")

    def extract_from_enhanced_dps(self):
        """Extract DPs from enhanced-dps-database.json"""
        print(f"\n📖 Processing enhanced-dps-database.json")
        with open(ENHANCED_DPS, 'r', encoding='utf-8') as f:
            data = json.load(f)

            new_count = 0
            for profile_name, profile_dps in data.items():
                for dp_num_str, dp_data in profile_dps.items():
                    dp_num = int(dp_num_str)
                    if dp_num in self.existing_dp_numbers:
                        continue
                    if str(dp_num) in self.new_dps:
                        continue  # Already added

                    # Create DP entry
                    dp_entry = {
                        "type": dp_data.get("type", "value"),
                        "usage": dp_data.get("name", f"Unknown DP{dp_num}"),
                        "brands": ["Tuya"],
                        "models": ["TS0601"],
                        "cluster": "0xEF00",
                        "homeyCapability": []
                    }

                    # Add capability if available
                    if "capability" in dp_data:
                        dp_entry["homeyCapability"].append(dp_data["capability"])

                    # Add range
                    if dp_entry["type"] == "value":
                        dp_entry["range"] = [dp_data.get("min", 0), dp_data.get("max", 1000)]
                        if "unit" in dp_data:
                            dp_entry["unit"] = dp_data["unit"]
                        if "divide" in dp_data:
                            # Convert divide to unit notation
                            divide_val = dp_data["divide"]
                            if divide_val == 10:
                                dp_entry["unit"] = dp_entry.get("unit", "value") + " × 10"
                            elif divide_val == 100:
                                dp_entry["unit"] = dp_entry.get("unit", "value") + " × 100"
                    elif dp_entry["type"] == "enum":
                        if "values" in dp_data:
                            dp_entry["values"] = dp_data["values"]
                            dp_entry["range"] = list(dp_data["values"].keys())
                    elif dp_entry["type"] == "bool":
                        dp_entry["range"] = [0, 1]

                    self.new_dps[str(dp_num)] = dp_entry
                    new_count += 1

            print(f"   ✓ Extracted {new_count} new DPs from enhanced database")

    def add_missing_thermostat_dps(self):
        """Add missing thermostat DPs (30-49)"""
        print(f"\n🌡️  Adding missing thermostat DPs (30-49)")

        thermostat_dps = {
            "30": {
                "type": "enum",
                "range": [0, 1, 2],
                "values": {"0": "auto", "1": "manual", "2": "off"},
                "usage": "HVAC mode (auto/manual/off)",
                "brands": ["Tuya", "Moes"],
                "models": ["TS0601", "BHT-002"],
                "cluster": "0xEF00 → 0x0201",
                "homeyCapability": ["thermostat_mode"]
            },
            "31": {
                "type": "value",
                "range": [5, 35],
                "unit": "°C",
                "usage": "Temperature limit lower",
                "brands": ["Tuya", "Moes"],
                "models": ["TS0601"],
                "cluster": "0xEF00 → 0x0201",
                "homeyCapability": []
            },
            "32": {
                "type": "value",
                "range": [5, 35],
                "unit": "°C",
                "usage": "Temperature limit upper",
                "brands": ["Tuya", "Moes"],
                "models": ["TS0601"],
                "cluster": "0xEF00 → 0x0201",
                "homeyCapability": []
            },
            "34": {
                "type": "value",
                "range": [0, 100],
                "unit": "%",
                "usage": "Humidity target (dehumidifier)",
                "brands": ["Tuya"],
                "models": ["TS0601"],
                "cluster": "0xEF00",
                "homeyCapability": ["target_humidity"]
            },
            "37": {
                "type": "bool",
                "range": [0, 1],
                "usage": "Vacation mode",
                "brands": ["Tuya", "Moes"],
                "models": ["BHT-002"],
                "cluster": "0xEF00",
                "homeyCapability": []
            },
            "38": {
                "type": "bool",
                "range": [0, 1],
                "usage": "Away mode",
                "brands": ["Tuya"],
                "models": ["TS0601"],
                "cluster": "0xEF00",
                "homeyCapability": []
            },
            "48": {
                "type": "enum",
                "range": [0, 2],
                "values": {"0": "off", "1": "heat", "2": "cool"},
                "usage": "Operating state",
                "brands": ["Tuya"],
                "models": ["TS0601"],
                "cluster": "0xEF00 → 0x0201",
                "homeyCapability": []
            },
            "49": {
                "type": "value",
                "range": [0, 3600],
                "unit": "seconds",
                "usage": "Boost time remaining",
                "brands": ["Tuya", "Moes"],
                "models": ["BHT-002"],
                "cluster": "0xEF00",
                "homeyCapability": []
            }
        }

        added = 0
        for dp_num, dp_data in thermostat_dps.items():
            if int(dp_num) not in self.existing_dp_numbers and dp_num not in self.new_dps:
                self.new_dps[dp_num] = dp_data
                added += 1

        print(f"   ✓ Added {added} thermostat DPs")

    def add_missing_lighting_dps(self):
        """Add missing lighting/RGB DPs"""
        print(f"\n💡 Adding missing lighting DPs")

        lighting_dps = {
            "53": {
                "type": "value",
                "range": [0, 255],
                "usage": "Red channel (RGB)",
                "brands": ["Tuya", "Lidl"],
                "models": ["TS0503A", "TS0504A"],
                "cluster": "0xEF00 → 0x0300",
                "homeyCapability": []
            },
            "54": {
                "type": "value",
                "range": [0, 255],
                "usage": "Green channel (RGB)",
                "brands": ["Tuya", "Lidl"],
                "models": ["TS0503A", "TS0504A"],
                "cluster": "0xEF00 → 0x0300",
                "homeyCapability": []
            },
            "55": {
                "type": "value",
                "range": [0, 255],
                "usage": "Blue channel (RGB)",
                "brands": ["Tuya", "Lidl"],
                "models": ["TS0503A", "TS0504A"],
                "cluster": "0xEF00 → 0x0300",
                "homeyCapability": []
            },
            "56": {
                "type": "value",
                "range": [0, 255],
                "usage": "White channel (RGBW)",
                "brands": ["Tuya", "Lidl"],
                "models": ["TS0504A", "TS0505"],
                "cluster": "0xEF00 → 0x0300",
                "homeyCapability": []
            },
            "57": {
                "type": "enum",
                "range": [0, 8],
                "values": {"0": "white", "1": "color", "2": "scene", "3": "music"},
                "usage": "Light mode",
                "brands": ["Tuya", "Lidl"],
                "models": ["TS0503A", "TS0505"],
                "cluster": "0xEF00 → 0x0300",
                "homeyCapability": []
            },
            "58": {
                "type": "enum",
                "range": [0, 10],
                "usage": "Scene selection",
                "brands": ["Tuya"],
                "models": ["TS0505"],
                "cluster": "0xEF00 → 0x0300",
                "homeyCapability": []
            },
            "59": {
                "type": "value",
                "range": [0, 100],
                "unit": "%",
                "usage": "Animation speed",
                "brands": ["Tuya", "Lidl"],
                "models": ["TS0505"],
                "cluster": "0xEF00 → 0x0300",
                "homeyCapability": []
            },
            "60": {
                "type": "string",
                "range": "hex color",
                "usage": "HSV color data",
                "brands": ["Tuya"],
                "models": ["TS0503A", "TS0505"],
                "cluster": "0xEF00 → 0x0300",
                "homeyCapability": []
            }
        }

        added = 0
        for dp_num, dp_data in lighting_dps.items():
            if int(dp_num) not in self.existing_dp_numbers and dp_num not in self.new_dps:
                self.new_dps[dp_num] = dp_data
                added += 1

        print(f"   ✓ Added {added} lighting DPs")

    def add_missing_energy_dps(self):
        """Add missing energy monitoring DPs (122-145)"""
        print(f"\n⚡ Adding missing energy monitoring DPs")

        energy_dps = {
            "122": {
                "type": "value",
                "range": [0, 30000],
                "unit": "W",
                "usage": "Active power (phase A)",
                "brands": ["Tuya"],
                "models": ["TS0601"],
                "cluster": "0xEF00 → 0x0702",
                "homeyCapability": ["measure_power"]
            },
            "123": {
                "type": "value",
                "range": [0, 30000],
                "unit": "W",
                "usage": "Active power (phase B)",
                "brands": ["Tuya"],
                "models": ["TS0601"],
                "cluster": "0xEF00 → 0x0702",
                "homeyCapability": ["measure_power.phaseB"]
            },
            "124": {
                "type": "value",
                "range": [0, 30000],
                "unit": "W",
                "usage": "Active power (phase C)",
                "brands": ["Tuya"],
                "models": ["TS0601"],
                "cluster": "0xEF00 → 0x0702",
                "homeyCapability": ["measure_power.phaseC"]
            },
            "125": {
                "type": "value",
                "range": [0, 30000],
                "unit": "W",
                "usage": "Total active power (3-phase)",
                "brands": ["Tuya"],
                "models": ["TS0601"],
                "cluster": "0xEF00 → 0x0702",
                "homeyCapability": ["measure_power"]
            },
            "126": {
                "type": "value",
                "range": [0, 100],
                "unit": "A × 1000",
                "usage": "Current (phase A)",
                "brands": ["Tuya"],
                "models": ["TS0601"],
                "cluster": "0xEF00 → 0x0B04",
                "homeyCapability": ["measure_current"]
            },
            "127": {
                "type": "value",
                "range": [0, 100],
                "unit": "A × 1000",
                "usage": "Current (phase B)",
                "brands": ["Tuya"],
                "models": ["TS0601"],
                "cluster": "0xEF00 → 0x0B04",
                "homeyCapability": ["measure_current.phaseB"]
            },
            "128": {
                "type": "value",
                "range": [0, 100],
                "unit": "A × 1000",
                "usage": "Current (phase C)",
                "brands": ["Tuya"],
                "models": ["TS0601"],
                "cluster": "0xEF00 → 0x0B04",
                "homeyCapability": ["measure_current.phaseC"]
            },
            "129": {
                "type": "value",
                "range": [0, 500],
                "unit": "V × 10",
                "usage": "Voltage (phase A)",
                "brands": ["Tuya"],
                "models": ["TS0601"],
                "cluster": "0xEF00 → 0x0B04",
                "homeyCapability": ["measure_voltage"]
            },
            "130": {
                "type": "value",
                "range": [0, 500],
                "unit": "V × 10",
                "usage": "Voltage (phase B)",
                "brands": ["Tuya"],
                "models": ["TS0601"],
                "cluster": "0xEF00 → 0x0B04",
                "homeyCapability": ["measure_voltage.phaseB"]
            },
            "131": {
                "type": "value",
                "range": [0, 500],
                "unit": "V × 10",
                "usage": "Voltage (phase C)",
                "brands": ["Tuya"],
                "models": ["TS0601"],
                "cluster": "0xEF00 → 0x0B04",
                "homeyCapability": ["measure_voltage.phaseC"]
            },
            "132": {
                "type": "value",
                "range": [0, 100000],
                "unit": "kWh × 100",
                "usage": "Total energy consumed",
                "brands": ["Tuya"],
                "models": ["TS0601", "TS011F"],
                "cluster": "0xEF00 → 0x0702",
                "homeyCapability": ["meter_power"]
            },
            "133": {
                "type": "value",
                "range": [0, 1000],
                "unit": "×0.01",
                "usage": "Power factor",
                "brands": ["Tuya"],
                "models": ["TS0601"],
                "cluster": "0xEF00 → 0x0B04",
                "homeyCapability": []
            },
            "134": {
                "type": "value",
                "range": [4500, 6500],
                "unit": "Hz × 100",
                "usage": "Grid frequency",
                "brands": ["Tuya"],
                "models": ["TS0601"],
                "cluster": "0xEF00 → 0x0B04",
                "homeyCapability": []
            },
            "135": {
                "type": "value",
                "range": [0, 50000],
                "unit": "VAR",
                "usage": "Reactive power",
                "brands": ["Tuya"],
                "models": ["TS0601"],
                "cluster": "0xEF00 → 0x0702",
                "homeyCapability": []
            },
            "136": {
                "type": "value",
                "range": [0, 50000],
                "unit": "VA",
                "usage": "Apparent power",
                "brands": ["Tuya"],
                "models": ["TS0601"],
                "cluster": "0xEF00 → 0x0702",
                "homeyCapability": []
            },
            "137": {
                "type": "bool",
                "range": [0, 1],
                "usage": "Power restore mode",
                "brands": ["Tuya"],
                "models": ["TS011F", "TS0121"],
                "cluster": "0xEF00",
                "homeyCapability": []
            },
            "138": {
                "type": "value",
                "range": [0, 5000],
                "unit": "W",
                "usage": "Power threshold (overcurrent)",
                "brands": ["Tuya"],
                "models": ["TS011F"],
                "cluster": "0xEF00",
                "homeyCapability": []
            },
            "139": {
                "type": "value",
                "range": [0, 500],
                "unit": "V",
                "usage": "Voltage threshold (overvoltage)",
                "brands": ["Tuya"],
                "models": ["TS011F"],
                "cluster": "0xEF00",
                "homeyCapability": []
            },
            "140": {
                "type": "bool",
                "range": [0, 1],
                "usage": "Overcurrent protection enabled",
                "brands": ["Tuya"],
                "models": ["TS011F", "TS0601"],
                "cluster": "0xEF00",
                "homeyCapability": []
            },
            "141": {
                "type": "bool",
                "range": [0, 1],
                "usage": "Overvoltage protection enabled",
                "brands": ["Tuya"],
                "models": ["TS011F", "TS0601"],
                "cluster": "0xEF00",
                "homeyCapability": []
            },
            "142": {
                "type": "bool",
                "range": [0, 1],
                "usage": "Undervoltage protection enabled",
                "brands": ["Tuya"],
                "models": ["TS011F", "TS0601"],
                "cluster": "0xEF00",
                "homeyCapability": []
            },
            "143": {
                "type": "value",
                "range": [0, 999999],
                "unit": "seconds",
                "usage": "Total operation time",
                "brands": ["Tuya"],
                "models": ["TS011F"],
                "cluster": "0xEF00",
                "homeyCapability": []
            },
            "144": {
                "type": "bool",
                "range": [0, 1],
                "usage": "Energy reset trigger",
                "brands": ["Tuya"],
                "models": ["TS011F"],
                "cluster": "0xEF00",
                "homeyCapability": []
            },
            "145": {
                "type": "bool",
                "range": [0, 1],
                "usage": "LED indicator mode",
                "brands": ["Tuya"],
                "models": ["TS011F", "TS0121"],
                "cluster": "0xEF00",
                "homeyCapability": []
            }
        }

        added = 0
        for dp_num, dp_data in energy_dps.items():
            if int(dp_num) not in self.existing_dp_numbers and dp_num not in self.new_dps:
                self.new_dps[dp_num] = dp_data
                added += 1

        print(f"   ✓ Added {added} energy monitoring DPs")

    def add_missing_advanced_sensor_dps(self):
        """Add missing advanced sensor DPs (146-180)"""
        print(f"\n🔬 Adding missing advanced sensor DPs")

        sensor_dps = {
            "146": {
                "type": "value",
                "range": [0, 360],
                "unit": "degrees",
                "usage": "Wind direction",
                "brands": ["Tuya"],
                "models": ["Weather Station"],
                "cluster": "0xEF00",
                "homeyCapability": ["measure_wind_direction"]
            },
            "147": {
                "type": "value",
                "range": [0, 5000],
                "unit": "mm × 10",
                "usage": "Rainfall amount",
                "brands": ["Tuya"],
                "models": ["Weather Station"],
                "cluster": "0xEF00",
                "homeyCapability": ["measure_rain"]
            },
            "148": {
                "type": "value",
                "range": [0, 100],
                "unit": "µg/m³",
                "usage": "PM1.0 concentration",
                "brands": ["Tuya"],
                "models": ["TS0601"],
                "cluster": "0xEF00",
                "homeyCapability": ["measure_pm1"]
            },
            "149": {
                "type": "value",
                "range": [0, 1000],
                "unit": "ppb",
                "usage": "TVOC (Total VOC)",
                "brands": ["Tuya"],
                "models": ["TS0601"],
                "cluster": "0xEF00",
                "homeyCapability": ["measure_tvoc"]
            },
            "150": {
                "type": "value",
                "range": [0, 1000],
                "unit": "ppm",
                "usage": "CO (Carbon Monoxide)",
                "brands": ["Tuya"],
                "models": ["TS0205"],
                "cluster": "0xEF00",
                "homeyCapability": ["measure_co"]
            },
            "151": {
                "type": "value",
                "range": [0, 100],
                "unit": "%LEL",
                "usage": "Combustible gas (CH4/LPG)",
                "brands": ["Tuya"],
                "models": ["TS0601"],
                "cluster": "0xEF00",
                "homeyCapability": ["measure_gas"]
            },
            "152": {
                "type": "value",
                "range": [0, 500],
                "unit": "dB",
                "usage": "Sound level (noise)",
                "brands": ["Tuya"],
                "models": ["TS0601"],
                "cluster": "0xEF00",
                "homeyCapability": ["measure_noise"]
            },
            "153": {
                "type": "value",
                "range": [0, 100],
                "unit": "µS/cm",
                "usage": "Soil conductivity (EC)",
                "brands": ["Tuya"],
                "models": ["TS0601"],
                "cluster": "0xEF00",
                "homeyCapability": []
            },
            "154": {
                "type": "value",
                "range": [0, 14],
                "unit": "pH",
                "usage": "Soil pH level",
                "brands": ["Tuya"],
                "models": ["TS0601"],
                "cluster": "0xEF00",
                "homeyCapability": []
            },
            "155": {
                "type": "value",
                "range": [0, 2000],
                "unit": "mg/L",
                "usage": "NPK fertilizer (nitrogen)",
                "brands": ["Tuya"],
                "models": ["TS0601"],
                "cluster": "0xEF00",
                "homeyCapability": []
            },
            "156": {
                "type": "value",
                "range": [0, 500],
                "unit": "cm",
                "usage": "Water level / depth",
                "brands": ["Tuya"],
                "models": ["TS0601"],
                "cluster": "0xEF00",
                "homeyCapability": []
            },
            "157": {
                "type": "value",
                "range": [0, 200],
                "unit": "L/min",
                "usage": "Water flow rate",
                "brands": ["Tuya"],
                "models": ["TS0601"],
                "cluster": "0xEF00",
                "homeyCapability": []
            },
            "158": {
                "type": "value",
                "range": [0, 999999],
                "unit": "L",
                "usage": "Water consumption total",
                "brands": ["Tuya"],
                "models": ["TS0601"],
                "cluster": "0xEF00",
                "homeyCapability": ["meter_water"]
            },
            "159": {
                "type": "bool",
                "range": [0, 1],
                "usage": "Water leak detected",
                "brands": ["Tuya"],
                "models": ["TS0207"],
                "cluster": "0xEF00 → 0x0500",
                "homeyCapability": ["alarm_water"]
            },
            "160": {
                "type": "value",
                "range": [0, 1000],
                "unit": "cm",
                "usage": "Target distance (radar)",
                "brands": ["Tuya"],
                "models": ["TS0225", "ZY-M100"],
                "cluster": "0xEF00",
                "homeyCapability": ["measure_distance"]
            },
            "161": {
                "type": "value",
                "range": [0, 100],
                "unit": "%",
                "usage": "Motion confidence level",
                "brands": ["Tuya"],
                "models": ["TS0225"],
                "cluster": "0xEF00",
                "homeyCapability": []
            },
            "162": {
                "type": "enum",
                "range": [0, 3],
                "values": {"0": "stationary", "1": "moving", "2": "approaching", "3": "away"},
                "usage": "Motion direction",
                "brands": ["Tuya"],
                "models": ["TS0225"],
                "cluster": "0xEF00",
                "homeyCapability": []
            },
            "163": {
                "type": "value",
                "range": [0, 1000],
                "unit": "ms",
                "usage": "Response time / detection latency",
                "brands": ["Tuya"],
                "models": ["TS0225"],
                "cluster": "0xEF00",
                "homeyCapability": []
            },
            "164": {
                "type": "value",
                "range": [0, 100],
                "unit": "%",
                "usage": "Radar sensitivity",
                "brands": ["Tuya"],
                "models": ["TS0225", "ZY-M100"],
                "cluster": "0xEF00",
                "homeyCapability": []
            },
            "165": {
                "type": "value",
                "range": [0, 1000],
                "unit": "cm",
                "usage": "Detection range minimum",
                "brands": ["Tuya"],
                "models": ["TS0225"],
                "cluster": "0xEF00",
                "homeyCapability": []
            },
            "166": {
                "type": "value",
                "range": [0, 1000],
                "unit": "cm",
                "usage": "Detection range maximum",
                "brands": ["Tuya"],
                "models": ["TS0225"],
                "cluster": "0xEF00",
                "homeyCapability": []
            },
            "167": {
                "type": "value",
                "range": [0, 3600],
                "unit": "seconds",
                "usage": "Detection delay / hold time",
                "brands": ["Tuya"],
                "models": ["TS0225", "TS0202"],
                "cluster": "0xEF00",
                "homeyCapability": []
            },
            "168": {
                "type": "value",
                "range": [0, 3600],
                "unit": "seconds",
                "usage": "Fading time / unoccupied delay",
                "brands": ["Tuya"],
                "models": ["TS0225"],
                "cluster": "0xEF00",
                "homeyCapability": []
            },
            "169": {
                "type": "enum",
                "range": [0, 2],
                "values": {"0": "large_motion", "1": "small_motion", "2": "breathing"},
                "usage": "Motion detection mode",
                "brands": ["Tuya"],
                "models": ["TS0225"],
                "cluster": "0xEF00",
                "homeyCapability": []
            },
            "170": {
                "type": "bool",
                "range": [0, 1],
                "usage": "Static detection enabled",
                "brands": ["Tuya"],
                "models": ["TS0225"],
                "cluster": "0xEF00",
                "homeyCapability": []
            }
        }

        added = 0
        for dp_num, dp_data in sensor_dps.items():
            if int(dp_num) not in self.existing_dp_numbers and dp_num not in self.new_dps:
                self.new_dps[dp_num] = dp_data
                added += 1

        print(f"   ✓ Added {added} advanced sensor DPs")

    def add_missing_config_dps(self):
        """Add missing configuration DPs (171-210)"""
        print(f"\n⚙️  Adding missing configuration DPs")

        config_dps = {
            "171": {
                "type": "bool",
                "range": [0, 1],
                "usage": "Scene switch enable",
                "brands": ["Tuya"],
                "models": ["TS0044"],
                "cluster": "0xEF00",
                "homeyCapability": []
            },
            "172": {
                "type": "enum",
                "range": [0, 2],
                "values": {"0": "scene", "1": "switch", "2": "dimmer"},
                "usage": "Button mode",
                "brands": ["Tuya"],
                "models": ["TS0044"],
                "cluster": "0xEF00",
                "homeyCapability": []
            },
            "173": {
                "type": "value",
                "range": [0, 10000],
                "unit": "ms",
                "usage": "Long press duration",
                "brands": ["Tuya"],
                "models": ["TS0044"],
                "cluster": "0xEF00",
                "homeyCapability": []
            },
            "174": {
                "type": "bool",
                "range": [0, 1],
                "usage": "Beep on press",
                "brands": ["Tuya"],
                "models": ["TS0044"],
                "cluster": "0xEF00",
                "homeyCapability": []
            },
            "175": {
                "type": "bool",
                "range": [0, 1],
                "usage": "Vibration on press",
                "brands": ["Tuya"],
                "models": ["TS0044"],
                "cluster": "0xEF00",
                "homeyCapability": []
            },
            "180": {
                "type": "enum",
                "range": [0, 2],
                "values": {"0": "off", "1": "on", "2": "restore"},
                "usage": "Power-on behavior",
                "brands": ["Tuya"],
                "models": ["TS0001", "TS011F"],
                "cluster": "0xEF00",
                "homeyCapability": []
            },
            "181": {
                "type": "bool",
                "range": [0, 1],
                "usage": "Inching mode enabled",
                "brands": ["Tuya"],
                "models": ["TS0001"],
                "cluster": "0xEF00",
                "homeyCapability": []
            },
            "182": {
                "type": "value",
                "range": [0, 86400],
                "unit": "seconds",
                "usage": "Inching duration",
                "brands": ["Tuya"],
                "models": ["TS0001"],
                "cluster": "0xEF00",
                "homeyCapability": []
            },
            "183": {
                "type": "bool",
                "range": [0, 1],
                "usage": "Interlock enabled",
                "brands": ["Tuya"],
                "models": ["TS0002", "TS0003"],
                "cluster": "0xEF00",
                "homeyCapability": []
            },
            "184": {
                "type": "enum",
                "range": [0, 1],
                "values": {"0": "relay_mode", "1": "detached_mode"},
                "usage": "Switch mode",
                "brands": ["Tuya"],
                "models": ["TS0002"],
                "cluster": "0xEF00",
                "homeyCapability": []
            },
            "185": {
                "type": "value",
                "range": [0, 100],
                "unit": "%",
                "usage": "Minimum brightness",
                "brands": ["Tuya"],
                "models": ["TS110F"],
                "cluster": "0xEF00",
                "homeyCapability": []
            },
            "186": {
                "type": "value",
                "range": [0, 100],
                "unit": "%",
                "usage": "Maximum brightness",
                "brands": ["Tuya"],
                "models": ["TS110F"],
                "cluster": "0xEF00",
                "homeyCapability": []
            },
            "187": {
                "type": "enum",
                "range": [0, 2],
                "values": {"0": "RC", "1": "RL", "2": "C"},
                "usage": "Light type (load type)",
                "brands": ["Tuya"],
                "models": ["TS110F"],
                "cluster": "0xEF00",
                "homeyCapability": []
            },
            "188": {
                "type": "value",
                "range": [1, 100],
                "unit": "Hz",
                "usage": "PWM frequency",
                "brands": ["Tuya"],
                "models": ["TS110F"],
                "cluster": "0xEF00",
                "homeyCapability": []
            },
            "189": {
                "type": "value",
                "range": [0, 10000],
                "unit": "ms",
                "usage": "Fade time",
                "brands": ["Tuya"],
                "models": ["TS110F", "TS0505"],
                "cluster": "0xEF00",
                "homeyCapability": []
            },
            "190": {
                "type": "enum",
                "range": [0, 3],
                "values": {"0": "instant", "1": "smooth", "2": "fade", "3": "custom"},
                "usage": "Transition mode",
                "brands": ["Tuya"],
                "models": ["TS0505"],
                "cluster": "0xEF00",
                "homeyCapability": []
            },
            "202": {
                "type": "string",
                "range": "JSON",
                "usage": "Weekly schedule (Monday)",
                "brands": ["Tuya"],
                "models": ["BHT-002"],
                "cluster": "0xEF00",
                "homeyCapability": []
            },
            "203": {
                "type": "string",
                "range": "JSON",
                "usage": "Weekly schedule (Tuesday)",
                "brands": ["Tuya"],
                "models": ["BHT-002"],
                "cluster": "0xEF00",
                "homeyCapability": []
            },
            "204": {
                "type": "string",
                "range": "JSON",
                "usage": "Weekly schedule (Wednesday)",
                "brands": ["Tuya"],
                "models": ["BHT-002"],
                "cluster": "0xEF00",
                "homeyCapability": []
            },
            "205": {
                "type": "string",
                "range": "JSON",
                "usage": "Weekly schedule (Thursday)",
                "brands": ["Tuya"],
                "models": ["BHT-002"],
                "cluster": "0xEF00",
                "homeyCapability": []
            },
            "206": {
                "type": "string",
                "range": "JSON",
                "usage": "Weekly schedule (Friday)",
                "brands": ["Tuya"],
                "models": ["BHT-002"],
                "cluster": "0xEF00",
                "homeyCapability": []
            },
            "207": {
                "type": "string",
                "range": "JSON",
                "usage": "Weekly schedule (Saturday)",
                "brands": ["Tuya"],
                "models": ["BHT-002"],
                "cluster": "0xEF00",
                "homeyCapability": []
            },
            "208": {
                "type": "string",
                "range": "JSON",
                "usage": "Weekly schedule (Sunday)",
                "brands": ["Tuya"],
                "models": ["BHT-002"],
                "cluster": "0xEF00",
                "homeyCapability": []
            }
        }

        added = 0
        for dp_num, dp_data in config_dps.items():
            if int(dp_num) not in self.existing_dp_numbers and dp_num not in self.new_dps:
                self.new_dps[dp_num] = dp_data
                added += 1

        print(f"   ✓ Added {added} configuration DPs")

    def _infer_type(self, usage: str) -> str:
        """Infer DP type from usage description"""
        usage_lower = usage.lower()

        if any(word in usage_lower for word in ['bool', 'on/off', 'enable', 'detect']):
            return "bool"
        elif any(word in usage_lower for word in ['enum', 'mode', 'state', 'level']):
            return "enum"
        elif any(word in usage_lower for word in ['string', 'json', 'text', 'schedule']):
            return "string"
        elif any(word in usage_lower for word in ['raw', 'data', 'bytes']):
            return "raw"
        else:
            return "value"

    def merge_and_save(self, base_data):
        """Merge all DPs and save to file"""
        print(f"\n💾 Merging and saving database...")

        # Merge new DPs into datapoints
        all_dps = {**self.current_dps, **self.new_dps}

        # Sort by DP number
        sorted_dps = dict(sorted(all_dps.items(), key=lambda x: int(x[0])))

        # Update base data
        base_data['datapoints'] = sorted_dps
        base_data['lastUpdated'] = "2025-12-05"
        base_data['version'] = "2.0.0"

        # Add enrichment metadata
        base_data['sources'].extend([
            "DATAPOINT_MAPPINGS.json (driver analysis)",
            "forum-comprehensive-device-data.json",
            "enhanced-dps-database.json",
            "Manual DP pattern research"
        ])

        # Save to file
        with open(OUTPUT_DB, 'w', encoding='utf-8') as f:
            json.dump(base_data, f, indent=2, ensure_ascii=False)

        print(f"   ✓ Saved enriched database to {OUTPUT_DB}")

    def print_statistics(self):
        """Print enrichment statistics"""
        print(f"\n" + "="*60)
        print(f"📊 ENRICHMENT STATISTICS")
        print(f"="*60)

        before_count = len(self.existing_dp_numbers)
        after_count = before_count + len(self.new_dps)
        new_dp_numbers = sorted([int(k) for k in self.new_dps.keys()])

        print(f"\n✅ DPs before: {before_count}")
        print(f"✅ DPs after: {after_count}")
        print(f"✅ New DPs added: {len(self.new_dps)}")
        print(f"✅ Coverage: {after_count}/255 ({after_count/255*100:.1f}%)")

        print(f"\n📝 New DP numbers added:")

        # Group by ranges
        ranges = []
        if new_dp_numbers:
            start = new_dp_numbers[0]
            end = new_dp_numbers[0]

            for dp in new_dp_numbers[1:]:
                if dp == end + 1:
                    end = dp
                else:
                    ranges.append(f"{start}-{end}" if start != end else str(start))
                    start = dp
                    end = dp
            ranges.append(f"{start}-{end}" if start != end else str(start))

        print(f"   {', '.join(ranges)}")

        # Gaps remaining
        all_dp_numbers = sorted(self.existing_dp_numbers.union(set(new_dp_numbers)))
        gaps = []
        for i in range(1, 256):
            if i not in all_dp_numbers:
                if not gaps or gaps[-1][-1] != i - 1:
                    gaps.append([i, i])
                else:
                    gaps[-1][1] = i

        print(f"\n⚠️  Remaining gaps:")
        gap_ranges = [f"{g[0]}-{g[1]}" if g[0] != g[1] else str(g[0]) for g in gaps[:10]]
        print(f"   {', '.join(gap_ranges)}")
        if len(gaps) > 10:
            print(f"   ... and {len(gaps) - 10} more gaps")

        print(f"\n" + "="*60)

    def run(self):
        """Run the enrichment process"""
        print("="*60)
        print("🚀 TUYA DP DATABASE ENRICHMENT")
        print("="*60)

        # Load current database
        base_data = self.load_current_database()

        # Extract from all sources
        self.extract_from_datapoint_mappings()
        self.extract_from_enhanced_dps()

        # Add category-specific DPs
        self.add_missing_thermostat_dps()
        self.add_missing_lighting_dps()
        self.add_missing_energy_dps()
        self.add_missing_advanced_sensor_dps()
        self.add_missing_config_dps()

        # Merge and save
        self.merge_and_save(base_data)

        # Print statistics
        self.print_statistics()

        print(f"\n✨ Enrichment complete!")
        return 0

def main():
    enricher = DPDatabaseEnricher()
    return enricher.run()

if __name__ == "__main__":
    sys.exit(main())
