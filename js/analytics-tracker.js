document.addEventListener('DOMContentLoaded', () => {
    const page = window.location.pathname;

    // Avoid logging for admin pages or API calls
    if (page.startsWith('/admin') || page.startsWith('/api')) {
        return;
    }

    try {
        const blob = new Blob([JSON.stringify({ page })], { type: 'application/json' });
        navigator.sendBeacon('/api/log-view', blob);
    } catch (error) {
        console.error('Error sending analytics beacon:', error);
    }
});
