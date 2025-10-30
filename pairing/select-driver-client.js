/**
 * Custom Pairing View - Client-side Logic
 * Universal Tuya Zigbee Driver Selector with Scoring & Crowdsourcing
 */

// Global state
let selectedDriver = null;
let deviceInfo = null;
let allDrivers = [];
let filteredDrivers = [];

/**
 * Score driver compatibility with device
 */
function scoreDriver(device, driver) {
    let score = 0;
    if (!device || !driver) return 0;

    const dman = (device.manufacturerName || '').toLowerCase();
    const dprod = (device.productId || '').toLowerCase();

    // Manufacturer exact/partial match
    const manufacturers = Array.isArray(driver.manufacturerName) ? driver.manufacturerName : [driver.manufacturerName];
    for (const m of manufacturers) {
        if (!m) continue;
        const mm = m.toLowerCase();
        if (mm === dman) score += 40;
        else if (dman.includes(mm) || mm.includes(dman)) score += 15;
    }

    // ProductId exact/partial match
    const productIds = Array.isArray(driver.productId) ? driver.productId : [driver.productId];
    for (const p of productIds) {
        if (!p) continue;
        const pp = p.toLowerCase();
        if (pp === dprod) score += 40;
        else if (dprod.includes(pp) || pp.includes(dprod)) score += 10;
    }

    // Endpoint count match
    const driverEndpoints = driver.endpoints ? Object.keys(driver.endpoints).length : 0;
    const deviceEndpoints = device.endpoints ? Object.keys(device.endpoints).length : 0;
    if (driverEndpoints === deviceEndpoints) score += 5;
    else if (Math.abs(driverEndpoints - deviceEndpoints) === 1) score += 2;

    // Clusters match (bonus)
    if (device.clusters && driver.clusters) {
        const deviceClusters = new Set();
        Object.values(device.clusters).forEach(arr => {
            if (Array.isArray(arr)) {
                arr.forEach(c => deviceClusters.add(String(c).toLowerCase()));
            }
        });
        
        for (const c of driver.clusters) {
            if (deviceClusters.has(String(c).toLowerCase())) score += 5;
        }
    }

    return score;
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
 * Display device information
 */
function displayDeviceInfo(device) {
    const infoEl = document.getElementById('deviceInfo');
    if (!infoEl) return;
    
    const html = `
        <strong>Manufacturer:</strong> ${device.manufacturerName || 'Unknown'}<br>
        <strong>Product ID:</strong> ${device.productId || 'Unknown'}<br>
        <strong>Model ID:</strong> ${device.modelId || 'N/A'}<br>
        <strong>IEEE Address:</strong> ${device.ieee || 'Unknown'}<br>
        <strong>Endpoints:</strong> ${Object.keys(device.endpoints || {}).join(', ') || 'None'}<br>
        <strong>Clusters:</strong> ${Object.keys(device.clusters || {}).length} endpoints with clusters
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
        
        li.innerHTML = `
            <div class="driver-header">
                <div>
                    <div class="driver-name">${driver.name || driver.id}</div>
                    <div class="driver-id">${driver.id}</div>
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
