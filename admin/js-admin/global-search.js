document.addEventListener('DOMContentLoaded', function () {
    const searchInput = document.getElementById('globalSearchInput');
    const searchResultsContainer = document.getElementById('globalSearchResults');

    let allSearchableData = [];
    let isDataLoaded = false;

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
        console.log('Loading all data for global search...');

        try {
            const [customerRes, governmentRes, monitoringRes] = await Promise.all([
                fetch('/api/customer-data'),
                fetch('/api/government-data'),
                fetch(`/api/fetch-monitoring?ranges=${Object.values(salesDataRanges).join(',')}`)
            ]);

            const searchableItems = [];

            // 1. Process Customer Data
            if (customerRes.ok) {
                const customerData = await customerRes.json();
                if (customerData.values && customerData.values.length > 1) {
                    const headers = customerData.values[0];
                    const nameIndex = headers.indexOf('Nama Calon Pelanggan');
                    if (nameIndex !== -1) {
                        customerData.values.slice(1).forEach(row => {
                            const name = row[nameIndex];
                            if (name) {
                                searchableItems.push({ name, type: 'Calon Pelanggan', source: 'customer' });
                            }
                        });
                    }
                }
            }

            // 2. Process Government Data
            if (governmentRes.ok) {
                const governmentData = await governmentRes.json();
                if (governmentData.values && governmentData.values.length > 1) {
                    const headers = governmentData.values[0];
                    const nameIndex = headers.indexOf('nama_koperasi');
                     if (nameIndex !== -1) {
                        governmentData.values.slice(1).forEach(row => {
                            const name = row[nameIndex];
                            if (name) {
                                searchableItems.push({ name, type: 'Pemerintahan', source: 'government' });
                            }
                        });
                    }
                }
            }

            // 3. Process Billing Data
            if (monitoringRes.ok) {
                const monitoringData = await monitoringRes.json();
                const rangeToSalesKey = Object.fromEntries(Object.entries(salesDataRanges).map(a => a.reverse()));
                const requestedRanges = Object.values(salesDataRanges);

                if (monitoringData.valueRanges) {
                    monitoringData.valueRanges.forEach((valueRange, index) => {
                        const salesName = rangeToSalesKey[requestedRanges[index]];
                        if (salesName && valueRange.values && valueRange.values.length > 1) {
                            const headers = valueRange.values[0];
                            const nameIndex = headers.findIndex(h => h.toLowerCase() === 'nama pelanggan');
                            if (nameIndex !== -1) {
                                valueRange.values.slice(1).forEach(row => {
                                    const name = row[nameIndex];
                                    if (name) {
                                        searchableItems.push({ name, type: `Billing (${salesName})`, source: 'billing', sales: salesName });
                                    }
                                });
                            }
                        }
                    });
                }
            }

            // Deduplicate
            const customerMap = new Map();
            searchableItems.forEach(item => {
                if (!customerMap.has(item.name)) {
                    customerMap.set(item.name, item);
                }
            });

            allSearchableData = Array.from(customerMap.values());
            isDataLoaded = true;
            console.log('Global search data loaded (All Sources):', allSearchableData.length, 'records.');

        } catch (error) {
            console.error('Error loading global search data:', error);
        }
    }

    function performSearch(term) {
        if (term.length < 2) {
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
            searchResultsContainer.innerHTML = '<div class="result-item"><em>No results found</em></div>';
            searchResultsContainer.style.display = 'block';
            return;
        }

        searchResultsContainer.innerHTML = '';
        results.forEach(item => {
            const resultItem = document.createElement('div');
            resultItem.className = 'result-item';
            resultItem.innerHTML = `
                <h4>${item.name}</h4>
                <p>${item.type}</p>
            `;
            resultItem.addEventListener('click', () => {
                if (item.source === 'billing') {
                    window.location.href = `/admin/pelanggan.html?sales=${encodeURIComponent(item.sales)}&q=${encodeURIComponent(item.name)}`;
                } else {
                    window.location.href = `/admin/dashboard.html?q=${encodeURIComponent(item.name)}`;
                }
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