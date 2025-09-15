#!/usr/bin/env python3
import os
import json
import shutil
from pathlib import Path
import glob

class DriverOrganizer:
    def __init__(self):
        self.drivers_dir = Path('drivers')
        self.organized_drivers_dir = Path('drivers_organized')
        self.categories = {
            'sensors': {
                'keywords': ['sensor', 'temperature', 'humidity', 'motion', 'pir', 'radar', 'presence', 'air_quality', 'soil'],
                'drivers': []
            },
            'switches': {
                'keywords': ['switch', 'gang', 'button', 'knob', 'dimmer'],
                'drivers': []
            },
            'lights': {
                'keywords': ['light', 'led', 'bulb', 'lamp', 'gu10'],
                'drivers': []
            },
            'plugs_sockets': {
                'keywords': ['plug', 'socket', 'energy'],
                'drivers': []
            },
            'detectors': {
                'keywords': ['detector', 'smoke', 'water', 'leak', 'co', 'sos'],
                'drivers': []
            },
            'climate': {
                'keywords': ['thermostat', 'valve', 'radiator', 'climate'],
                'drivers': []
            },
            'curtains_covers': {
                'keywords': ['curtain', 'blind', 'cover', 'motor'],
                'drivers': []
            },
            'specialized': {
                'keywords': ['remote', 'timer', 'ir', 'scene'],
                'drivers': []
            }
        }
        
    def categorize_driver(self, driver_name):
        """Categorize driver based on name"""
        name_lower = driver_name.lower()
        
        for category, config in self.categories.items():
            for keyword in config['keywords']:
                if keyword in name_lower:
                    return category
        
        return 'specialized'  # Default category
    
    def analyze_current_organization(self):
        """Analyze current driver organization"""
        driver_dirs = [d for d in self.drivers_dir.iterdir() if d.is_dir()]
        
        print(f"Found {len(driver_dirs)} drivers to analyze...")
        
        for driver_dir in driver_dirs:
            category = self.categorize_driver(driver_dir.name)
            self.categories[category]['drivers'].append(driver_dir.name)
        
        # Print analysis
        total_drivers = 0
        for category, config in self.categories.items():
            count = len(config['drivers'])
            total_drivers += count
            print(f"{category.upper()}: {count} drivers")
            if count > 0:
                for driver in sorted(config['drivers'])[:3]:  # Show first 3
                    print(f"  - {driver}")
                if count > 3:
                    print(f"  ... and {count - 3} more")
                print()
        
        print(f"Total: {total_drivers} drivers")
        return self.categories
    
    def create_organized_structure(self):
        """Create organized driver structure"""
        if self.organized_drivers_dir.exists():
            shutil.rmtree(self.organized_drivers_dir)
        
        self.organized_drivers_dir.mkdir(exist_ok=True)
        
        # Create category directories
        for category in self.categories.keys():
            category_dir = self.organized_drivers_dir / category
            category_dir.mkdir(exist_ok=True)
        
        # Move drivers to categories
        moved_count = 0
        for category, config in self.categories.items():
            category_dir = self.organized_drivers_dir / category
            
            for driver_name in config['drivers']:
                src_path = self.drivers_dir / driver_name
                dst_path = category_dir / driver_name
                
                if src_path.exists():
                    shutil.copytree(src_path, dst_path)
                    moved_count += 1
                    print(f"Organized: {driver_name} -> {category}/")
        
        print(f"\nOrganized {moved_count} drivers into categories")
        return moved_count
    
    def validate_organized_structure(self):
        """Validate that all drivers work in organized structure"""
        validation_report = {
            'total_drivers': 0,
            'valid_drivers': 0,
            'invalid_drivers': [],
            'categories': {}
        }
        
        for category_dir in self.organized_drivers_dir.iterdir():
            if not category_dir.is_dir():
                continue
                
            category_name = category_dir.name
            category_drivers = []
            
            for driver_dir in category_dir.iterdir():
                if not driver_dir.is_dir():
                    continue
                    
                validation_report['total_drivers'] += 1
                
                # Check for required files
                compose_file = driver_dir / 'driver.compose.json'
                device_file = driver_dir / 'device.js'
                
                if compose_file.exists() and device_file.exists():
                    try:
                        # Validate JSON
                        with open(compose_file, 'r', encoding='utf-8') as f:
                            json.load(f)
                        
                        validation_report['valid_drivers'] += 1
                        category_drivers.append(driver_dir.name)
                        
                    except json.JSONDecodeError as e:
                        validation_report['invalid_drivers'].append({
                            'driver': driver_dir.name,
                            'category': category_name,
                            'error': f"Invalid JSON: {e}"
                        })
                else:
                    validation_report['invalid_drivers'].append({
                        'driver': driver_dir.name,
                        'category': category_name,
                        'error': "Missing required files"
                    })
            
            validation_report['categories'][category_name] = {
                'count': len(category_drivers),
                'drivers': category_drivers
            }
        
        return validation_report
    
    def generate_organization_report(self):
        """Generate comprehensive organization report"""
        analysis = self.analyze_current_organization()
        
        report = {
            'timestamp': '2025-09-14T21:22:09+02:00',
            'organization_analysis': analysis,
            'recommendations': self.get_organization_recommendations(),
            'current_structure': 'flat',
            'proposed_structure': 'categorized'
        }
        
        os.makedirs('data/organization', exist_ok=True)
        with open('data/organization/organization_report.json', 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        print(f"Organization report saved to data/organization/organization_report.json")
        return report
    
    def get_organization_recommendations(self):
        """Get recommendations for organization"""
        recommendations = []
        
        total_drivers = sum(len(config['drivers']) for config in self.categories.values())
        
        if total_drivers > 50:
            recommendations.append("With 111+ drivers, categorization is highly recommended for maintainability")
        
        # Check for duplicate functionality
        sensor_count = len(self.categories['sensors']['drivers'])
        if sensor_count > 20:
            recommendations.append(f"Consider sub-categorizing {sensor_count} sensors by type (temperature, motion, etc.)")
        
        switch_count = len(self.categories['switches']['drivers'])
        if switch_count > 15:
            recommendations.append(f"Consider organizing {switch_count} switches by gang count (1-gang, 2-gang, etc.)")
        
        recommendations.append("Organized structure improves developer experience and maintenance")
        recommendations.append("Categories align with Homey device classes for better UX")
        
        return recommendations

if __name__ == "__main__":
    organizer = DriverOrganizer()
    
    print("=== DRIVER ORGANIZATION ANALYSIS ===")
    report = organizer.generate_organization_report()
    
    print("\n=== RECOMMENDATIONS ===")
    for rec in report['recommendations']:
        print(f"• {rec}")
    
    # Ask user if they want to proceed with organization
    print(f"\nCurrent: 111 drivers in flat structure")
    print(f"Proposed: Organized into {len(organizer.categories)} categories")
    
    print(f"\nOrganization would create:")
    for category, config in organizer.categories.items():
        count = len(config['drivers'])
        print(f"  {category}/: {count} drivers")
