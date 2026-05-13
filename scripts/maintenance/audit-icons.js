const fs = require('fs');
const path = require('path');
const glob = require('glob');

async function auditIcons() {
    console.log('Starting Icon Audit...');
    const driversPath = path.join(process.cwd(), 'drivers');
    const icons = glob.sync('**/assets/icon.svg', { cwd: driversPath });

    const report = {
        totalIcons: icons.length,
        nonCompliant: [],
        compliant: [],
        details: []
    };

    for (const iconRelPath of icons) {
        const iconPath = path.join(driversPath, iconRelPath);
        const content = fs.readFileSync(iconPath, 'utf8');
        const driverName = path.dirname(path.dirname(iconRelPath));

        const issues = [];
        
        // Check for text tags
        if (content.includes('<text') || content.includes('<tspan')) {
            issues.push('Contains text labels');
        }

        // Check for viewBox
        const viewBoxMatch = content.match(/viewBox="([^"]+)"/);
        if (viewBoxMatch) {
            const dims = viewBoxMatch[1].split(/[ ,]+/).map(Number);
            if (dims.length === 4) {
                const width = dims[2];
                const height = dims[3];
                if (width !== 960 || height !== 960) {
                    issues.push(`Incorrect dimensions: ${width}x${height} (Expected 960x960)`);
                }
            }
        } else {
            issues.push('Missing viewBox');
        }

        // Check for complex diagrams (heuristics)
        if (content.length > 50000) {
            issues.push('SVG file size too large (>50KB)');
        }

        if (issues.length > 0) {
            report.nonCompliant.push(driverName);
            report.details.push({
                driver: driverName,
                path: iconRelPath,
                issues: issues
            });
        } else {
            report.compliant.push(driverName);
        }
    }

    console.log(`\nAudit Results:`);
    console.log(`Total Icons: ${report.totalIcons}`);
    console.log(`Compliant: ${report.compliant.length}`);
    console.log(`Non-Compliant: ${report.nonCompliant.length}`);
    
    fs.writeFileSync('icon_audit_report.json', JSON.stringify(report, null, 2));
    console.log('\nReport saved to icon_audit_report.json');

    // Generate Markdown summary for user
    let md = '# Icon Audit Summary\n\n';
    md += `Total Icons: ${report.totalIcons}\n`;
    md += `Compliant: ${report.compliant.length}\n`;
    md += `Non-Compliant: ${report.nonCompliant.length}\n\n`;
    md += '## Non-Compliant Drivers\n';
    report.details.slice(0, 50).forEach(d => {
        md += `- **${d.driver}**: ${d.issues.join(', ')}\n`;
    });
    if (report.details.length > 50) md += `\n... and ${report.details.length - 50} more.`;
    
    fs.writeFileSync('icon_audit_summary.md', md);
}

auditIcons();
