/**
 * Custom Pairing View - Client-side Logic
 * Universal Tuya Zigbee Driver Selector with Scoring & Crowdsourcing
 */

// Global state
let selectedDriver = null;
let deviceInfo = null;
let allDrivers = [];
let filteredDrivers = [];

// ZCL Cluster constants from spec
const ZCL_CLUSTERS = {
    BASIC: '0',
    POWER_CONFIGURATION: '1',
    IDENTIFY: '3',
    ON_OFF: '6',
    LEVEL_CONTROL: '8',
    TIME: '10', // 0x000A
    ELECTRICAL_MEASUREMENT: '2820', // 0x0B04
    TEMPERATURE_MEASUREMENT: '1026',
    RELATIVE_HUMIDITY: '1029',
    IAS_ZONE: '1280'
};

/**
 * Score driver compatibility with device (ZCL Spec-aware)
 */
function scoreDriver(device, driver) {
    let score = 0;
    if (!device || !driver) return 0;

    const dman = (device.manufacturerName || '').toLowerCase();
    const dprod = (device.productId || '').toLowerCase();
    const dmodel = (device.modelId || '').toLowerCase();

    // === MANUFACTURER MATCH (0-40 points) ===
    const manufacturers = Array.isArray(driver.manufacturerName) ? driver.manufacturerName : [driver.manufacturerName];
    for (const m of manufacturers) {
        if (!m) continue;
        const mm = m.toLowerCase();
        if (mm === dman) score += 40;
        else if (dman.includes(mm) || mm.includes(dman)) score += 15;
    }

    // === PRODUCT ID MATCH (0-40 points) ===
    const productIds = Array.isArray(driver.productId) ? driver.productId : [driver.productId];
    for (const p of productIds) {
        if (!p) continue;
        const pp = p.toLowerCase();
        if (pp === dprod) score += 40;
        else if (dprod.includes(pp) || pp.includes(dprod)) score += 10;
    }

    // === PENALIZE GENERIC TS0002 DRIVER (-80 points) ===
    // TS0002 is too generic and matches ~39 drivers
    if (productIds.some(p => p === 'TS0002') && productIds.length === 1) {
        score -= 80;
    }

    // === ENDPOINT COUNT MATCH (0-10 points) ===
    const driverEndpoints = driver.endpoints ? Object.keys(driver.endpoints).length : 0;
    const deviceEndpoints = device.endpoints ? Object.keys(device.endpoints).length : 0;
    if (driverEndpoints === deviceEndpoints && driverEndpoints > 0) score += 10;
    else if (Math.abs(driverEndpoints - deviceEndpoints) === 1) score += 5;

    // === ZCL CLUSTER MATCH (0-50 points) ===
    // Based on ZCL spec: match specific clusters
    if (device.clusters && driver.clusters) {
        const deviceClusters = extractDeviceClusters(device.clusters);
        const driverClusters = new Set(driver.clusters.map(c => String(c).toLowerCase()));
        
        let clusterMatches = 0;
        for (const c of driverClusters) {
            if (deviceClusters.has(c)) {
                clusterMatches++;
                // Important clusters get bonus
                if (c === ZCL_CLUSTERS.ON_OFF || c === '6') score += 8;
                else if (c === ZCL_CLUSTERS.ELECTRICAL_MEASUREMENT || c === '2820') score += 10;
                else if (c === ZCL_CLUSTERS.POWER_CONFIGURATION || c === '1') score += 6;
                else if (c === ZCL_CLUSTERS.TIME || c === '10') score += 5;
                else score += 4;
            }
        }
        
        // Bonus for high cluster match ratio
        if (driverClusters.size > 0) {
            const matchRatio = clusterMatches / driverClusters.size;
            if (matchRatio > 0.8) score += 15;
            else if (matchRatio > 0.5) score += 8;
        }
    }

    // === SPECIFICITY BONUS (0-20 points) ===
    // Prefer drivers with more specific fingerprints
    const hasManufacturer = manufacturers.some(m => m && m.length > 0);
    const hasProductId = productIds.some(p => p && p.length > 0);
    const hasModel = dmodel && dmodel.length > 0;
    
    if (hasManufacturer && hasProductId && hasModel) score += 20;
    else if (hasManufacturer && hasProductId) score += 10;
    
    // Penalize drivers with too many productIds (too generic)
    if (productIds.length > 5) score -= 10;
    if (productIds.length > 10) score -= 20;

    return Math.max(0, score); // Never negative
}

