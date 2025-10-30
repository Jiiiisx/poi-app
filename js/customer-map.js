document.addEventListener('DOMContentLoaded', () => {
    const mapElement = document.getElementById('customer-map');
    if (!mapElement) return;

    // Initialize the map
    const map = L.map(mapElement).setView([-6.2088, 106.8456], 10); // Center on Jakarta

    // Add a tile layer from OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Function to add markers to the map
    const addMarkers = () => {
        if (window.googleSheetsIntegration && window.googleSheetsIntegration.isInitialized) {
            const customerData = window.googleSheetsIntegration.originalData;
            const governmentData = window.googleSheetsIntegration.originalGovernmentData;

            // Add markers for government data with lat/long
            governmentData.forEach(item => {
                if (item.latitude && item.longitude) {
                    const lat = parseFloat(item.latitude);
                    const lng = parseFloat(item.longitude);
                    if (!isNaN(lat) && !isNaN(lng)) {
                        L.marker([lat, lng]).addTo(map)
                            .bindPopup(`<b>${item.nama_koperasi}</b><br>${item.alamat}`);
                    }
                }
            });

            // Geocode and add markers for customer data (requires a geocoding service)
            // Since we don't have a geocoding service, we will skip this part.

        } else {
            // Retry after a short delay if the integration is not ready
            setTimeout(addMarkers, 500);
        }
    };

    addMarkers();
});