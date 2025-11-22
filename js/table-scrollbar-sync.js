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
    this.updateScrollContentWidth();
    
    this.scrollTop.addEventListener('scroll', () => {
      this.tableContainer.scrollLeft = this.scrollTop.scrollLeft;
    });
    
    this.tableContainer.addEventListener('scroll', () => {
      this.scrollTop.scrollLeft = this.tableContainer.scrollLeft;
    });
    
    window.addEventListener('resize', () => {
      this.updateScrollContentWidth();
    });
    
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

document.addEventListener('DOMContentLoaded', () => {
  const scrollbarSync = new TableScrollbarSync();
  scrollbarSync.init();
  
  window.addEventListener('tableDataLoaded', () => {
    scrollbarSync.updateScrollContentWidth();
  });
});

window.TableScrollbarSync = TableScrollbarSync;