/**
 * Extract all clusters from device endpoints
 */
function extractDeviceClusters(clustersByEndpoint) {
    const clusters = new Set();
    Object.values(clustersByEndpoint || {}).forEach(arr => {
        if (Array.isArray(arr)) {
            arr.forEach(c => clusters.add(String(c).toLowerCase()));
        }
    });
    return clusters;
}

/**
 * Initialize page
 */
async function init() {
    // Get device info from Homey pairing context
    deviceInfo = window.deviceInfo || await fetchDeviceInfo();
    
    // Display device info
    displayDeviceInfo(deviceInfo);
    
    // Load drivers
    await loadDrivers();
    
    // Setup search
    setupSearch();
}

/**
 * Fetch device info from pairing context
 */
async function fetchDeviceInfo() {
    try {
        // Try to get from Homey context
        if (window.Homey && window.Homey.getDeviceInfo) {
            return await window.Homey.getDeviceInfo();
        }
        
        // Fallback: try REST endpoint
        const res = await fetch('/api/pairing/device-info');
        if (res.ok) {
            return await res.json();
        }
    } catch (err) {
        console.error('Failed to fetch device info:', err);
    }
    
    return {
        manufacturerName: 'Unknown',
        productId: 'Unknown',
        modelId: 'N/A',
        ieee: 'Unknown',
        endpoints: {},
        clusters: {}
    };
}

/**
 * Display device information (with ZCL cluster details)
 */
function displayDeviceInfo(device) {
    const infoEl = document.getElementById('deviceInfo');
    if (!infoEl) return;
    
    // Extract important clusters
    const deviceClusters = extractDeviceClusters(device.clusters || {});
    const importantClusters = [];
    
    if (deviceClusters.has('6') || deviceClusters.has(ZCL_CLUSTERS.ON_OFF)) {
        importantClusters.push('🔌 On/Off');
    }
    if (deviceClusters.has('2820') || deviceClusters.has(ZCL_CLUSTERS.ELECTRICAL_MEASUREMENT)) {
        importantClusters.push('⚡ Electrical Measurement');
    }
    if (deviceClusters.has('1') || deviceClusters.has(ZCL_CLUSTERS.POWER_CONFIGURATION)) {
        importantClusters.push('🔋 Power Config');
    }
    if (deviceClusters.has('10') || deviceClusters.has(ZCL_CLUSTERS.TIME)) {
        importantClusters.push('⏰ Time');
    }
    if (deviceClusters.has('1026')) importantClusters.push('🌡️ Temperature');
    if (deviceClusters.has('1029')) importantClusters.push('💧 Humidity');
    if (deviceClusters.has('1280')) importantClusters.push('🚨 IAS Zone');
    
    const html = `
        <strong>Manufacturer:</strong> ${device.manufacturerName || 'Unknown'}<br>
        <strong>Product ID:</strong> ${device.productId || 'Unknown'}<br>
        <strong>Model ID:</strong> ${device.modelId || 'N/A'}<br>
        <strong>IEEE Address:</strong> ${device.ieee || 'Unknown'}<br>
        <strong>Endpoints:</strong> ${Object.keys(device.endpoints || {}).join(', ') || 'None'}<br>
        <strong>Total Clusters:</strong> ${deviceClusters.size} detected<br>
        ${importantClusters.length > 0 ? `<strong>Key Features:</strong> ${importantClusters.join(', ')}` : ''}
    `;
    
    infoEl.innerHTML = html;
}

/**
 * Load available drivers
 */
