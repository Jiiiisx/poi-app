const ModalHandler = {
    modal: document.getElementById('enhancedModal'),
    title: document.getElementById('enhancedModalTitle'),
    message: document.getElementById('enhancedModalMessage'),
    confirmButton: document.getElementById('enhancedModalConfirm'),
    cancelButton: document.getElementById('enhancedModalCancel'),
    closeButton: document.getElementById('enhancedModalClose'),

    show: function(title, message, confirmCallback) {
        this.title.textContent = title;
        this.message.textContent = message;

        if (confirmCallback) {
            this.confirmButton.style.display = 'inline-block';
            this.cancelButton.style.display = 'inline-block';
            this.closeButton.style.display = 'none';

            this.confirmButton.onclick = () => {
                this.hide();
                confirmCallback();
            };

            this.cancelButton.onclick = () => {
                this.hide();
            };
        } else {
            this.confirmButton.style.display = 'none';
            this.cancelButton.style.display = 'none';
            this.closeButton.style.display = 'inline-block';

            this.closeButton.onclick = () => {
                this.hide();
            };
        }

        this.modal.style.display = 'block';
    },

    hide: function() {
        this.modal.style.display = 'none';
    }
};

