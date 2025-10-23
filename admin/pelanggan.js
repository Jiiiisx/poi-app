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

    function _parseHeaderDate(header) {
        const monthMap = {
            'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'mei': 4, 'jun': 5,
            'jul': 6, 'agu': 7, 'sep': 8, 'okt': 9, 'nov': 10, 'des': 11
        };
        if (typeof header !== 'string') return null;
        const parts = header.replace(/billing/i, '').trim().split(' ');
        if (parts.length < 2) return null;

        const monthName = parts[0].toLowerCase().substring(0, 3);
        const month = monthMap[monthName];
        const year = parseInt(parts[1], 10);

        if (month === undefined || isNaN(year)) return null;

        return new Date(year + 2000, month);
    }

    function applyFilters() {
        const searchTerm = searchInput.value.toLowerCase();
        let data = monitoringDataBySales[selectedSales] || [];

        // Apply search filter first
        if (searchTerm) {
            data = data.filter(row =>
                row.some(cell => cell && cell.toString().toLowerCase().includes(searchTerm))
            );
        }

        // Apply month and status filters
        const monthIndex = selectedMonthIndex !== 'all' ? parseInt(selectedMonthIndex, 10) : -1;
        
        if (selectedStatus !== 'all') {
            const headers = monitoringDataHeadersBySales[selectedSales] || [];
            const billingHeaders = headers.map((h, i) => ({ name: h, index: i }))
                                          .filter(h => h.name.toLowerCase().startsWith('billing'));

            if (selectedStatus === 'pra npc') {
                const now = new Date();
                const sortedBillingHeaders = billingHeaders
                    .filter(header => _parseHeaderDate(header.name) <= now)
                    .sort((a, b) => _parseHeaderDate(a.name) - _parseHeaderDate(b.name));

                const lastTwoMonthsHeaders = sortedBillingHeaders.slice(-2);

                if (lastTwoMonthsHeaders.length < 2) {
                    data = [];
                } else {
                    data = data.filter(row => {
                        const isUnpaidLastMonth = (row[lastTwoMonthsHeaders[1].index] || '').toLowerCase().trim() === 'unpaid';
                        const isUnpaidTwoMonthsAgo = (row[lastTwoMonthsHeaders[0].index] || '').toLowerCase().trim() === 'unpaid';
                        return isUnpaidLastMonth && isUnpaidTwoMonthsAgo;
                    });
                }
            } else if (selectedStatus === 'ct0') {
                const now = new Date();
                const sortedBillingHeaders = billingHeaders
                    .filter(header => _parseHeaderDate(header.name) <= now)
                    .sort((a, b) => _parseHeaderDate(a.name) - _parseHeaderDate(b.name));
                
                if (sortedBillingHeaders.length < 2) {
                    data = [];
                } else {
                    data = data.filter(row => {
                        for (let i = 0; i <= sortedBillingHeaders.length - 2; i++) {
                            const header1 = sortedBillingHeaders[i];
                            const header2 = sortedBillingHeaders[i + 1];
                            const isUnpaid1 = (row[header1.index] || '').toLowerCase().trim() === 'unpaid';
                            const isUnpaid2 = (row[header2.index] || '').toLowerCase().trim() === 'unpaid';
                            if (isUnpaid1 && isUnpaid2) {
                                return true;
                            }
                        }
                        return false;
                    });
                }
            } else {
                // Existing logic for paid, unpaid, etc.
                data = data.filter(row => {
                    if (monthIndex !== -1) {
                        const cellStatus = (row[monthIndex] || '').toLowerCase().trim();
                        return cellStatus === selectedStatus;
                    } else {
                        const date = new Date();
                        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
                        const monthName = months[date.getMonth()];
                        const year = date.getFullYear().toString().slice(-2);
                        const currentMonthHeader = `Billing ${monthName} ${year}`;
                        const currentMonthColumnIndex = headers.findIndex(h => h.toLowerCase() === currentMonthHeader.toLowerCase());

                        if (currentMonthColumnIndex !== -1) {
                            const cellStatus = (row[currentMonthColumnIndex] || '').toLowerCase().trim();
                            return cellStatus === selectedStatus;
                        }
                        return false;
                    }
                });
            }
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

    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `custom-notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 500);
        }, 3000);
    }

    function copyToClipboard(text) {
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
            showNotification('Copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            showNotification('Failed to copy', 'error');
        });
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

        const noInternetIndex = headers.findIndex(h => h.toLowerCase() === 'nomor internet');
        const noCustomerIndex = headers.findIndex(h => h.toLowerCase() === 'no customer');

        paginatedData.forEach((rowData, rowIndex) => {
            const tr = document.createElement('tr');
            rowData.forEach((cellData, colIndex) => {
                const td = document.createElement('td');
                const header = headers[colIndex];

                if (colIndex === noInternetIndex || colIndex === noCustomerIndex) {
                    td.classList.add('copyable-cell');
                    td.innerHTML = `
                        <span>${cellData || ''}</span>
                        <button class="btn-copy" onclick="copyToClipboard('${cellData || ''}')" title="Copy">
                            <i class="far fa-copy"></i>
                        </button>
                    `;
                } else if (header && header.toLowerCase() === 'fup') {
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
                
                // Make cells non-editable if they have a copy button
                if (colIndex !== noInternetIndex && colIndex !== noCustomerIndex) {
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

            // On success, update the local data model to prevent UI inconsistency before a refresh.
            const filteredDataIndex = parseInt(td.dataset.row, 10);
            const colIndex = parseInt(td.dataset.col, 10);
            if (filteredData[filteredDataIndex]) {
                filteredData[filteredDataIndex][colIndex] = newValue;
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