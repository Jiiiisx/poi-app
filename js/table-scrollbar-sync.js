/**
 * Table Scrollbar Sync - Moves scrollbar to top of table
 * This script synchronizes scroll positions between top and bottom scrollbars
 */

class TableScrollbarSync {
  constructor() {
    this.tableContainer = null;
    this.scrollTop = null;
    this.scrollContent = null;
    this.isInitialized = false;
  }

  init() {
    if (this.isInitialized) return;
    
    this.tableContainer = document.getElementById('tableContainer');
    this.scrollTop = document.getElementById('tableScrollTop');
    this.scrollContent = document.getElementById('tableScrollContent');
    
    if (!this.tableContainer || !this.scrollTop || !this.scrollContent) {
      console.warn('Table scrollbar elements not found');
      return;
    }
    
    this.setupScrollSync();
    this.isInitialized = true;
  }

  setupScrollSync() {
    // Create a hidden div that matches the table width for the top scrollbar
    this.updateScrollContentWidth();
    
    // Sync scroll from top scrollbar to table
    this.scrollTop.addEventListener('scroll', () => {
      this.tableContainer.scrollLeft = this.scrollTop.scrollLeft;
    });
    
    // Sync scroll from table to top scrollbar
    this.tableContainer.addEventListener('scroll', () => {
      this.scrollTop.scrollLeft = this.tableContainer.scrollLeft;
    });
    
    // Update width when window resizes
    window.addEventListener('resize', () => {
      this.updateScrollContentWidth();
    });
    
    // Also update when table content changes
    const observer = new MutationObserver(() => {
      this.updateScrollContentWidth();
    });
    
    observer.observe(this.tableContainer, {
      childList: true,
      subtree: true
    });
  }

  updateScrollContentWidth() {
    if (!this.tableContainer || !this.scrollContent) return;
    
    const table = this.tableContainer.querySelector('table');
    if (table) {
      this.scrollContent.style.width = table.offsetWidth + 'px';
    }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const scrollbarSync = new TableScrollbarSync();
  scrollbarSync.init();
  
  // Re-initialize when table data is loaded
  window.addEventListener('tableDataLoaded', () => {
    scrollbarSync.updateScrollContentWidth();
  });
});

// Export for use in other modules
window.TableScrollbarSync = TableScrollbarSync;
