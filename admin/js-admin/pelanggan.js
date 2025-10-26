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

    // Skeleton Loader Elements
    const skeletonSalesList = document.querySelector('.skeleton-sales-list');
    const skeletonTableArea = document.querySelector('.skeleton-table-area');
    const realSalesList = document.querySelector('.sales-list-container');
    const realBillingArea = document.querySelector('.billing-monitoring-area');

    let selectedMonth = 'all';
    let selectedStatus = 'all';

    function showSkeletonLoader() {
        // Generate and show sales list skeleton
        let salesSkeletonHTML = '';
        for (let i = 0; i < 15; i++) { // Approx number of sales people
            salesSkeletonHTML += '<div class="skeleton-item"></div>';
        }
        skeletonSalesList.innerHTML = salesSkeletonHTML;
        skeletonSalesList.style.display = 'block';
        realSalesList.style.display = 'none';

        // Generate and show table area skeleton
        let tableSkeletonHTML = '<div class="skeleton-filters"></div>';
        for (let i = 0; i < 10; i++) { // 10 rows for the table
            tableSkeletonHTML += '<div class="skeleton-row"></div>';
        }
        skeletonTableArea.innerHTML = tableSkeletonHTML;
        skeletonTableArea.style.display = 'block';
        realBillingArea.style.display = 'none';
    }

    function hideSkeletonLoader() {
        skeletonSalesList.style.display = 'none';
        realSalesList.style.display = 'block';
        skeletonTableArea.style.display = 'none';
        realBillingArea.style.display = 'block';
    }

    async function ensureDataForSales(salesName) {
        if (monitoringDataBySales[salesName]) {
            return; // Data already loaded
        }

        showSkeletonLoader();
        // tableContainer.innerHTML = '<p>Loading data for ' + salesName + '...</p>';
        try {
            const rangeName = salesDataRanges[salesName];
            if (!rangeName) throw new Error('Invalid sales name.');

            const response = await fetch(`/api/fetch-monitoring?ranges=${rangeName}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const data = await response.json();
            processMonitoringData(data, [rangeName]);
            hideSkeletonLoader();
        } catch (error) {
            console.error(`Error fetching data for ${salesName}:`, error);
            hideSkeletonLoader();
            tableContainer.innerHTML = `<p>Failed to load data for ${salesName}. Please try again.</p>`;
            throw error;
        }
    }

    async function initialLoad() {
        populateSalesList(); // This will now use the updated selectedSales to set the 'active' class
        setupEventListeners();
        
        if (searchQueryParam) {
            searchInput.value = decodeURIComponent(searchQueryParam);
        }

        await filterBySales(selectedSales, true);
        document.dispatchEvent(new Event('page-rendered'));
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

                // Extract sheet name from range like ''Sheet Name'!A1:Z100'
                const sheetNameMatch = range.match(/^'([^']*)'/);
                const sheetName = sheetNameMatch ? sheetNameMatch[1] : range.split('!')[0];

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
                monitoringDataHeadersBySales[salesName] = { headers: headers, sheetName: sheetName };
                monitoringDataBySales[salesName] = rows;
            }
        });
    }

    function populateMonthFilter() {
        monthFilter.innerHTML = '<option value="all">All Months</option>';
        const headers = (monitoringDataHeadersBySales[selectedSales] || {}).headers || [];
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

        // Search filter
        if (searchTerm) {
            data = data.filter(item => Object.values(item).some(val => val.toString().toLowerCase().includes(searchTerm)));
        }

        // Month and Status filters
        if (selectedMonth !== 'all') {
            if (selectedStatus !== 'all') {
                // Filter by status for the selected month
                data = data.filter(item => (item[selectedMonth] || '').toLowerCase() === selectedStatus);
            } else {
                // Filter by any status for the selected month (i.e., not empty)
                data = data.filter(item => (item[selectedMonth] || '') !== '');
            }
        } else { // selectedMonth === 'all'
            if (selectedStatus !== 'all') {
                // Filter by status across all billing months
                const billingHeaders = ((monitoringDataHeadersBySales[selectedSales] || {}).headers || []).filter(h => h.toLowerCase().startsWith('billing'));
                data = data.filter(item => billingHeaders.some(header => (item[header] || '').toLowerCase() === selectedStatus));
            }
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
        
        let headers = (monitoringDataHeadersBySales[selectedSales] || {}).headers || [];
        if (selectedMonth !== 'all') {
            const nonBillingHeaders = headers.filter(h => !h.toLowerCase().startsWith('billing'));
            headers = [...nonBillingHeaders, selectedMonth];
        }

        headers.forEach(h => { 
            const th = document.createElement('th'); 
            th.textContent = h; 
            if (headers.indexOf(h) === 0) th.classList.add('sticky-col-1');
            if (headers.indexOf(h) === 1) th.classList.add('sticky-col-2');
            if (headers.indexOf(h) === 2) th.classList.add('sticky-col-3');
            headerRow.appendChild(th); 
        });
        thead.appendChild(headerRow);

        paginatedData.forEach((item, rowIndex) => {
            const tr = document.createElement('tr');
            headers.forEach((header, colIndex) => {
                const td = document.createElement('td');
                const cellData = item[header] || '';
                td.textContent = cellData;
                td.contentEditable = true; // Make cell editable

                // Add data attributes for saving
                td.dataset.originalRow = item.originalSheetRow;
                td.dataset.header = header;

                if (colIndex === 0) td.classList.add('sticky-col-1');
                if (colIndex === 1) td.classList.add('sticky-col-2');
                if (colIndex === 2) td.classList.add('sticky-col-3');
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
        table.appendChild(thead); table.appendChild(tbody);
        tableContainer.innerHTML = ''; tableContainer.appendChild(table);

        // Freeze column logic
        const firstColWidth = table.querySelector('.sticky-col-1').offsetWidth;
        const secondColWidth = table.querySelector('.sticky-col-2').offsetWidth;

        const stickyCol2s = table.querySelectorAll('.sticky-col-2');
        stickyCol2s.forEach(cell => {
            cell.style.left = `${firstColWidth}px`;
        });

        const stickyCol3s = table.querySelectorAll('.sticky-col-3');
        stickyCol3s.forEach(cell => {
            cell.style.left = `${firstColWidth + secondColWidth}px`;
        });

        updatePagination();
    }

    function columnIndexToLetter(index) {
        let temp, letter = '';
        while (index >= 0) {
            temp = index % 26;
            letter = String.fromCharCode(temp + 65) + letter;
            index = Math.floor(index / 26) - 1;
        }
        return letter;
    }

    function updatePagination() {
        const totalPages = Math.ceil(filteredData.length / rowsPerPage);
        pageInfo.textContent = `Page ${currentPage} of ${totalPages || 1}`;
        prevPageButton.disabled = currentPage === 1;
        nextPageButton.disabled = currentPage === totalPages || totalPages === 0;
    }

    function setupEventListeners() {
        searchInput.addEventListener('input', applyFilters);
        monthFilter.addEventListener('change', (e) => { selectedMonth = e.target.value; applyFilters(); });
        statusFilters.addEventListener('click', (e) => { if (e.target.tagName === 'BUTTON') { statusFilters.querySelector('.active').classList.remove('active'); e.target.classList.add('active'); selectedStatus = e.target.dataset.status; applyFilters(); } });

        // Event listener for inline editing
        tableContainer.addEventListener('blur', async (e) => {
            const td = e.target;
            if (td.tagName !== 'TD' || !td.isContentEditable) {
                return;
            }

            const newValue = td.textContent.trim();
            const originalRow = td.dataset.originalRow;
            const header = td.dataset.header;

            const headerInfo = monitoringDataHeadersBySales[selectedSales] || {};
            const sheetName = headerInfo.sheetName;

            if (!sheetName) {
                console.error('Could not determine sheet name for saving.');
                td.style.backgroundColor = '#f8d7da'; // Error
                return;
            }

            const originalData = monitoringDataBySales[selectedSales] || [];
            const originalItem = originalData.find(item => item.originalSheetRow == originalRow);
            const oldValue = originalItem ? originalItem[header] : '';

            if (newValue === oldValue) {
                return; // No change
            }

            const allHeaders = headerInfo.headers || [];
            const colIndex = allHeaders.findIndex(h => h === header);
            if (colIndex === -1) {
                console.error('Could not find column index for header:', header);
                return;
            }

            const colLetter = columnIndexToLetter(colIndex);
            const range = `'${sheetName}'!${colLetter}${originalRow}`;

            td.style.backgroundColor = '#fdffab'; // Saving...

            try {
                const response = await fetch('/api/update-cell', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ range, value: newValue }),
                });

                if (!response.ok) throw new Error('Failed to update sheet');

                if (originalItem) {
                    originalItem[header] = newValue;
                }

                td.style.backgroundColor = '#d4edda'; // Success
                setTimeout(() => { td.style.backgroundColor = ''; }, 2000);

            } catch (error) {
                console.error('Error updating cell:', error);
                td.textContent = oldValue; // Revert on failure
                td.style.backgroundColor = '#f8d7da'; // Error
                setTimeout(() => { td.style.backgroundColor = ''; }, 2000);
            }
        }, true);
    }

    // --- Event Listeners ---

    initialLoad();
});