/**
 * 🚀 Universal Tuya Zigbee Dashboard - Main Application
 * 
 * @author dlnraja
 * @version 3.4.0
 * @date 2025-01-13
 */

class DashboardApp {
  constructor() {
    this.currentLanguage = 'en';
    this.translations = {};
    this.dashboardData = {};
    this.currentPage = 1;
    this.itemsPerPage = 12;
    this.filteredDrivers = [];
    
    this.init();
  }

  async init() {
    try {
      console.log('🚀 Initializing Universal Tuya Zigbee Dashboard...');
      
      // Load translations
      await this.loadTranslations();
      
      // Load dashboard data
      await this.loadDashboardData();
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Initialize UI
      this.initializeUI();
      
      // Hide loading overlay
      this.hideLoadingOverlay();
      
      console.log('✅ Dashboard initialized successfully');
      
    } catch (error) {
      console.error('❌ Error initializing dashboard:', error);
      this.showError('Failed to initialize dashboard. Please refresh the page.');
    }
  }

  async loadTranslations() {
    try {
      const languages = ['en', 'fr', 'nl', 'ta-LK'];
      
      for (const lang of languages) {
        const response = await fetch(`lang/${lang}.json`);
        if (response.ok) {
          this.translations[lang] = await response.json();
        }
      }
      
      console.log('🌍 Translations loaded:', Object.keys(this.translations));
      
    } catch (error) {
      console.error('❌ Error loading translations:', error);
      // Fallback to English
      this.translations = { en: {} };
    }
  }

  async loadDashboardData() {
    try {
      // Try to load from data files
      const dataFiles = [
        'data/kpi.json',
        'data/sources.json',
        'data/drivers.json',
        'data/categories.json'
      ];
      
      for (const file of dataFiles) {
        try {
          const response = await fetch(file);
          if (response.ok) {
            const data = await response.json();
            const key = file.split('/').pop().replace('.json', '');
            this.dashboardData[key] = data;
          }
        } catch (error) {
          console.warn(`⚠️ Could not load ${file}:`, error.message);
        }
      }
      
      // If no data files, use fallback data
      if (Object.keys(this.dashboardData).length === 0) {
        this.dashboardData = this.getFallbackData();
      }
      
      console.log('📊 Dashboard data loaded:', Object.keys(this.dashboardData));
      
    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
      this.dashboardData = this.getFallbackData();
    }
  }

  getFallbackData() {
    return {
      kpi: {
        totalDrivers: 786,
        totalVendors: 24,
        totalCategories: 12,
        assetsCompleteness: 92,
        integrationBySource: {
          'Zigbee2MQTT': { percentage: 85, status: '✅ Integrated', lastSync: '2025-01-13' },
          'Blakadder': { percentage: 78, status: '🛠 Partial', lastSync: '2025-01-13' },
          'Homey Forum': { percentage: 60, status: '🔄 Syncing', lastSync: '2025-01-13' },
          'JohanBenz Repos': { percentage: 40, status: '📋 Planned', lastSync: '2025-01-13' }
        }
      },
      sources: [
        { name: 'Zigbee2MQTT', link: 'https://www.zigbee2mqtt.io/', integration: 85, status: '✅ Integrated', lastSync: '2025-01-13' },
        { name: 'Blakadder', link: 'https://blakadder.com/zigbee/', integration: 78, status: '🛠 Partial', lastSync: '2025-01-13' },
        { name: 'Homey Forum', link: 'https://community.homey.app/', integration: 60, status: '🔄 Syncing', lastSync: '2025-01-13' },
        { name: 'JohanBenz Repos', link: 'https://github.com/JohanBenz', integration: 40, status: '📋 Planned', lastSync: '2025-01-13' }
      ],
      drivers: this.generateSampleDrivers(),
      categories: [
        { name: 'Plug', count: 156, icon: '🔌' },
        { name: 'Switch', count: 142, icon: '🔘' },
        { name: 'Light', count: 134, icon: '💡' },
        { name: 'Cover', count: 89, icon: '🪟' },
        { name: 'Sensor', count: 167, icon: '📡' },
        { name: 'Thermostat', count: 45, icon: '🌡️' },
        { name: 'Other', count: 53, icon: '🔧' }
      ]
    };
  }

