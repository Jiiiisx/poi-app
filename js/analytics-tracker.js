document.addEventListener('DOMContentLoaded', () => {
    const page = window.location.pathname;

    if (page.startsWith('/admin') || page.startsWith('/api')) {
        return;
    }

    try {
        fetch('/api?action=log-view', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ page }),
            keepalive: true
        });
    } catch (error) {
    }
});