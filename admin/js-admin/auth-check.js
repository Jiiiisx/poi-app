(function() {
    const token = localStorage.getItem('adminToken');
    // We also check that the current page is not already the login page to avoid redirect loops.
    if (!token && window.location.pathname.indexOf('login.html') === -1) {
        console.log('Authentication token not found. Redirecting to login page.');
        window.location.href = 'login.html';
    }
})();
