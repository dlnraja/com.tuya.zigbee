#!/usr/bin/env python3
import requests
import json
import time
import os
from datetime import datetime

class ComprehensiveSourceScraper:
    def __init__(self):
        self.sources = {
            'johan_bendz_issues': 'https://api.github.com/repos/JohanBendz/com.tuya.zigbee/issues?state=open&per_page=100',
            'johan_bendz_closed_issues': 'https://api.github.com/repos/JohanBendz/com.tuya.zigbee/issues?state=closed&per_page=100',
            'johan_bendz_prs': 'https://api.github.com/repos/JohanBendz/com.tuya.zigbee/pulls?state=all&per_page=100',
            'homey_community_tuya': 'https://community.homey.app/t/tuya-zigbee-app/35928.json',
            'blakadder_db': 'https://zigbee.blakadder.com/assets/js/devices.js'
        }
        self.scraped_data = {}
        self.device_database = {}
        
    def scrape_github_api(self, url, source_name):
        """Scrape GitHub API endpoints"""
        try:
            print(f"Scraping {source_name}...")
            headers = {
                'User-Agent': 'Ultimate-Zigbee-Hub-Scraper/1.0',
                'Accept': 'application/vnd.github+json'
            }
            
            response = requests.get(url, headers=headers, timeout=30)
            if response.status_code == 200:
                data = response.json()
                print(f"Scraped {len(data)} items from {source_name}")
                return data
            else:
                print(f"Failed to scrape {source_name}: {response.status_code}")
                return []
        except Exception as e:
            print(f"Error scraping {source_name}: {e}")
            return []
    
    def extract_device_info_from_issues(self, issues):
        """Extract device information from GitHub issues"""
        devices = []
        for issue in issues:
            if 'device request' in issue['title'].lower():
                device_info = self.parse_device_request_title(issue['title'])
                if device_info:
                    device_info.update({
                        'issue_number': issue['number'],
                        'issue_url': issue['html_url'],
                        'author': issue['user']['login'],
                        'created_at': issue['created_at'],
                        'body': issue['body'],
                        'labels': [label['name'] for label in issue['labels']]
                    })
                    devices.append(device_info)
        return devices
    
    def parse_device_request_title(self, title):
        """Parse device request title to extract manufacturer and model"""
        import re
        
        # Pattern pour extraire les infos: "Device Request - [name] - [manufacturer] / [model]"
        patterns = [
            r'Device Request - \[(.+?)\] - \[(.+?)\] / \[(.+?)\]',
            r'Device Request - (.+?) - (.+?) / (.+?)$',
            r'Device Request - (.+?) / (.+?)$',
            r'(.+?) - (.+?) / (.+?)$'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, title, re.IGNORECASE)
            if match:
                groups = match.groups()
                if len(groups) >= 3:
                    return {
                        'device_name': groups[0].strip(),
                        'manufacturer': groups[1].strip(),
                        'model': groups[2].strip()
                    }
                elif len(groups) == 2:
                    return {
                        'device_name': groups[0].strip(),
                        'manufacturer': 'TUYA',
                        'model': groups[1].strip()
                    }
        
        return None
    
    def scrape_all_sources(self):
        """Scrape all configured sources"""
        print("Starting comprehensive source scraping...")
        
        # Scrape GitHub issues
        issues = self.scrape_github_api(self.sources['johan_bendz_issues'], 'Johan Bendz Open Issues')
        closed_issues = self.scrape_github_api(self.sources['johan_bendz_closed_issues'], 'Johan Bendz Closed Issues')
        prs = self.scrape_github_api(self.sources['johan_bendz_prs'], 'Johan Bendz Pull Requests')
        
        # Combine all issues
        all_issues = issues + closed_issues
        
        # Extract device information
        devices = self.extract_device_info_from_issues(all_issues)
        
        self.scraped_data = {
            'timestamp': datetime.now().isoformat(),
            'sources': {
                'github_issues': {
                    'open_issues': issues,
                    'closed_issues': closed_issues,
                    'pull_requests': prs
                }
            },
            'extracted_devices': devices,
            'statistics': {
                'total_issues': len(all_issues),
                'total_devices_found': len(devices),
                'open_issues': len(issues),
                'closed_issues': len(closed_issues),
                'pull_requests': len(prs)
            }
        }
        
        return self.scraped_data
    
    def enhance_device_database(self):
        """Enhance device database with scraped information"""
        print("Enhancing device database...")
        
        enhanced_devices = {}
        
        for device in self.scraped_data['extracted_devices']:
            device_key = f"{device['manufacturer']}_{device['model']}".replace(' ', '_').lower()
            
            enhanced_devices[device_key] = {
                'name': device['device_name'],
                'manufacturer': device['manufacturer'],
                'model': device['model'],
                'source': 'github_issues',
                'issue_url': device['issue_url'],
                'community_requested': True,
                'priority': 'high' if device['author'] else 'medium',
                'capabilities': self.infer_capabilities(device['device_name']),
                'zigbee_info': self.infer_zigbee_info(device['manufacturer'], device['model']),
                'metadata': {
                    'issue_number': device['issue_number'],
                    'author': device['author'],
                    'created_at': device['created_at']
                }
            }
        
        self.device_database = enhanced_devices
        return enhanced_devices
    
    def infer_capabilities(self, device_name):
        """Infer device capabilities from name"""
        name_lower = device_name.lower()
        capabilities = []
        
        capability_mappings = {
            'temperature': ['measure_temperature'],
            'humidity': ['measure_humidity'],
            'motion': ['alarm_motion'],
            'contact': ['alarm_contact'],
            'smoke': ['alarm_smoke'],
            'water': ['alarm_water'],
            'leak': ['alarm_water'],
            'door': ['alarm_contact'],
            'window': ['alarm_contact'],
            'switch': ['onoff'],
            'dimmer': ['onoff', 'dim'],
            'light': ['onoff', 'dim'],
            'plug': ['onoff'],
            'energy': ['measure_power', 'meter_power'],
            'battery': ['measure_battery'],
            'thermostat': ['target_temperature', 'measure_temperature'],
            'valve': ['target_temperature'],
            'soil': ['measure_temperature', 'measure_humidity'],
            'air quality': ['measure_pm25'],
            'co': ['alarm_co'],
            'gas': ['alarm_gas']
        }
        
        for keyword, caps in capability_mappings.items():
            if keyword in name_lower:
                capabilities.extend(caps)
        
        # Remove duplicates and add battery if it's a sensor
        capabilities = list(set(capabilities))
        if any(cap.startswith('alarm_') or cap.startswith('measure_') for cap in capabilities):
            if 'measure_battery' not in capabilities:
                capabilities.append('measure_battery')
        
        return capabilities
    
    def infer_zigbee_info(self, manufacturer, model):
        """Infer Zigbee information"""
        zigbee_info = {
            'manufacturerName': [],
            'productId': [model],
            'clusters': [0, 1, 3]  # Basic clusters
        }
        
        # Add manufacturer variations
        manufacturer_variations = {
            'TUYA': ['_TZ3000_', '_TZE200_', '_TZE284_', 'TUYA'],
            'MOES': ['_TZ3000_', 'MOES'],
            'ONENUO': ['_TZE284_', 'ONENUO'],
            'BSEED': ['_TZ3000_', 'BSEED'],
            'NEDIS': ['_TZ3000_', 'NEDIS'],
            'WoodUpp': ['WoodUpp'],
            'HOBEIAN': ['_TZ3000_', 'HOBEIAN']
        }
        
        if manufacturer.upper() in manufacturer_variations:
            zigbee_info['manufacturerName'] = manufacturer_variations[manufacturer.upper()]
        else:
            zigbee_info['manufacturerName'] = [manufacturer, '_TZ3000_', 'TUYA']
        
        return zigbee_info
    
    def save_results(self, output_dir='data/enhanced_sources'):
        """Save scraping results"""
        os.makedirs(output_dir, exist_ok=True)
        
        # Save raw scraped data
        with open(f'{output_dir}/scraped_data.json', 'w', encoding='utf-8') as f:
            json.dump(self.scraped_data, f, indent=2, ensure_ascii=False)
        
        # Save enhanced device database
        with open(f'{output_dir}/enhanced_device_database.json', 'w', encoding='utf-8') as f:
            json.dump(self.device_database, f, indent=2, ensure_ascii=False)
        
        # Save summary report
        report = {
            'scraping_timestamp': self.scraped_data['timestamp'],
            'statistics': self.scraped_data['statistics'],
            'new_devices_found': len(self.device_database),
            'high_priority_devices': len([d for d in self.device_database.values() if d['priority'] == 'high']),
            'device_types': self.analyze_device_types()
        }
        
        with open(f'{output_dir}/scraping_report.json', 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        print(f"Results saved to {output_dir}/")
        return report
    
    def analyze_device_types(self):
        """Analyze types of devices found"""
        type_counts = {}
        for device in self.device_database.values():
            device_name = device['name'].lower()
            for device_type in ['sensor', 'switch', 'light', 'plug', 'thermostat', 'detector', 'valve']:
                if device_type in device_name:
                    type_counts[device_type] = type_counts.get(device_type, 0) + 1
                    break
            else:
                type_counts['other'] = type_counts.get('other', 0) + 1
        return type_counts

if __name__ == "__main__":
    scraper = ComprehensiveSourceScraper()
    
    # Scrape all sources
    scraped_data = scraper.scrape_all_sources()
    
    # Enhance device database
    enhanced_db = scraper.enhance_device_database()
    
    # Save results
    report = scraper.save_results()
    
    print("\nSCRAPING SUMMARY:")
    print(f"Total issues analyzed: {report['statistics']['total_issues']}")
    print(f"New devices found: {report['new_devices_found']}")
    print(f"High priority devices: {report['high_priority_devices']}")
    print(f"Device types: {report['device_types']}")
