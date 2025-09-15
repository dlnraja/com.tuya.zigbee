#!/usr/bin/env python3
"""
Advanced Source Analyzer for Ultimate Zigbee Hub
Analyzes all sources (GitHub issues, PRs, forum discussions, device databases) for missing features
"""

import os
import json
import re
from pathlib import Path

class AdvancedSourceAnalyzer:
    def __init__(self, project_path):
        self.project_path = Path(project_path)
        self.analysis_results = {
            'device_databases': {},
            'github_analysis': {},
            'forum_discussions': {},
            'missing_features': [],
            'enhancement_opportunities': [],
            'device_coverage_gaps': [],
            'recommended_additions': []
        }
        
    def analyze_device_databases(self):
        """Analyze all device databases in the project"""
        print("[ANALYZING] Device databases...")
        
        # Find all device database files
        db_files = list(self.project_path.rglob("*device*database*.json"))
        db_files.extend(list(self.project_path.rglob("*devices*.json")))
        
        all_devices = {}
        manufacturer_coverage = {}
        
        for db_file in db_files:
            try:
                with open(db_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                if isinstance(data, list):
                    devices = data
                elif isinstance(data, dict):
                    devices = data.get('devices', [])
                else:
                    continue
                
                for device in devices:
                    if isinstance(device, dict):
                        # Extract device information
                        model = device.get('model', device.get('modelID', 'Unknown'))
                        manufacturer = device.get('manufacturer', device.get('brand', 'Unknown'))
                        device_type = device.get('type', device.get('category', 'sensor'))
                        
                        device_key = f"{manufacturer}_{model}"
                        all_devices[device_key] = {
                            'model': model,
                            'manufacturer': manufacturer,
                            'type': device_type,
                            'capabilities': device.get('capabilities', []),
                            'clusters': device.get('clusters', []),
                            'source': str(db_file.name)
                        }
                        
                        # Track manufacturer coverage
                        if manufacturer not in manufacturer_coverage:
                            manufacturer_coverage[manufacturer] = []
                        manufacturer_coverage[manufacturer].append(model)
                        
            except Exception as e:
                print(f"[ERROR] Failed to analyze {db_file}: {e}")
        
        self.analysis_results['device_databases'] = {
            'total_devices': len(all_devices),
            'manufacturers': len(manufacturer_coverage),
            'manufacturer_coverage': manufacturer_coverage,
            'devices': all_devices
        }
        
        print(f"[FOUND] {len(all_devices)} devices from {len(manufacturer_coverage)} manufacturers")
        
    def analyze_github_sources(self):
        """Analyze GitHub issues, PRs, and repository data"""
        print("[ANALYZING] GitHub sources...")
        
        github_files = list(self.project_path.rglob("*github*.json"))
        github_files.extend(list(self.project_path.rglob("*issues*.json")))
        github_files.extend(list(self.project_path.rglob("*pr*.json")))
        
        issues = []
        prs = []
        feature_requests = []
        device_requests = []
        
        for gh_file in github_files:
            try:
                with open(gh_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                # Extract issues and PRs
                if 'issues' in data:
                    for issue in data['issues']:
                        if isinstance(issue, dict):
                            title = issue.get('title', '').lower()
                            body = issue.get('body', '').lower()
                            labels = [label.get('name', '') for label in issue.get('labels', [])]
                            
                            issue_info = {
                                'title': issue.get('title', ''),
                                'body': issue.get('body', ''),
                                'labels': labels,
                                'state': issue.get('state', ''),
                                'source': str(gh_file.name)
                            }
                            
                            if 'enhancement' in labels or 'feature' in title:
                                feature_requests.append(issue_info)
                            elif any(device in title for device in ['ts0', 'device', 'sensor', 'switch', 'plug']):
                                device_requests.append(issue_info)
                            
                            issues.append(issue_info)
                
                if 'pull_requests' in data or 'prs' in data:
                    pr_data = data.get('pull_requests', data.get('prs', []))
                    prs.extend(pr_data)
                    
            except Exception as e:
                print(f"[ERROR] Failed to analyze {gh_file}: {e}")
        
        self.analysis_results['github_analysis'] = {
            'total_issues': len(issues),
            'total_prs': len(prs),
            'feature_requests': feature_requests,
            'device_requests': device_requests
        }
        
        print(f"[FOUND] {len(issues)} issues, {len(prs)} PRs, {len(feature_requests)} features, {len(device_requests)} device requests")
        
    def analyze_forum_discussions(self):
        """Analyze Homey Community forum discussions"""
        print("[ANALYZING] Forum discussions...")
        
        forum_files = list(self.project_path.rglob("*forum*.json"))
        forum_files.extend(list(self.project_path.rglob("*community*.json")))
        forum_files.extend(list(self.project_path.rglob("*homey*.json")))
        
        discussions = []
        feature_suggestions = []
        device_compatibility_issues = []
        
        for forum_file in forum_files:
            try:
                with open(forum_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                if isinstance(data, dict) and 'discussions' in data:
                    for discussion in data['discussions']:
                        if isinstance(discussion, dict):
                            title = discussion.get('title', '').lower()
                            content = discussion.get('content', '').lower()
                            
                            discussion_info = {
                                'title': discussion.get('title', ''),
                                'content': discussion.get('content', ''),
                                'category': discussion.get('category', ''),
                                'replies': discussion.get('replies', 0),
                                'source': str(forum_file.name)
                            }
                            
                            # Categorize discussions
                            if any(word in title for word in ['feature', 'suggestion', 'enhancement', 'improvement']):
                                feature_suggestions.append(discussion_info)
                            elif any(word in title for word in ['not working', 'compatibility', 'support', 'error']):
                                device_compatibility_issues.append(discussion_info)
                            
                            discussions.append(discussion_info)
                            
            except Exception as e:
                print(f"[ERROR] Failed to analyze {forum_file}: {e}")
        
        self.analysis_results['forum_discussions'] = {
            'total_discussions': len(discussions),
            'feature_suggestions': feature_suggestions,
            'compatibility_issues': device_compatibility_issues
        }
        
        print(f"[FOUND] {len(discussions)} discussions, {len(feature_suggestions)} suggestions, {len(device_compatibility_issues)} compatibility issues")
        
    def identify_missing_features(self):
        """Identify missing features based on all sources"""
        print("[IDENTIFYING] Missing features...")
        
        missing_features = []
        
        # Common features requested in Zigbee apps
        standard_features = [
            {'name': 'Battery reporting optimization', 'priority': 'high', 'category': 'performance'},
            {'name': 'Custom device pairing instructions', 'priority': 'medium', 'category': 'usability'},
            {'name': 'Advanced scene support', 'priority': 'medium', 'category': 'functionality'},
            {'name': 'Device health monitoring', 'priority': 'medium', 'category': 'diagnostics'},
            {'name': 'Firmware update notifications', 'priority': 'low', 'category': 'maintenance'},
            {'name': 'Energy consumption analytics', 'priority': 'medium', 'category': 'analytics'},
            {'name': 'Automated device discovery', 'priority': 'high', 'category': 'usability'},
            {'name': 'Multi-language flow cards', 'priority': 'medium', 'category': 'localization'},
            {'name': 'Device group management', 'priority': 'medium', 'category': 'organization'},
            {'name': 'Advanced automation triggers', 'priority': 'high', 'category': 'functionality'}
        ]
        
        # Analyze current app structure to see what's missing
        app_json_path = self.project_path / ".homeycompose" / "app.json"
        current_features = set()
        
        if app_json_path.exists():
            try:
                with open(app_json_path, 'r', encoding='utf-8') as f:
                    app_data = json.load(f)
                
                # Check existing features
                permissions = app_data.get('permissions', [])
                if 'homey:manager:energy' in permissions:
                    current_features.add('energy_management')
                if 'homey:manager:notifications' in permissions:
                    current_features.add('notifications')
                    
            except Exception as e:
                print(f"[ERROR] Failed to analyze app.json: {e}")
        
        # Check for missing standard features
        for feature in standard_features:
            feature_key = feature['name'].lower().replace(' ', '_')
            if feature_key not in current_features:
                missing_features.append(feature)
        
        self.analysis_results['missing_features'] = missing_features
        print(f"[IDENTIFIED] {len(missing_features)} missing features")
        
    def generate_enhancement_recommendations(self):
        """Generate comprehensive enhancement recommendations"""
        print("[GENERATING] Enhancement recommendations...")
        
        recommendations = []
        
        # Device coverage recommendations
        device_data = self.analysis_results['device_databases']
        if device_data:
            total_devices = device_data['total_devices']
            manufacturers = device_data['manufacturers']
            
            if total_devices < 1000:
                recommendations.append({
                    'type': 'device_coverage',
                    'priority': 'high',
                    'title': 'Expand device database',
                    'description': f'Current coverage: {total_devices} devices from {manufacturers} manufacturers. Target: 1500+ devices.',
                    'action': 'Add more manufacturer IDs and device definitions'
                })
        
        # GitHub feature recommendations
        github_data = self.analysis_results['github_analysis']
        if github_data and github_data['feature_requests']:
            top_features = github_data['feature_requests'][:5]
            recommendations.append({
                'type': 'feature_implementation',
                'priority': 'medium',
                'title': 'Implement community requested features',
                'description': f'Found {len(github_data["feature_requests"])} feature requests from GitHub',
                'action': f'Prioritize implementation of top requested features: {[f["title"] for f in top_features]}'
            })
        
        # Forum compatibility recommendations
        forum_data = self.analysis_results['forum_discussions']
        if forum_data and forum_data['compatibility_issues']:
            recommendations.append({
                'type': 'compatibility_improvement',
                'priority': 'high', 
                'title': 'Address device compatibility issues',
                'description': f'Found {len(forum_data["compatibility_issues"])} compatibility issues in forums',
                'action': 'Review and fix reported device compatibility problems'
            })
        
        # Performance recommendations
        recommendations.extend([
            {
                'type': 'performance',
                'priority': 'medium',
                'title': 'Optimize battery device reporting',
                'description': 'Implement intelligent reporting intervals for battery devices',
                'action': 'Add configurable reporting intervals and battery optimization'
            },
            {
                'type': 'user_experience',
                'priority': 'medium',
                'title': 'Enhanced pairing experience',
                'description': 'Improve device discovery and pairing flow',
                'action': 'Add visual pairing guides and auto-detection'
            },
            {
                'type': 'robustness',
                'priority': 'high',
                'title': 'Error handling and recovery',
                'description': 'Implement comprehensive error handling and device recovery',
                'action': 'Add retry mechanisms and offline device handling'
            }
        ])
        
        self.analysis_results['enhancement_opportunities'] = recommendations
        print(f"[GENERATED] {len(recommendations)} enhancement recommendations")
        
    def create_device_matrix_update(self):
        """Create updated device compatibility matrix"""
        print("[UPDATING] Device matrix...")
        
        device_matrix = {
            'metadata': {
                'last_updated': '2025-09-14',
                'total_devices': 0,
                'total_manufacturers': 0,
                'coverage_score': 0.0
            },
            'manufacturers': {},
            'device_types': {},
            'compatibility_matrix': {}
        }
        
        # Aggregate all device data
        all_devices = self.analysis_results['device_databases'].get('devices', {})
        manufacturer_coverage = self.analysis_results['device_databases'].get('manufacturer_coverage', {})
        
        device_matrix['metadata']['total_devices'] = len(all_devices)
        device_matrix['metadata']['total_manufacturers'] = len(manufacturer_coverage)
        device_matrix['manufacturers'] = manufacturer_coverage
        
        # Categorize by device types
        device_types = {}
        for device_key, device_info in all_devices.items():
            device_type = device_info.get('type', 'unknown')
            if device_type not in device_types:
                device_types[device_type] = []
            device_types[device_type].append(device_info)
        
        device_matrix['device_types'] = {k: len(v) for k, v in device_types.items()}
        
        # Calculate coverage score (based on Johan Bendz standards)
        target_devices = 1500
        target_manufacturers = 100
        current_score = min(100, (len(all_devices) / target_devices * 50) + (len(manufacturer_coverage) / target_manufacturers * 50))
        device_matrix['metadata']['coverage_score'] = round(current_score, 2)
        
        # Save updated matrix
        matrix_path = self.project_path / "matrices" / "ENHANCED_DEVICE_MATRIX.json"
        matrix_path.parent.mkdir(exist_ok=True)
        
        with open(matrix_path, 'w', encoding='utf-8') as f:
            json.dump(device_matrix, f, indent=2, ensure_ascii=False)
        
        print(f"[UPDATED] Device matrix: {len(all_devices)} devices, {len(manufacturer_coverage)} manufacturers, {current_score:.1f}% coverage")
        
    def run_comprehensive_analysis(self):
        """Run complete source analysis"""
        print("=== ADVANCED SOURCE ANALYSIS ===")
        
        # Analyze all sources
        self.analyze_device_databases()
        self.analyze_github_sources()
        self.analyze_forum_discussions()
        self.identify_missing_features()
        self.generate_enhancement_recommendations()
        self.create_device_matrix_update()
        
        # Generate comprehensive report
        report_path = self.project_path / "comprehensive_source_analysis_report.json"
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(self.analysis_results, f, indent=2, ensure_ascii=False)
        
        # Print summary
        print("\n=== ANALYSIS SUMMARY ===")
        print(f"Devices analyzed: {self.analysis_results['device_databases'].get('total_devices', 0)}")
        print(f"Manufacturers covered: {self.analysis_results['device_databases'].get('manufacturers', 0)}")
        print(f"GitHub issues/PRs: {self.analysis_results['github_analysis'].get('total_issues', 0)}")
        print(f"Forum discussions: {self.analysis_results['forum_discussions'].get('total_discussions', 0)}")
        print(f"Missing features identified: {len(self.analysis_results['missing_features'])}")
        print(f"Enhancement opportunities: {len(self.analysis_results['enhancement_opportunities'])}")
        print(f"Report saved to: {report_path}")
        
        return self.analysis_results

def main():
    project_path = r"c:\Users\HP\Desktop\tuya_repair"
    analyzer = AdvancedSourceAnalyzer(project_path)
    results = analyzer.run_comprehensive_analysis()

if __name__ == "__main__":
    main()
