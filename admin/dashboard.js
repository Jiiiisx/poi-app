document.addEventListener('DOMContentLoaded', function () {
    // --- START: State and Variables ---
    let allCustomerData = [];
    let filteredCustomerData = [];
    let allGovernmentData = [];
    let filteredGovernmentData = [];
    let currentPage = 1;
    const rowsPerPage = 10;
    let currentView = 'customer'; // 'customer' or 'government'

    const salesDataRanges = {
        'Andi': 'AndiData', 'April': 'AprilData', 'Nandi': 'NandiData', 'Octa': 'OctaData',
        'Yandi': 'YandiData', 'Totong': 'TotongData', 'Yusdhi': 'YusdhiData', 'Nursyarif': 'NursyarifData',
        'Reynaldi': 'ReynaldiData', 'Andri': 'AndriData', 'Tri Susantohadi': 'TriSusantohadiData',
        'Dedi Kurniawan': 'DediKurniawanData', 'Muhammad Arifin': 'MuhammadArifinData', 'Fajar Sodik': 'FajarSodikData',
        'Ichrima': 'IchrimaData', 'Muhamad Ferdi Ridwan': 'MuhamadFerdiRidwanData', 'Suprihatin': 'SuprihatinData',
        'Fini Fadilah Handayani': 'FiniFadilahHandayaniData', 'Hinduntomy Wijaya': 'HinduntomyWijayaData'
    };

    // --- DOM Elements ---
    const tableContainer = document.getElementById('customer-table-container');
    const searchInput = document.getElementById('searchInput');
    const prevPageButton = document.getElementById('prevPage');
    const nextPageButton = document.getElementById('nextPage');
    const pageInfo = document.getElementById('pageInfo');
    const btnShowAll = document.getElementById('btnTableShowAll');
    const btnShowSchool = document.getElementById('btnTableShowSchool');
    const btnShowNonSchool = document.getElementById('btnTableShowNonSchool');
    const btnShowGovernment = document.getElementById('btnTableShowGovernment');

    // --- START: Data Fetching and Processing ---

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
        if (month === undefined || isNaN(year)) return null;
        return new Date(year + 2000, month);
    }

    function deDuplicateAndProcessData(apiResponse) {
        const customerMap = new Map();
        const allBillingHeaders = new Set();
        if (apiResponse.valueRanges) {
            apiResponse.valueRanges.forEach(valueRange => {
                if (valueRange.values && valueRange.values.length > 1) {
                    const headers = valueRange.values[0];
                    const nameIndex = headers.findIndex(h => h.toLowerCase() === 'nama pelanggan');
                    const noInternetIndex = headers.findIndex(h => h.toLowerCase() === 'nomor internet');
                    if (nameIndex === -1 || noInternetIndex === -1) return;
                    headers.forEach(h => { if (h.toLowerCase().startsWith('billing')) allBillingHeaders.add(h); });
                    valueRange.values.slice(1).forEach(row => {
                        const customerId = row[noInternetIndex] || row[nameIndex];
                        if (customerId && customerId.trim() !== '' && !customerMap.has(customerId)) {
                            const customerData = {};
                            headers.forEach((header, index) => { customerData[header] = (row[index] || '').trim(); });
                            customerMap.set(customerId, customerData);
                        }
                    });
                }
            });
        }
        const sortedBillingHeaders = [...allBillingHeaders].sort((a, b) => {
            const dateA = _parseHeaderDate(a), dateB = _parseHeaderDate(b);
            if (!dateA) return 1; if (!dateB) return -1;
            return dateA - dateB;
        });
        return { uniqueCustomers: customerMap, sortedBillingHeaders };
    }

    async function loadAndProcessMonitoringData() {
        const requestedRanges = Object.values(salesDataRanges);
        const ranges = requestedRanges.join(',');
        const response = await fetch(`/api/fetch-monitoring?ranges=${ranges}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        const { uniqueCustomers, sortedBillingHeaders } = deDuplicateAndProcessData(data);
        const unpaidChartData = processUnpaidForChart(uniqueCustomers, sortedBillingHeaders);
        renderUnpaidTrendChart(unpaidChartData);
        const stats = processStatsForCards(uniqueCustomers, sortedBillingHeaders);
        updateStatsCards(stats);
    }

    async function loadCustomerData() {
        const response = await fetch('/api/customer-data');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        allCustomerData = data.values.slice(1);
    }

    async function loadGovernmentData() {
        const response = await fetch('/api/government-data');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        if (!data.values || data.values.length < 1) {
            allGovernmentData = [];
            return;
        }
        const originalHeaders = data.values[0];
        const normalizedHeaders = originalHeaders.map(h => h.toLowerCase().replace(/ /g, '_'));

        allGovernmentData = data.values.slice(1).map(row => {
            const rowAsObject = {};
            normalizedHeaders.forEach((header, index) => {
                rowAsObject[header] = row[index] || '';
            });
            return rowAsObject;
        });
    }

    async function loadAllData() {
        tableContainer.innerHTML = '<p>Loading all data...</p>';
        try {
            await Promise.all([
                loadAndProcessMonitoringData(),
                loadCustomerData(),
                loadGovernmentData()
            ]);
            console.log('Dashboard loaded successfully.');
            render(); // Initial render call
        } catch (error) {
            console.error('Dashboard failed to load:', error);
            tableContainer.innerHTML = '<p>Failed to load dashboard data. Please try again.</p>';
        }
    }

    // --- END: Data Fetching and Processing ---

    // --- START: Rendering Logic ---

    function render() {
        currentPage = 1;
        if (currentView === 'government') {
            filterAndRenderGovernmentTable();
        } else {
            filterAndRenderCustomerTable();
        }
    }

    function filterAndRenderCustomerTable() {
        const searchTerm = searchInput.value.toLowerCase();
        const activeFilterBtn = document.querySelector('.filter-buttons .active');
        const filterType = activeFilterBtn ? activeFilterBtn.id.replace('btnTableShow', '').toLowerCase() : 'all';
        let data = allCustomerData;
        if (filterType === 'school') data = data.filter(row => window.schoolDataFilter.isSchool(row[1]));
        else if (filterType === 'non-school') data = data.filter(row => !window.schoolDataFilter.isSchool(row[1]));
        if (searchTerm) {
            data = data.filter(row => row.some(cell => cell && cell.toString().toLowerCase().includes(searchTerm)));
        }
        filteredCustomerData = data;
        renderCustomerTable();
    }

    function renderCustomerTable() {
        const start = (currentPage - 1) * rowsPerPage, end = start + rowsPerPage;
        const paginatedData = filteredCustomerData.slice(start, end);
        if (paginatedData.length === 0) {
            tableContainer.innerHTML = '<p>No customer data found.</p>';
            updatePagination(); return;
        }
        const table = document.createElement('table'); table.className = 'customer-table';
        const thead = document.createElement('thead'), tbody = document.createElement('tbody');
        const headerRow = document.createElement('tr');
        const headers = ['ODP Terdekat', 'Nama', 'Alamat', 'No. Telepon', 'Nama Sales', 'Visit', 'Status', 'Keterangan', 'Gambar'];
        headers.forEach(h => { const th = document.createElement('th'); th.textContent = h; headerRow.appendChild(th); });
        thead.appendChild(headerRow);
        paginatedData.forEach((rowData) => {
            const tr = document.createElement('tr');
            for (let i = 0; i < headers.length; i++) {
                const td = document.createElement('td');
                const cellData = rowData[i] || '';
                if (i === 2 && cellData.startsWith('http')) { const a = document.createElement('a'); a.href = cellData; a.textContent = 'View on Map'; a.target = '_blank'; a.className = 'action-btn btn-view-map'; td.appendChild(a); }
                else if (i === 8) { const imageUrl = rowData[i]; if (imageUrl && imageUrl.startsWith('http')) { const btn = document.createElement('button'); btn.textContent = 'View Image'; btn.className = 'action-btn btn-view-image'; btn.onclick = () => window.open(imageUrl, '_blank'); td.appendChild(btn); } }
                else { td.textContent = cellData; }
                tr.appendChild(td);
            }
            tbody.appendChild(tr);
        });
        table.appendChild(thead); table.appendChild(tbody);
        tableContainer.innerHTML = ''; tableContainer.appendChild(table);
        updatePagination();
    }

    function filterAndRenderGovernmentTable() {
        const searchTerm = searchInput.value.toLowerCase();
        let data = allGovernmentData;
        if (searchTerm) {
            data = data.filter(item => Object.values(item).some(val => val.toString().toLowerCase().includes(searchTerm)));
        }
        filteredGovernmentData = data;
        renderGovernmentTable();
    }

    function renderGovernmentTable() {
        const start = (currentPage - 1) * rowsPerPage, end = start + rowsPerPage;
        const paginatedData = filteredGovernmentData.slice(start, end);
        if (paginatedData.length === 0) {
            tableContainer.innerHTML = '<p>No government data found.</p>';
            updatePagination(); return;
        }
        const table = document.createElement('table'); table.className = 'customer-table government-table';
        const thead = document.createElement('thead'), tbody = document.createElement('tbody');
        const headerRow = document.createElement('tr');
        
        // Get headers dynamically from the first data object
        const headers = paginatedData.length > 0 ? Object.keys(paginatedData[0]) : [];

        headers.forEach(h => { const th = document.createElement('th'); th.textContent = h.replace(/_/g, ' ').toUpperCase(); headerRow.appendChild(th); });
        thead.appendChild(headerRow);

        paginatedData.forEach(item => {
            const tr = document.createElement('tr');
            headers.forEach(header => {
                const td = document.createElement('td');
                td.textContent = item[header] || '';
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
        table.appendChild(thead); table.appendChild(tbody);
        tableContainer.innerHTML = ''; tableContainer.appendChild(table);
        updatePagination();
    }

    function updatePagination() {
        const data = currentView === 'government' ? filteredGovernmentData : allCustomerData;
        const totalPages = Math.ceil(data.length / rowsPerPage);
        pageInfo.textContent = `Page ${currentPage} of ${totalPages || 1}`;
        prevPageButton.disabled = currentPage === 1;
        nextPageButton.disabled = currentPage === totalPages || totalPages === 0;
    }

    function renderUnpaidTrendChart(chartData) {
        const ctx = document.getElementById('unpaidTrendChart').getContext('2d');
        new Chart(ctx, {
            type: 'bar', data: { labels: chartData.labels, datasets: [{
                label: 'Jumlah Pelanggan Menunggak', data: chartData.data,
                backgroundColor: 'rgba(217, 54, 62, 0.6)', borderColor: 'rgba(217, 54, 62, 1)',
                borderWidth: 1, borderRadius: 4,
            }]}, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ` ${c.raw} Pelanggan` } } }, scales: { y: { beginAtZero: true, grid: { drawBorder: false }, ticks: { stepSize: 10 } }, x: { grid: { display: false } } } }
        });
    }

    function processUnpaidForChart(uniqueCustomers, sortedBillingHeaders) {
        const unpaidCounts = sortedBillingHeaders.map(header => {
            let count = 0;
            for (const customer of uniqueCustomers.values()) {
                if ((customer[header] || '').toLowerCase() === 'unpaid') {
                    count++;
                }
            }
            return count;
        });
        return {
            labels: sortedBillingHeaders.map(h => h.replace('Billing ', '')),
            data: unpaidCounts
        };
    }

    function processStatsForCards(uniqueCustomers, sortedBillingHeaders) {
        const date = new Date();
        const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
        const currentMonthShort = months[date.getMonth()];
        const currentYearShort = String(date.getFullYear()).slice(-2);
        const currentMonthHeader = sortedBillingHeaders.find(h => h.includes(currentMonthShort) && h.includes(currentYearShort));
        let paidThisMonth = 0, unpaidThisMonth = 0;
        if (currentMonthHeader) {
            for (const customer of uniqueCustomers.values()) {
                const status = (customer[currentMonthHeader] || '').toLowerCase();
                if (status === 'paid') paidThisMonth++;
                else if (status === 'unpaid') unpaidThisMonth++;
            }
        }
        const totalBilled = paidThisMonth + unpaidThisMonth;
        return {
            totalPelanggan: uniqueCustomers.size,
            paidThisMonth, unpaidThisMonth,
            closingRate: totalBilled > 0 ? Math.round((paidThisMonth / totalBilled) * 100) : 0
        };
    }

    function updateStatsCards(stats) {
        const cards = document.querySelector('.stats-cards');
        cards.children[0].querySelector('span').textContent = stats.totalPelanggan.toLocaleString('id-ID');
        cards.children[1].querySelector('span').textContent = stats.paidThisMonth.toLocaleString('id-ID');
        cards.children[2].querySelector('span').textContent = stats.unpaidThisMonth.toLocaleString('id-ID');
        cards.children[3].querySelector('span').textContent = `${stats.closingRate}%`;
    }

    // --- END: Rendering Logic ---

    // --- START: Event Listeners ---
    function setupEventListeners() {
        searchInput.addEventListener('input', () => {
            currentPage = 1;
            if (currentView === 'government') {
                filterAndRenderGovernmentTable();
            } else {
                filterAndRenderCustomerTable();
            }
        });

        const setActiveFilter = (activeButton) => {
            [btnShowAll, btnShowSchool, btnShowNonSchool, btnShowGovernment].forEach(button => button.classList.remove('active'));
            activeButton.classList.add('active');
        };

        btnShowAll.addEventListener('click', () => { currentView = 'customer'; setActiveFilter(btnShowAll); render(); });
        btnShowSchool.addEventListener('click', () => { currentView = 'customer'; setActiveFilter(btnShowSchool); render(); });
        btnShowNonSchool.addEventListener('click', () => { currentView = 'customer'; setActiveFilter(btnShowNonSchool); render(); });
        btnShowGovernment.addEventListener('click', () => { currentView = 'government'; setActiveFilter(btnShowGovernment); render(); });

        prevPageButton.addEventListener('click', () => { if (currentPage > 1) { currentPage--; if(currentView === 'government') renderGovernmentTable(); else renderCustomerTable(); } });
        nextPageButton.addEventListener('click', () => {
            const data = currentView === 'government' ? filteredGovernmentData : filteredCustomerData;
            const totalPages = Math.ceil(data.length / rowsPerPage);
            if (currentPage < totalPages) { currentPage++; if(currentView === 'government') renderGovernmentTable(); else renderCustomerTable(); }
        });
    }
    // --- END: Event Listeners ---

    // Initial Load
    loadAllData();
    setupEventListeners();
});