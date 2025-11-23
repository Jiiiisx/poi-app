document.addEventListener('DOMContentLoaded', function () {
    console.log('[sidebar.js] Script loaded'); // Diagnostic log 1
    const menuToggle = document.getElementById('menu-toggle');
    const body = document.body;

    // Check for saved sidebar state
    if (localStorage.getItem('sidebar-collapsed') === 'true') {
        body.classList.add('sidebar-collapsed');
    }

    if (menuToggle) {
        menuToggle.addEventListener('click', function () {
            console.log('[sidebar.js] Menu toggle button clicked!'); // Diagnostic log 2
            body.classList.toggle('sidebar-collapsed');
            // Save state to localStorage
            if (body.classList.contains('sidebar-collapsed')) {
                localStorage.setItem('sidebar-collapsed', 'true');
            } else {
                localStorage.setItem('sidebar-collapsed', 'false');
            }
        });
    } else {
        console.log('[sidebar.js] Menu toggle button not found!');
    }
});
