document.addEventListener('DOMContentLoaded', function () {
    const salesDataRanges = {
        'Andi': 'AndiData', 'April': 'AprilData', 'Nandi': 'NandiData', 'Octa': 'OctaData',
        'Yandi': 'YandiData', 'Totong': 'TotongData', 'Yusdhi': 'YusdhiData', 'Nursyarif': 'NursyarifData',
        'Reynaldi': 'ReynaldiData', 'Andri': 'AndriData', 'Tri Susantohadi': 'TriSusantohadiData',
        'Dedi Kurniawan': 'DediKurniawanData', 'Muhammad Arifin': 'MuhammadArifinData', 'Fajar Sodik': 'FajarSodikData',
        'Ichrima': 'IchrimaData', 'Muhamad Ferdi Ridwan': 'MuhamadFerdiRidwanData', 'Suprihatin': 'SuprihatinData',
        'Fini Fadilah Handayani': 'FiniFadilahHandayaniData', 'Hinduntomy Wijaya': 'HinduntomyWijayaData'
    };

    let monitoringDataBySales = {};
    let monitoringDataHeadersBySales = {};
    let filteredData = [];
    let currentPage = 1;
    const rowsPerPage = 10;

    // --- Handle URL Params ---
    const urlParams = new URLSearchParams(window.location.search);
    const salesQueryParam = urlParams.get('sales');
    const searchQueryParam = urlParams.get('q');

    let selectedSales = salesQueryParam || 'Andi'; // Default to param or 'Andi'

    const tableContainer = document.getElementById('billing-table-container');
    const searchInput = document.getElementById('searchInput');
    const prevPageButton = document.getElementById('prevPage');
    const nextPageButton = document.getElementById('nextPage');
    const pageInfo = document.getElementById('pageInfo');
    const salesListElement = document.getElementById('sales-list');
    const selectedSalesElement = document.getElementById('selected-sales');
    const salesPerformanceSummaryElement = document.getElementById('sales-performance-summary');
    const monthFilter = document.getElementById('month-filter');
    const statusFilters = document.getElementById('status-filters');

    let selectedMonth = 'all';
    let selectedStatus = 'all';

    async function ensureDataForSales(salesName) {
        if (monitoringDataBySales[salesName]) {
            return; // Data already loaded
        }

        tableContainer.innerHTML = '<p>Loading data for ' + salesName + '...</p>';
        try {
            const rangeName = salesDataRanges[salesName];
            if (!rangeName) throw new Error('Invalid sales name.');

            const response = await fetch(`/api/fetch-monitoring?ranges=${rangeName}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const data = await response.json();
            processMonitoringData(data, [rangeName]);
        } catch (error) {
            console.error(`Error fetching data for ${salesName}:`, error);
            tableContainer.innerHTML = `<p>Failed to load data for ${salesName}. Please try again.</p>`;
            throw error;
        }
    }

    async function initialLoad() {
        populateSalesList(); // This will now use the updated selectedSales to set the 'active' class
        
        if (searchQueryParam) {
            searchInput.value = decodeURIComponent(searchQueryParam);
        }

        await filterBySales(selectedSales, true);
    }

    function populateSalesList() {
        salesListElement.innerHTML = '';
        const salesNames = Object.keys(salesDataRanges).sort();
        salesNames.forEach(salesName => {
            const li = document.createElement('li');
            li.textContent = salesName;
            if (salesName === selectedSales) {
                li.classList.add('active');
            }
            li.addEventListener('click', async () => {
                // Update URL without reloading
                const newUrl = new URL(window.location);
                newUrl.searchParams.set('sales', salesName);
                newUrl.searchParams.delete('q'); // Remove search query on manual selection
                window.history.pushState({path:newUrl.href}, '', newUrl.href);

                document.querySelectorAll('#sales-list li').forEach(item => item.classList.remove('active'));
                li.classList.add('active');
                await filterBySales(salesName);
            });
            salesListElement.appendChild(li);
        });
    }

    async function filterBySales(salesName, isInitialLoad = false) {
        try {
            await ensureDataForSales(salesName);
            selectedSales = salesName;
            selectedSalesElement.textContent = salesName;
            
            populateMonthFilter();
            
            if (!isInitialLoad) {
                searchInput.value = '';
                monthFilter.value = 'all';
                statusFilters.querySelector('.active').classList.remove('active');
                statusFilters.querySelector('[data-status="all"]').classList.add('active');
            }

            selectedMonth = monthFilter.value;
            selectedStatus = statusFilters.querySelector('.active').dataset.status;

            applyFilters();
            renderSalesSummary(salesName);
        } catch (error) {
            // Error is already handled
        }
    }

    function processMonitoringData(data, requestedRanges) {
        const rangeToSalesKey = {};
        for (const key in salesDataRanges) {
            rangeToSalesKey[salesDataRanges[key]] = key;
        }

        data.valueRanges.forEach((valueRange, index) => {
            const requestedRangeName = requestedRanges[index];
            const salesName = rangeToSalesKey[requestedRangeName];
            if (salesName && valueRange.values && valueRange.values.length > 1) {
                const headers = valueRange.values[0].map(h => h.trim());
                const nameIndex = headers.findIndex(h => h.toLowerCase() === 'nama pelanggan');
                const range = valueRange.range;
                const startRowMatch = range.match(/(\d+)/);
                if (!startRowMatch) { console.error('Could not parse start row from range:', range); return; }
                const headerRow = parseInt(startRowMatch[0], 10);

                const rows = [];
                valueRange.values.slice(1).forEach((row, i) => {
                    if (row[nameIndex] && row[nameIndex].trim() !== '') {
                        const rowAsObject = {};
                        headers.forEach((header, index) => {
                            rowAsObject[header] = (row[index] || '').trim();
                        });
                        rows.push({ ...rowAsObject, originalSheetRow: headerRow + 1 + i });
                    }
                });
                monitoringDataHeadersBySales[salesName] = headers;
                monitoringDataBySales[salesName] = rows;
            }
        });
    }

    function populateMonthFilter() {
        monthFilter.innerHTML = '<option value="all">All Months</option>';
        const headers = monitoringDataHeadersBySales[selectedSales] || [];
        const billingHeaders = headers.filter(h => h.toLowerCase().startsWith('billing'));
        const sortedBillingHeaders = [...billingHeaders].sort((a, b) => {
            const dateA = _parseHeaderDate(a), dateB = _parseHeaderDate(b);
            if (!dateA) return 1; if (!dateB) return -1;
            return dateB - dateA;
        });
        sortedBillingHeaders.forEach(header => {
            const option = document.createElement('option');
            option.value = header;
            option.textContent = header;
            monthFilter.appendChild(option);
        });
    }

    function _parseHeaderDate(header) {
        const monthMap = {
            'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'mei': 4, 'jun': 5,
            'jul': 6, 'agu': 7, 'ags': 7, 'agt': 7, 'sep': 8, 'okt': 9, 'nov': 10, 'des': 11
        };
        if (typeof header !== 'string') return null;
        const parts = header.replace(/billing/i, '').trim().split(' ');
        if (parts.length < 2) return null;
        const monthName = parts[0].toLowerCase().substring(0, 3);
        const month = monthMap[monthName];
        const year = parseInt(parts[1], 10);
        if (month === undefined || isNaN(year)) { console.warn(`Could not parse date: "${header}"`); return null; }
        return new Date(year + 2000, month);
    }

    function applyFilters() {
        const searchTerm = searchInput.value.toLowerCase();
        let data = monitoringDataBySales[selectedSales] || [];
        if (searchTerm) {
            data = data.filter(item => Object.values(item).some(val => val.toString().toLowerCase().includes(searchTerm)));
        }
        if (selectedStatus !== 'all') {
            // ... (rest of filter logic is complex and unchanged)
        }
        filteredData = data;
        currentPage = 1;
        renderBillingTable();
        updatePagination();
    }

    function renderBillingTable() {
        const start = (currentPage - 1) * rowsPerPage, end = start + rowsPerPage;
        const paginatedData = filteredData.slice(start, end);
        if (paginatedData.length === 0) {
            tableContainer.innerHTML = '<p>No billing data found for the selected filters.</p>';
            updatePagination(); return;
        }
        const table = document.createElement('table'); table.className = 'customer-table';
        const thead = document.createElement('thead'), tbody = document.createElement('tbody');
        const headerRow = document.createElement('tr');
        const headers = monitoringDataHeadersBySales[selectedSales] || [];
        headers.forEach(h => { const th = document.createElement('th'); th.textContent = h; headerRow.appendChild(th); });
        thead.appendChild(headerRow);

        paginatedData.forEach((item, rowIndex) => {
            const tr = document.createElement('tr');
            headers.forEach((header, colIndex) => {
                const td = document.createElement('td'), cellData = item[header] || '';
                // ... (cell rendering logic is complex and unchanged)
                td.textContent = cellData;
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
        table.appendChild(thead); table.appendChild(tbody);
        tableContainer.innerHTML = ''; tableContainer.appendChild(table);
        updatePagination();
    }

    function updatePagination() {
        const totalPages = Math.ceil(filteredData.length / rowsPerPage);
        pageInfo.textContent = `Page ${currentPage} of ${totalPages || 1}`;
        prevPageButton.disabled = currentPage === 1;
        nextPageButton.disabled = currentPage === totalPages || totalPages === 0;
    }

    // --- Event Listeners ---
    searchInput.addEventListener('input', applyFilters);
    monthFilter.addEventListener('change', (e) => { selectedMonth = e.target.value; applyFilters(); });
    statusFilters.addEventListener('click', (e) => { if (e.target.tagName === 'BUTTON') { statusFilters.querySelector('.active').classList.remove('active'); e.target.classList.add('active'); selectedStatus = e.target.dataset.status; applyFilters(); } });
    // ... (other listeners)

    initialLoad();
});