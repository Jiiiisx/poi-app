document.addEventListener('DOMContentLoaded', () => {
    const page = window.location.pathname;

    // Avoid logging for admin pages or API calls
    if (page.startsWith('/admin') || page.startsWith('/api')) {
        return;
    }

    navigator.sendBeacon('/api/log-view', JSON.stringify({ page }));
});
