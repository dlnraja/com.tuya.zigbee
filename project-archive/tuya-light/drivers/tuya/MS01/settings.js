document.addEventListener('DOMContentLoaded', function() {
    // Initialize the UI components
    initTabs();
    initCollapsibleCards();
    initSliders();
    initSaveButton();
    
    // Load initial data
    loadDeviceStatus();
    loadSettings();
    
    // Start status updates
    startStatusUpdates();
});

// Tab functionality
function initTabs() {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs and contents
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            tab.classList.add('active');
            const tabId = tab.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
            
            // Lazy load tab content if needed
            loadTabContent(tabId);
        });
    });
}

// Collapsible cards functionality
function initCollapsibleCards() {
    document.querySelectorAll('.card-header').forEach(header => {
        header.addEventListener('click', () => {
            const body = header.nextElementSibling;
            header.classList.toggle('collapsed');
            
            // Toggle icon
            const icon = header.querySelector('.toggle i');
            if (header.classList.contains('collapsed')) {
                body.style.maxHeight = '0';
                body.style.padding = '0 20px';
                icon.classList.remove('fa-chevron-down');
                icon.classList.add('fa-chevron-up');
            } else {
                body.style.maxHeight = body.scrollHeight + 'px';
                body.style.padding = '20px';
                icon.classList.remove('fa-chevron-up');
                icon.classList.add('fa-chevron-down');
            }
        });
    });
}

// Initialize slider controls
function initSliders() {
    // Format functions for sliders
    const formatFunctions = {
        'report-interval': formatSeconds,
        'battery-threshold': v => `${v}%`,
        'motion-timeout': v => `${v}s`,
        'temperature-offset': v => {
            const temp = v / 10;
            return `${temp > 0 ? '+' : ''}${temp.toFixed(1)}°C`;
        },
        'humidity-offset': v => {
            const humidity = v / 10;
            return `${humidity > 0 ? '+' : ''}${humidity.toFixed(1)}%`;
        }
    };

    // Initialize each slider
    Object.entries(formatFunctions).forEach(([id, formatter]) => {
        const slider = document.getElementById(id);
        const valueDisplay = document.getElementById(`${id}-value`);
        
        if (slider && valueDisplay) {
            // Initial update
            valueDisplay.textContent = formatter(slider.value);
            
            // Update on change
            slider.addEventListener('input', () => {
                valueDisplay.textContent = formatter(slider.value);
            });
        }
    });
}

// Format seconds to human-readable format
function formatSeconds(seconds) {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
    return `${Math.round(seconds / 3600 * 10) / 10} h`;
}

// Save button functionality
function initSaveButton() {
    const saveBtn = document.getElementById('save-settings');
    if (!saveBtn) return;
    
    saveBtn.addEventListener('click', () => {
        // Show loading state
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        saveBtn.disabled = true;
        
        // Collect all settings
        const settings = {
            deviceName: document.getElementById('device-name')?.value || 'Tuya Multi-Sensor',
            reportInterval: parseInt(document.getElementById('report-interval')?.value) || 300,
            ledEnabled: document.getElementById('led-enabled')?.checked || true,
            batteryThreshold: parseInt(document.getElementById('battery-threshold')?.value) || 20,
            motionTimeout: parseInt(document.getElementById('motion-timeout')?.value) || 60,
            motionSensitivity: document.getElementById('motion-sensitivity')?.value || 'medium',
            temperatureOffset: parseFloat(document.getElementById('temperature-offset')?.value) || 0,
            humidityOffset: parseFloat(document.getElementById('humidity-offset')?.value) || 0,
            temperatureUnit: document.getElementById('temperature-unit')?.value || 'celsius'
        };
        
        // Simulate API call to save settings
        setTimeout(() => {
            // Show success message
            saveBtn.innerHTML = '<i class="fas fa-check"></i> Settings Saved';
            saveBtn.style.backgroundColor = '#2ecc71';
            
            // Save to localStorage for demo purposes
            localStorage.setItem('tuyaMultiSensorSettings', JSON.stringify(settings));
            
            // Reset button after delay
            setTimeout(() => {
                saveBtn.innerHTML = originalText;
                saveBtn.style.backgroundColor = '';
                saveBtn.disabled = false;
            }, 2000);
        }, 1000);
    });
}

