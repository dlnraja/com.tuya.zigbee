/**
 * GENERIC DRAWER MODULE
 * Fallback drawer pour tous les autres types de devices
 */

class GenericDrawer {
    constructor(standards) {
        this.standards = standards;
    }

    async drawOnCanvas(ctx, driverName, features, dimensions, standards) {
        const { width, height } = dimensions;
        const centerX = width / 2;
        const centerY = height / 2;
        
        // Déterminer la catégorie
        const category = this.determineCategory(driverName);
        const colors = standards.colorPalette[category] || standards.colorPalette.automation;
        
        // Background blanc
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);
        
        // Device principal selon le type
        if (driverName.includes('lock')) {
            this.drawLock(ctx, dimensions, colors);
        } else if (driverName.includes('plug') || driverName.includes('outlet')) {
            this.drawPlug(ctx, dimensions, colors);
        } else if (driverName.includes('remote') || driverName.includes('controller')) {
            this.drawRemote(ctx, driverName, dimensions, colors);
        } else if (driverName.includes('thermostat')) {
            this.drawThermostat(ctx, dimensions, colors);
        } else {
            this.drawGenericDevice(ctx, driverName, dimensions, colors);
        }
    }

    drawLock(ctx, dimensions, colors) {
        const { width, height } = dimensions;
        const centerX = width / 2;
        const centerY = height / 2;
        const lockSize = Math.min(width, height) / 3;
        
        // Corps de la serrure
        const gradient = ctx.createLinearGradient(centerX - lockSize, centerY - lockSize/2, centerX + lockSize, centerY + lockSize/2);
        gradient.addColorStop(0, colors[0]);
        gradient.addColorStop(1, colors[1] || colors[0]);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(centerX - lockSize, centerY - lockSize/2, lockSize * 2, lockSize);
        
        ctx.strokeStyle = colors[1] || colors[0];
        ctx.lineWidth = 3;
        ctx.strokeRect(centerX - lockSize, centerY - lockSize/2, lockSize * 2, lockSize);
        
        // Anse de la serrure
        ctx.strokeStyle = colors[1] || colors[0];
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(centerX, centerY - lockSize/4, lockSize/2, Math.PI, 0, false);
        ctx.stroke();
        
        // Trou de serrure
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(centerX, centerY, lockSize/4, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.fillRect(centerX - lockSize/8, centerY, lockSize/4, lockSize/3);
    }

    drawPlug(ctx, dimensions, colors) {
        const { width, height } = dimensions;
        const centerX = width / 2;
        const centerY = height / 2;
        const plugSize = Math.min(width, height) / 3;
        
        // Corps de la prise
        const gradient = ctx.createLinearGradient(centerX - plugSize, centerY - plugSize, centerX + plugSize, centerY + plugSize);
        gradient.addColorStop(0, colors[0]);
        gradient.addColorStop(1, colors[1] || colors[0]);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(centerX - plugSize, centerY - plugSize, plugSize * 2, plugSize * 2);
        
        ctx.strokeStyle = colors[1] || colors[0];
        ctx.lineWidth = 3;
        ctx.strokeRect(centerX - plugSize, centerY - plugSize, plugSize * 2, plugSize * 2);
        
        // Trous de la prise (EU style)
        ctx.fillStyle = 'white';
        
        // Trous principaux
        const holeSize = plugSize / 6;
        ctx.fillRect(centerX - holeSize - 8, centerY - holeSize/2, holeSize * 2, holeSize);
        ctx.fillRect(centerX + 8 - holeSize, centerY - holeSize/2, holeSize * 2, holeSize);
        
        // Terre (rond)
        ctx.beginPath();
        ctx.arc(centerX, centerY + 15, holeSize/2, 0, 2 * Math.PI);
        ctx.fill();
    }

    drawRemote(ctx, driverName, dimensions, colors) {
        const { width, height } = dimensions;
        const centerX = width / 2;
        const centerY = height / 2;
        const remoteWidth = width / 2.5;
        const remoteHeight = height / 1.5;
        
        // Corps de la télécommande
        const gradient = ctx.createLinearGradient(centerX, centerY - remoteHeight/2, centerX, centerY + remoteHeight/2);
        gradient.addColorStop(0, colors[0]);
        gradient.addColorStop(1, colors[1] || colors[0]);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(centerX - remoteWidth/2, centerY - remoteHeight/2, remoteWidth, remoteHeight);
        
        ctx.strokeStyle = colors[1] || colors[0];
        ctx.lineWidth = 2;
        ctx.strokeRect(centerX - remoteWidth/2, centerY - remoteHeight/2, remoteWidth, remoteHeight);
        
        // Boutons de la télécommande
        const buttonSize = Math.min(remoteWidth, remoteHeight) / 8;
        const buttonSpacing = buttonSize + 5;
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        
        // Grille de boutons 3x4
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 3; col++) {
                const btnX = centerX - buttonSpacing + (col * buttonSpacing);
                const btnY = centerY - remoteHeight/2 + 20 + (row * buttonSpacing);
                
                ctx.beginPath();
                ctx.arc(btnX, btnY, buttonSize/2, 0, 2 * Math.PI);
                ctx.fill();
                
                ctx.strokeStyle = colors[1] || colors[0];
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        }
    }

    drawThermostat(ctx, dimensions, colors) {
        const { width, height } = dimensions;
        const centerX = width / 2;
        const centerY = height / 2;
        const thermoRadius = Math.min(width, height) / 3;
        
        // Corps circulaire
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, thermoRadius);
        gradient.addColorStop(0, colors[0]);
        gradient.addColorStop(1, colors[1] || colors[0]);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, thermoRadius, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.strokeStyle = colors[1] || colors[0];
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Écran central
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(centerX, centerY, thermoRadius * 0.6, 0, 2 * Math.PI);
        ctx.fill();
        
        // Affichage température
        ctx.fillStyle = '#00FF00';
        ctx.font = `${Math.max(12, thermoRadius/3)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('21°', centerX, centerY - 5);
        
        ctx.fillStyle = '#FFFF00';
        ctx.font = `${Math.max(8, thermoRadius/5)}px Arial`;
        ctx.fillText('AUTO', centerX, centerY + 10);
        
        // Contrôles rotatifs
        for (let i = 0; i < 12; i++) {
            const angle = (i * 30) * (Math.PI / 180);
            const x1 = centerX + (thermoRadius + 5) * Math.cos(angle);
            const y1 = centerY + (thermoRadius + 5) * Math.sin(angle);
            const x2 = centerX + (thermoRadius + 10) * Math.cos(angle);
            const y2 = centerY + (thermoRadius + 10) * Math.sin(angle);
            
            ctx.strokeStyle = colors[1] || colors[0];
            ctx.lineWidth = i % 3 === 0 ? 3 : 1;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
    }

    drawGenericDevice(ctx, driverName, dimensions, colors) {
        const { width, height } = dimensions;
        const centerX = width / 2;
        const centerY = height / 2;
        const deviceSize = Math.min(width, height) / 3;
        
        // Corps principal
        const gradient = ctx.createLinearGradient(centerX - deviceSize, centerY - deviceSize, centerX + deviceSize, centerY + deviceSize);
        gradient.addColorStop(0, colors[0]);
        gradient.addColorStop(1, colors[1] || colors[0]);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(centerX - deviceSize, centerY - deviceSize, deviceSize * 2, deviceSize * 2);
        
        ctx.strokeStyle = colors[1] || colors[0];
        ctx.lineWidth = 3;
        ctx.strokeRect(centerX - deviceSize, centerY - deviceSize, deviceSize * 2, deviceSize * 2);
        
        // Logo Zigbee central
        const zigbeeSize = deviceSize / 2;
        this.drawZigbeeLogo(ctx, centerX, centerY, zigbeeSize, 'white');
        
        // LED d'état
        ctx.fillStyle = '#00FF00';
        ctx.beginPath();
        ctx.arc(centerX + deviceSize - 8, centerY - deviceSize + 8, 4, 0, 2 * Math.PI);
        ctx.fill();
    }

    drawZigbeeLogo(ctx, centerX, centerY, size, color) {
        ctx.fillStyle = color;
        ctx.font = `${Math.max(16, size)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Forme en Z stylisée ou icône générique
        const icon = this.getDeviceIcon(ctx.driverName || 'generic');
        ctx.fillText(icon, centerX, centerY);
    }

    getDeviceIcon(driverName) {
        const name = driverName.toLowerCase();
        
        if (name.includes('lock')) return '🔒';
        if (name.includes('plug') || name.includes('outlet')) return '🔌';
        if (name.includes('remote')) return '📱';
        if (name.includes('thermostat')) return '🌡️';
        if (name.includes('bridge')) return '📶';
        if (name.includes('repeater')) return '📡';
        
        return '📱'; // Generic device
    }

    determineCategory(driverName) {
        const name = driverName.toLowerCase();
        
        if (name.includes('switch') || name.includes('button')) return 'switches';
        if (name.includes('sensor')) return 'sensors';
        if (name.includes('bulb') || name.includes('light')) return 'lighting';
        if (name.includes('plug') || name.includes('outlet')) return 'energy';
        if (name.includes('lock')) return 'security';
        if (name.includes('thermostat') || name.includes('climate')) return 'climate';
        if (name.includes('detector')) return 'security';
        
        return 'automation';
    }

    generateSVG(driverName, features, dimensions) {
        const { width, height } = dimensions;
        const category = this.determineCategory(driverName);
        const colors = this.standards.colorPalette[category] || this.standards.colorPalette.automation;
        
        let deviceContent = '';
        
        if (driverName.includes('lock')) {
            deviceContent = this.generateLockSVG(width, height, colors);
        } else if (driverName.includes('plug') || driverName.includes('outlet')) {
            deviceContent = this.generatePlugSVG(width, height, colors);
        } else {
            deviceContent = this.generateGenericDeviceSVG(driverName, width, height, colors);
        }
        
        return `
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="deviceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:${colors[0]};stop-opacity:1" />
                    <stop offset="100%" style="stop-color:${colors[1] || colors[0]};stop-opacity:1" />
                </linearGradient>
            </defs>
            
            <rect width="100%" height="100%" fill="white"/>
            ${deviceContent}
        </svg>`;
    }

    generateLockSVG(width, height, colors) {
        const centerX = width / 2;
        const centerY = height / 2;
        const lockSize = Math.min(width, height) / 3;
        
        return `
        <rect x="${centerX - lockSize}" y="${centerY - lockSize/2}" width="${lockSize * 2}" height="${lockSize}" fill="url(#deviceGrad)" stroke="${colors[1] || colors[0]}" stroke-width="3"/>
        <path d="M ${centerX - lockSize/2} ${centerY - lockSize/2} A ${lockSize/2} ${lockSize/2} 0 0 1 ${centerX + lockSize/2} ${centerY - lockSize/2}" fill="none" stroke="${colors[1] || colors[0]}" stroke-width="4"/>
        <circle cx="${centerX}" cy="${centerY}" r="${lockSize/4}" fill="white"/>
        <rect x="${centerX - lockSize/8}" y="${centerY}" width="${lockSize/4}" height="${lockSize/3}" fill="white"/>
        `;
    }

    generatePlugSVG(width, height, colors) {
        const centerX = width / 2;
        const centerY = height / 2;
        const plugSize = Math.min(width, height) / 3;
        const holeSize = plugSize / 6;
        
        return `
        <rect x="${centerX - plugSize}" y="${centerY - plugSize}" width="${plugSize * 2}" height="${plugSize * 2}" fill="url(#deviceGrad)" stroke="${colors[1] || colors[0]}" stroke-width="3"/>
        <rect x="${centerX - holeSize - 8}" y="${centerY - holeSize/2}" width="${holeSize * 2}" height="${holeSize}" fill="white"/>
        <rect x="${centerX + 8 - holeSize}" y="${centerY - holeSize/2}" width="${holeSize * 2}" height="${holeSize}" fill="white"/>
        <circle cx="${centerX}" cy="${centerY + 15}" r="${holeSize/2}" fill="white"/>
        `;
    }

    generateGenericDeviceSVG(driverName, width, height, colors) {
        const centerX = width / 2;
        const centerY = height / 2;
        const deviceSize = Math.min(width, height) / 3;
        const icon = this.getDeviceIcon(driverName);
        
        return `
        <rect x="${centerX - deviceSize}" y="${centerY - deviceSize}" width="${deviceSize * 2}" height="${deviceSize * 2}" fill="url(#deviceGrad)" stroke="${colors[1] || colors[0]}" stroke-width="3"/>
        <text x="${centerX}" y="${centerY}" text-anchor="middle" dominant-baseline="middle" fill="white" font-family="Arial" font-size="${Math.max(16, deviceSize/2)}">${icon}</text>
        <circle cx="${centerX + deviceSize - 8}" cy="${centerY - deviceSize + 8}" r="4" fill="#00FF00"/>
        `;
    }
}

module.exports = GenericDrawer;
