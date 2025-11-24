document.addEventListener('DOMContentLoaded', function () {
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.overlay');
    const body = document.body;

    const handleToggle = () => {
        // This checks if the sidebar is positioned off-screen, which is the mobile state.
        const isMobile = getComputedStyle(sidebar).transform !== 'none';

        if (isMobile) {
             sidebar.classList.toggle('active');
        } 
        // Desktop view
        else {
            body.classList.toggle('sidebar-collapsed');
            localStorage.setItem('sidebar-collapsed', body.classList.contains('sidebar-collapsed'));
        }
    };

    if (menuToggle) {
        menuToggle.addEventListener('click', handleToggle);
    }
    
    // The overlay is only used in mobile view.
    if (overlay) {
        overlay.addEventListener('click', () => {
            if (sidebar.classList.contains('active')) {
                sidebar.classList.remove('active');
            }
        });
    }
});
