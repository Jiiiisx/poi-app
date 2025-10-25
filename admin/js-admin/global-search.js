document.addEventListener('DOMContentLoaded', function () {
    const searchInput = document.getElementById('globalSearchInput');
    const searchResultsContainer = document.getElementById('globalSearchResults');

    let allSearchableData = [];
    let isDataLoaded = false;

    async function loadSearchData() {
        if (isDataLoaded) return;

        try {
            const [customerRes, governmentRes] = await Promise.all([
                fetch('/api/customer-data'),
                fetch('/api/government-data')
            ]);

            if (!customerRes.ok || !governmentRes.ok) {
                throw new Error('Failed to load all search data.');
            }

            const customerData = await customerRes.json();
            const governmentData = await governmentRes.json();

            // Process customer data
            if (customerData.values && customerData.values.length > 1) {
                const customerHeaders = customerData.values[0];
                const customers = customerData.values.slice(1).map(row => {
                    const name = row[customerHeaders.indexOf('Nama Calon Pelanggan')] || 'N/A';
                    const type = 'Calon Pelanggan';
                    return { name, type, source: 'customer' };
                });
                allSearchableData.push(...customers);
            }

            // Process government data
            if (governmentData.values && governmentData.values.length > 1) {
                const govHeaders = governmentData.values[0];
                const customers = governmentData.values.slice(1).map(row => {
                    const name = row[govHeaders.indexOf('nama_koperasi')] || 'N/A';
                    const type = 'Pemerintahan';
                    return { name, type, source: 'government' };
                });
                allSearchableData.push(...customers);
            }
            
            isDataLoaded = true;
            console.log('Global search data loaded:', allSearchableData.length, 'records.');

        } catch (error) {
            console.error('Error loading global search data:', error);
            // Don't block the UI, just log the error. Search will not work.
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
        ).slice(0, 10); // Limit to 10 results

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
                <p>${item.type}</p>
            `;
            resultItem.addEventListener('click', () => {
                // Redirect to dashboard with search query
                window.location.href = `/admin/dashboard.html?q=${encodeURIComponent(item.name)}`;
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

    // Hide results when clicking outside
    document.addEventListener('click', function(event) {
        if (!searchResultsContainer.contains(event.target) && event.target !== searchInput) {
            searchResultsContainer.style.display = 'none';
        }
    });
});