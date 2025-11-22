
document.addEventListener('DOMContentLoaded', function () {
    function initializeCustomDropdown(selectElement) {
        const customDropdown = document.createElement('div');
        customDropdown.className = 'custom-dropdown';

        const selectedOption = document.createElement('div');
        selectedOption.className = 'custom-dropdown-selected';
        selectedOption.textContent = selectElement.options[selectElement.selectedIndex].textContent;

        const optionsContainer = document.createElement('div');
        optionsContainer.className = 'custom-dropdown-options';

        Array.from(selectElement.options).forEach(option => {
            const customOption = document.createElement('div');
            customOption.className = 'custom-dropdown-option';
            customOption.textContent = option.textContent;
            customOption.dataset.value = option.value;

            customOption.addEventListener('click', function () {
                selectedOption.textContent = this.textContent;
                selectElement.value = this.dataset.value;
                selectElement.dispatchEvent(new Event('change'));
                optionsContainer.style.display = 'none';
            });

            optionsContainer.appendChild(customOption);
        });

        customDropdown.appendChild(selectedOption);
        customDropdown.appendChild(optionsContainer);

        selectedOption.addEventListener('click', function () {
            optionsContainer.style.display = optionsContainer.style.display === 'block' ? 'none' : 'block';
        });

        selectElement.style.display = 'none';
        selectElement.parentNode.insertBefore(customDropdown, selectElement.nextSibling);
    }

    const observer = new MutationObserver(function (mutations) {
        const monthFilter = document.getElementById('monthFilter');
        if (monthFilter && monthFilter.options.length > 1) {
            if (!monthFilter.nextElementSibling || !monthFilter.nextElementSibling.classList.contains('custom-dropdown')) {
                initializeCustomDropdown(monthFilter);
            }
        }
    });

    const monitoringSection = document.getElementById('monthlyMonitoringSection');
    if (monitoringSection) {
        observer.observe(monitoringSection, { childList: true, subtree: true });
    }

    document.addEventListener('click', function (e) {
        const openDropdown = document.querySelector('.custom-dropdown-options[style*="block"]');
        if (openDropdown && !e.target.closest('.custom-dropdown')) {
            openDropdown.style.display = 'none';
        }
    });
});
