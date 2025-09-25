/**
 * LIGHTING DRAWER MODULE
 * Génère des images spécifiques aux devices d'éclairage selon standards Johan Bendz
 */

class LightingDrawer {
    constructor(standards) {
        this.standards = standards;
        this.lightingColors = standards.colorPalette.lighting; // ['#FFD700', '#FFA500']
    }

    async drawOnCanvas(ctx, driverName, features, dimensions, standards) {
        const { width, height } = dimensions;
        const centerX = width / 2;
        const centerY = height / 2;
        
        // Background blanc professionnel
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);
        
        // Dessiner selon le type d'éclairage
        if (driverName.includes('bulb')) {
            this.drawBulb(ctx, driverName, dimensions);
        } else if (driverName.includes('strip')) {
            this.drawLEDStrip(ctx, driverName, dimensions);
        } else if (driverName.includes('spot')) {
            this.drawSpotLight(ctx, driverName, dimensions);
        } else if (driverName.includes('ceiling')) {
            this.drawCeilingLight(ctx, driverName, dimensions);
        } else {
            this.drawGenericLight(ctx, driverName, dimensions);
        }
    }

    drawBulb(ctx, driverName, dimensions) {
        const { width, height } = dimensions;
        const centerX = width / 2;
        const centerY = height / 2;
        const bulbWidth = width / 3;
        const bulbHeight = height / 2.5;
        
        // Corps de l'ampoule (forme poire)
        const gradient = ctx.createRadialGradient(centerX, centerY - bulbHeight/4, 0, centerX, centerY, bulbWidth);
        gradient.addColorStop(0, this.lightingColors[0]);
        gradient.addColorStop(1, this.lightingColors[1]);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.ellipse(centerX, centerY - bulbHeight/6, bulbWidth/2, bulbHeight/2, 0, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.strokeStyle = this.lightingColors[1];
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Culot de l'ampoule
        const culotHeight = bulbHeight / 4;
        const culotWidth = bulbWidth / 2;
        
        ctx.fillStyle = '#C0C0C0';
        ctx.fillRect(centerX - culotWidth/2, centerY + bulbHeight/3, culotWidth, culotHeight);
        
        ctx.strokeStyle = '#A0A0A0';
        ctx.lineWidth = 1;
        ctx.strokeRect(centerX - culotWidth/2, centerY + bulbHeight/3, culotWidth, culotHeight);
        
        // Filetage du culot
        ctx.strokeStyle = '#808080';
        ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
            const y = centerY + bulbHeight/3 + (i * culotHeight/4) + 2;
            ctx.beginPath();
            ctx.moveTo(centerX - culotWidth/2, y);
            ctx.lineTo(centerX + culotWidth/2, y);
            ctx.stroke();
        }
        
        // Rayons lumineux selon le type
        if (driverName.includes('rgb')) {
            this.drawRGBRays(ctx, centerX, centerY - bulbHeight/6, bulbWidth/2 + 10);
        } else if (driverName.includes('tunable')) {
            this.drawTunableRays(ctx, centerX, centerY - bulbHeight/6, bulbWidth/2 + 10);
        } else {
            this.drawWhiteRays(ctx, centerX, centerY - bulbHeight/6, bulbWidth/2 + 10);
        }
    }

    drawLEDStrip(ctx, driverName, dimensions) {
        const { width, height } = dimensions;
        const centerY = height / 2;
        const stripWidth = width - 40;
        const stripHeight = height / 8;
        const stripX = 20;
        const stripY = centerY - stripHeight/2;
        
        // Base de la bande
        ctx.fillStyle = '#2C2C2C';
        ctx.fillRect(stripX, stripY, stripWidth, stripHeight);
        
        ctx.strokeStyle = '#1C1C1C';
        ctx.lineWidth = 1;
        ctx.strokeRect(stripX, stripY, stripWidth, stripHeight);
        
        // LEDs individuelles
        const ledCount = Math.min(12, Math.floor(stripWidth / 20));
        const ledSpacing = stripWidth / ledCount;
        const ledSize = Math.min(ledSpacing - 4, stripHeight - 4);
        
        for (let i = 0; i < ledCount; i++) {
            const ledX = stripX + (i * ledSpacing) + ledSpacing/2 - ledSize/2;
            const ledY = stripY + (stripHeight - ledSize)/2;
            
            // Couleur LED selon le type
            let ledColor = this.lightingColors[0];
            if (driverName.includes('rgb')) {
                const colors = ['#FF0000', '#00FF00', '#0000FF'];
                ledColor = colors[i % 3];
            } else if (driverName.includes('tunable')) {
                ledColor = i % 2 === 0 ? '#FFD700' : '#FFA500';
            }
            
            const ledGradient = ctx.createRadialGradient(ledX + ledSize/2, ledY + ledSize/2, 0, ledX + ledSize/2, ledY + ledSize/2, ledSize/2);
            ledGradient.addColorStop(0, ledColor);
            ledGradient.addColorStop(1, this.darkenColor(ledColor, 0.3));
            
            ctx.fillStyle = ledGradient;
            ctx.fillRect(ledX, ledY, ledSize, ledSize);
            
            // Brillance LED
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.fillRect(ledX + 1, ledY + 1, ledSize - 2, 2);
        }
        
        // Connecteurs aux extrémités
        ctx.fillStyle = '#C0C0C0';
        ctx.fillRect(stripX - 5, stripY + stripHeight/4, 5, stripHeight/2);
        ctx.fillRect(stripX + stripWidth, stripY + stripHeight/4, 5, stripHeight/2);
    }

    drawSpotLight(ctx, driverName, dimensions) {
        const { width, height } = dimensions;
        const centerX = width / 2;
        const centerY = height / 2;
        const spotRadius = Math.min(width, height) / 4;
        
        // Corps du spot (cylindrique vu de face)
        const gradient = ctx.createLinearGradient(centerX - spotRadius, centerY - spotRadius, centerX + spotRadius, centerY + spotRadius);
        gradient.addColorStop(0, '#E0E0E0');
        gradient.addColorStop(0.5, '#C0C0C0');
        gradient.addColorStop(1, '#A0A0A0');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, spotRadius, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.strokeStyle = '#808080';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Réflecteur intérieur
        ctx.fillStyle = '#F0F0F0';
        ctx.beginPath();
        ctx.arc(centerX, centerY, spotRadius * 0.8, 0, 2 * Math.PI);
        ctx.fill();
        
        // LED centrale
        const ledGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, spotRadius * 0.4);
        ledGradient.addColorStop(0, this.lightingColors[0]);
        ledGradient.addColorStop(1, this.lightingColors[1]);
        
        ctx.fillStyle = ledGradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, spotRadius * 0.4, 0, 2 * Math.PI);
        ctx.fill();
        
        // Faisceau lumineux
        this.drawSpotBeam(ctx, centerX, centerY, spotRadius);
    }

    drawCeilingLight(ctx, driverName, dimensions) {
        const { width, height } = dimensions;
        const centerX = width / 2;
        const centerY = height / 2;
        const lightSize = Math.min(width, height) / 2.5;
        
        // Base circulaire du plafonnier
        const baseGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, lightSize);
        baseGradient.addColorStop(0, '#F8F8F8');
        baseGradient.addColorStop(1, '#E0E0E0');
        
        ctx.fillStyle = baseGradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, lightSize, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.strokeStyle = '#C0C0C0';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Diffuseur central
        const diffuserGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, lightSize * 0.7);
        diffuserGradient.addColorStop(0, this.lightingColors[0]);
        diffuserGradient.addColorStop(1, 'rgba(255, 215, 0, 0.3)');
        
        ctx.fillStyle = diffuserGradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, lightSize * 0.7, 0, 2 * Math.PI);
        ctx.fill();
        
        // Motif décoratif
        ctx.strokeStyle = this.lightingColors[1];
        ctx.lineWidth = 1;
        for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI) / 4;
            const innerRadius = lightSize * 0.3;
            const outerRadius = lightSize * 0.6;
            
            const x1 = centerX + innerRadius * Math.cos(angle);
            const y1 = centerY + innerRadius * Math.sin(angle);
            const x2 = centerX + outerRadius * Math.cos(angle);
            const y2 = centerY + outerRadius * Math.sin(angle);
            
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
    }

    drawGenericLight(ctx, driverName, dimensions) {
        const { width, height } = dimensions;
        const centerX = width / 2;
        const centerY = height / 2;
        const lightSize = Math.min(width, height) / 3;
        
        // Corps principal
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, lightSize);
        gradient.addColorStop(0, this.lightingColors[0]);
        gradient.addColorStop(1, this.lightingColors[1]);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, lightSize, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.strokeStyle = this.lightingColors[1];
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Rayons lumineux génériques
        this.drawGenericRays(ctx, centerX, centerY, lightSize + 5);
    }

    drawRGBRays(ctx, centerX, centerY, startRadius) {
        const colors = ['#FF0000', '#00FF00', '#0000FF'];
        const rayLength = 20;
        
        ctx.lineWidth = 2;
        
        for (let i = 0; i < colors.length; i++) {
            ctx.strokeStyle = colors[i];
            const angleOffset = (i * 120) * (Math.PI / 180);
            
            for (let angle = 0; angle < 360; angle += 60) {
                const rad = (angle * Math.PI / 180) + angleOffset;
                const x1 = centerX + startRadius * Math.cos(rad);
                const y1 = centerY + startRadius * Math.sin(rad);
                const x2 = centerX + (startRadius + rayLength) * Math.cos(rad);
                const y2 = centerY + (startRadius + rayLength) * Math.sin(rad);
                
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }
        }
    }

    drawTunableRays(ctx, centerX, centerY, startRadius) {
        const colors = [this.lightingColors[0], this.lightingColors[1]];
        const rayLength = 18;
        
        ctx.lineWidth = 2;
        
        colors.forEach((color, i) => {
            ctx.strokeStyle = color;
            const angleOffset = i * 30;
            
            for (let angle = angleOffset; angle < 360; angle += 60) {
                const rad = angle * Math.PI / 180;
                const x1 = centerX + startRadius * Math.cos(rad);
                const y1 = centerY + startRadius * Math.sin(rad);
                const x2 = centerX + (startRadius + rayLength) * Math.cos(rad);
                const y2 = centerY + (startRadius + rayLength) * Math.sin(rad);
                
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }
        });
    }

    drawWhiteRays(ctx, centerX, centerY, startRadius) {
        const rayLength = 15;
        
        ctx.strokeStyle = this.lightingColors[0];
        ctx.lineWidth = 2;
        
        for (let angle = 0; angle < 360; angle += 45) {
            const rad = angle * Math.PI / 180;
            const x1 = centerX + startRadius * Math.cos(rad);
            const y1 = centerY + startRadius * Math.sin(rad);
            const x2 = centerX + (startRadius + rayLength) * Math.cos(rad);
            const y2 = centerY + (startRadius + rayLength) * Math.sin(rad);
            
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
    }

    drawGenericRays(ctx, centerX, centerY, startRadius) {
        const rayLength = 12;
        
        ctx.strokeStyle = this.lightingColors[1];
        ctx.lineWidth = 1.5;
        
        for (let angle = 0; angle < 360; angle += 30) {
            const rad = angle * Math.PI / 180;
            const x1 = centerX + startRadius * Math.cos(rad);
            const y1 = centerY + startRadius * Math.sin(rad);
            const x2 = centerX + (startRadius + rayLength) * Math.cos(rad);
            const y2 = centerY + (startRadius + rayLength) * Math.sin(rad);
            
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
    }

    drawSpotBeam(ctx, centerX, centerY, spotRadius) {
        // Faisceau conique depuis le spot
        ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
        ctx.beginPath();
        ctx.moveTo(centerX, centerY + spotRadius);
        ctx.lineTo(centerX - spotRadius * 1.5, centerY + spotRadius * 3);
        ctx.lineTo(centerX + spotRadius * 1.5, centerY + spotRadius * 3);
        ctx.closePath();
        ctx.fill();
        
        // Contours du faisceau
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    darkenColor(color, factor) {
        // Utilitaire pour assombrir une couleur
        const hex = color.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        
        return `rgb(${Math.floor(r * (1 - factor))}, ${Math.floor(g * (1 - factor))}, ${Math.floor(b * (1 - factor))})`;
    }

    generateSVG(driverName, features, dimensions) {
        const { width, height } = dimensions;
        
        let lightingContent = '';
        
        if (driverName.includes('bulb')) {
            lightingContent = this.generateBulbSVG(driverName, width, height);
        } else if (driverName.includes('strip')) {
            lightingContent = this.generateStripSVG(driverName, width, height);
        } else {
            lightingContent = this.generateGenericLightSVG(width, height);
        }
        
        return `
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <radialGradient id="lightGrad" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" style="stop-color:${this.lightingColors[0]};stop-opacity:1" />
                    <stop offset="100%" style="stop-color:${this.lightingColors[1]};stop-opacity:1" />
                </radialGradient>
            </defs>
            
            <rect width="100%" height="100%" fill="white"/>
            ${lightingContent}
        </svg>`;
    }

    generateBulbSVG(driverName, width, height) {
        const centerX = width / 2;
        const centerY = height / 2;
        const bulbWidth = width / 3;
        const bulbHeight = height / 2.5;
        
        return `
        <ellipse cx="${centerX}" cy="${centerY - bulbHeight/6}" rx="${bulbWidth/2}" ry="${bulbHeight/2}" fill="url(#lightGrad)" stroke="${this.lightingColors[1]}" stroke-width="2"/>
        <rect x="${centerX - bulbWidth/4}" y="${centerY + bulbHeight/3}" width="${bulbWidth/2}" height="${bulbHeight/4}" fill="#C0C0C0" stroke="#A0A0A0"/>
        `;
    }

    generateStripSVG(driverName, width, height) {
        const centerY = height / 2;
        const stripWidth = width - 40;
        const stripHeight = height / 8;
        
        return `
        <rect x="20" y="${centerY - stripHeight/2}" width="${stripWidth}" height="${stripHeight}" fill="#2C2C2C" stroke="#1C1C1C"/>
        `;
    }

    generateGenericLightSVG(width, height) {
        const centerX = width / 2;
        const centerY = height / 2;
        const lightSize = Math.min(width, height) / 3;
        
        return `
        <circle cx="${centerX}" cy="${centerY}" r="${lightSize}" fill="url(#lightGrad)" stroke="${this.lightingColors[1]}" stroke-width="3"/>
        `;
    }
}

module.exports = LightingDrawer;
