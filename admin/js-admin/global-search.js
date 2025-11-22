document.addEventListener('DOMContentLoaded', function () {
    const searchInput = document.getElementById('globalSearchInput');
    const searchResultsContainer = document.getElementById('globalSearchResults');

    let allSearchableData = [];
    let isDataLoaded = false;

    async function fetchWithAuth(url, options = {}) {
        const token = localStorage.getItem('adminToken');
        if (!token) {
            // Don't redirect, just fail silently for search
            console.warn('No auth token for global search, requests will fail.');
            return Promise.reject(new Error('No auth token'));
        }
    
        const headers = { ...options.headers, 'Authorization': `Bearer ${token}` };
        return fetch(url, { ...options, headers });
    }

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
        console.log('[Global Search] Starting to load data...');
        const searchableItems = [];
        const isProfilePage = window.location.pathname.includes('profil-pelanggan.html');

        try {
            if (isProfilePage) {
                // On profile page, only load billing data
                const monitoringRes = await fetchWithAuth(`/api?action=fetch-monitoring&ranges=${Object.values(salesDataRanges).join(',')}`);
                if (monitoringRes.ok) {
                    const monitoringData = await monitoringRes.json();
                    const rangeToSalesKey = Object.fromEntries(Object.entries(salesDataRanges).map(a => a.reverse()));
                    const requestedRanges = Object.values(salesDataRanges);
                    let billingCustomersCount = 0;

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
                                            billingCustomersCount++;
                                        }
                                    });
                                }
                            }
                        });
                    }
                    console.log(`[Global Search] Loaded ${billingCustomersCount} billing customers for profile page.`);
                } else {
                    console.error('[Global Search] Failed to load billing data for profile page.');
                }
            } else {
                // On other pages, load all data
                const [customerRes, governmentRes, monitoringRes] = await Promise.all([
                    fetchWithAuth('/api?action=customer-data'),
                    fetchWithAuth('/api?action=government-data'),
                    fetchWithAuth(`/api?action=fetch-monitoring&ranges=${Object.values(salesDataRanges).join(',')}`)
                ]);

                // Process Customer Data
                if (customerRes.ok) {
                    const customerData = await customerRes.json();
                    if (customerData.values && customerData.values.length > 1) {
                        const headers = customerData.values[0];
                        const nameIndex = headers.indexOf('Nama Calon Pelanggan');
                        if (nameIndex !== -1) {
                            const customers = customerData.values.slice(1).map(row => {
                                const name = row[nameIndex];
                                return name ? { name, type: 'Calon Pelanggan', source: 'customer' } : null;
                            }).filter(Boolean);
                            searchableItems.push(...customers);
                        }
                    }
                } else {
                    console.error('[Global Search] Failed to load customer data.');
                }

                // Process Government Data
                if (governmentRes.ok) {
                    const governmentData = await governmentRes.json();
                    if (governmentData.values && governmentData.values.length > 1) {
                        const headers = governmentData.values[0];
                        const nameIndex = headers.indexOf('Nama Instansi');
                        if (nameIndex !== -1) {
                            const customers = governmentData.values.slice(1).map(row => {
                                const name = row[nameIndex];
                                return name ? { name, type: 'Pemerintahan', source: 'government' } : null;
                            }).filter(Boolean);
                            searchableItems.push(...customers);
                        }
                    }
                } else {
                    console.error('[Global Search] Failed to load government data.');
                }

                // Process Billing Data
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
                } else {
                    console.error('[Global Search] Failed to load billing data.');
                }
            }

            // Common processing for both cases
            const customerMap = new Map();
            searchableItems.forEach(item => {
                const existing = customerMap.get(item.name);
                if (!existing || (existing.source !== 'billing' && item.source === 'billing')) {
                    customerMap.set(item.name, item);
                }
            });

            allSearchableData = Array.from(customerMap.values());
            isDataLoaded = true;
            console.log(`[Global Search] Final searchable data count: ${allSearchableData.length}`);

        } catch (error) {
            console.error('[Global Search] General error in loadSearchData:', error);
        }
    }

    function performSearch(term) {
        if (term.length < 2) {
            searchResultsContainer.style.display = 'none';
            return;
        }

        const lowerCaseTerm = term.toLowerCase();

        const results = allSearchableData
            .map(item => {
                const lowerCaseName = item.name.toLowerCase();
                let score = 0;

                // Exact match scoring
                const index = lowerCaseName.indexOf(lowerCaseTerm);
                if (index === 0) {
                    score = 100; // Starts with
                } else if (index > 0) {
                    score = 50;  // Includes
                }

                // Fuzzy match scoring (if no exact match was found)
                if (score === 0) {
                    let termIndex = 0;
                    let nameIndex = 0;
                    let fuzzyScore = 0;
                    while (termIndex < lowerCaseTerm.length && nameIndex < lowerCaseName.length) {
                        if (lowerCaseTerm[termIndex] === lowerCaseName[nameIndex]) {
                            termIndex++;
                            fuzzyScore += 10; // Add to score for each matched character
                        }
                        nameIndex++;
                    }
                    // Only consider it a fuzzy match if all characters of the term were found in order
                    if (termIndex === lowerCaseTerm.length) {
                        score = fuzzyScore;
                    }
                }

                return { ...item, score };
            })
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);

        renderResults(results, term);
    }

    function renderResults(results, term) {
        if (results.length === 0) {
            searchResultsContainer.innerHTML = '<div class="result-item"><em>No results found</em></div>';
            searchResultsContainer.style.display = 'block';
            return;
        }

        const isProfilePage = window.location.pathname.includes('profil-pelanggan.html');

        searchResultsContainer.innerHTML = '';
        results.forEach(item => {
            const resultItem = document.createElement('div');
            resultItem.className = 'result-item';

            // Highlight the search term
            const regex = new RegExp(`(${term})`, 'gi');
            const highlightedName = item.name.replace(regex, '<strong>$1</strong>');

            resultItem.innerHTML = `
                <h4>${highlightedName}</h4>
                <p>${item.type}</p>
            `;
                resultItem.addEventListener('click', () => {
                    if (isProfilePage && item.source === 'billing') {
                        // On profile page, reload with new customer data
                        window.location.href = `/admin/profil-pelanggan.html?customer=${encodeURIComponent(item.name)}&sales=${encodeURIComponent(item.sales)}`;
                    } else if (item.source === 'billing') {
                        // On other pages, go to the profile page directly
                        window.location.href = `/admin/profil-pelanggan.html?customer=${encodeURIComponent(item.name)}&sales=${encodeURIComponent(item.sales)}`;
                    } else {
                        // For non-billing customers, go to the main dashboard with a search query
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

    if (searchResultsContainer) {
        document.addEventListener('click', function(event) {
            if (!searchResultsContainer.contains(event.target) && event.target !== searchInput) {
                searchResultsContainer.style.display = 'none';
            }
        });
    }
});