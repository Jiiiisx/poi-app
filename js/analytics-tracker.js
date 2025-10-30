document.addEventListener('DOMContentLoaded', () => {
    const page = window.location.pathname;

    // Avoid logging for admin pages or API calls
    if (page.startsWith('/admin') || page.startsWith('/api')) {
        return;
    }

    try {
        fetch('/api/log-view', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ page }),
            keepalive: true
        });
    } catch (error) {
        console.error('Error sending analytics:', error);
    }
});
