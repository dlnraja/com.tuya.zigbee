
// Dashboard JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Update statistics
    updateStatistics();
    
    // Add smooth scrolling
    addSmoothScrolling();
    
    // Add interactive features
    addInteractiveFeatures();
});

function updateStatistics() {
    // This would normally fetch from an API
    // For now, we'll use placeholder values
    const stats = {
        'total-devices': '25+',
        'total-categories': '11',
        'total-vendors': '25+'
    };
    
    for (const [id, value] of Object.entries(stats)) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }
}

function addSmoothScrolling() {
    const links = document.querySelectorAll('a[href^="#"]');
    
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

function addInteractiveFeatures() {
    // Add hover effects to cards
    const cards = document.querySelectorAll('.overview-card, .stat-card, .category-card, .vendor-card');
    
    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
}

// Add loading animation
window.addEventListener('load', function() {
    document.body.classList.add('loaded');
});
