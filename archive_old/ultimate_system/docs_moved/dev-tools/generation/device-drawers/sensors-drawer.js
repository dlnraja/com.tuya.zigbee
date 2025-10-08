/**
 * SENSORS DRAWER MODULE
 * Génère des images spécifiques aux sensors selon standards Johan Bendz
 */

class SensorsDrawer {
    constructor(standards) {
        this.standards = standards;
        this.sensorColors = standards.colorPalette.sensors; // ['#2196F3', '#03A9F4']
    }

    async drawOnCanvas(ctx, driverName, features, dimensions, standards) {
        const { width, height } = dimensions;
        const centerX = width / 2;
        const centerY = height / 2;
        
        // Background blanc professionnel
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);
        
        // Dessiner selon le type de sensor
        if (driverName.includes('motion') || driverName.includes('presence')) {
            this.drawMotionSensor(ctx, driverName, dimensions);
        } else if (driverName.includes('temperature')) {
            this.drawTemperatureSensor(ctx, driverName, dimensions);
        } else if (driverName.includes('door') || driverName.includes('window')) {
            this.drawDoorWindowSensor(ctx, driverName, dimensions);
        } else if (driverName.includes('air_quality') || driverName.includes('co2')) {
            this.drawAirQualitySensor(ctx, driverName, dimensions);
        } else if (driverName.includes('smoke') || driverName.includes('detector')) {
            this.drawDetector(ctx, driverName, dimensions);
        } else if (driverName.includes('water') || driverName.includes('leak')) {
            this.drawWaterSensor(ctx, driverName, dimensions);
        } else {
            this.drawGenericSensor(ctx, driverName, dimensions);
        }
        