async function loadDrivers() {
    try {
        // Try to load from assets
        const res = await fetch('/assets/drivers.json');
        if (res.ok) {
            allDrivers = await res.json();
        } else {
            // Fallback: get from Homey context
            if (window.candidates) {
                allDrivers = window.candidates;
            } else {
                // Ultimate fallback: minimal driver list
                allDrivers = getFallbackDrivers();
            }
        }
        
        // Calculate scores for each driver
        allDrivers = allDrivers.map(driver => ({
            ...driver,
            score: scoreDriver(deviceInfo, driver)
        }));
        
        // Sort by score (highest first)
        allDrivers.sort((a, b) => b.score - a.score);
        
        // Display drivers
        filteredDrivers = [...allDrivers];
        displayDrivers(filteredDrivers);
        
        // Auto-select top match if score high enough
        if (allDrivers[0] && allDrivers[0].score >= 60) {
            selectDriver(allDrivers[0]);
        }
        
    } catch (err) {
        console.error('Failed to load drivers:', err);
        showMessage('Failed to load driver list', 'error');
    }
}

/**
 * Get fallback driver list
 */
function getFallbackDrivers() {
    return [
        {
            id: 'switch_basic_2gang',
            name: 'Switch 2-gang Basic',
            manufacturerName: ['_TZ3000_4fjiwweb', '_TZ3000_ji4araar'],
            productId: ['TS0002'],
            endpoints: { '1': {}, '2': {} },
            clusters: ['onOff', 'basic']
        },
        {
            id: 'usb_outlet_2port',
            name: 'USB Outlet 2-port',
            manufacturerName: ['_TZ3000_1obwwnmq', '_TZ3000_w0qqde0g'],
            productId: ['TS011F'],
            endpoints: { '1': {}, '2': {} },
            clusters: ['onOff', 'basic', 'electricalMeasurement']
        }
    ];
}

/**
 * Display drivers in UI
 */
function displayDrivers(drivers) {
    const listEl = document.getElementById('driverList');
    const countEl = document.getElementById('driverCount');
    
    if (!listEl) return;
    
    listEl.innerHTML = '';
    if (countEl) countEl.textContent = drivers.length;
    
    drivers.forEach(driver => {
        const li = document.createElement('li');
        li.className = 'driver-option';
        if (selectedDriver && selectedDriver.id === driver.id) {
            li.classList.add('selected');
        }
        
        const manufacturers = Array.isArray(driver.manufacturerName) 
            ? driver.manufacturerName.slice(0, 3).join(', ') 
            : driver.manufacturerName || 'N/A';
        const productIds = Array.isArray(driver.productId) 
            ? driver.productId.slice(0, 3).join(', ') 
            : driver.productId || 'N/A';
        const endpoints = driver.endpoints ? Object.keys(driver.endpoints).join(', ') : 'N/A';
        
        // Show why this driver matches
        const reasons = [];
        if (driver.score >= 60) reasons.push('✅ Good match');
        else if (driver.score >= 30) reasons.push('⚠️ Possible match');
        else reasons.push('❌ Poor match');
        
        if (productIds.includes('TS0002') && driver.score < 40) {
            reasons.push('⚠️ Generic driver');
        }
        
        li.innerHTML = `
            <div class="driver-header">
                <div>
                    <div class="driver-name">${driver.name || driver.id}</div>
                    <div class="driver-id">${driver.id}</div>
                    <div style="font-size: 11px; color: #666; margin-top: 4px;">${reasons.join(' • ')}</div>
                </div>
                <div class="driver-score">${driver.score || 0}</div>
            </div>
            <div class="driver-meta">
                <div class="meta-item">
                    <span>🏭</span>
                    <span class="badge">${manufacturers}</span>
                </div>
                <div class="meta-item">
                    <span>📦</span>
                    <span class="badge">${productIds}</span>
                </div>
                <div class="meta-item">
                    <span>🔌</span>
                    <span class="badge">${endpoints}</span>
                </div>
            </div>
        `;
        
        li.onclick = () => selectDriver(driver);
        listEl.appendChild(li);
    });
}

/**
 * Select a driver
 */
function selectDriver(driver) {
    selectedDriver = driver;
    
    // Update UI
    document.querySelectorAll('.driver-option').forEach(el => {
        el.classList.remove('selected');
    });
    
    event.currentTarget?.classList.add('selected');
    
    // Enable continue button
    const btn = document.getElementById('continueBtn');
    if (btn) btn.disabled = false;
}

/**
 * Setup search functionality
 */
