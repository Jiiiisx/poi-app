document.addEventListener('DOMContentLoaded', function () {
    console.log('laporan.js loaded');

    // --- Helper function for authenticated API calls ---
    async function fetchWithAuth(url, options = {}) {
        const token = localStorage.getItem('adminToken');
        if (!token) {
            window.location.href = 'login.html';
            return new Promise(() => {}); 
        }
        const headers = { ...options.headers, 'Authorization': `Bearer ${token}` };
        const response = await fetch(url, { ...options, headers });
        if (response.status === 401) {
            window.location.href = 'login.html';
            throw new Error('Unauthorized');
        }
        return response;
    }

    // --- START: State and Variables ---
    let salesPerformance = {};
    let allSalesChart = null;
    let singleSalesChart = null;
    const salesDataRanges = {
        'Andi': 'AndiData', 'April': 'AprilData', 'Nandi': 'NandiData', 'Octa': 'OctaData',
        'Yandi': 'YandiData', 'Totong': 'TotongData', 'Yusdhi': 'YusdhiData', 'Nursyarif': 'NursyarifData',
        'Reynaldi': 'ReynaldiData', 'Andri': 'AndriData', 'Tri Susantohadi': 'TriSusantohadiData',
        'Dedi Kurniawan': 'DediKurniawanData', 'Muhammad Arifin': 'MuhammadArifinData', 'Fajar Sodik': 'FajarSodikData',
        'Ichrima': 'IchrimaData', 'Muhamad Ferdi Ridwan': 'MuhamadFerdiRidwanData', 'Suprihatin': 'SuprihatinData',
        'Fini Fadilah Handayani': 'FiniFadilahHandayaniData', 'Hinduntomy Wijaya': 'HinduntomyWijayaData'
    };

    // --- DOM Elements ---
    const salesFilter = document.getElementById('sales-filter');
    const allSalesView = document.getElementById('all-sales-view');
    const singleSalesView = document.getElementById('single-sales-view');
    const skeletonLoader = document.querySelector('.skeleton-loader');
    
    // --- NEW: Message Generator DOM Elements ---
    const billingMonthFilter = document.getElementById('billing-month-filter');
    const billingStatusFilter = document.getElementById('billing-status-filter');
    const generateMessageBtn = document.getElementById('generate-message-btn');
    const messageGeneratorOutput = document.getElementById('message-generator-output');

    // --- Data Fetching and Processing ---
    function processApiResponse(apiResponse) {
        // ... (fungsi yang ada tidak diubah)
        const performanceData = {};
        const reverseSalesDataRanges = Object.fromEntries(Object.entries(salesDataRanges).map(a => a.reverse()));
        const requestedRanges = Object.values(salesDataRanges);

        if (apiResponse.valueRanges) {
            apiResponse.valueRanges.forEach((valueRange, index) => {
                const namedRange = requestedRanges[index];
                const salesName = reverseSalesDataRanges[namedRange];

                if (salesName && valueRange.values && valueRange.values.length > 1) {
                    const headers = valueRange.values[0];
                    const nameIndex = headers.findIndex(h => h.toLowerCase() === 'nama pelanggan');
                    const customers = valueRange.values.slice(1).map(row => {
                        if (!row[nameIndex] || row[nameIndex].trim() === '') return null;
                        const customerData = {};
                        headers.forEach((header, index) => {
                            customerData[header] = row[index] || '';
                        });
                        return customerData;
                    }).filter(Boolean);
                    
                    performanceData[salesName] = { customers, totalCustomers: customers.length, headers };
                }
            });
        }
        return performanceData;
    }

    async function loadAndProcessSalesData() {
        const requestedRanges = Object.values(salesDataRanges);
        const ranges = requestedRanges.join(',');
        try {
            const response = await fetchWithAuth(`/api?action=fetch-monitoring&ranges=${ranges}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            salesPerformance = processApiResponse(data);
            return true;
        } catch (error) {
            console.error('Failed to load sales data:', error);
            return false;
        }
    }

    // --- NEW: Message Generator Logic ---
    function populateBillingMonthFilter() {
        if (!billingMonthFilter) return;
        
        const allHeaders = new Set();
        for (const sales in salesPerformance) {
            (salesPerformance[sales].headers || []).forEach(header => {
                if (header.toLowerCase().startsWith('billing')) {
                    allHeaders.add(header);
                }
            });
        }

        const sortedMonths = Array.from(allHeaders).sort((a, b) => {
            const dateA = new Date(a.split(' ')[2], ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"].indexOf(a.split(' ')[1]), 1);
            const dateB = new Date(b.split(' ')[2], ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"].indexOf(b.split(' ')[1]), 1);
            return dateB - dateA;
        });

        billingMonthFilter.innerHTML = '<option value="">Pilih Bulan</option>';
        sortedMonths.forEach(month => {
            billingMonthFilter.innerHTML += `<option value="${month}">${month}</option>`;
        });
    }

    const monthMap = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

    function getMonthColumns(headers) {
        const billingHeaders = headers.filter(h => h.toLowerCase().startsWith('billing'));
        return billingHeaders.sort((a, b) => {
            const dateA = parseMonthColumnToDate(a);
            const dateB = parseMonthColumnToDate(b);
            return dateB - dateA;
        });
    }

    function parseMonthColumnToDate(monthColumn) {
        if (!monthColumn) return null;
        const parts = monthColumn.split(' ');
        if (parts.length < 3) return null;
        const monthName = parts[1];
        const year = `20${parts[2]}`;
        const monthIndex = monthMap.indexOf(monthName);
        if (monthIndex === -1) return null;
        return new Date(year, monthIndex, 1);
    }

    function findLatestStatus(customer, allHeaders) {
        const sortedMonths = getMonthColumns(allHeaders);
        for (const monthColumn of sortedMonths) {
            const status = (customer[monthColumn] || '').trim().toUpperCase(); // TRIM ADDED
            // DIAGNOSTIC HACK: Ignore UNPAID status to see if PRA NPC appears
            if (status && status !== 'N/A' && status !== 'UNPAID') {
                return { status, monthColumn };
            }
        }
        return { status: null, monthColumn: null };
    }

    function generateBillingMessages() {
        const selectedMonth = billingMonthFilter.value;
        const selectedStatus = billingStatusFilter.value.toUpperCase();
        const selectedSales = salesFilter.value;

        if ((selectedStatus === 'PAID' || selectedStatus === 'UNPAID') && !selectedMonth) {
            alert('Silakan pilih bulan tagihan untuk status PAID atau UNPAID.');
            return;
        }

        let customersBySales = {};
        const allHeaders = Array.from(Object.values(salesPerformance).reduce((acc, { headers }) => {
            headers.forEach(h => acc.add(h));
            return acc;
        }, new Set()));

        for (const salesName in salesPerformance) {
            if (selectedSales !== 'all' && salesName !== selectedSales) {
                continue;
            }

            const salesData = salesPerformance[salesName];
            const matchingCustomers = salesData.customers.filter(customer => {
                if (selectedStatus === 'PAID' || selectedStatus === 'UNPAID') {
                    const statusInMonth = (customer[selectedMonth] || '').trim().toUpperCase(); // TRIM ADDED
                    return statusInMonth === selectedStatus;
                } else {
                    const { status: latestStatus, monthColumn: latestMonthColumn } = findLatestStatus(customer, allHeaders);
                    if (!latestStatus) return false;

                    const statusDate = parseMonthColumnToDate(latestMonthColumn);
                    if (!statusDate) return false;

                    const now = new Date();
                    const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, now.getDate());

                    if (selectedStatus === 'PRA NPC') {
                        return latestStatus === 'PRA NPC' && statusDate >= twoMonthsAgo;
                    }

                    if (selectedStatus === 'CTO') {
                        if (latestStatus === 'CTO') return true;
                        if (latestStatus === 'PRA NPC' && statusDate < twoMonthsAgo) return true;
                        return false;
                    }
                }
                return false;
            });

            if (matchingCustomers.length > 0) {
                customersBySales[salesName] = matchingCustomers;
            }
        }
        renderGeneratedMessages(customersBySales, selectedMonth, selectedStatus, selectedSales);
    }

    function renderGeneratedMessages(customersBySales, selectedMonth, selectedStatus, selectedSales) {
        messageGeneratorOutput.innerHTML = '';
        messageGeneratorOutput.style.display = 'block';

        const monthName = selectedMonth ? selectedMonth.replace('Billing ', '').split(' ')[0].toUpperCase() : new Date().toLocaleString('default', { month: 'short' }).toUpperCase();

        if (Object.keys(customersBySales).length === 0) {
            messageGeneratorOutput.innerHTML = `<p>Tidak ada pelanggan dengan status "${selectedStatus}" yang cocok dengan kriteria.</p>`;
            return;
        }

        const salesTitle = selectedSales === 'all' ? "ALL SALES TELDA" : `Sales: ${selectedSales.toUpperCase()}`;

        for (const salesName in customersBySales) {
            const customers = customersBySales[salesName];
            const messageBlock = document.createElement('div');
            messageBlock.className = 'sales-message-block';
            
            let titleMonth = (selectedStatus === 'PAID' || selectedStatus === 'UNPAID') ? `BULAN ${monthName}` : `PERIODE ${new Date().toLocaleString('default', { month: 'short' }).toUpperCase()}`;
            let messageContent = `*${selectedStatus} ${titleMonth}*\n*${salesTitle}*\n\n`;

            if (selectedSales === 'all') {
                 messageContent += `*Sales: ${salesName.toUpperCase()}*\n`;
            }
            
            customers.forEach((customer, index) => {
                const name = customer['Nama Pelanggan'] || '';
                const noInternet = customer['Nomor Internet'] || '';
                const noTelepon = customer['No Telepon'] || '';

                const phonePart = noTelepon ? `, ${noTelepon}` : '';
                messageContent += `${index + 1}. ${name.toUpperCase()} - ${noInternet}${phonePart}\n`;
            });

            messageBlock.innerHTML = `
                <div class="sales-message-header">
                    <h4>Pesan untuk: ${salesName}</h4>
                    <button class="copy-button" data-sales="${salesName}">Salin Pesan</button>
                </div>
                <div class="message-content" id="message-for-${salesName}">${messageContent.trim()}</div>
            `;
            messageGeneratorOutput.appendChild(messageBlock);
        }
    }

    // --- Existing Rendering Logic (renderAllSalesView, etc.) ---
    // ... (Semua fungsi render yang ada tidak diubah) ...
    function populateSalesFilter() { const salesNames = Object.keys(salesPerformance).sort(); salesNames.forEach(name => { const option = document.createElement('option'); option.value = name; option.textContent = name; salesFilter.appendChild(option); }); }
    function renderLeaderboardTable(salesData) { const container = document.getElementById('leaderboard-table-container'); if (!container) return; const table = document.createElement('table'); table.className = 'customer-table'; const thead = document.createElement('thead'); const tbody = document.createElement('tbody'); thead.innerHTML = `<tr><th>Rank</th><th>Sales Name</th><th>Total Pelanggan</th></tr>`; salesData.forEach((sales, index) => { const tr = document.createElement('tr'); tr.innerHTML = `<td>${index + 1}</td><td>${sales.name}</td><td>${sales.totalCustomers}</td>`; tbody.appendChild(tr); }); table.appendChild(thead); table.appendChild(tbody); container.innerHTML = ''; container.appendChild(table); }
    function renderAllSalesView() { const salesNames = Object.keys(salesPerformance); const salesData = salesNames.map(name => ({ name: name, totalCustomers: salesPerformance[name].totalCustomers })).sort((a, b) => b.totalCustomers - a.totalCustomers); const totalSales = salesData.length; const totalPelanggan = salesData.reduce((sum, sales) => sum + sales.totalCustomers, 0); const avgPerSales = totalSales > 0 ? (totalPelanggan / totalSales).toFixed(1) : 0; const topPerformer = totalSales > 0 ? salesData[0].name : '-'; document.getElementById('summary-total-sales').textContent = totalSales; document.getElementById('summary-total-pelanggan').textContent = totalPelanggan; document.getElementById('summary-avg-per-sales').textContent = avgPerSales; document.getElementById('summary-top-performer').textContent = topPerformer; const chartLabels = salesData.map(s => s.name); const chartData = salesData.map(s => s.totalCustomers); const ctx = document.getElementById('allSalesChart').getContext('2d'); if (allSalesChart) allSalesChart.destroy(); const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim() || '#d9363e'; const gradient = ctx.createLinearGradient(0, 0, 600, 0); gradient.addColorStop(0, primaryColor); gradient.addColorStop(1, '#ff7e5f'); allSalesChart = new Chart(ctx, { type: 'bar', data: { labels: chartLabels, datasets: [{ label: 'Jumlah Pelanggan', data: chartData, backgroundColor: gradient, borderRadius: 4, borderWidth: 0 }] }, options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { backgroundColor: '#fff', titleColor: '#333', bodyColor: '#666', borderColor: '#ddd', borderWidth: 1, padding: 10, callbacks: { label: (context) => ` ${context.raw} Pelanggan` } } }, scales: { x: { beginAtZero: true, grid: { drawBorder: false, }, ticks: { font: { family: "'Poppins', sans-serif" } } }, y: { grid: { display: false }, ticks: { font: { family: "'Poppins', sans-serif" } } } } } }); renderLeaderboardTable(salesData); }
    function renderSingleSalesView(salesName) { const salesData = salesPerformance[salesName]; if (!salesData) return; document.getElementById('total-pelanggan-sales').textContent = salesData.totalCustomers; let paidCustomers = 0; let unpaidCustomers = 0; if (salesData.customers.length > 0) { const headers = Object.keys(salesData.customers[0]); const billingColumns = headers.filter(h => h.toLowerCase().startsWith('billing')); const parseBillingMonth = (billingHeader) => { const parts = billingHeader.split(' '); if (parts.length !== 3) return null; const monthName = parts[1]; const year = `20${parts[2]}`; const monthIndex = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'].findIndex(m => m.toLowerCase() === monthName.toLowerCase()); if (monthIndex === -1) return null; return new Date(year, monthIndex, 1); }; billingColumns.sort((a, b) => { const dateA = parseBillingMonth(a); const dateB = parseBillingMonth(b); if (!dateA || !dateB) return 0; return dateA - dateB; }); salesData.customers.forEach(customer => { let latestStatus = ''; for (let i = billingColumns.length - 1; i >= 0; i--) { const col = billingColumns[i]; if (customer[col] && customer[col].trim() !== '') { latestStatus = customer[col].toLowerCase(); break; } } if (latestStatus === 'paid') { paidCustomers++; } else if (latestStatus === 'unpaid') { unpaidCustomers++; } }); } document.getElementById('paid-customers-sales').textContent = paidCustomers; document.getElementById('unpaid-customers-sales').textContent = unpaidCustomers; const monthlyAcquisitions = {}; salesData.customers.forEach(customer => { if (customer.acquisitionDate) { const monthYear = `${customer.acquisitionDate.getMonth() + 1}/${customer.acquisitionDate.getFullYear()}`; monthlyAcquisitions[monthYear] = (monthlyAcquisitions[monthYear] || 0) + 1; } }); const sortedMonths = Object.keys(monthlyAcquisitions).sort((a, b) => { const [m1, y1] = a.split('/'); const [m2, y2] = b.split('/'); return new Date(y1, m1 - 1) - new Date(y2, m2 - 1); }); const chartLabels = sortedMonths; const chartData = sortedMonths.map(month => monthlyAcquisitions[month]); const ctx = document.getElementById('singleSalesChart').getContext('2d'); if (singleSalesChart) singleSalesChart.destroy(); const gradient = ctx.createLinearGradient(0, 0, 0, 400); gradient.addColorStop(0, 'rgba(40, 167, 69, 0.6)'); gradient.addColorStop(1, 'rgba(40, 167, 69, 0)'); singleSalesChart = new Chart(ctx, { type: 'line', data: { labels: chartLabels, datasets: [{ label: 'Akuisisi per Bulan', data: chartData, backgroundColor: gradient, borderColor: '#28a745', borderWidth: 3, tension: 0.4, fill: true, pointBackgroundColor: '#fff', pointBorderColor: '#28a745', pointHoverRadius: 7, pointRadius: 5 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { drawBorder: false } }, x: { grid: { display: false } } } } }); }
    function updateView() { const selectedSales = salesFilter.value; if (selectedSales === 'all') { allSalesView.style.display = 'block'; singleSalesView.style.display = 'none'; renderAllSalesView(); } else { allSalesView.style.display = 'none'; singleSalesView.style.display = 'block'; renderSingleSalesView(selectedSales); } }

    // --- Event Listeners ---
    function setupEventListeners() {
        const menuToggle = document.getElementById('menu-toggle');
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.querySelector('.overlay');
        if (menuToggle && sidebar && overlay) {
            menuToggle.addEventListener('click', () => { sidebar.classList.toggle('active'); overlay.style.display = sidebar.classList.contains('active') ? 'block' : 'none'; });
            overlay.addEventListener('click', () => { sidebar.classList.remove('active'); overlay.style.display = 'none'; });
        }
        salesFilter.addEventListener('change', updateView);

        // --- NEW: Message Generator Event Listeners ---
        if (generateMessageBtn) {
            generateMessageBtn.addEventListener('click', generateBillingMessages);
        }
        if (messageGeneratorOutput) {
            messageGeneratorOutput.addEventListener('click', function(e) {
                if (e.target.classList.contains('copy-button')) {
                    const salesName = e.target.dataset.sales;
                    const textToCopy = document.getElementById(`message-for-${salesName}`).innerText;
                    navigator.clipboard.writeText(textToCopy).then(() => {
                        e.target.textContent = 'Disalin!';
                        e.target.classList.add('copied');
                        setTimeout(() => {
                            e.target.textContent = 'Salin Pesan';
                            e.target.classList.remove('copied');
                        }, 2000);
                    }).catch(err => {
                        console.error('Failed to copy text: ', err);
                        alert('Gagal menyalin pesan.');
                    });
                }
            });
        }
    }

    // --- Initial Load ---
    async function init() {
        showSkeletonLoader();
        const success = await loadAndProcessSalesData();
        hideSkeletonLoader();
        if (success) {
            populateSalesFilter();
            populateBillingMonthFilter(); // NEW: Populate the new dropdown
            updateView();
            setupEventListeners();
            document.dispatchEvent(new Event('page-rendered'));
        } else {
            document.getElementById('all-sales-view').innerHTML = '<p>Failed to load report data.</p>';
            document.getElementById('all-sales-view').style.display = 'block';
        }
    }

    init();
});