// Load device status
function loadDeviceStatus() {
    // Create status tab content if it doesn't exist
    const statusTab = document.getElementById('status');
    if (statusTab && !statusTab.querySelector('.sensor-grid')) {
        statusTab.innerHTML = `
            <div class="sensor-grid">
                <div class="sensor-card">
                    <div class="sensor-icon">
                        <i class="fas fa-thermometer-half"></i>
                    </div>
                    <div class="sensor-value" id="temperature-value">--°C</div>
                    <div class="sensor-label">Temperature</div>
                </div>
                
                <div class="sensor-card">
                    <div class="sensor-icon">
                        <i class="fas fa-tint"></i>
                    </div>
                    <div class="sensor-value" id="humidity-value">--%</div>
                    <div class="sensor-label">Humidity</div>
                </div>
                
                <div class="sensor-card">
                    <div class="sensor-icon">
                        <i class="fas fa-battery-three-quarters"></i>
                    </div>
                    <div class="sensor-value" id="battery-value">--%</div>
                    <div class="sensor-label">Battery</div>
                </div>
                
                <div class="sensor-card">
                    <div class="sensor-icon">
                        <i class="fas fa-running"></i>
                    </div>
                    <div class="sensor-value" id="motion-status">None</div>
                    <div class="sensor-label">Motion</div>
                </div>
            </div>

            <div class="status-card">
                <div class="status-icon" style="background-color: #2ecc71;">
                    <i class="fas fa-check"></i>
                </div>
                <div class="status-info">
                    <div class="status-title">Device Status</div>
                    <div class="status-value">Connected and reporting normally</div>
                </div>
                <div class="status-badge status-online">Online</div>
            </div>

            <div class="card">
                <div class="card-header">
                    <i class="fas fa-bell"></i>
                    Recent Alerts
                    <span class="toggle"><i class="fas fa-chevron-down"></i></span>
                </div>
                <div class="card-body">
                    <div class="form-group">
                        <div id="alerts-list">
                            <p style="color: var(--text-secondary); text-align: center; padding: 10px 0;">No recent alerts</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Re-initialize collapsible cards for the new content
        initCollapsibleCards();
    }
}

// Load settings tab content
function loadSettingsTab() {
    const settingsTab = document.getElementById('settings');
    if (settingsTab && !settingsTab.querySelector('.card')) {
        settingsTab.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <i class="fas fa-sliders-h"></i>
                    General Settings
                    <span class="toggle"><i class="fas fa-chevron-down"></i></span>
                </div>
                <div class="card-body">
                    <div class="form-group">
                        <label for="device-name">Device Name</label>
                        <input type="text" id="device-name" placeholder="Enter device name">
                    </div>
                    <div class="form-group">
                        <label for="report-interval">Report Interval</label>
                        <div class="slider-container">
                            <input type="range" min="60" max="43200" value="300" class="slider" id="report-interval">
                            <span class="slider-value" id="report-interval-value">5 min</span>
                        </div>
                        <div class="hint">How often the device reports its status (1 minute to 12 hours)</div>
                    </div>
                    <div class="form-group">
                        <label>
                            Enable Status LED
                            <label class="switch">
                                <input type="checkbox" id="led-enabled" checked>
                                <span class="slider-switch"></span>
                            </label>
                        </label>
                        <div class="hint">Turn the status LED on or off</div>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <i class="fas fa-battery-three-quarters"></i>
                    Battery Settings
                    <span class="toggle"><i class="fas fa-chevron-down"></i></span>
                </div>
                <div class="card-body">
                    <div class="form-group">
                        <label for="battery-threshold">Low Battery Threshold</label>
                        <div class="slider-container">
                            <input type="range" min="5" max="50" value="20" class="slider" id="battery-threshold">
                            <span class="slider-value" id="battery-threshold-value">20%</span>
                        </div>
                        <div class="hint">Battery level that triggers a low battery alert</div>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <i class="fas fa-running"></i>
                    Motion Detection
                    <span class="toggle"><i class="fas fa-chevron-down"></i></span>
                </div>
                <div class="card-body">
                    <div class="form-group">
                        <label for="motion-timeout">Motion Timeout</label>
                        <div class="slider-container">
                            <input type="range" min="10" max="3600" value="60" class="slider" id="motion-timeout">
                            <span class="slider-value" id="motion-timeout-value">60s</span>
                        </div>
                        <div class="hint">How long motion stays active after detection</div>
                    </div>
                    <div class="form-group">
                        <label for="motion-sensitivity">Motion Sensitivity</label>
                        <select id="motion-sensitivity">
                            <option value="low">Low</option>
                            <option value="medium" selected>Medium</option>
                            <option value="high">High</option>
                        </select>
                        <div class="hint">Adjust the sensitivity of the motion sensor</div>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <i class="fas fa-thermometer-half"></i>
                    Temperature & Humidity
                    <span class="toggle"><i class="fas fa-chevron-down"></i></span>
                </div>
                <div class="card-body">
                    <div class="form-group">
                        <label for="temperature-offset">Temperature Offset</label>
                        <div class="slider-container">
                            <input type="range" min="-100" max="100" value="0" step="5" class="slider" id="temperature-offset">
                            <span class="slider-value" id="temperature-offset-value">0.0°C</span>
                        </div>
                        <div class="hint">Calibrate the temperature sensor if needed</div>
                    </div>
                    <div class="form-group">
                        <label for="humidity-offset">Humidity Offset</label>
                        <div class="slider-container">
                            <input type="range" min="-200" max="200" value="0" step="10" class="slider" id="humidity-offset">
                            <span class="slider-value" id="humidity-offset-value">0.0%</span>
                        </div>
                        <div class="hint">Calibrate the humidity sensor if needed</div>
                    </div>
                    <div class="form-group">
                        <label for="temperature-unit">Temperature Unit</label>
                        <select id="temperature-unit">
                            <option value="celsius">Celsius (°C)</option>
                            <option value="fahrenheit">Fahrenheit (°F)</option>
                        </select>
                    </div>
                </div>
            </div>
        `;
        
        // Re-initialize sliders and other interactive elements
        initSliders();
        initCollapsibleCards();
    }
}

