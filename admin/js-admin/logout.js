document.addEventListener('DOMContentLoaded', () => {
    const logoutButton = document.querySelector('.sidebar-footer a, #logout-button'); // Selects the logout link

    if (logoutButton) {
        logoutButton.addEventListener('click', (event) => {
            event.preventDefault(); // Prevent the link from navigating to href

            console.log('Logging out...');

            // Remove the authentication token from storage
            localStorage.removeItem('adminToken');

            // Redirect to the login page
            window.location.href = 'login.html';
        });
    }
});
