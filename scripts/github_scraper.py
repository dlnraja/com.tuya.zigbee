#!/usr/bin/env python3
"""
GitHub & Forum Scraper for Tuya Zigbee Device Information
Extracts manufacturerNames, clusters, and data points from:
- JohanBendz/com.tuya.zigbee issues/PRs
- dlnraja/com.tuya.zigbee issues/PRs
- community.homey.app forum posts
"""

import re
import json
import requests
from bs4 import BeautifulSoup
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Set
import time

class TuyaDeviceScraper:
    def __init__(self):
        self.manufacturers = set()
        self.clusters = {}
        self.datapoints = {}
        self.devices = []

        # GitHub API base URLs
        self.github_repos = [
            "JohanBendz/com.tuya.zigbee",
            "dlnraja/com.tuya.zigbee"
        ]

        # Output directory
        self.output_dir = Path(__file__).parent.parent / "scraped_data"
        self.output_dir.mkdir(exist_ok=True)

    def extract_manufacturer_names(self, text: str) -> List[str]:
        """Extract manufacturer names like _TZ3000_xxx, _TZE200_xxx"""
        pattern = r'_TZ[E]?\d{3,4}_[a-zA-Z0-9]+'
        return re.findall(pattern, text)

    def extract_model_ids(self, text: str) -> List[str]:
        """Extract model IDs like TS0601, TS0202"""
        pattern = r'TS\d{4}'
        return re.findall(pattern, text)

    def extract_clusters(self, text: str) -> Dict[str, List[int]]:
        """Extract cluster information from interview data"""
        clusters = {}

        # Extract input clusters
        input_match = re.search(r'"inputClusters":\s*\[([\d,\s]+)\]', text)
        if input_match:
            clusters['input'] = [int(c.strip()) for c in input_match.group(1).split(',') if c.strip()]

        # Extract output clusters
        output_match = re.search(r'"outputClusters":\s*\[([\d,\s]+)\]', text)
        if output_match:
            clusters['output'] = [int(c.strip()) for c in output_match.group(1).split(',') if c.strip()]

        return clusters

    def extract_datapoints(self, text: str) -> List[int]:
        """Extract Tuya datapoint (DP) numbers"""
        # Look for patterns like "dp":1, "datapoint":2, etc.
        pattern = r'(?:dp|datapoint)[":]?\s*[:=]?\s*(\d+)'
        return [int(m) for m in re.findall(pattern, text, re.IGNORECASE)]

    def scrape_github_issues(self, repo: str, state: str = "all"):
        """Scrape GitHub issues from a repository"""
        print(f"\n📥 Scraping {repo} issues ({state})...")

        # Using GitHub API (no auth needed for public repos, but rate-limited)
        page = 1
        while True:
            url = f"https://api.github.com/repos/{repo}/issues"
            params = {
                "state": state,
                "per_page": 100,
                "page": page
            }

            try:
                response = requests.get(url, params=params, timeout=30)
                if response.status_code == 403:
                    print("⚠️  Rate limit reached. Waiting 60s...")
                    time.sleep(60)
                    continue

                response.raise_for_status()
                issues = response.json()

                if not issues:
                    break

                for issue in issues:
                    # Skip pull requests
                    if 'pull_request' in issue:
                        continue

                    self.process_issue(issue, repo)

                print(f"   ✅ Processed page {page} ({len(issues)} issues)")
                page += 1
                time.sleep(1)  # Be nice to API

            except Exception as e:
                print(f"   ❌ Error: {e}")
                break

    def process_issue(self, issue: dict, repo: str):
        """Process a single issue and extract device information"""
        title = issue.get('title', '')
        body = issue.get('body', '') or ''
        full_text = f"{title}\n{body}"

        # Extract manufacturers
        manufacturers = self.extract_manufacturer_names(full_text)
        self.manufacturers.update(manufacturers)

        # Extract model IDs
        models = self.extract_model_ids(full_text)

        # Extract clusters
        clusters = self.extract_clusters(body)

        # Extract datapoints
        datapoints = self.extract_datapoints(body)

        if manufacturers or models or clusters or datapoints:
            device_info = {
                "source": f"github:{repo}",
                "issue_number": issue['number'],
                "title": title,
                "url": issue['html_url'],
                "state": issue['state'],
                "created_at": issue['created_at'],
                "manufacturers": manufacturers,
                "models": models,
                "clusters": clusters,
                "datapoints": datapoints
            }

            self.devices.append(device_info)

            # Store cluster info per manufacturer
            for mfr in manufacturers:
                if mfr not in self.clusters:
                    self.clusters[mfr] = []
                if clusters:
                    self.clusters[mfr].append({
                        "issue": issue['number'],
                        "clusters": clusters
                    })

            # Store datapoint info per manufacturer
            for mfr in manufacturers:
                if mfr not in self.datapoints:
                    self.datapoints[mfr] = set()
                self.datapoints[mfr].update(datapoints)

    def scrape_forum(self, search_query: str = "tuya zigbee manufacturerName"):
        """Scrape Homey community forum"""
        print(f"\n📥 Scraping Homey forum...")

        # Note: Forum requires JS rendering, so we'll use a simplified approach
        # This would ideally use selenium or similar for JS rendering
        print("   ℹ️  Forum scraping requires manual export or selenium")
        print("   ℹ️  Use GitHub data for now")

    def generate_report(self):
        """Generate comprehensive JSON reports"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

        # 1. All devices
        devices_file = self.output_dir / f"devices_{timestamp}.json"
        with open(devices_file, 'w', encoding='utf-8') as f:
            json.dump(self.devices, f, indent=2, ensure_ascii=False)
        print(f"\n📄 Devices saved: {devices_file}")

        # 2. Manufacturers list
        manufacturers_file = self.output_dir / f"manufacturers_{timestamp}.json"
        with open(manufacturers_file, 'w', encoding='utf-8') as f:
            json.dump(sorted(list(self.manufacturers)), f, indent=2)
        print(f"📄 Manufacturers saved: {manufacturers_file}")

        # 3. Clusters by manufacturer
        clusters_file = self.output_dir / f"clusters_{timestamp}.json"
        # Convert sets to lists for JSON serialization
        clusters_serializable = {
            k: v for k, v in self.clusters.items()
        }
        with open(clusters_file, 'w', encoding='utf-8') as f:
            json.dump(clusters_serializable, f, indent=2)
        print(f"📄 Clusters saved: {clusters_file}")

        # 4. Datapoints by manufacturer
        datapoints_file = self.output_dir / f"datapoints_{timestamp}.json"
        # Convert sets to lists
        datapoints_serializable = {
            k: sorted(list(v)) for k, v in self.datapoints.items()
        }
        with open(datapoints_file, 'w', encoding='utf-8') as f:
            json.dump(datapoints_serializable, f, indent=2)
        print(f"📄 Datapoints saved: {datapoints_file}")

        # 5. Summary statistics
        summary = {
            "timestamp": timestamp,
            "statistics": {
                "total_devices": len(self.devices),
                "unique_manufacturers": len(self.manufacturers),
                "manufacturers_with_clusters": len(self.clusters),
                "manufacturers_with_datapoints": len(self.datapoints)
            },
            "top_manufacturers": list(self.manufacturers)[:50]
        }

        summary_file = self.output_dir / f"summary_{timestamp}.json"
        with open(summary_file, 'w', encoding='utf-8') as f:
            json.dump(summary, f, indent=2)
        print(f"📄 Summary saved: {summary_file}")

        # 6. Generate markdown report
        self.generate_markdown_report(timestamp)

    def generate_markdown_report(self, timestamp: str):
        """Generate human-readable markdown report"""
        md_file = self.output_dir / f"REPORT_{timestamp}.md"

        with open(md_file, 'w', encoding='utf-8') as f:
            f.write("# Tuya Zigbee Device Scraping Report\n\n")
            f.write(f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")

            f.write("## 📊 Statistics\n\n")
            f.write(f"- **Total Devices Found:** {len(self.devices)}\n")
            f.write(f"- **Unique Manufacturers:** {len(self.manufacturers)}\n")
            f.write(f"- **Manufacturers with Clusters:** {len(self.clusters)}\n")
            f.write(f"- **Manufacturers with Datapoints:** {len(self.datapoints)}\n\n")

            f.write("## 🏭 Manufacturers\n\n")
            for mfr in sorted(self.manufacturers)[:100]:
                cluster_count = len(self.clusters.get(mfr, []))
                dp_count = len(self.datapoints.get(mfr, set()))
                f.write(f"- `{mfr}` - {cluster_count} cluster refs, {dp_count} datapoints\n")

            if len(self.manufacturers) > 100:
                f.write(f"\n*...and {len(self.manufacturers) - 100} more*\n")

            f.write("\n## 📦 Recent Devices\n\n")
            for device in self.devices[:20]:
                f.write(f"### {device['title']}\n\n")
                f.write(f"- **Source:** {device['source']}\n")
                f.write(f"- **URL:** {device['url']}\n")
                f.write(f"- **State:** {device['state']}\n")
                if device['manufacturers']:
                    f.write(f"- **Manufacturers:** {', '.join(device['manufacturers'])}\n")
                if device['models']:
                    f.write(f"- **Models:** {', '.join(device['models'])}\n")
                if device['clusters']:
                    f.write(f"- **Clusters:** {json.dumps(device['clusters'])}\n")
                if device['datapoints']:
                    f.write(f"- **Datapoints:** {device['datapoints']}\n")
                f.write("\n")

        print(f"📄 Markdown report: {md_file}")

def main():
    print("🚀 Tuya Zigbee Device Scraper Starting...")
    print("=" * 60)

    scraper = TuyaDeviceScraper()

    # Scrape all GitHub repos
    for repo in scraper.github_repos:
        scraper.scrape_github_issues(repo, state="all")

    # Generate reports
    print("\n" + "=" * 60)
    print("📊 Generating reports...")
    scraper.generate_report()

    print("\n✅ Scraping complete!")
    print(f"   📁 Output directory: {scraper.output_dir}")
    print(f"   🏭 Manufacturers found: {len(scraper.manufacturers)}")
    print(f"   📦 Devices processed: {len(scraper.devices)}")

if __name__ == "__main__":
    main()