function setupSearch() {
    const searchBox = document.getElementById('searchBox');
    if (!searchBox) return;
    
    searchBox.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        
        if (!query) {
            filteredDrivers = [...allDrivers];
        } else {
            filteredDrivers = allDrivers.filter(driver => {
                const name = (driver.name || '').toLowerCase();
                const id = (driver.id || '').toLowerCase();
                const manufacturers = Array.isArray(driver.manufacturerName) 
                    ? driver.manufacturerName.join(' ').toLowerCase() 
                    : (driver.manufacturerName || '').toLowerCase();
                const productIds = Array.isArray(driver.productId) 
                    ? driver.productId.join(' ').toLowerCase() 
                    : (driver.productId || '').toLowerCase();
                
                return name.includes(query) || 
                       id.includes(query) || 
                       manufacturers.includes(query) || 
                       productIds.includes(query);
            });
        }
        
        displayDrivers(filteredDrivers);
    });
}

/**
 * Confirm driver selection
 */
async function confirmSelection() {
    if (!selectedDriver) {
        showMessage('Please select a driver first', 'error');
        return;
    }
    
    try {
        // Try Homey API first
        if (window.Homey && window.Homey.emit) {
            window.Homey.emit('driver_selected', selectedDriver.id);
            showMessage('Driver selected successfully!', 'success');
            return;
        }
        
        // Fallback: POST to pairing endpoint
        const res = await fetch('/api/pairing/select-driver', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                driverId: selectedDriver.id, 
                device: deviceInfo 
            })
        });
        
        if (res.ok) {
            showMessage('Driver selected successfully!', 'success');
        } else {
            throw new Error('Failed to apply driver selection');
        }
        
    } catch (err) {
        console.error('Confirmation error:', err);
        showMessage('Failed to apply driver selection: ' + err.message, 'error');
    }
}

/**
 * Copy device info to clipboard
 */
function copyDeviceInfo() {
    const json = JSON.stringify(deviceInfo, null, 2);
    
    if (navigator.clipboard) {
        navigator.clipboard.writeText(json).then(() => {
            showMessage('Device info copied to clipboard!', 'success');
        }).catch(err => {
            console.error('Copy failed:', err);
            showMessage('Failed to copy to clipboard', 'error');
        });
    } else {
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = json;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showMessage('Device info copied to clipboard!', 'success');
    }
}

/**
 * Refresh device info
 */
async function refreshDeviceInfo() {
    deviceInfo = await fetchDeviceInfo();
    displayDeviceInfo(deviceInfo);
    
    // Recalculate scores
    allDrivers = allDrivers.map(driver => ({
        ...driver,
        score: scoreDriver(deviceInfo, driver)
    }));
    allDrivers.sort((a, b) => b.score - a.score);
    
    filteredDrivers = [...allDrivers];
    displayDrivers(filteredDrivers);
    
    showMessage('Device info refreshed', 'success');
}

/**
 * Report device to crowdsourcing endpoint
 */
async function reportDevice() {
    if (!deviceInfo) {
        showMessage('No device info to report', 'error');
        return;
    }
    
    const btn = document.getElementById('reportBtn');
    if (btn) btn.disabled = true;
    
    try {
        const payload = {
            device: deviceInfo,
            selectedDriver: selectedDriver?.id || null,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
        };
        
        // Try to send to GitHub Pages endpoint
        const res = await fetch('https://dlnraja.github.io/com.tuya.zigbee/report-device', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (res.ok) {
            showMessage('Device reported successfully! Thank you for contributing.', 'success');
        } else {
            throw new Error('Report endpoint unavailable');
        }
        
    } catch (err) {
        console.error('Report error:', err);
        showMessage('Report endpoint unavailable. You can manually create a GitHub issue with the device JSON.', 'error');
        
        // Offer to copy JSON for manual reporting
        copyDeviceInfo();
    } finally {
        if (btn) btn.disabled = false;
    }
}

/**
 * Show message to user
 */
function showMessage(text, type = 'info') {
    const box = document.getElementById('messageBox');
    if (!box) return;
    
    box.innerHTML = `<div class="message ${type}">${text}</div>`;
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        box.innerHTML = '';
    }, 5000);
}

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
