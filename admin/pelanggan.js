document.addEventListener('DOMContentLoaded', function () {
    const salesDataRanges = {
        'Andi': 'AndiData',
        'April': 'AprilData',
        'Nandi': 'NandiData',
        'Octa': 'OctaData',
        'Yandi': 'YandiData',
        'Totong': 'TotongData',
        'Yusdhi': 'YusdhiData',
        'Nursyarif': 'NursyarifData',
        'Reynaldi': 'ReynaldiData',
        'Andri': 'AndriData',
        'TRI SUSANTOHADI': 'TriSusantohadiData',
        'DEDI KURNIAWAN': 'DediKurniawanData',
        'MUHAMMAD ARIFIN': 'MuhammadArifinData',
        'FAJAR SODIK': 'FajarSodikData',
        'ICHRIMA': 'IchrimaData',
        'MUHAMAD  FERDI  RIDWAN': 'MuhamadFerdiRidwanData',
        'SUPRIHATIN': 'SuprihatinData',
        'FINI FADILAH HANDAYANI': 'FiniFadilahHandayaniData',
        'HINDUNTOMY WIJAYA': 'HinduntomyWijayaData'
    };

    let monitoringDataBySales = {};
    let monitoringDataHeadersBySales = {};
    let filteredData = [];
    let currentPage = 1;
    const rowsPerPage = 10;
    let selectedSales = 'Andi'; // Default to first sales person

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

    let selectedMonthIndex = 'all';
    let selectedStatus = 'all';

    async function loadMonitoringData() {
        try {
            const requestedRanges = Object.values(salesDataRanges);
            const ranges = requestedRanges.join(',');
            const response = await fetch(`/api/fetch-monitoring?ranges=${ranges}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            console.log('Raw monitoring data:', data);
            processMonitoringData(data, requestedRanges);
            populateSalesList();
            // Initial load for the default sales person
            filterBySales(selectedSales, true);
        } catch (error) {
            console.error('Error fetching monitoring data:', error);
            tableContainer.innerHTML = '<p>Error loading billing data. Please try again later.</p>';
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
                const headers = valueRange.values[0];
                const nameIndex = headers.findIndex(h => h.toLowerCase() === 'nama pelanggan');
                const rows = valueRange.values.slice(1).filter(row => row[nameIndex] && row[nameIndex].trim() !== '');
                monitoringDataHeadersBySales[salesName] = headers;
                monitoringDataBySales[salesName] = rows;
            }
        });
        console.log('Processed monitoring data:', monitoringDataBySales);
    }

    function populateSalesList() {
        salesListElement.innerHTML = '';
        for (const salesName in monitoringDataBySales) {
            const li = document.createElement('li');
            li.textContent = salesName;
            if (salesName === selectedSales) {
                li.classList.add('active');
            }
            li.addEventListener('click', () => {
                filterBySales(salesName);
                document.querySelectorAll('#sales-list li').forEach(item => item.classList.remove('active'));
                li.classList.add('active');
            });
            salesListElement.appendChild(li);
        }
    }

    function populateMonthFilter() {
        monthFilter.innerHTML = '<option value="all">All Months</option>';
        const headers = monitoringDataHeadersBySales[selectedSales] || [];
        headers.forEach((header, index) => {
            if (header.toLowerCase().startsWith('billing')) {
                const option = document.createElement('option');
                option.value = index;
                option.textContent = header;
                monthFilter.appendChild(option);
            }
        });
    }

    function filterBySales(salesName, isInitialLoad = false) {
        selectedSales = salesName;
        selectedSalesElement.textContent = salesName;
        
        populateMonthFilter();
        
        if (!isInitialLoad) {
            // Reset filters when changing sales, but not on initial load
            searchInput.value = '';
            monthFilter.value = 'all';
            statusFilters.querySelector('.active').classList.remove('active');
            statusFilters.querySelector('[data-status="all"]').classList.add('active');
        }

        selectedMonthIndex = monthFilter.value;
        selectedStatus = statusFilters.querySelector('.active').dataset.status;

        applyFilters();
        renderSalesSummary(salesName);
    }

    function applyFilters() {
        const searchTerm = searchInput.value.toLowerCase();
        let data = monitoringDataBySales[selectedSales] || [];

        // Search filter
        if (searchTerm) {
            data = data.filter(row =>
                row.some(cell => cell && cell.toString().toLowerCase().includes(searchTerm))
            );
        }

        // Month and Status filter
        if (selectedMonthIndex !== 'all') {
            const monthIndex = parseInt(selectedMonthIndex, 10);
            data = data.filter(row => {
                const cellValue = row[monthIndex];
                if (selectedStatus === 'all') {
                    return true; // Show all for the selected month
                }
                
                const cellStatus = (cellValue || '').toLowerCase().trim();

                if (selectedStatus === 'paid') {
                    return cellStatus === 'paid';
                }
                if (selectedStatus === 'unpaid') {
                    return cellStatus === 'unpaid';
                }
                if (selectedStatus === 'pra npc') {
                    return cellStatus === 'pra npc';
                }
                if (selectedStatus === 'ct0') {
                    return cellStatus === 'ct0';
                }
                // If status is something else, and not 'all', we don't have a match
                return false;
            });
        }

        filteredData = data;
        currentPage = 1;
        renderBillingTable();
        updatePagination();
    }

    function renderSalesSummary(salesName) {
        const salesData = monitoringDataBySales[salesName] || [];
        const totalCustomers = salesData.length;

        salesPerformanceSummaryElement.innerHTML = `
            <div class="summary-card">
                <p>Total Pelanggan</p>
                <span>${totalCustomers}</span>
            </div>
        `;
    }

    function renderBillingTable() {
        const start = (currentPage - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        const paginatedData = filteredData.slice(start, end);

        if (paginatedData.length === 0) {
            tableContainer.innerHTML = '<p>No billing data found for the selected filters.</p>';
            return;
        }

        const table = document.createElement('table');
        table.className = 'customer-table';
        const thead = document.createElement('thead');
        const tbody = document.createElement('tbody');

        const headerRow = document.createElement('tr');
        const headers = monitoringDataHeadersBySales[selectedSales] || [];
        headers.forEach(headerText => {
            const th = document.createElement('th');
            th.textContent = headerText;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);

        paginatedData.forEach((rowData, rowIndex) => {
            const tr = document.createElement('tr');
            rowData.forEach((cellData, colIndex) => {
                const td = document.createElement('td');
                const header = headers[colIndex];

                if (header && header.toLowerCase() === 'fup') {
                    const fupData = cellData || '';
                    if (fupData.includes('/')) {
                        const [used, total] = fupData.replace(/GB/gi, '').split('/');
                        const percentage = (parseFloat(used) / parseFloat(total)) * 100;
                        td.innerHTML = `
                            <div>${fupData}</div>
                            <div class="fup-bar-container">
                                <div class="fup-bar" style="width: ${percentage}%;"></div>
                            </div>
                        `;
                    } else {
                        td.textContent = fupData;
                    }
                } else {
                    td.textContent = cellData || '';
                }

                td.dataset.row = start + rowIndex;
                td.dataset.col = colIndex;
                if (header && header.toLowerCase().startsWith('billing')) {
                    td.contentEditable = true;
                }
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });

        table.appendChild(thead);
        table.appendChild(tbody);
        tableContainer.innerHTML = '';
        tableContainer.appendChild(table);
    }

    function updatePagination() {
        const totalPages = Math.ceil(filteredData.length / rowsPerPage);
        pageInfo.textContent = `Page ${currentPage} of ${totalPages || 1}`;
        prevPageButton.disabled = currentPage === 1;
        nextPageButton.disabled = currentPage === totalPages;
    }

    // Event Listeners
    searchInput.addEventListener('input', applyFilters);

    monthFilter.addEventListener('change', (e) => {
        selectedMonthIndex = e.target.value;
        applyFilters();
    });

    statusFilters.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            statusFilters.querySelector('.active').classList.remove('active');
            e.target.classList.add('active');
            selectedStatus = e.target.dataset.status;
            applyFilters();
        }
    });

    tableContainer.addEventListener('blur', async (e) => {
        const td = e.target;
        if (td.tagName !== 'TD' || !td.contentEditable) return;

        const newValue = td.textContent;
        const rowIndex = parseInt(td.dataset.row, 10) + 2; // +2 for header and 1-based index
        const colIndex = parseInt(td.dataset.col, 10);
        const colLetter = String.fromCharCode('A'.charCodeAt(0) + colIndex);
        const sheetName = 'REKAP PS AR KALIABANG';
        const range = `'${sheetName}'!${colLetter}${rowIndex}`;

        td.style.backgroundColor = '#fdffab';

        try {
            const response = await fetch('/api/update-cell', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ range, value: newValue }),
            });

            if (!response.ok) {
                throw new Error('Failed to update sheet');
            }

            td.style.backgroundColor = '#d4edda';
            setTimeout(() => { td.style.backgroundColor = ''; }, 2000);

        } catch (error) {
            console.error('Error updating cell:', error);
            td.style.backgroundColor = '#f8d7da';
        }
    }, true);

    prevPageButton.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderBillingTable();
            updatePagination();
        }
    });

    nextPageButton.addEventListener('click', () => {
        const totalPages = Math.ceil(filteredData.length / rowsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderBillingTable();
            updatePagination();
        }
    });

    loadMonitoringData();
});