// Load advanced tab content
function loadAdvancedTab() {
    const advancedTab = document.getElementById('advanced');
    if (advancedTab && !advancedTab.querySelector('.card')) {
        advancedTab.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <i class="fas fa-tools"></i>
                    Device Information
                    <span class="toggle"><i class="fas fa-chevron-down"></i></span>
                </div>
                <div class="card-body">
                    <div class="form-group">
                        <label>Firmware Version</label>
                        <div class="hint">v1.2.3</div>
                    </div>
                    <div class="form-group">
                        <label>Hardware Version</label>
                        <div class="hint">1.0</div>
                    </div>
                    <div class="form-group">
                        <label>Zigbee MAC Address</label>
                        <div class="hint">00:15:8D:00:01:23:45:67</div>
                    </div>
                    <div class="form-group">
                        <label>Last Seen</label>
                        <div class="hint" id="last-seen">Just now</div>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <i class="fas fa-sync-alt"></i>
                    Maintenance
                    <span class="toggle"><i class="fas fa-chevron-down"></i></span>
                </div>
                <div class="card-body">
                    <div class="form-group">
                        <button id="check-updates" class="btn btn-block">
                            <i class="fas fa-sync-alt"></i> Check for Updates
                        </button>
                        <div class="hint" id="update-status"></div>
                    </div>
                    <div class="form-group">
                        <button id="reboot-device" class="btn btn-secondary btn-block">
                            <i class="fas fa-power-off"></i> Reboot Device
                        </button>
                        <div class="hint">Restart the device</div>
                    </div>
                    <div class="form-group">
                        <button id="reset-device" class="btn btn-danger btn-block">
                            <i class="fas fa-trash-alt"></i> Factory Reset
                        </button>
                        <div class="hint">Reset all settings to default</div>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <i class="fas fa-chart-line"></i>
                    Diagnostics
                    <span class="toggle"><i class="fas fa-chevron-down"></i></span>
                </div>
                <div class="card-body">
                    <div class="form-group">
                        <label>Signal Strength</label>
                        <div class="hint">
                            <i class="fas fa-wifi"></i> Excellent
                            <div class="progress" style="margin-top: 5px; height: 6px; background: #e0e0e0; border-radius: 3px;">
                                <div style="width: 90%; height: 100%; background: #2ecc71; border-radius: 3px;"></div>
                            </div>
                        </div>
                    </div>
                    <div class="form-group">
                        <button id="test-sensors" class="btn btn-block">
                            <i class="fas fa-vial"></i> Run Sensor Test
                        </button>
                        <div class="hint" id="test-result"></div>
                    </div>
                    <div class="form-group">
                        <button id="export-logs" class="btn btn-secondary btn-block">
                            <i class="fas fa-download"></i> Export Device Logs
                        </button>
                        <div class="hint">Download detailed device logs for troubleshooting</div>
                    </div>
                </div>
            </div>
        `;
        
        // Initialize maintenance buttons
        initMaintenanceButtons();
        initCollapsibleCards();
    }
}

// Initialize maintenance buttons
function initMaintenanceButtons() {
    // Check for updates
    const checkUpdatesBtn = document.getElementById('check-updates');
    if (checkUpdatesBtn) {
        checkUpdatesBtn.addEventListener('click', function() {
            const updateStatus = document.getElementById('update-status');
            const originalText = this.innerHTML;
            
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking...';
            this.disabled = true;
            
            // Simulate update check
            setTimeout(() => {
                if (Math.random() > 0.3) {
                    updateStatus.innerHTML = '<i class="fas fa-check-circle" style="color: #2ecc71;"></i> Your device is up to date';
                } else {
                    updateStatus.innerHTML = '<i class="fas fa-arrow-alt-circle-down" style="color: #e67e22;"></i> Update available! <a href="#" style="color: #3498db;">Download now</a>';
                }
                
                this.innerHTML = originalText;
                this.disabled = false;
            }, 1500);
        });
    }
    
    // Reboot device
    const rebootBtn = document.getElementById('reboot-device');
    if (rebootBtn) {
        rebootBtn.addEventListener('click', function() {
            if (confirm('Are you sure you want to reboot the device? It may take a minute to come back online.')) {
                alert('Device is rebooting...');
                // Simulate reboot
                setTimeout(() => {
                    alert('Device has been rebooted successfully.');
                }, 2000);
            }
        });
    }
    
    // Factory reset
    const resetBtn = document.getElementById('reset-device');
    if (resetBtn) {
        resetBtn.addEventListener('click', function() {
            if (confirm('WARNING: This will reset all settings to factory defaults. Are you sure?')) {
                if (confirm('This cannot be undone. All your settings will be lost. Proceed?')) {
                    // Simulate factory reset
                    localStorage.removeItem('tuyaMultiSensorSettings');
                    alert('Device has been reset to factory defaults. The page will now reload.');
                    setTimeout(() => {
                        window.location.reload();
                    }, 1000);
                }
            }
        });
    }
    
    // Test sensors
    const testSensorsBtn = document.getElementById('test-sensors');
    if (testSensorsBtn) {
        testSensorsBtn.addEventListener('click', function() {
            const testResult = document.getElementById('test-result');
            const originalText = this.innerHTML;
            
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Testing...';
            this.disabled = true;
            testResult.textContent = '';
            
            // Simulate sensor test
            setTimeout(() => {
                const results = [
                    '✓ Temperature sensor: OK',
                    '✓ Humidity sensor: OK',
                    '✓ Motion sensor: OK',
                    '✓ Battery level: 87%'
                ];
                
                testResult.innerHTML = results.join('<br>');
                this.innerHTML = originalText;
                this.disabled = false;
            }, 2000);
        });
    }
    
    // Export logs
    const exportLogsBtn = document.getElementById('export-logs');
    if (exportLogsBtn) {
        exportLogsBtn.addEventListener('click', function() {
            // Create a log file
            const logContent = `Tuya Multi-Sensor Logs\n`;
            logContent += `Generated: ${new Date().toISOString()}\n`;
            logContent += `Device ID: TY-${Math.random().toString(36).substr(2, 9).toUpperCase()}\n\n`;
            logContent += `[SYSTEM] Device started\n`;
            logContent += `[SENSOR] Temperature: 23.5°C\n`;
            logContent += `[SENSOR] Humidity: 45%\n`;
            logContent += `[BATTERY] Level: 87%\n`;
            logContent += `[CONNECTION] Signal strength: -65 dBm\n`;
            
            // Create a download link
            const blob = new Blob([logContent], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `tuya-sensor-logs-${new Date().toISOString().split('T')[0]}.log`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }
}

// Load settings from localStorage
function loadSettings() {
    try {
        const savedSettings = localStorage.getItem('tuyaMultiSensorSettings');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            
            // Apply settings to form elements
            if (settings.deviceName) document.getElementById('device-name').value = settings.deviceName;
            if (settings.reportInterval) document.getElementById('report-interval').value = settings.reportInterval;
            if (settings.ledEnabled !== undefined) document.getElementById('led-enabled').checked = settings.ledEnabled;
            if (settings.batteryThreshold) document.getElementById('battery-threshold').value = settings.batteryThreshold;
            if (settings.motionTimeout) document.getElementById('motion-timeout').value = settings.motionTimeout;
            if (settings.motionSensitivity) document.getElementById('motion-sensitivity').value = settings.motionSensitivity;
            if (settings.temperatureOffset) document.getElementById('temperature-offset').value = settings.temperatureOffset;
            if (settings.humidityOffset) document.getElementById('humidity-offset').value = settings.humidityOffset;
            if (settings.temperatureUnit) document.getElementById('temperature-unit').value = settings.temperatureUnit;
            
            // Update slider displays
            initSliders();
        }
    } catch (e) {
        console.error('Error loading settings:', e);
    }
}

// Start status updates
function startStatusUpdates() {
    // Initial update
    updateDeviceStatus();
    
    // Update every 5 seconds
    setInterval(updateDeviceStatus, 5000);
}

// Update device status display
function updateDeviceStatus() {
    // Simulate random sensor values for demo
    const temperature = (Math.random() * 10 + 20).toFixed(1);
    const humidity = (Math.random() * 20 + 40).toFixed(1);
    const battery = Math.max(10, Math.min(100, Math.round(Math.random() * 30 + 70)));
    
    // Update UI
    const tempElement = document.getElementById('temperature-value');
    const humidityElement = document.getElementById('humidity-value');
    const batteryElement = document.getElementById('battery-value');
    const motionElement = document.getElementById('motion-status');
    const lastSeenElement = document.getElementById('last-seen');
    
    if (tempElement) tempElement.textContent = `${temperature}°C`;
    if (humidityElement) humidityElement.textContent = `${humidity}%`;
    if (batteryElement) batteryElement.textContent = `${battery}%`;
    
    // Update battery icon
    const batteryIcon = document.querySelector('.fa-battery-three-quarters');
    if (batteryIcon) {
        batteryIcon.className = ''; // Clear existing classes
        if (battery > 75) batteryIcon.className = 'fas fa-battery-full';
        else if (battery > 50) batteryIcon.className = 'fas fa-battery-three-quarters';
        else if (battery > 25) batteryIcon.className = 'fas fa-battery-half';
        else if (battery > 10) batteryIcon.className = 'fas fa-battery-quarter';
        else batteryIcon.className = 'fas fa-battery-empty';
    }
    
    // Random motion detection
    if (motionElement && Math.random() > 0.9) {
        motionElement.textContent = 'Detected';
        motionElement.classList.add('status-update');
        setTimeout(() => motionElement.classList.remove('status-update'), 500);
        
        // Reset after delay
        setTimeout(() => {
            if (motionElement) motionElement.textContent = 'None';
        }, 5000);
    }
    
    // Update last seen time
    if (lastSeenElement) {
        lastSeenElement.textContent = 'Just now';
    }
}

// Lazy load tab content
function loadTabContent(tabId) {
    switch (tabId) {
        case 'status':
            loadDeviceStatus();
            break;
        case 'settings':
            loadSettingsTab();
            break;
        case 'advanced':
            loadAdvancedTab();
            break;
    }
}
