const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const sourceImg = 'C:\\Users\\HP\\.gemini\\antigravity\\brain\\5f53ae3a-521f-4e04-8e55-91827922913a\\radiator_icon_500x500_1776086374640.png';

function walk(dir) {
    if (dir.includes('node_modules')) return;
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            walk(filePath);
        } else if (file === 'large.png') {
            try {
                // Simplified size check using powershell via cmd to avoid escaping hell
                const cmd = `powershell -Command "Add-Type -AssemblyName System.Drawing; $img = [System.Drawing.Image]::FromFile('${filePath}'); Write-Host \\"$($img.Width)x$($img.Height)\\""`;
                const out = execSync(cmd).toString().trim();
                if (out !== '500x500') {
                    console.log(`Fixing invalid size (${out}) image: ${filePath}`);
                    fs.copyFileSync(sourceImg, filePath);
                }
            } catch (e) {
                // console.error(`Failed to process ${filePath}: ${e.message}`);
            }
        }
    });
}

console.log('--- Scanning and fixing 300x300 large.png files ---');
walk('drivers');
console.log('--- Scan complete ---');
