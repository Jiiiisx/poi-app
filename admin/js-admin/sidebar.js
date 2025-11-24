document.addEventListener('DOMContentLoaded', function () {
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.overlay');
    const body = document.body;

    // This function ensures the correct classes are on the body depending on screen width
    const updateLayout = () => {
        if (window.innerWidth <= 768) {
            // On mobile, the desktop collapsed class should be removed to prevent style conflicts
            if (body.classList.contains('sidebar-collapsed')) {
                body.classList.remove('sidebar-collapsed');
            }
        } else {
            // On desktop, restore the collapsed state from localStorage if it exists
            if (localStorage.getItem('sidebar-collapsed') === 'true') {
                body.classList.add('sidebar-collapsed');
            } else {
                body.classList.remove('sidebar-collapsed');
            }
        }
    };

    // This function handles the click on the menu toggle button
    const handleToggle = () => {
        const isMobile = window.innerWidth <= 768;

        if (isMobile) {
            // On mobile, we toggle the slide-in sidebar
            sidebar.classList.toggle('active');
        } else {
            // On desktop, we toggle the collapsed sidebar
            body.classList.toggle('sidebar-collapsed');
            localStorage.setItem('sidebar-collapsed', body.classList.contains('sidebar-collapsed'));
        }
    };

    if (menuToggle) {
        menuToggle.addEventListener('click', handleToggle);
    }
    
    // The overlay is only for mobile to close the sidebar
    if (overlay) {
        overlay.addEventListener('click', () => {
            if (sidebar.classList.contains('active')) {
                sidebar.classList.remove('active');
            }
        });
    }

    // Set the correct layout on initial page load and on window resize
    updateLayout();
    window.addEventListener('resize', updateLayout);
});