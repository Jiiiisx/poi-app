document.addEventListener('DOMContentLoaded', function () {
    const sidebarPlaceholder = document.querySelector('aside.sidebar');
    if (sidebarPlaceholder) {
        fetch('sidebar.html')
            .then(response => response.text())
            .then(data => {
                sidebarPlaceholder.innerHTML = data;
                setActiveLink();
            })
            .catch(error => console.error('Error loading sidebar:', error));
    }

    function setActiveLink() {
        const currentPage = window.location.pathname.split('/').pop();
        const navLinks = document.querySelectorAll('.sidebar-nav a');

        navLinks.forEach(link => {
            const linkPage = link.getAttribute('href').split('/').pop();
            if (linkPage === currentPage) {
                link.parentElement.classList.add('active');
            }
        });
    }
});
