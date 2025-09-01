import os
import json
import datetime
import platform
import subprocess
from pathlib import Path

# Configuration
CONFIG = {
    'root_dir': os.path.dirname(os.path.abspath(__file__)),
    'reports_dir': os.path.join(os.path.dirname(os.path.abspath(__file__)), 'reports'),
    'drivers_dir': os.path.join(os.path.dirname(os.path.abspath(__file__)), 'drivers'),
    'output_file': 'tuya-integration-report.md'
}

def analyze_driver(driver_path):
    """Analyze a single driver directory and return its status."""
    driver_name = os.path.basename(driver_path)
    config_path = os.path.join(driver_path, 'driver.compose.json')
    
    result = {
        'name': driver_name,
        'has_config': False,
        'has_icons': False,
        'issues': [],
        'metadata': {}
    }
    
    # Check config file
    if os.path.exists(config_path):
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                config = json.load(f)
            
            result['has_config'] = True
            result['metadata'] = config
            
            # Check icons
            if 'images' in config:
                small_icon = os.path.join(driver_path, config['images'].get('small', ''))
                large_icon = os.path.join(driver_path, config['images'].get('large', ''))
                
                result['has_icons'] = os.path.exists(small_icon) and os.path.exists(large_icon)
                
                if not os.path.exists(small_icon):
                    result['issues'].append(f"Missing icon: {config['images'].get('small')}")
                if not os.path.exists(large_icon):
                    result['issues'].append(f"Missing icon: {config['images'].get('large')}")
            else:
                result['issues'].append("Missing 'images' section in config")
            
            # Check required fields
            required_fields = ['id', 'class', 'name']
            for field in required_fields:
                if field not in config:
                    result['issues'].append(f"Missing required field: {field}")
            
        except Exception as e:
            result['issues'].append(f"Error reading config: {str(e)}")
    else:
        result['issues'].append("Missing driver.compose.json")
    
    return result

def generate_markdown_report(drivers):
    """Generate a markdown report from driver analysis."""
    now = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    valid_drivers = [d for d in drivers if not d['issues']]
    invalid_drivers = [d for d in drivers if d['issues']]
    
    # Calculate statistics
    total_drivers = len(drivers)
    valid_count = len(valid_drivers)
    valid_percent = round((valid_count / total_drivers) * 100) if total_drivers > 0 else 0
    invalid_count = len(invalid_drivers)
    
    report = f"""# Tuya Zigbee Integration Report

**Generated:** {now}  
**Repository:** [dlnraja/com.tuya.zigbee](https://github.com/dlnraja/com.tuya.zigbee)

## 📊 Summary

- **Total Drivers:** {total}
- **Valid Drivers:** {valid} ({percent}%)
- **Drivers with Issues:** {invalid}

## 📋 Drivers List

| Name | Status | Issues |
|------|--------|--------|
""".format(
        now=now,
        total=total_drivers,
        valid=valid_count,
        percent=valid_percent,
        invalid=invalid_count
    )
    
    # Add driver rows
    for driver in sorted(drivers, key=lambda x: x['name']):
        status = '✅ Valid' if not driver['issues'] else f"❌ {len(driver['issues'])} issue(s)"
        issues = '<br>'.join(driver['issues']) if driver['issues'] else 'None'
        report += f"| {driver['name']} | {status} | {issues} |\n"
    
    # Add detailed issues section
    if invalid_drivers:
        report += '\n## ⚠️ Detailed Issues\n\n'
        for driver in sorted(invalid_drivers, key=lambda x: x['name']):
            report += f"### {driver['name']}\n"
            for issue in driver['issues']:
                report += f"- {issue}\n"
            report += "\n"
    
    # Add recommendations
    report += """## 🚀 Recommendations

1. **Fix Critical Issues**
   - {invalid_count} drivers need attention
   - Update missing or invalid configurations

2. **Icon Management**
   - Standardize icon formats (recommended: PNG)
   - Ensure all drivers have properly sized icons

3. **Driver Validation**
   - Implement automated testing
   - Verify device compatibility

4. **Documentation**
   - Update documentation to reflect changes
   - Document requirements for new drivers

---
*Report generated automatically - Tuya Zigbee Integration*
""".format(invalid_count=len(invalid_drivers))
    
    return report

def open_file(filepath):
    """Open a file with the default application."""
    try:
        if platform.system() == 'Windows':
            os.startfile(filepath)
        elif platform.system() == 'Darwin':
            subprocess.Popen(['open', filepath])
        else:
            subprocess.Popen(['xdg-open', filepath])
    except Exception as e:
        print(f"⚠️ Could not open file: {e}")

def main():
    print("🚀 Starting Tuya Integration Report Generation...")
    
    # Create reports directory if it doesn't exist
    os.makedirs(CONFIG['reports_dir'], exist_ok=True)
    
    # Get all driver directories
    try:
        driver_dirs = [os.path.join(CONFIG['drivers_dir'], d) for d in os.listdir(CONFIG['drivers_dir']) 
                      if os.path.isdir(os.path.join(CONFIG['drivers_dir'], d))]
    except Exception as e:
        print(f"❌ Error reading drivers directory: {e}")
        return
    
    print(f"🔍 Found {len(driver_dirs)} drivers to analyze...")
    
    # Analyze each driver
    drivers = []
    for i, driver_dir in enumerate(driver_dirs, 1):
        print(f"\r📊 Analyzing drivers... {i}/{len(driver_dirs)}", end='', flush=True)
        drivers.append(analyze_driver(driver_dir))
    
    print("\n📝 Generating report...")
    
    # Generate and save the report
    report = generate_markdown_report(drivers)
    report_path = os.path.join(CONFIG['reports_dir'], CONFIG['output_file'])
    
    try:
        with open(report_path, 'w', encoding='utf-8') as f:
            f.write(report)
        
        print(f"\n✅ Report generated successfully: {report_path}")
        
        # Open the report
        open_file(report_path)
        
    except Exception as e:
        print(f"❌ Error saving report: {e}")

if __name__ == "__main__":
    main()
