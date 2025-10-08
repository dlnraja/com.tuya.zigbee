#!/usr/bin/env python3
"""
Project Structure Organizer for Ultimate Zigbee Hub
Organizes files into proper category-based folder structure while maintaining Homey requirements
"""

import os
import shutil
import json
from pathlib import Path

class ProjectOrganizer:
    def __init__(self, project_root):
        self.project_root = Path(project_root)
        
        # Required files that must stay at root
        self.root_required_files = {
            'app.js', 'app.json', 'package.json', 'package-lock.json',
            '.gitignore', '.homeyignore', '.homeychangelog.json', 
            'README.md', 'LICENSE', 'babel.config.js', 'jest.config.js',
            'eslint.config.js', 'tsconfig.json', 'nodemon.json'
        }
        
        # Categories for organization
        self.categories = {
            'lighting': ['smart_light', 'dimmer_switch', 'light_switch', 'rgb_controller'],
            'sensors': ['motion_sensor', 'temperature_humidity_sensor', 'door_window_sensor', 
                       'air_quality_sensor', 'radar_sensor'],
            'security': ['smoke_sensor', 'co_detector', 'water_leak_sensor'],
            'energy': ['smart_plug', 'energy_plug'],
            'climate': ['thermostat'],
            'covers': ['curtain_motor'],
            'controls': ['scene_switch']
        }
    
    def create_organized_structure(self):
        """Create organized folder structure"""
        print("🏗️ Creating organized project structure...")
        
        # Create main category directories
        for category in self.categories:
            category_path = self.project_root / 'organized' / category
            category_path.mkdir(parents=True, exist_ok=True)
            
            # Create subdirectories for each category
            (category_path / 'drivers').mkdir(exist_ok=True)
            (category_path / 'assets').mkdir(exist_ok=True)
            (category_path / 'docs').mkdir(exist_ok=True)
        
        # Create consolidated directories
        consolidated_dirs = ['core', 'scripts', 'documentation', 'assets', 'tests']
        for dir_name in consolidated_dirs:
            (self.project_root / 'organized' / dir_name).mkdir(parents=True, exist_ok=True)
    
    def organize_drivers_by_category(self):
        """Organize drivers into category-based structure"""
        print("📁 Organizing drivers by categories...")
        
        drivers_path = self.project_root / 'drivers'
        if not drivers_path.exists():
            return
        
        for driver_dir in drivers_path.iterdir():
            if not driver_dir.is_dir():
                continue
                
            driver_name = driver_dir.name
            
            # Find which category this driver belongs to
            category = None
            for cat, devices in self.categories.items():
                if any(device in driver_name for device in devices):
                    category = cat
                    break
            
            if category:
                # Copy driver to organized structure (don't move original yet)
                dest_path = self.project_root / 'organized' / category / 'drivers' / driver_name
                if dest_path.exists():
                    shutil.rmtree(dest_path)
                shutil.copytree(driver_dir, dest_path)
                print(f"   ✓ {driver_name} → {category}/drivers/")
    
    def consolidate_documentation(self):
        """Consolidate all documentation"""
        print("📚 Consolidating documentation...")
        
        doc_sources = ['docs', 'documentation', 'README.md']
        dest_docs = self.project_root / 'organized' / 'documentation'
        
        for source in doc_sources:
            source_path = self.project_root / source
            if source_path.exists():
                if source_path.is_file():
                    shutil.copy2(source_path, dest_docs / source_path.name)
                    print(f"   ✓ {source} → documentation/")
                else:
                    for item in source_path.rglob('*'):
                        if item.is_file():
                            rel_path = item.relative_to(source_path)
                            dest_file = dest_docs / rel_path
                            dest_file.parent.mkdir(parents=True, exist_ok=True)
                            shutil.copy2(item, dest_file)
    
    def consolidate_core_files(self):
        """Consolidate core application files"""
        print("⚙️ Consolidating core files...")
        
        core_files = ['app.js', 'lib', 'api', 'config']
        dest_core = self.project_root / 'organized' / 'core'
        
        for source in core_files:
            source_path = self.project_root / source
            if source_path.exists():
                if source_path.is_file():
                    shutil.copy2(source_path, dest_core / source_path.name)
                    print(f"   ✓ {source} → core/")
                else:
                    dest_dir = dest_core / source_path.name
                    if dest_dir.exists():
                        shutil.rmtree(dest_dir)
                    shutil.copytree(source_path, dest_dir)
                    print(f"   ✓ {source}/ → core/")
    
    def consolidate_scripts(self):
        """Consolidate all scripts and tools"""
        print("🔧 Consolidating scripts and tools...")
        
        script_sources = ['scripts', 'tools', 'test']
        dest_scripts = self.project_root / 'organized' / 'scripts'
        
        for source in script_sources:
            source_path = self.project_root / source
            if source_path.exists() and source_path.is_dir():
                dest_dir = dest_scripts / source_path.name
                if dest_dir.exists():
                    shutil.rmtree(dest_dir)
                shutil.copytree(source_path, dest_dir)
                print(f"   ✓ {source}/ → scripts/")
    
    def create_category_readme(self):
        """Create README files for each category"""
        print("📝 Creating category documentation...")
        
        category_descriptions = {
            'lighting': 'Smart lighting devices including bulbs, switches, dimmers, and RGB controllers',
            'sensors': 'Environmental and motion sensors for monitoring and automation',
            'security': 'Safety devices including smoke, CO, and water leak detectors', 
            'energy': 'Smart plugs and energy monitoring devices',
            'climate': 'Temperature control and HVAC devices',
            'covers': 'Motorized curtains, blinds, and window treatments',
            'controls': 'Scene switches and wireless control devices'
        }
        
        for category, description in category_descriptions.items():
            readme_path = self.project_root / 'organized' / category / 'README.md'
            device_list = self.categories[category]
            
            content = f"""# {category.title()} Category - Ultimate Zigbee Hub

## Description
{description}

## Supported Devices
{chr(10).join(f'- {device.replace("_", " ").title()}' for device in device_list)}

## Organization
- `drivers/` - Device drivers for this category
- `assets/` - Images and resources
- `docs/` - Category-specific documentation

## Professional Standards
Following Johan Benz organization standards for maximum user experience and maintainability.
"""
            
            with open(readme_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            print(f"   ✓ README.md → {category}/")
    
    def generate_organization_report(self):
        """Generate comprehensive organization report"""
        print("📊 Generating organization report...")
        
        report = {
            'project_name': 'Ultimate Zigbee Hub',
            'organization_date': '2025-09-14',
            'structure': 'Category-based organization following Johan Benz standards',
            'categories': {},
            'statistics': {
                'total_drivers': 0,
                'total_categories': len(self.categories),
                'files_organized': 0
            }
        }
        
        for category, devices in self.categories.items():
            category_path = self.project_root / 'organized' / category
            driver_count = len(list((category_path / 'drivers').glob('*'))) if (category_path / 'drivers').exists() else 0
            
            report['categories'][category] = {
                'description': f'{category.title()} devices and controllers',
                'device_types': devices,
                'driver_count': driver_count,
                'path': f'organized/{category}/'
            }
            
            report['statistics']['total_drivers'] += driver_count
        
        report_path = self.project_root / 'organized' / 'ORGANIZATION_REPORT.json'
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        print(f"   ✓ Organization report → organized/ORGANIZATION_REPORT.json")
        return report

def main():
    project_root = "."
    organizer = ProjectOrganizer(project_root)
    
    print("🚀 Starting Ultimate Zigbee Hub organization...")
    print("📋 Following Johan Benz professional standards\n")
    
    # Create organized structure
    organizer.create_organized_structure()
    organizer.organize_drivers_by_category()
    organizer.consolidate_documentation()
    organizer.consolidate_core_files()
    organizer.consolidate_scripts()
    organizer.create_category_readme()
    
    # Generate report
    report = organizer.generate_organization_report()
    
    print(f"\n✅ Organization complete!")
    print(f"📊 Statistics:")
    print(f"   - {report['statistics']['total_drivers']} drivers organized")
    print(f"   - {report['statistics']['total_categories']} categories created") 
    print(f"   - Professional structure following Johan Benz standards")
    print(f"\n📁 Organized structure available in 'organized/' directory")

if __name__ == "__main__":
    main()
