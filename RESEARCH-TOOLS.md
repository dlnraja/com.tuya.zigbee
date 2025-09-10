# Tuya Zigbee Research Tools

This directory contains tools for researching Tuya Zigbee devices, collecting data from various sources, and analyzing device compatibility.

## Available Scripts

### 1. Homey Forum Scraper

**File:** `scripts/research/homey-forum-scraper.js`

This script scrapes the Homey Community Forum for discussions about Tuya Zigbee devices, extracting device models, features, and compatibility information.

**Usage:**
```bash
# Install dependencies
npm install axios cheerio

# Run the scraper
node scripts/research/homey-forum-scraper.js
```

**Output:**
- `research/homey-forum/homey-forum-topics-*.json` - Raw forum posts
- `research/homey-forum/homey-forum-topics-final.json` - Combined results

---

### 2. GitHub Repository Scraper

**File:** `scripts/research/github-scraper.js`

This script searches GitHub for repositories related to Tuya and Zigbee, with a focus on Johan Benz's repositories and forks.

**Prerequisites:**
- GitHub Personal Access Token with `public_repo` scope
- Set the token as an environment variable: `export GITHUB_TOKEN=your_token_here`

**Usage:**
```bash
# Install dependencies
npm install @octokit/rest @octokit/plugin-retry @octokit/plugin-throttling

# Run the scraper
export GITHUB_TOKEN=your_token_here
node scripts/research/github-scraper.js
```

**Output:**
- `research/github/johan-benz-repos.json` - List of Johan Benz's repositories
- `research/github/johan-benz-repo-details.json` - Detailed repository information
- `research/github/github-search-results.json` - General Tuya/Zigbee search results

---

### 3. Device Data Analyzer

**File:** `scripts/analysis/analyze-device-data.js`

This script analyzes the collected data from various sources, identifies Tuya Zigbee devices, and generates a comprehensive device database and compatibility matrix.

**Usage:**
```bash
# Install dependencies
npm install natural

# Run the analyzer
node scripts/analysis/analyze-device-data.js
```

**Output:**
- `data/device-database/device-database.json` - Comprehensive device database
- `docs/sources/DEVICE_MATRIX.md` - Markdown table of device compatibility

---

## Research Workflow

1. **Data Collection**
   - Run the Homey Forum Scraper to collect discussions
   - Run the GitHub Scraper to find relevant code and documentation

2. **Data Analysis**
   - The Device Data Analyzer will process the collected data
   - It will identify device models, features, and compatibility information

3. **Review Results**
   - Check the generated `DEVICE_MATRIX.md` for a summary of devices
   - Review the detailed device database for more information

4. **Update Implementation**
   - Use the collected information to implement or update device drivers
   - Add support for new devices based on community findings

---

## Important Notes

- Be respectful of API rate limits when running the scrapers
- The scrapers include delays between requests to avoid overloading servers
- Some data sources may require authentication (e.g., GitHub API token)
- Always review and respect the terms of service for each data source

---

## Next Steps

1. Review the collected data in the `research` directory
2. Update the device drivers based on the findings
3. Contribute back to the community by sharing your findings

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