  generateSampleDrivers() {
    const sampleDrivers = [];
    const categories = ['plug', 'switch', 'light', 'cover', 'sensor', 'thermostat'];
    const vendors = ['tuya', 'zemismart', 'moes', 'nous', 'lidl_silvercrest', 'blitzwolf'];
    
    for (let i = 1; i <= 50; i++) {
      const category = categories[Math.floor(Math.random() * categories.length)];
      const vendor = vendors[Math.floor(Math.random() * vendors.length)];
      const techCode = `TS${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`;
      
      sampleDrivers.push({
        id: `driver_${i}`,
        name: `Sample ${category.charAt(0).toUpperCase() + category.slice(1)} ${i}`,
        techCode: techCode,
        vendor: vendor,
        category: category,
        capabilities: ['onoff', 'dim', 'measure_power'].slice(0, Math.floor(Math.random() * 3) + 1),
        image: `../assets/images/small.png`,
        description: `Sample ${category} device with ${techCode} technology`
      });
    }
    
    return sampleDrivers;
  }

  setupEventListeners() {
    // Language selector
    const languageSelect = document.getElementById('languageSelect');
    if (languageSelect) {
      languageSelect.addEventListener('change', (e) => {
        this.setLanguage(e.target.value);
      });
    }

    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        this.toggleTheme();
      });
    }

    // Search input
    const searchInput = document.getElementById('driverSearch');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.filterDrivers(e.target.value);
      });
    }

    // Category filter
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
      categoryFilter.addEventListener('change', (e) => {
        this.filterDrivers();
      });
    }

    // Vendor filter
    const vendorFilter = document.getElementById('vendorFilter');
    if (vendorFilter) {
      vendorFilter.addEventListener('change', (e) => {
        this.filterDrivers();
      });
    }

    // Hero buttons
    const viewDriversBtn = document.querySelector('[data-i18n="hero.viewDrivers"]');
    if (viewDriversBtn) {
      viewDriversBtn.addEventListener('click', () => {
        document.querySelector('.drivers-section').scrollIntoView({ behavior: 'smooth' });
      });
    }

    const viewStatsBtn = document.querySelector('[data-i18n="hero.viewStats"]');
    if (viewStatsBtn) {
      viewStatsBtn.addEventListener('click', () => {
        document.querySelector('.kpi-section').scrollIntoView({ behavior: 'smooth' });
      });
    }

    const contributeBtn = document.querySelector('[data-i18n="hero.contribute"]');
    if (contributeBtn) {
      contributeBtn.addEventListener('click', () => {
        window.open('https://github.com/dlnraja/homey-tuya-zigbee', '_blank');
      });
    }
  }

  initializeUI() {
    // Set initial language
    this.setLanguage(this.currentLanguage);
    
    // Update KPI cards
    this.updateKPICards();
    
    // Update sources table
    this.updateSourcesTable();
    
    // Update drivers grid
    this.updateDriversGrid();
    
    // Update filters
    this.updateFilters();
    
    // Update last update date
    this.updateLastUpdateDate();
    
    // Initialize charts
    this.initializeCharts();
    
    // Load changelog
    this.loadChangelog();
    
    // Load roadmap
    this.loadRoadmap();
  }

  setLanguage(language) {
    this.currentLanguage = language;
    
    // Update language selector
    const languageSelect = document.getElementById('languageSelect');
    if (languageSelect) {
      languageSelect.value = language;
    }
    
    // Update all translatable elements
    this.updateTranslations();
    
    // Store language preference
    localStorage.setItem('dashboard-language', language);
    
    console.log(`🌍 Language changed to: ${language}`);
  }

  updateTranslations() {
    const translation = this.translations[this.currentLanguage] || this.translations['en'] || {};
    
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      const keys = key.split('.');
      let value = translation;
      
      for (const k of keys) {
        value = value?.[k];
        if (value === undefined) break;
      }
      
      if (value !== undefined) {
        if (element.tagName === 'INPUT' && element.type === 'placeholder') {
          element.placeholder = value;
        } else {
          element.textContent = value;
        }
      }
    });
  }

  updateKPICards() {
    const kpiData = this.dashboardData.kpi;
    if (!kpiData) return;

    // Update KPI values with animation
    this.animateCounter('totalDrivers', kpiData.totalDrivers);
    this.animateCounter('totalVendors', kpiData.totalVendors);
    this.animateCounter('totalCategories', kpiData.totalCategories);
    this.animateCounter('assetsCompleteness', kpiData.assetsCompleteness, '%');
  }

  animateCounter(elementId, targetValue, suffix = '') {
    const element = document.getElementById(elementId);
    if (!element) return;

    const startValue = 0;
    const duration = 2000;
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const currentValue = Math.floor(startValue + (targetValue - startValue) * this.easeOutQuart(progress));
      element.textContent = currentValue + suffix;

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }

  easeOutQuart(t) {
    return 1 - Math.pow(1 - t, 4);
  }

  updateSourcesTable() {
    const sourcesData = this.dashboardData.sources;
    if (!sourcesData) return;

    const tbody = document.getElementById('sourcesTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';
    
    sourcesData.forEach(source => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${source.name}</td>
        <td><a href="${source.link}" target="_blank" rel="noopener noreferrer">${source.link}</a></td>
        <td>${source.integration}%</td>
        <td>${source.status}</td>
        <td>${source.lastSync}</td>
      `;
      tbody.appendChild(row);
    });
  }

  updateDriversGrid() {
    const driversData = this.dashboardData.drivers;
    if (!driversData) return;

    this.filteredDrivers = [...driversData];
    this.renderDriversPage();
  }

  filterDrivers(searchTerm = '') {
    const driversData = this.dashboardData.drivers;
    if (!driversData) return;

    const categoryFilter = document.getElementById('categoryFilter')?.value || '';
    const vendorFilter = document.getElementById('vendorFilter')?.value || '';

    this.filteredDrivers = driversData.filter(driver => {
      const matchesSearch = !searchTerm || 
        driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        driver.techCode.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = !categoryFilter || driver.category === categoryFilter;
      const matchesVendor = !vendorFilter || driver.vendor === vendorFilter;

      return matchesSearch && matchesCategory && matchesVendor;
    });

    this.currentPage = 1;
    this.renderDriversPage();
  }

  renderDriversPage() {
    const grid = document.getElementById('driversGrid');
    if (!grid) return;

    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    const pageDrivers = this.filteredDrivers.slice(startIndex, endIndex);

    grid.innerHTML = '';

    if (pageDrivers.length === 0) {
      grid.innerHTML = `
        <div class="text-center" style="grid-column: 1 / -1; padding: 2rem;">
          <p>${this.getTranslation('drivers.noDriversFound')}</p>
        </div>
      `;
      return;
    }

    pageDrivers.forEach(driver => {
      const card = this.createDriverCard(driver);
      grid.appendChild(card);
    });

    this.updatePagination();
  }

  createDriverCard(driver) {
    const card = document.createElement('div');
    card.className = 'driver-card';
    
    card.innerHTML = `
      <img src="${driver.image}" alt="${driver.name}" class="driver-image" onerror="this.src='../assets/images/small.png'">
      <div class="driver-content">
        <h3 class="driver-name">${driver.name}</h3>
        <div class="driver-tech-code">${driver.techCode}</div>
        <div class="driver-meta">
          <span>${driver.vendor}</span>
          <span>${driver.category}</span>
        </div>
        <div class="driver-capabilities">
          ${driver.capabilities.map(cap => `<span class="capability-tag">${cap}</span>`).join('')}
        </div>
      </div>
    `;

    return card;
  }

  updatePagination() {
    const pagination = document.getElementById('pagination');
    if (!pagination) return;

    const totalPages = Math.ceil(this.filteredDrivers.length / this.itemsPerPage);
    
    if (totalPages <= 1) {
      pagination.innerHTML = '';
      return;
    }

    let paginationHTML = '';

    // Previous button
    paginationHTML += `
      <button ${this.currentPage === 1 ? 'disabled' : ''} onclick="dashboardApp.goToPage(${this.currentPage - 1})">
        ${this.getTranslation('common.previous')}
      </button>
    `;

    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
        paginationHTML += `
          <button class="${i === this.currentPage ? 'active' : ''}" onclick="dashboardApp.goToPage(${i})">
            ${i}
          </button>
        `;
      } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
        paginationHTML += '<span>...</span>';
      }
    }

    // Next button
    paginationHTML += `
      <button ${this.currentPage === totalPages ? 'disabled' : ''} onclick="dashboardApp.goToPage(${this.currentPage + 1})">
        ${this.getTranslation('common.next')}
      </button>
    `;

    pagination.innerHTML = paginationHTML;
  }

  goToPage(page) {
    this.currentPage = page;
    this.renderDriversPage();
    window.scrollTo({ top: document.querySelector('.drivers-section').offsetTop - 100, behavior: 'smooth' });
  }

  updateFilters() {
    const driversData = this.dashboardData.drivers;
    if (!driversData) return;

    // Update category filter
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
      const categories = [...new Set(driversData.map(d => d.category))];
      categoryFilter.innerHTML = `<option value="">${this.getTranslation('drivers.allCategories')}</option>`;
      categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category.charAt(0).toUpperCase() + category.slice(1);
        categoryFilter.appendChild(option);
      });
    }

    // Update vendor filter
    const vendorFilter = document.getElementById('vendorFilter');
    if (vendorFilter) {
      const vendors = [...new Set(driversData.map(d => d.vendor))];
      vendorFilter.innerHTML = `<option value="">${this.getTranslation('drivers.allVendors')}</option>`;
      vendors.forEach(vendor => {
        const option = document.createElement('option');
        option.value = vendor;
        option.textContent = vendor.charAt(0).toUpperCase() + vendor.slice(1);
        vendorFilter.appendChild(option);
      });
    }
  }

  updateLastUpdateDate() {
    const lastUpdateElement = document.getElementById('lastUpdateDate');
    if (lastUpdateElement) {
      const now = new Date();
      lastUpdateElement.textContent = now.toLocaleDateString(this.currentLanguage, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  }

  initializeCharts() {
    // This would integrate with Chart.js or similar library
    // For now, we'll create simple CSS-based charts
    this.createCategoryChart();
    this.createVendorChart();
  }

  createCategoryChart() {
    const categoriesData = this.dashboardData.categories;
    if (!categoriesData) return;

    const chartContainer = document.getElementById('categoryChart');
    if (!chartContainer) return;

    // Create simple CSS chart
    chartContainer.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 0.5rem; height: 100%;">
        ${categoriesData.map(cat => `
          <div style="display: flex; align-items: center; gap: 1rem;">
            <span style="width: 2rem;">${cat.icon}</span>
            <span style="flex: 1;">${cat.name}</span>
            <div style="flex: 2; height: 1.5rem; background: #e2e8f0; border-radius: 0.25rem; overflow: hidden;">
              <div style="width: ${(cat.count / Math.max(...categoriesData.map(c => c.count))) * 100}%; height: 100%; background: linear-gradient(90deg, #667eea, #f093fb);"></div>
            </div>
            <span style="width: 3rem; text-align: right; font-weight: 600;">${cat.count}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  createVendorChart() {
    const driversData = this.dashboardData.drivers;
    if (!driversData) return;

    const vendorCounts = {};
    driversData.forEach(driver => {
      vendorCounts[driver.vendor] = (vendorCounts[driver.vendor] || 0) + 1;
    });

    const topVendors = Object.entries(vendorCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 8);

    const chartContainer = document.getElementById('vendorChart');
    if (!chartContainer) return;

    chartContainer.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 0.5rem; height: 100%;">
        ${topVendors.map(([vendor, count]) => `
          <div style="display: flex; align-items: center; gap: 1rem;">
            <span style="flex: 1; text-transform: capitalize;">${vendor}</span>
            <div style="flex: 2; height: 1.5rem; background: #e2e8f0; border-radius: 0.25rem; overflow: hidden;">
              <div style="width: ${(count / Math.max(...topVendors.map(([,c]) => c))) * 100}%; height: 100%; background: linear-gradient(90deg, #764ba2, #667eea);"></div>
            </div>
            <span style="width: 3rem; text-align: right; font-weight: 600;">${count}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  async loadChangelog() {
    try {
      const response = await fetch('../CHANGELOG.md');
      if (response.ok) {
        const changelogText = await response.text();
        this.parseChangelog(changelogText);
      }
    } catch (error) {
      console.warn('⚠️ Could not load changelog:', error.message);
      this.showSampleChangelog();
    }
  }

  parseChangelog(changelogText) {
    const container = document.getElementById('changelogContainer');
    if (!container) return;

    const lines = changelogText.split('\n');
    let changelogHTML = '';
    let currentVersion = '';

    lines.forEach(line => {
      if (line.startsWith('## ')) {
        if (currentVersion) {
          changelogHTML += '</div>';
        }
        currentVersion = line.replace('## ', '');
        changelogHTML += `
          <div class="changelog-entry">
            <div class="changelog-header">
              <span class="changelog-version">${currentVersion}</span>
              <span class="changelog-date">2025-01-13</span>
            </div>
            <div class="changelog-changes">
        `;
      } else if (line.startsWith('- ') && currentVersion) {
        changelogHTML += `<p>${line.replace('- ', '• ')}</p>`;
      }
    });

    if (currentVersion) {
      changelogHTML += '</div></div>';
    }

    container.innerHTML = changelogHTML;
  }

  showSampleChangelog() {
    const container = document.getElementById('changelogContainer');
    if (!container) return;

    container.innerHTML = `
      <div class="changelog-entry">
        <div class="changelog-header">
          <span class="changelog-version">3.4.0</span>
          <span class="changelog-date">2025-01-13</span>
        </div>
        <div class="changelog-changes">
          <p>• Complete SOT architecture implementation</p>
          <p>• Multilingual dashboard support</p>
          <p>• Automated driver generation</p>
          <p>• GitHub Actions CI/CD integration</p>
        </div>
      </div>
      <div class="changelog-entry">
        <div class="changelog-header">
          <span class="changelog-version">3.3.0</span>
          <span class="changelog-date">2025-01-13</span>
        </div>
        <div class="changelog-changes">
          <p>• SDK3+ migration</p>
          <p>• Enhanced driver structure</p>
          <p>• Improved asset management</p>
        </div>
      </div>
    `;
  }

  loadRoadmap() {
    const timeline = document.getElementById('roadmapTimeline');
    if (!timeline) return;

    timeline.innerHTML = `
      <div class="roadmap-item">
        <div class="roadmap-quarter">Q1 2025</div>
        <div class="roadmap-title">Complete SDK3.4.0 Migration</div>
        <div class="roadmap-description">Full implementation of Source-of-Truth architecture with automated driver generation</div>
        <span class="roadmap-status completed">Completed</span>
      </div>
      <div class="roadmap-item">
        <div class="roadmap-quarter">Q2 2025</div>
        <div class="roadmap-title">GitHub Actions CI/CD</div>
        <div class="roadmap-description">Complete automation pipeline for validation, enrichment, and deployment</div>
        <span class="roadmap-status inProgress">In Progress</span>
      </div>
      <div class="roadmap-item">
        <div class="roadmap-quarter">Q3 2025</div>
        <div class="roadmap-title">Advanced AI Enrichment</div>
        <div class="roadmap-description">Machine learning integration for automatic driver optimization</div>
        <span class="roadmap-status planned">Planned</span>
      </div>
      <div class="roadmap-item">
        <div class="roadmap-quarter">Q4 2025</div>
        <div class="roadmap-title">Community Platform</div>
        <div class="roadmap-description">User-driven driver development and contribution system</div>
        <span class="roadmap-status planned">Planned</span>
      </div>
    `;
  }

  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('dashboard-theme', newTheme);
    
    // Update theme toggle icon
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
      const icon = themeToggle.querySelector('i');
      if (icon) {
        icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
      }
    }
    
    console.log(`🌙 Theme changed to: ${newTheme}`);
  }

  getTranslation(key) {
    const translation = this.translations[this.currentLanguage] || this.translations['en'] || {};
    const keys = key.split('.');
    let value = translation;
    
    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) break;
    }
    
    return value || key;
  }

  showError(message) {
    console.error('❌ Dashboard Error:', message);
    
    // Create error notification
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ef4444;
      color: white;
      padding: 1rem;
      border-radius: 0.5rem;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
      z-index: 10000;
      max-width: 400px;
    `;
    errorDiv.textContent = message;
    
    document.body.appendChild(errorDiv);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.parentNode.removeChild(errorDiv);
      }
    }, 5000);
  }

  hideLoadingOverlay() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
      overlay.style.opacity = '0';
      setTimeout(() => {
        overlay.style.display = 'none';
      }, 300);
    }
  }

  // Public methods for external access
  refreshData() {
    this.loadDashboardData().then(() => {
      this.updateKPICards();
      this.updateSourcesTable();
      this.updateDriversGrid();
      this.initializeCharts();
    });
  }

  exportData() {
    const dataStr = JSON.stringify(this.dashboardData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'dashboard-data.json';
    link.click();
    
    URL.revokeObjectURL(url);
  }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Load saved preferences
  const savedLanguage = localStorage.getItem('dashboard-language');
  const savedTheme = localStorage.getItem('dashboard-theme');
  
  // Apply saved theme
  if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
  }
  
  // Initialize dashboard
  window.dashboardApp = new DashboardApp();
  
  // Apply saved language after initialization
  if (savedLanguage) {
    setTimeout(() => {
      window.dashboardApp.setLanguage(savedLanguage);
    }, 100);
  }
});

// Export for external use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DashboardApp;
}