        // Indicateurs d'alimentation
        if (driverName.includes('battery') || driverName.includes('cr2032')) {
            this.addBatteryIndicator(ctx, dimensions);
        }
    }

    drawMotionSensor(ctx, driverName, dimensions) {
        const { width, height } = dimensions;
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 6;
        
        // Corps principal du sensor PIR
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius * 2);
        gradient.addColorStop(0, this.sensorColors[0]);
        gradient.addColorStop(1, this.sensorColors[1]);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.strokeStyle = this.sensorColors[1];
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Ondes de détection
        ctx.strokeStyle = this.sensorColors[0];
        ctx.lineWidth = 2;
        for (let i = 1; i <= 3; i++) {
            const waveRadius = radius + (i * 15);
            ctx.globalAlpha = 1 - (i * 0.2);
            ctx.beginPath();
            ctx.arc(centerX, centerY, waveRadius, 0, 2 * Math.PI);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
        
        // Lentille PIR
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 0.6, 0, 2 * Math.PI);
        ctx.fill();
        
        // Grille hexagonale de détection
        ctx.strokeStyle = this.sensorColors[1];
        ctx.lineWidth = 1;
        this.drawHexGrid(ctx, centerX, centerY, radius * 0.5);
    }

    drawTemperatureSensor(ctx, driverName, dimensions) {
        const { width, height } = dimensions;
        const centerX = width / 2;
        const centerY = height / 2;
        
        // Thermomètre stylisé
        const thermoWidth = width / 8;
        const thermoHeight = height / 2;
        
        // Corps du thermomètre
        ctx.fillStyle = '#F0F0F0';
        ctx.fillRect(centerX - thermoWidth/2, centerY - thermoHeight/2, thermoWidth, thermoHeight);
        ctx.strokeStyle = this.sensorColors[0];
        ctx.lineWidth = 2;
        ctx.strokeRect(centerX - thermoWidth/2, centerY - thermoHeight/2, thermoWidth, thermoHeight);
        
        // Bulbe
        const bulbRadius = thermoWidth;
        const gradient = ctx.createRadialGradient(centerX, centerY + thermoHeight/2, 0, centerX, centerY + thermoHeight/2, bulbRadius);
        gradient.addColorStop(0, this.sensorColors[0]);
        gradient.addColorStop(1, this.sensorColors[1]);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY + thermoHeight/2, bulbRadius, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.strokeStyle = this.sensorColors[1];
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Mercure
        ctx.fillStyle = this.sensorColors[0];
        ctx.fillRect(centerX - thermoWidth/4, centerY - thermoHeight/4, thermoWidth/2, thermoHeight/2 + bulbRadius/2);
        
        // Graduations
        ctx.strokeStyle = this.sensorColors[1];
        ctx.lineWidth = 1;
        for (let i = 0; i < 5; i++) {
            const y = centerY - thermoHeight/2 + (i * thermoHeight/4);
            ctx.beginPath();
            ctx.moveTo(centerX + thermoWidth/2, y);
            ctx.lineTo(centerX + thermoWidth/2 + 5, y);
            ctx.stroke();
        }
        
        // Texte température si assez grand
        if (width > 50) {
            ctx.fillStyle = this.sensorColors[0];
            ctx.font = `${Math.max(8, width/15)}px Arial`;
            ctx.textAlign = 'center';
            ctx.fillText('°C', centerX, centerY - thermoHeight/2 - 10);
        }
    }

    drawDoorWindowSensor(ctx, driverName, dimensions) {
        const { width, height } = dimensions;
        const centerX = width / 2;
        const centerY = height / 2;
        
        // Partie fixe (sur le cadre)
        const fixedWidth = width / 4;
        const fixedHeight = height / 3;
        
        ctx.fillStyle = this.sensorColors[0];
        ctx.fillRect(centerX - fixedWidth - 5, centerY - fixedHeight/2, fixedWidth, fixedHeight);
        ctx.strokeStyle = this.sensorColors[1];
        ctx.lineWidth = 2;
        ctx.strokeRect(centerX - fixedWidth - 5, centerY - fixedHeight/2, fixedWidth, fixedHeight);
        
        // Partie mobile (sur la porte)
        const mobileWidth = width / 5;
        const mobileHeight = height / 4;
        
        ctx.fillStyle = this.sensorColors[1];
        ctx.fillRect(centerX + 5, centerY - mobileHeight/2, mobileWidth, mobileHeight);
        ctx.strokeStyle = this.sensorColors[0];
        ctx.lineWidth = 2;
        ctx.strokeRect(centerX + 5, centerY - mobileHeight/2, mobileWidth, mobileHeight);
        
        // Champ magnétique (lignes courbes)
        ctx.strokeStyle = this.sensorColors[0];
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.7;
        
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(centerX, centerY, 15 + (i * 10), -Math.PI/2, Math.PI/2);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    }

    drawAirQualitySensor(ctx, driverName, dimensions) {
        const { width, height } = dimensions;
        const centerX = width / 2;
        const centerY = height / 2;
        const sensorSize = Math.min(width, height) / 3;
        
        // Corps principal
        const gradient = ctx.createLinearGradient(
            centerX - sensorSize, centerY - sensorSize,
            centerX + sensorSize, centerY + sensorSize
        );
        gradient.addColorStop(0, this.sensorColors[0]);
        gradient.addColorStop(1, this.sensorColors[1]);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(centerX - sensorSize, centerY - sensorSize, sensorSize * 2, sensorSize * 2);
        
        ctx.strokeStyle = this.sensorColors[1];
        ctx.lineWidth = 3;
        ctx.strokeRect(centerX - sensorSize, centerY - sensorSize, sensorSize * 2, sensorSize * 2);
        
        // Grilles d'aération
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        for (let i = -2; i <= 2; i++) {
            const y = centerY + (i * 8);
            ctx.beginPath();
            ctx.moveTo(centerX - sensorSize/2, y);
            ctx.lineTo(centerX + sensorSize/2, y);
            ctx.stroke();
        }
        
        // Particules dans l'air
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        for (let i = 0; i < 8; i++) {
            const x = centerX - sensorSize + Math.random() * (sensorSize * 2);
            const y = centerY - sensorSize + Math.random() * (sensorSize * 2);
            const radius = 1 + Math.random() * 2;
            
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, 2 * Math.PI);
            ctx.fill();
        }
    }

    drawDetector(ctx, driverName, dimensions) {
        const { width, height } = dimensions;
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 3;
        
        // Corps circulaire du détecteur
        ctx.fillStyle = this.sensorColors[0];
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.strokeStyle = this.sensorColors[1];
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Grille de ventilation
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        for (let i = -3; i <= 3; i++) {
            const y = centerY + (i * 6);
            if (Math.abs(y - centerY) < radius - 5) {
                const lineLength = Math.sqrt(Math.pow(radius - 5, 2) - Math.pow(y - centerY, 2));
                ctx.beginPath();
                ctx.moveTo(centerX - lineLength, y);
                ctx.lineTo(centerX + lineLength, y);
                ctx.stroke();
            }
        }
        
        // LED d'état
        const ledRadius = 5;
        ctx.fillStyle = driverName.includes('smoke') ? '#FF0000' : '#00FF00';
        ctx.beginPath();
        ctx.arc(centerX, centerY - radius + 12, ledRadius, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    drawWaterSensor(ctx, driverName, dimensions) {
        const { width, height } = dimensions;
        const centerX = width / 2;
        const centerY = height / 2;
        
        // Corps du sensor
        const sensorWidth = width / 3;
        const sensorHeight = height / 4;
        
        ctx.fillStyle = this.sensorColors[0];
        ctx.fillRect(centerX - sensorWidth/2, centerY - sensorHeight/2, sensorWidth, sensorHeight);
        ctx.strokeStyle = this.sensorColors[1];
        ctx.lineWidth = 2;
        ctx.strokeRect(centerX - sensorWidth/2, centerY - sensorHeight/2, sensorWidth, sensorHeight);
        
        // Gouttes d'eau stylisées
        const droplets = [
            { x: centerX - 20, y: centerY + 30, size: 8 },
            { x: centerX + 10, y: centerY + 35, size: 6 },
            { x: centerX - 5, y: centerY + 40, size: 10 }
        ];
        
        ctx.fillStyle = '#00BFFF';
        droplets.forEach(drop => {
            // Forme de goutte
            ctx.beginPath();
            ctx.arc(drop.x, drop.y, drop.size/2, 0, 2 * Math.PI);
            ctx.fill();
            
            // Pointe de la goutte
            ctx.beginPath();
            ctx.moveTo(drop.x, drop.y - drop.size/2);
            ctx.lineTo(drop.x - 3, drop.y - drop.size);
            ctx.lineTo(drop.x + 3, drop.y - drop.size);
            ctx.closePath();
            ctx.fill();
        });
        
        // Sondes de détection
        ctx.strokeStyle = this.sensorColors[1];
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
            const x = centerX - sensorWidth/2 + 5 + (i * 10);
            ctx.beginPath();
            ctx.moveTo(x, centerY + sensorHeight/2);
            ctx.lineTo(x, centerY + sensorHeight/2 + 15);
            ctx.stroke();
        }
    }

    drawGenericSensor(ctx, driverName, dimensions) {
        const { width, height } = dimensions;
        const centerX = width / 2;
        const centerY = height / 2;
        const sensorSize = Math.min(width, height) / 4;
        
        // Corps principal
        const gradient = ctx.createLinearGradient(
            centerX - sensorSize, centerY - sensorSize,
            centerX + sensorSize, centerY + sensorSize
        );
        gradient.addColorStop(0, this.sensorColors[0]);
        gradient.addColorStop(1, this.sensorColors[1]);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(centerX - sensorSize, centerY - sensorSize, sensorSize * 2, sensorSize * 2);
        
        ctx.strokeStyle = this.sensorColors[1];
        ctx.lineWidth = 3;
        ctx.strokeRect(centerX - sensorSize, centerY - sensorSize, sensorSize * 2, sensorSize * 2);
        
        // LED indicateur
        const ledSize = sensorSize / 3;
        ctx.fillStyle = '#00FF00';
        ctx.fillRect(centerX - ledSize/2, centerY - sensorSize + 5, ledSize, ledSize/2);
        
        // Icône sensor générique
        if (width > 40) {
            ctx.fillStyle = 'white';
            ctx.font = `${Math.max(12, width/8)}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('📡', centerX, centerY + 5);
        }
    }

    drawHexGrid(ctx, centerX, centerY, radius) {
        const hexSize = radius / 4;
        const positions = [
            { x: 0, y: 0 },
            { x: -hexSize, y: -hexSize * 0.8 },
            { x: hexSize, y: -hexSize * 0.8 },
            { x: -hexSize, y: hexSize * 0.8 },
            { x: hexSize, y: hexSize * 0.8 },
            { x: -hexSize * 2, y: 0 },
            { x: hexSize * 2, y: 0 }
        ];
        
        positions.forEach(pos => {
            const x = centerX + pos.x;
            const y = centerY + pos.y;
            const size = hexSize / 3;
            
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (i * Math.PI) / 3;
                const hx = x + size * Math.cos(angle);
                const hy = y + size * Math.sin(angle);
                
                if (i === 0) ctx.moveTo(hx, hy);
                else ctx.lineTo(hx, hy);
            }
            ctx.closePath();
            ctx.stroke();
        });
    }

    addBatteryIndicator(ctx, dimensions) {
        const { width, height } = dimensions;
        const batteryWidth = 10;
        const batteryHeight = 5;
        const x = width - batteryWidth - 3;
        const y = height - batteryHeight - 3;
        
        // Corps de la batterie
        ctx.fillStyle = this.sensorColors[0];
        ctx.fillRect(x, y, batteryWidth - 1, batteryHeight);
        
        // Borne positive
        ctx.fillRect(x + batteryWidth - 1, y + 1, 1, batteryHeight - 2);
        
        // Niveau de charge
        ctx.fillStyle = '#00FF00';
        ctx.fillRect(x + 1, y + 1, (batteryWidth - 3) * 0.7, batteryHeight - 2);
    }

    generateSVG(driverName, features, dimensions) {
        const { width, height } = dimensions;
        
        let sensorContent = '';
        
        if (driverName.includes('motion') || driverName.includes('presence')) {
            sensorContent = this.generateMotionSensorSVG(width, height);
        } else if (driverName.includes('temperature')) {
            sensorContent = this.generateTemperatureSensorSVG(width, height);
        } else {
            sensorContent = this.generateGenericSensorSVG(width, height);
        }
        
        return `
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <radialGradient id="sensorGrad" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" style="stop-color:${this.sensorColors[0]};stop-opacity:1" />
                    <stop offset="100%" style="stop-color:${this.sensorColors[1]};stop-opacity:1" />
                </radialGradient>
            </defs>
            
            <rect width="100%" height="100%" fill="white"/>
            ${sensorContent}
            ${(driverName.includes('battery') || driverName.includes('cr2032')) ? this.generateBatteryIndicatorSVG(width, height) : ''}
        </svg>`;
    }

    generateMotionSensorSVG(width, height) {
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 6;
        
        return `
        <circle cx="${centerX}" cy="${centerY}" r="${radius}" fill="url(#sensorGrad)" stroke="${this.sensorColors[1]}" stroke-width="3"/>
        <circle cx="${centerX}" cy="${centerY}" r="${radius + 15}" fill="none" stroke="${this.sensorColors[0]}" stroke-width="2" opacity="0.8"/>
        <circle cx="${centerX}" cy="${centerY}" r="${radius + 30}" fill="none" stroke="${this.sensorColors[0]}" stroke-width="2" opacity="0.6"/>
        <circle cx="${centerX}" cy="${centerY}" r="${radius + 45}" fill="none" stroke="${this.sensorColors[0]}" stroke-width="2" opacity="0.4"/>
        <circle cx="${centerX}" cy="${centerY}" r="${radius * 0.6}" fill="rgba(255,255,255,0.8)"/>
        `;
    }

    generateTemperatureSensorSVG(width, height) {
        const centerX = width / 2;
        const centerY = height / 2;
        const thermoWidth = width / 8;
        const thermoHeight = height / 2;
        const bulbRadius = thermoWidth;
        
        return `
        <rect x="${centerX - thermoWidth/2}" y="${centerY - thermoHeight/2}" width="${thermoWidth}" height="${thermoHeight}" 
              fill="#F0F0F0" stroke="${this.sensorColors[0]}" stroke-width="2"/>
        <circle cx="${centerX}" cy="${centerY + thermoHeight/2}" r="${bulbRadius}" fill="url(#sensorGrad)" stroke="${this.sensorColors[1]}" stroke-width="2"/>
        <rect x="${centerX - thermoWidth/4}" y="${centerY - thermoHeight/4}" width="${thermoWidth/2}" height="${thermoHeight/2 + bulbRadius/2}" fill="${this.sensorColors[0]}"/>
        <text x="${centerX}" y="${centerY - thermoHeight/2 - 10}" text-anchor="middle" fill="${this.sensorColors[0]}" font-family="Arial" font-size="${Math.max(8, width/15)}">°C</text>
        `;
    }

    generateGenericSensorSVG(width, height) {
        const centerX = width / 2;
        const centerY = height / 2;
        const sensorSize = Math.min(width, height) / 4;
        
        return `
        <rect x="${centerX - sensorSize}" y="${centerY - sensorSize}" width="${sensorSize * 2}" height="${sensorSize * 2}" 
              fill="url(#sensorGrad)" stroke="${this.sensorColors[1]}" stroke-width="3"/>
        <rect x="${centerX - sensorSize/3}" y="${centerY - sensorSize + 5}" width="${sensorSize * 2/3}" height="${sensorSize/3}" fill="#00FF00"/>
        <text x="${centerX}" y="${centerY + 5}" text-anchor="middle" dominant-baseline="middle" fill="white" 
              font-family="Arial" font-size="${Math.max(12, width/8)}">📡</text>
        `;
    }

    generateBatteryIndicatorSVG(width, height) {
        const batteryWidth = 10;
        const batteryHeight = 5;
        const x = width - batteryWidth - 3;
        const y = height - batteryHeight - 3;
        
        return `
        <g>
            <rect x="${x}" y="${y}" width="${batteryWidth - 1}" height="${batteryHeight}" fill="${this.sensorColors[0]}"/>
            <rect x="${x + batteryWidth - 1}" y="${y + 1}" width="1" height="${batteryHeight - 2}" fill="${this.sensorColors[0]}"/>
            <rect x="${x + 1}" y="${y + 1}" width="${(batteryWidth - 3) * 0.7}" height="${batteryHeight - 2}" fill="#00FF00"/>
        </g>
        `;
    }
}

module.exports = SensorsDrawer;
