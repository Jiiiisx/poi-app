// This script checks if the user is authenticated by looking for a token.
// If no token is found, it redirects the user to the login page.
// This should be included in the <head> of every protected admin page.

(function() {
    const token = localStorage.getItem('adminToken');
    // We also check that the current page is not already the login page to avoid redirect loops.
    if (!token && window.location.pathname.indexOf('login.html') === -1) {
        console.log('Authentication token not found. Redirecting to login page.');
        window.location.href = 'login.html';
    }
})();
