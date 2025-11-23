// --- Skeleton Loader ---
function showSkeletonLoader() {
    const skeletonLoader = document.querySelector('.skeleton-loader');
    if (!skeletonLoader) return;

    // General approach: find skeleton elements and populate them
    const skeletonCards = skeletonLoader.querySelector('.skeleton-cards');
    if (skeletonCards) {
        let cardsHTML = '';
        // Create a generic number of cards, or inspect the layout if needed
        for (let i = 0; i < 4; i++) {
            cardsHTML += '<div class="skeleton-card-item" style="flex: 1; min-width: 200px; height: 100px; background-color: #e0e0e0; border-radius: 8px;"></div>';
        }
        skeletonCards.innerHTML = cardsHTML;
    }

    const skeletonChart = skeletonLoader.querySelector('.skeleton-chart');
    if (skeletonChart) {
        skeletonChart.innerHTML = '<div style="width: 100%; height: 300px; background-color: #e0e0e0; border-radius: 8px;"></div>';
    }

    const skeletonTable = skeletonLoader.querySelector('.skeleton-table');
    if (skeletonTable) {
        let tableRowsHTML = '';
        for (let i = 0; i < 10; i++) { // 10 rows for a generic table
            tableRowsHTML += '<div class="skeleton-row" style="height: 40px; background-color: #e0e0e0; border-radius: 4px; margin-bottom: 10px;"></div>';
        }
        skeletonTable.innerHTML = tableRowsHTML;
    }

    // Hide the main content areas if they exist
    const mainContentAreas = document.querySelectorAll('.content-area');
    mainContentAreas.forEach(area => area.style.display = 'none');

    skeletonLoader.style.display = 'block';
}

function hideSkeletonLoader() {
    const skeletonLoader = document.querySelector('.skeleton-loader');
    if (skeletonLoader) {
        skeletonLoader.style.display = 'none';
    }

    // Show the main content areas
    const mainContentAreas = document.querySelectorAll('.content-area');
    mainContentAreas.forEach(area => {
        // Reset display to its default (e.g., 'block', 'flex', etc.)
        // An empty string will revert to the stylesheet's value.
        area.style.display = ''; 
    });
}
