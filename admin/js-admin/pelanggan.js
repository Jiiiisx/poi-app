document.addEventListener('DOMContentLoaded', function () {
    // --- Configuration & DOM Elements ---
    const salesDataRanges = {
        'Andi': 'AndiData', 'April': 'AprilData', 'Nandi': 'NandiData', 'Octa': 'OctaData',
        'Yandi': 'YandiData', 'Totong': 'TotongData', 'Yusdhi': 'YusdhiData', 'Nursyarif': 'NursyarifData',
        'Reynaldi': 'ReynaldiData', 'Andri': 'AndriData', 'Tri Susantohadi': 'TriSusantohadiData',
        'Dedi Kurniawan': 'DediKurniawanData', 'Muhammad Arifin': 'MuhammadArifinData', 'Fajar Sodik': 'FajarSodikData',
        'Ichrima': 'IchrimaData', 'Muhamad Ferdi Ridwan': 'MuhamadFerdiRidwanData', 'Suprihatin': 'SuprihatinData',
        'Fini Fadilah Handayani': 'FiniFadilahHandayaniData', 'Hinduntomy Wijaya': 'HinduntomyWijayaData'
    };

    const tableContainer = document.getElementById('billing-table-container');
    const searchInput = document.getElementById('globalSearchInput');
    const salesListElement = document.getElementById('sales-list');
    const selectedSalesElement = document.getElementById('selected-sales');
    const monthFilter = document.getElementById('month-filter');
    const statusFilters = document.getElementById('status-filters');
    const prevPageButton = document.getElementById('prevPage');
    const nextPageButton = document.getElementById('nextPage');
    const pageInfo = document.getElementById('pageInfo');
    
    let monitoringDataBySales = {};
    let monitoringDataHeadersBySales = {};
    let filteredData = [];
    let currentPage = 1;
    const rowsPerPage = 15;

    const urlParams = new URLSearchParams(window.location.search);
    let selectedSales = urlParams.get('sales') || 'Andi';
    let selectedMonth = 'all';
    let selectedStatus = 'all';

    // --- Main Initialization ---
    async function initialize() {
        populateSalesList();
        setupEventListeners();
        
        const searchQueryParam = urlParams.get('q');
        if (searchQueryParam) {
            searchInput.value = decodeURIComponent(searchQueryParam);
        }

        await filterBySales(selectedSales);
    }

    // --- Data Fetching & Processing ---
    async function ensureDataForSales(salesName) {
        if (monitoringDataBySales[salesName.toLowerCase()]) return; // Already loaded

        const token = localStorage.getItem('adminToken');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }

        tableContainer.innerHTML = '<p>Loading data for ' + salesName + '...</p>';
        try {
            const rangeName = salesDataRanges[salesName];
            if (!rangeName) throw new Error('Invalid sales name.');

            const response = await fetch(`/api?action=fetch-monitoring&ranges=${rangeName}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 401) { // Handle unauthorized case
                window.location.href = 'login.html';
                return;
            }
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const data = await response.json();
            processMonitoringData(data, [rangeName]);
        } catch (error) {
            console.error(`Error fetching data for ${salesName}:`, error);
            tableContainer.innerHTML = `<p>Failed to load data for ${salesName}. Please try again.</p>`;
            throw error;
        }
    }

    function processMonitoringData(data, requestedRanges) {
        const rangeToSalesKey = Object.fromEntries(Object.entries(salesDataRanges).map(([k, v]) => [v, k]));

        data.valueRanges.forEach((valueRange, index) => {
            const rangeName = requestedRanges[index];
            const salesName = rangeToSalesKey[rangeName];
            if (!salesName || !valueRange.values || valueRange.values.length < 2) return;

            const headers = valueRange.values[0].map(h => h.trim());
            const nameIndex = headers.findIndex(h => h.toLowerCase() === 'nama pelanggan');
            const range = valueRange.range;
            const sheetNameMatch = range.match(/^\'([^\']*)\'/);
            const sheetName = sheetNameMatch ? sheetNameMatch[1] : range.split('!')[0];
            const startRowMatch = range.match(/(\d+)/);
            if (!startRowMatch) return;
            const headerRow = parseInt(startRowMatch[0], 10);

            const rows = valueRange.values.slice(1).map((row, i) => {
                const rowAsObject = {};
                headers.forEach((header, index) => {
                    rowAsObject[header] = (row[index] || '').trim();
                });
                return { ...rowAsObject, originalSheetRow: headerRow + 1 + i };
            }).filter(item => item['Nama Pelanggan'] && item['Nama Pelanggan'].trim() !== '');
            
            monitoringDataHeadersBySales[salesName.toLowerCase()] = { headers, sheetName };
            monitoringDataBySales[salesName.toLowerCase()] = rows;
        });
    }

    // --- UI Population & Rendering ---
    function populateSalesList() {
        salesListElement.innerHTML = '';
        Object.keys(salesDataRanges).sort().forEach(salesName => {
            const li = document.createElement('li');
            li.textContent = salesName;
            if (salesName === selectedSales) li.classList.add('active');
            li.addEventListener('click', () => {
                const newUrl = new URL(window.location);
                newUrl.searchParams.set('sales', salesName);
                newUrl.searchParams.delete('q');
                window.history.pushState({ path: newUrl.href }, '', newUrl.href);

                document.querySelectorAll('#sales-list li').forEach(item => item.classList.remove('active'));
                li.classList.add('active');
                filterBySales(salesName);
            });
            salesListElement.appendChild(li);
        });
    }

    function populateMonthFilter() {
        monthFilter.innerHTML = '<option value="all">All Months</option>';
        const headers = (monitoringDataHeadersBySales[selectedSales.toLowerCase()] || {}).headers || [];
        const billingHeaders = headers.filter(h => h.toLowerCase().startsWith('billing')).sort((a, b) => {
            const dateA = new Date(a.split(' ')[2], ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"].indexOf(a.split(' ')[1]), 1);
            const dateB = new Date(b.split(' ')[2], ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"].indexOf(b.split(' ')[1]), 1);
            return dateB - dateA;
        });
        billingHeaders.forEach(header => {
            monthFilter.innerHTML += `<option value="${header}">${header}</option>`;
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
        
        let headers = (monitoringDataHeadersBySales[selectedSales.toLowerCase()] || {}).headers || [];
        if (selectedMonth !== 'all') {
            const nonBillingHeaders = headers.filter(h => !h.toLowerCase().startsWith('billing'));
            headers = [...nonBillingHeaders, selectedMonth];
        }

        headers.forEach((h, index) => { 
            const th = document.createElement('th'); 
            th.textContent = h; 
            if (index < 3) th.classList.add(`sticky-col-${index + 1}`);
            headerRow.appendChild(th); 
        });
        thead.appendChild(headerRow);

        paginatedData.forEach(item => {
            const tr = document.createElement('tr');
            headers.forEach((header, colIndex) => {
                const td = document.createElement('td');
                td.textContent = item[header] || '';
                if (colIndex < 3) td.classList.add(`sticky-col-${colIndex + 1}`);

                if (colIndex === 1) { // Assuming 'Nama Pelanggan' is the second column
                    td.classList.add('customer-link');
                    td.addEventListener('click', () => {
                        const customerIdentifier = item['Nama Pelanggan'];
                        if (customerIdentifier) {
                            window.location.href = `profil-pelanggan.html?customer=${encodeURIComponent(customerIdentifier)}&sales=${encodeURIComponent(selectedSales)}`;
                        }
                    });
                } else {
                    td.contentEditable = true;
                }

                td.dataset.originalRow = item.originalSheetRow;
                td.dataset.header = header;
                td.dataset.colIndex = colIndex; // Menyimpan indeks kolom secara langsung
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });

        table.appendChild(thead);
        table.appendChild(tbody);
        tableContainer.innerHTML = '';
        tableContainer.appendChild(table);

        updatePagination();
    }

    // --- Filtering Logic ---
    async function filterBySales(salesName) {
        try {
            await ensureDataForSales(salesName);
            selectedSales = salesName;
            selectedSalesElement.textContent = salesName;
            
            populateMonthFilter();
            
            searchInput.value = urlParams.get('q') || '';
            monthFilter.value = 'all';
            statusFilters.querySelector('.active').classList.remove('active');
            statusFilters.querySelector('[data-status="all"]').classList.add('active');

            selectedMonth = 'all';
            selectedStatus = 'all';

            applyFilters();
        } catch (error) {
            // Error is handled in ensureDataForSales
        }
    }

    function applyFilters() {
        const searchTerm = searchInput.value.toLowerCase();
        let data = monitoringDataBySales[selectedSales.toLowerCase()] || [];

        if (searchTerm) {
            data = data.filter(item => Object.values(item).some(val => val.toString().toLowerCase().includes(searchTerm)));
        }
        
        const allHeaders = (monitoringDataHeadersBySales[selectedSales.toLowerCase()] || {}).headers || [];
        const billingHeaders = allHeaders.filter(h => h.toLowerCase().startsWith('billing'));

        if (selectedStatus === 'pra npc') {
            const now = new Date();
            const sortedBillingHeaders = billingHeaders
                .filter(header => _parseHeaderDate(header) <= now)
                .sort((a, b) => _parseHeaderDate(a) - _parseHeaderDate(b));

            const lastTwoMonthsHeaders = sortedBillingHeaders.slice(-2);

            if (lastTwoMonthsHeaders.length < 2) {
                data = [];
            } else {
                data = data.filter(item => {
                    const isUnpaidLastMonth = (item[lastTwoMonthsHeaders[1]] || '').toLowerCase() === 'unpaid';
                    const isUnpaidTwoMonthsAgo = (item[lastTwoMonthsHeaders[0]] || '').toLowerCase() === 'unpaid';
                    return isUnpaidLastMonth && isUnpaidTwoMonthsAgo;
                });
            }
        } else if (selectedStatus === 'ct0') {
            const now = new Date();
            const sortedBillingHeaders = billingHeaders
                .filter(header => _parseHeaderDate(header) <= now)
                .sort((a, b) => _parseHeaderDate(a) - _parseHeaderDate(b));

            if (sortedBillingHeaders.length < 2) {
                data = [];
            } else {
                data = data.filter(item => {
                    for (let i = 0; i <= sortedBillingHeaders.length - 2; i++) {
                        const header1 = sortedBillingHeaders[i];
                        const header2 = sortedBillingHeaders[i+1];
                        const isUnpaid1 = (item[header1] || '').toLowerCase() === 'unpaid';
                        const isUnpaid2 = (item[header2] || '').toLowerCase() === 'unpaid';
                        if (isUnpaid1 && isUnpaid2) {
                            return true;
                        }
                    }
                    return false;
                });
            }
        } else if (selectedStatus !== 'all') {
             if (selectedMonth !== 'all') {
                // Filter by a specific selected month
                data = data.filter(item => (item[selectedMonth] || 'n/a').toLowerCase() === selectedStatus);
            } else {
                // When "All Months" is selected, filter by the CURRENT month's status
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

        filteredData = data;
        currentPage = 1;
        renderBillingTable();
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

    function getCurrentMonthColumnName() {
        const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
        const d = new Date();
        const month = months[d.getMonth()];
        const year = String(d.getFullYear()).slice(-2);
        return `Billing ${month} ${year}`;
    }

    // --- Pagination ---
    function updatePagination() {
        const totalPages = Math.ceil(filteredData.length / rowsPerPage);
        pageInfo.textContent = `Page ${currentPage} of ${totalPages || 1}`;
        prevPageButton.disabled = currentPage === 1;
        nextPageButton.disabled = currentPage === totalPages || totalPages === 0;
    }

    // --- Event Listeners ---
    function setupEventListeners() {
        searchInput.addEventListener('input', applyFilters);
        monthFilter.addEventListener('change', (e) => { selectedMonth = e.target.value; applyFilters(); });
        statusFilters.addEventListener('click', (e) => { 
            if (e.target.tagName === 'BUTTON') { 
                statusFilters.querySelector('.active').classList.remove('active'); 
                e.target.classList.add('active'); 
                selectedStatus = e.target.dataset.status; 
                applyFilters(); 
            } 
        });

        prevPageButton.addEventListener('click', () => {
            if (currentPage > 1) { currentPage--; renderBillingTable(); }
        });

        nextPageButton.addEventListener('click', () => {
            const totalPages = Math.ceil(filteredData.length / rowsPerPage);
            if (currentPage < totalPages) { currentPage++; renderBillingTable(); }
        });

        // Inline editing listener
        tableContainer.addEventListener('blur', async (e) => {
            const td = e.target;
            if (td.tagName !== 'TD' || !td.isContentEditable) return;

            const token = localStorage.getItem('adminToken');
            if (!token) {
                window.location.href = 'login.html';
                return;
            }

            const newValue = td.textContent.trim();
            const originalRow = td.dataset.originalRow;
            const header = td.dataset.header;
            const headerInfo = monitoringDataHeadersBySales[selectedSales.toLowerCase()] || {};
            const sheetName = headerInfo.sheetName;
            
            const originalData = (monitoringDataBySales[selectedSales.toLowerCase()] || []).find(item => item.originalSheetRow == originalRow);
            const oldValue = originalData ? originalData[header] : '';

            if (newValue === oldValue || !sheetName) return;

            const colIndex = parseInt(td.dataset.colIndex, 10);
            if (isNaN(colIndex)) return;

            const colLetter = String.fromCharCode(65 + colIndex);
            const range = `'${sheetName}'!${colLetter}${originalRow}`;

            console.log('DEBUG: Attempting to update range:', range); // Tambahan untuk debugging

            td.style.backgroundColor = '#fdffab'; // Indicate saving
            try {
                const response = await fetch('/api?action=admin-update-cell', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ range, value: newValue }),
                });

                if (response.status === 401) {
                    window.location.href = 'login.html';
                    return;
                }
                if (!response.ok) throw new Error('Failed to update sheet');

                if (originalData) originalData[header] = newValue; // Update local data
                td.style.backgroundColor = '#d4edda'; // Success
            } catch (error) {
                console.error('Error updating cell:', error);
                td.textContent = oldValue; // Revert
                td.style.backgroundColor = '#f8d7da'; // Error
            } finally {
                setTimeout(() => { td.style.backgroundColor = ''; }, 2000);
            }
        }, true);
    }

    initialize();
});
