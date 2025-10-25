document.addEventListener('DOMContentLoaded', function () {
    const searchInput = document.getElementById('globalSearchInput');
    const searchResultsContainer = document.getElementById('globalSearchResults');

    let allSearchableData = [];
    let isDataLoaded = false;

    // This object maps salesperson names to their data ranges in Google Sheets.
    const salesDataRanges = {
        'Andi': 'AndiData', 'April': 'AprilData', 'Nandi': 'NandiData', 'Octa': 'OctaData',
        'Yandi': 'YandiData', 'Totong': 'TotongData', 'Yusdhi': 'YusdhiData', 'Nursyarif': 'NursyarifData',
        'Reynaldi': 'ReynaldiData', 'Andri': 'AndriData', 'Tri Susantohadi': 'TriSusantohadiData',
        'Dedi Kurniawan': 'DediKurniawanData', 'Muhammad Arifin': 'MuhammadArifinData', 'Fajar Sodik': 'FajarSodikData',
        'Ichrima': 'IchrimaData', 'Muhamad Ferdi Ridwan': 'MuhamadFerdiRidwanData', 'Suprihatin': 'SuprihatinData',
        'Fini Fadilah Handayani': 'FiniFadilahHandayaniData', 'Hinduntomy Wijaya': 'HinduntomyWijayaData'
    };

    async function loadSearchData() {
        if (isDataLoaded) return;

        try {
            const requestedRanges = Object.values(salesDataRanges);
            const ranges = requestedRanges.join(',');
            const response = await fetch(`/api/fetch-monitoring?ranges=${ranges}`);

            if (!response.ok) {
                throw new Error('Failed to load monitoring data for search.');
            }

            const data = await response.json();
            
            const customerMap = new Map();
            const rangeToSalesKey = Object.fromEntries(Object.entries(salesDataRanges).map(a => a.reverse()));

            if (data.valueRanges) {
                data.valueRanges.forEach((valueRange, index) => {
                    const namedRange = requestedRanges[index];
                    const salesName = rangeToSalesKey[namedRange];

                    if (salesName && valueRange.values && valueRange.values.length > 1) {
                        const headers = valueRange.values[0];
                        const nameIndex = headers.findIndex(h => h.toLowerCase() === 'nama pelanggan');
                        
                        if (nameIndex !== -1) {
                            valueRange.values.slice(1).forEach(row => {
                                const customerName = row[nameIndex];
                                if (customerName && !customerMap.has(customerName)) {
                                    customerMap.set(customerName, {
                                        name: customerName,
                                        sales: salesName,
                                        type: 'Pelanggan Billing'
                                    });
                                }
                            });
                        }
                    }
                });
            }

            allSearchableData = Array.from(customerMap.values());
            isDataLoaded = true;
            console.log('Global search data loaded (Billing):', allSearchableData.length, 'records.');

        } catch (error) {
            console.error('Error loading global search data:', error);
        }
    }

    function performSearch(term) {
        if (term.length < 3) {
            searchResultsContainer.style.display = 'none';
            return;
        }

        const lowerCaseTerm = term.toLowerCase();
        const results = allSearchableData.filter(item => 
            item.name.toLowerCase().includes(lowerCaseTerm)
        ).slice(0, 10);

        renderResults(results);
    }

    function renderResults(results) {
        if (results.length === 0) {
            searchResultsContainer.style.display = 'none';
            return;
        }

        searchResultsContainer.innerHTML = '';
        results.forEach(item => {
            const resultItem = document.createElement('div');
            resultItem.className = 'result-item';
            resultItem.innerHTML = `
                <h4>${item.name}</h4>
                <p>Sales: ${item.sales}</p>
            `;
            resultItem.addEventListener('click', () => {
                window.location.href = `/admin/pelanggan.html?sales=${encodeURIComponent(item.sales)}&q=${encodeURIComponent(item.name)}`;
            });
            searchResultsContainer.appendChild(resultItem);
        });

        searchResultsContainer.style.display = 'block';
    }

    // Event Listeners
    searchInput.addEventListener('focus', loadSearchData);
    searchInput.addEventListener('input', () => {
        performSearch(searchInput.value);
    });

    document.addEventListener('click', function(event) {
        if (!searchResultsContainer.contains(event.target) && event.target !== searchInput) {
            searchResultsContainer.style.display = 'none';
        }
    });
});