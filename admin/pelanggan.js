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
        'Tri Susantohadi': 'TriSusantohadiData',
        'Dedi Kurniawan': 'DediKurniawanData',
        'Muhammad Arifin': 'MuhammadArifinData',
        'Fajar Sodik': 'FajarSodikData',
        'Ichrima': 'IchrimaData',
        'Muhamad Ferdi Ridwan': 'MuhamadFerdiRidwanData',
        'Suprihatin': 'SuprihatinData',
        'Fini Fadilah Handayani': 'FiniFadilahHandayaniData',
        'Hinduntomy Wijaya': 'HinduntomyWijayaData'
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

    let selectedMonth = 'all';
    let selectedStatus = 'all';

    async function loadMonitoringData() {
        try {
            tableContainer.innerHTML = '<p>Loading billing data...</p>';
            const requestedRanges = Object.values(salesDataRanges);
            const ranges = requestedRanges.join(',');
            const response = await fetch(`/api/fetch-monitoring?ranges=${ranges}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            processMonitoringData(data, requestedRanges);
            populateSalesList();
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
                const headers = valueRange.values[0].map(h => h.trim());
                const nameIndex = headers.findIndex(h => h.toLowerCase() === 'nama pelanggan');
                
                const range = valueRange.range;
                const startRowMatch = range.match(/(\d+)/);
                if (!startRowMatch) {
                    console.error('Could not parse start row from range:', range);
                    return;
                }
                const headerRow = parseInt(startRowMatch[0], 10);

                const rows = [];
                valueRange.values.slice(1).forEach((row, i) => {
                    const nameCell = row[nameIndex];
                    if (nameCell && nameCell.trim() !== '') {
                        const rowAsObject = {};
                        headers.forEach((header, index) => {
                            rowAsObject[header] = (row[index] || '').trim();
                        });
                        rows.push({
                            ...rowAsObject, 
                            originalSheetRow: headerRow + 1 + i 
                        });
                    }
                });

                monitoringDataHeadersBySales[salesName] = headers;
                monitoringDataBySales[salesName] = rows;
            }
        });
    }

    function populateSalesList() {
        salesListElement.innerHTML = '';
        const salesNames = Object.keys(monitoringDataBySales).sort();
        salesNames.forEach(salesName => {
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
        });
    }

    function populateMonthFilter() {
        monthFilter.innerHTML = '<option value="all">All Months</option>';
        const headers = monitoringDataHeadersBySales[selectedSales] || [];
        const billingHeaders = headers.filter(h => h.toLowerCase().startsWith('billing'));
        
        const sortedBillingHeaders = [...billingHeaders].sort((a, b) => {
            const dateA = _parseHeaderDate(a);
            const dateB = _parseHeaderDate(b);
            if (!dateA) return 1;
            if (!dateB) return -1;
            return dateB - dateA; // Sort descending
        });

        sortedBillingHeaders.forEach(header => {
            const option = document.createElement('option');
            option.value = header;
            option.textContent = header;
            monthFilter.appendChild(option);
        });
    }

    function filterBySales(salesName, isInitialLoad = false) {
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

        if (month === undefined || isNaN(year)) {
            console.warn(`Could not parse date from header: "${header}"`);
            return null;
        }

        return new Date(year + 2000, month);
    }

    function getCurrentMonthColumnName() {
        const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
        const d = new Date();
        const month = months[d.getMonth()];
        const year = String(d.getFullYear()).slice(-2);
        return `Billing ${month} ${year}`;
    }

    function applyFilters() {
        const searchTerm = searchInput.value.toLowerCase();
        let data = monitoringDataBySales[selectedSales] || [];

        if (searchTerm) {
            data = data.filter(item =>
                Object.values(item).some(val => val.toString().toLowerCase().includes(searchTerm))
            );
        }

        if (selectedStatus !== 'all') {
            const allHeaders = monitoringDataHeadersBySales[selectedSales] || [];
            const billingHeaders = allHeaders.filter(h => h.toLowerCase().startsWith('billing'));

            if (selectedStatus === 'pra npc') {
                const now = new Date();
                const sortedBillingHeaders = billingHeaders
                    .filter(header => _parseHeaderDate(header) <= now)
                    .sort((a, b) => _parseHeaderDate(a) - _parseHeaderDate(b));
                const lastTwoMonthsHeaders = sortedBillingHeaders.slice(-2);

                if (lastTwoMonthsHeaders.length >= 2) {
                    data = data.filter(item => {
                        const isUnpaidLastMonth = (item[lastTwoMonthsHeaders[1]] || '').toLowerCase() === 'unpaid';
                        const isUnpaidTwoMonthsAgo = (item[lastTwoMonthsHeaders[0]] || '').toLowerCase() === 'unpaid';
                        return isUnpaidLastMonth && isUnpaidTwoMonthsAgo;
                    });
                } else {
                    data = [];
                }
            } else if (selectedStatus === 'ct0') {
                const now = new Date();
                const sortedBillingHeaders = billingHeaders
                    .filter(header => _parseHeaderDate(header) <= now)
                    .sort((a, b) => _parseHeaderDate(a) - _parseHeaderDate(b));

                if (sortedBillingHeaders.length >= 2) {
                    data = data.filter(item => {
                        for (let i = 0; i <= sortedBillingHeaders.length - 2; i++) {
                            const header1 = sortedBillingHeaders[i];
                            const header2 = sortedBillingHeaders[i + 1];
                            const isUnpaid1 = (item[header1] || '').toLowerCase() === 'unpaid';
                            const isUnpaid2 = (item[header2] || '').toLowerCase() === 'unpaid';
                            if (isUnpaid1 && isUnpaid2) {
                                return true;
                            }
                        }
                        return false;
                    });
                } else {
                    data = [];
                }
            } else { // Handle 'paid', 'unpaid'
                if (selectedMonth !== 'all') {
                    data = data.filter(item => {
                        const billingStatus = (item[selectedMonth] || 'n/a').toLowerCase();
                        return billingStatus === selectedStatus;
                    });
                } else {
                    const currentMonthColumn = getCurrentMonthColumnName();
                    if (allHeaders.map(h => h.toUpperCase()).includes(currentMonthColumn.toUpperCase())) {
                        data = data.filter(item => {
                            const billingStatus = (item[currentMonthColumn] || 'n/a').toLowerCase();
                            return billingStatus === selectedStatus;
                        });
                    } else {
                        data = [];
                    }
                }
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
            updatePagination();
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

        paginatedData.forEach((item, rowIndex) => {
            const tr = document.createElement('tr');
            headers.forEach((header, colIndex) => {
                const td = document.createElement('td');
                const cellData = item[header] || '';
                
                if (header.toLowerCase() === 'nomor internet' || header.toLowerCase() === 'no customer') {
                    td.classList.add('copyable-cell');
                    td.innerHTML = `
                        ${cellData}
                        <button class="btn-copy" data-copy-text="${cellData}" title="Copy">
                            <i class="fa-solid fa-copy"></i>
                        </button>
                    `;
                } else if (header.toLowerCase() === 'fup') {
                    if (cellData.includes('/')) {
                        const [used, total] = cellData.replace(/GB/gi, '').split('/');
                        const percentage = (parseFloat(used) / parseFloat(total)) * 100;
                        td.innerHTML = `
                            <div>${cellData}</div>
                            <div class="fup-bar-container">
                                <div class="fup-bar" style="width: ${percentage}%;"></div>
                            </div>
                        `;
                    } else {
                        td.textContent = cellData;
                    }
                } else {
                    td.textContent = cellData;
                }

                td.dataset.row = start + rowIndex;
                td.dataset.col = colIndex;
                td.dataset.originalSheetRow = item.originalSheetRow;
                
                if (header.toLowerCase() !== 'nomor internet' && header.toLowerCase() !== 'no customer') {
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

        tableContainer.querySelectorAll('.btn-copy').forEach(button => {
            button.addEventListener('click', () => {
                copyToClipboard(button.dataset.copyText);
            });
        });
    }

    function updatePagination() {
        const totalPages = Math.ceil(filteredData.length / rowsPerPage);
        pageInfo.textContent = `Page ${currentPage} of ${totalPages || 1}`;
        prevPageButton.disabled = currentPage === 1;
        nextPageButton.disabled = currentPage === totalPages || totalPages === 0;
    }

    // Event Listeners
    searchInput.addEventListener('input', applyFilters);

    monthFilter.addEventListener('change', (e) => {
        selectedMonth = e.target.value;
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
        const originalSheetRow = td.dataset.originalSheetRow;
        const colIndex = parseInt(td.dataset.col, 10);
        const headers = monitoringDataHeadersBySales[selectedSales] || [];
        const header = headers[colIndex];

        if (!originalSheetRow || !header) {
            console.error('Cannot update cell: missing originalSheetRow or header.');
            showNotification('Error: Cannot update row. Please refresh.', 'error');
            return;
        }

        const colLetter = String.fromCharCode('A'.charCodeAt(0) + colIndex);
        const sheetName = 'REKAP PS AR KALIABANG'; // This might need to be dynamic
        const range = `'${sheetName}'!${colLetter}${originalSheetRow}`;

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
            
            // Update local data model
            const dataIndex = parseInt(td.dataset.row, 10);
            if (filteredData[dataIndex]) {
                filteredData[dataIndex][header] = newValue;
            }

            td.style.backgroundColor = '#d4edda';
            setTimeout(() => { td.style.backgroundColor = ''; }, 2000);

        } catch (error) {
            console.error('Error updating cell:', error);
            const dataIndex = parseInt(td.dataset.row, 10);
            if (filteredData[dataIndex]) {
                td.textContent = filteredData[dataIndex][header]; // Revert on failure
            }
            td.style.backgroundColor = '#f8d7da';
            showNotification('Update failed. Please try again.', 'error');
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
