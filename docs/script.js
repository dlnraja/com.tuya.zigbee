document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 Dashboard Tuya Zigbee v3.4.1 chargé');
  
  // Mise à jour des statistiques en temps réel
  updateStats();
  
  // Chargement de la liste des drivers
  loadDriversList();
  
  // Actualisation automatique toutes les 30 secondes
  setInterval(updateStats, 30000);
});

async function updateStats() {
  try {
    // Simulation de données en temps réel
    const stats = {
      drivers: Math.floor(Math.random() * 50) + 100,
      capabilities: Math.floor(Math.random() * 10) + 20,
      clusters: Math.floor(Math.random() * 5) + 15
    };
    
    document.getElementById('drivers-count').textContent = stats.drivers + '+';
    document.getElementById('capabilities-count').textContent = stats.capabilities + '+';
    document.getElementById('clusters-count').textContent = stats.clusters + '+';
    
  } catch (error) {
    console.error('Erreur lors de la mise à jour des stats:', error);
  }
}

async function loadDriversList() {
  try {
    const drivers = [
      { name: 'wall_switch_1_gang', category: 'switch', description: 'Commutateur 1 bouton' },
      { name: 'wall_switch_2_gang', category: 'switch', description: 'Commutateur 2 boutons' },
      { name: 'wall_switch_3_gang', category: 'switch', description: 'Commutateur 3 boutons' },
      { name: 'rgb_bulb_E27', category: 'light', description: 'Ampoule RGB E27' },
      { name: 'rgb_bulb_E14', category: 'light', description: 'Ampoule RGB E14' },
      { name: 'temphumidsensor', category: 'sensor', description: 'Capteur température/humidité' },
      { name: 'motion_sensor', category: 'sensor', description: 'Capteur de mouvement' },
      { name: 'smartplug', category: 'plug', description: 'Prise intelligente avec mesure' }
    ];
    
    const driversList = document.getElementById('drivers-list');
    driversList.innerHTML = '';
    
    drivers.forEach(driver => {
      const driverCard = createDriverCard(driver);
      driversList.appendChild(driverCard);
    });
    
  } catch (error) {
    console.error('Erreur lors du chargement des drivers:', error);
  }
}

function createDriverCard(driver) {
  const card = document.createElement('div');
  card.className = 'driver-card';
  card.style.cssText = `
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
    padding: 1.5rem;
    border-radius: 10px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    transition: transform 0.3s ease;
  `;
  
  card.innerHTML = `
    <h3>${driver.name}</h3>
    <p class="driver-category">${driver.category}</p>
    <p class="driver-description">${driver.description}</p>
  `;
  
  card.addEventListener('mouseenter', () => {
    card.style.transform = 'translateY(-5px)';
  });
  
  card.addEventListener('mouseleave', () => {
    card.style.transform = 'translateY(0)';
  });
  
  return card;
}

// Ajout de styles CSS dynamiques
const style = document.createElement('style');
style.textContent = `
  .driver-card {
    cursor: pointer;
  }
  
  .driver-category {
    font-size: 0.9rem;
    opacity: 0.8;
    margin: 0.5rem 0;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  
  .driver-description {
    font-size: 1rem;
    opacity: 0.9;
    line-height: 1.4;
  }
`;
document.head.appendChild(style);