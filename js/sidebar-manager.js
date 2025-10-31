// Complete Sidebar Manager - Single source of truth for sidebar functionality

class SidebarManager {
    constructor() {
        this.sidebar = document.getElementById('sidebar');
        this.sidebarToggle = document.getElementById('sidebarToggle');
        this.fabSidebarToggle = document.getElementById('fab-toggle-sidebar');
        this.closeBtn = document.getElementById('closeSidebarBtn'); // Get the new close button
        this.overlay = document.getElementById('sidebarOverlay');
        this.salesList = document.querySelector('.sales-list');
        this.menuItems = document.querySelectorAll('.menu-list li');
        
        this.isInitialized = false;
        this.init();
    }

    init() {
        if (this.isInitialized) return;
        
        if (!this.validateElements()) {
            console.error('Required sidebar elements not found');
            return;
        }

        this.setupToggle();
        this.setupCloseButton(); // Setup the new close button
        this.setupFabToggle();
        this.setupSalesList();
        this.setupMenuStates();
        this.loadSavedState();
        this.setupResponsiveBehavior();
        
        this.isInitialized = true;
    }

    validateElements() {
        return !!(this.sidebar && this.sidebarToggle);
    }

    setupToggle() {
        // Ensure clean state
        this.sidebarToggle.removeEventListener('click', this.handleToggleClick);
        this.sidebarToggle.addEventListener('click', this.handleToggleClick.bind(this));
    }

    handleToggleClick(event) {
        event.stopPropagation();
        this.toggleSidebar();
    }

    setupFabToggle() {
        if (!this.fabSidebarToggle) return;
        this.fabSidebarToggle.addEventListener('click', this.handleToggleClick.bind(this));
    }

    toggleSidebar() {
        if (!this.sidebar || !this.sidebarToggle) return;

        const isCollapsed = this.sidebar.classList.contains('collapsed');
        
        if (isCollapsed) {
            this.openSidebar();
        } else {
            this.closeSidebar();
        }
    }

    openSidebar() {
        this.sidebar.classList.remove('collapsed');
        
        const icon = this.sidebarToggle.querySelector('i');
        if (icon) {
            icon.className = 'fas fa-bars';
        }
        
        if (this.overlay && window.innerWidth <= 768) {
            this.overlay.classList.add('active');
        }
        
        localStorage.setItem('sidebarCollapsed', 'false');
    }

    closeSidebar() {
        this.sidebar.classList.add('collapsed');
        
        const icon = this.sidebarToggle.querySelector('i');
        if (icon) {
            icon.className = 'fas fa-chevron-right';
        }
        
        if (this.overlay) {
            this.overlay.classList.remove('active');
        }
        
        localStorage.setItem('sidebarCollapsed', 'true');
    }

    setupResponsiveBehavior() {
        // Handle overlay clicks
        if (this.overlay) {
            this.overlay.addEventListener('click', () => {
                this.closeSidebar();
            });
        }

        // Handle window resize
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                // On desktop, always show sidebar
                this.sidebar.classList.remove('collapsed');
                const icon = this.sidebarToggle.querySelector('i');
                if (icon) {
                    icon.className = 'fas fa-bars';
                }
                if (this.overlay) {
                    this.overlay.classList.remove('active');
                }
            }
        });

        // Handle clicks outside on mobile
        document.addEventListener('click', (event) => {
            const isMobile = window.innerWidth <= 768;
            if (isMobile && 
                !this.sidebar.contains(event.target) && 
                !this.sidebarToggle.contains(event.target) &&
                !this.sidebar.classList.contains('collapsed')) {
                this.closeSidebar();
            }
        });
    }

    setupSalesList() {
        if (!this.salesList) return;

        this.salesList.innerHTML = '';
        
        // Add "Home" option
        const allSalesItem = this.createSalesItem('Home', 'all', true);
        this.salesList.appendChild(allSalesItem);

        // Load dynamic sales
        this.loadSalesFromSheets();
    }

    createSalesItem(name, id, isActive = false) {
        const li = document.createElement('li');
        li.className = `sales-item ${isActive ? 'active' : ''}`;
        li.dataset.salesId = id;
        li.dataset.salesName = name;
        const iconClass = name === 'Home' ? 'fa-home' : 'fa-user-tie';
        li.innerHTML = `
            <i class="fas ${iconClass}"></i>
            <span>${name}</span>
        `;
        
        li.addEventListener('click', () => {
            this.selectSalesItem(li);
        });
        
        return li;
    }

    selectSalesItem(selectedItem) {
        // Remove active from all items
        this.salesList.querySelectorAll('.sales-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Add active to selected
        selectedItem.classList.add('active');
        
        // Trigger filtering
        if (typeof googleSheetsIntegration !== 'undefined') {
            const salesName = selectedItem.dataset.salesName;
            if (googleSheetsIntegration.filterBySales) {
                googleSheetsIntegration.filterBySales(salesName);
            }
        }
    }

    loadSalesFromSheets() {
        // Placeholder for dynamic loading
        // In production, this would fetch from Google Sheets
        const salesNames = ['John Doe', 'Jane Smith', 'Mike Johnson'];
        
        salesNames.forEach(name => {
            const item = this.createSalesItem(name, name.toLowerCase().replace(/\s+/g, '-'));
            this.salesList.appendChild(item);
        });
    }

    setupMenuStates() {
        this.menuItems.forEach(item => {
            item.addEventListener('click', () => {
                this.menuItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                
                // Handle view switching
                const view = item.dataset.view;
                if (view) {
                    this.switchView(view);
                }
            });
        });
    }

    switchView(view) {
        // Implement view switching logic here
    }

    loadSavedState() {
        const savedState = localStorage.getItem('sidebarCollapsed');
        if (savedState === 'true') {
            this.sidebar.classList.add('collapsed');
            const icon = this.sidebarToggle.querySelector('i');
            if (icon) {
                icon.className = 'fas fa-chevron-right';
            }
        }
    }

    // Public API methods
    forceOpen() {
        this.openSidebar();
    }

    forceClose() {
        this.closeSidebar();
    }

    isOpen() {
        return !this.sidebar.classList.contains('collapsed');
    }

    setupCloseButton() {
        if (!this.closeBtn) return;
        this.closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.closeSidebar();
        });
    }
}

// Initialize when DOM is ready
function initSidebarManager() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.sidebarManager = new SidebarManager();
        });
    } else {
        window.sidebarManager = new SidebarManager();
    }
}

// Start initialization
initSidebarManager();

// Export for global use
window.SidebarManager = SidebarManager;
