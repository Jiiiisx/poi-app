const NotificationHandler = {
    notificationBar: document.getElementById('notification-bar'),

    show: function(message, type = 'success', duration = 3000) {
        this.notificationBar.textContent = message;
        this.notificationBar.classList.remove('success', 'error'); // Remove existing classes
        this.notificationBar.classList.add(type); // Add new class
        this.notificationBar.classList.add('show');

        setTimeout(() => {
            this.hide();
        }, duration);
    },

    hide: function() {
        this.notificationBar.classList.remove('show');
    }
};
