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
    
    const billingMonthFilter = document.getElementById('billing-month-filter');
    const generateMessageBtn = document.getElementById('generate-message-btn');
    const messageGeneratorOutput = document.getElementById('message-generator-output');

    // --- Data Fetching and Processing ---
    function processApiResponse(apiResponse) {
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

    // --- Message Generator Logic ---
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
        if (month === undefined || isNaN(year)) { return null; }
        return new Date(year + 2000, month);
    }

    function generateBillingMessages() {
        const selectedMonth = billingMonthFilter.value;
        const selectedSales = salesFilter.value;
        const statusCheckboxes = document.querySelectorAll('#status-checkboxes input[type="checkbox"]:checked');
        const selectedStatuses = Array.from(statusCheckboxes).map(cb => cb.value.toUpperCase());

        if (selectedStatuses.length === 0) {
            alert('Silakan pilih minimal satu status pelanggan.');
            return;
        }
        if (!selectedMonth && (selectedStatuses.includes('PAID') || selectedStatuses.includes('UNPAID'))) {
            alert('Silakan pilih bulan tagihan jika status PAID atau UNPAID dipilih.');
            return;
        }

        let customersBySales = {};
        const allHeaders = Array.from(Object.values(salesPerformance).reduce((acc, { headers }) => {
            headers.forEach(h => acc.add(h));
            return acc;
        }, new Set()));
        const billingHeaders = allHeaders.filter(h => h.toLowerCase().startsWith('billing'));

        for (const salesName in salesPerformance) {
            if (selectedSales !== 'all' && salesName !== selectedSales) continue;

            const salesData = salesPerformance[salesName];
            const matchingCustomers = salesData.customers.filter(customer => {
                let matches = false;
                for (const status of selectedStatuses) {
                    if (status === 'PAID' || status === 'UNPAID') {
                        if ((customer[selectedMonth] || '').trim().toUpperCase() === status) {
                            matches = true; break;
                        }
                    } else if (status === 'PRA NPC') {
                        const now = new Date();
                        const sortedBillingHeaders = billingHeaders.filter(h => _parseHeaderDate(h) <= now).sort((a, b) => _parseHeaderDate(a) - _parseHeaderDate(b));
                        if (sortedBillingHeaders.length >= 2) {
                            const lastThree = sortedBillingHeaders.slice(-3);
                            const lastMonthHeader = lastThree[lastThree.length - 1];
                            const twoMonthsAgoHeader = lastThree[lastThree.length - 2];
                            const isUnpaidLastMonth = (customer[lastMonthHeader] || '').trim().toUpperCase() === 'UNPAID';
                            const isUnpaidTwoMonthsAgo = (customer[twoMonthsAgoHeader] || '').trim().toUpperCase() === 'UNPAID';

                            if (isUnpaidLastMonth && isUnpaidTwoMonthsAgo) {
                                let isPraNpc = true;
                                if (lastThree.length === 3) {
                                    const threeMonthsAgoHeader = lastThree[0];
                                    if ((customer[threeMonthsAgoHeader] || '').trim().toUpperCase() === 'UNPAID') {
                                        isPraNpc = false; // This is a CT0 case
                                    }
                                }
                                if (isPraNpc) {
                                    matches = true; break;
                                }
                            }
                        }
                    } else if (status === 'CTO') {
                        const now = new Date();
                        const sortedBillingHeaders = billingHeaders.filter(h => _parseHeaderDate(h) <= now).sort((a, b) => _parseHeaderDate(a) - _parseHeaderDate(b));
                        if (sortedBillingHeaders.length >= 3) {
                            const lastThree = sortedBillingHeaders.slice(-3);
                            const isUnpaidLastMonth = (customer[lastThree[2]] || '').trim().toUpperCase() === 'UNPAID';
                            const isUnpaidTwoMonthsAgo = (customer[lastThree[1]] || '').trim().toUpperCase() === 'UNPAID';
                            const isUnpaidThreeMonthsAgo = (customer[lastThree[0]] || '').trim().toUpperCase() === 'UNPAID';
                            if (isUnpaidLastMonth && isUnpaidTwoMonthsAgo && isUnpaidThreeMonthsAgo) {
                                matches = true; break;
                            }
                        }
                        if(matches) break;
                    }
                }
                return matches;
            });

            if (matchingCustomers.length > 0) {
                customersBySales[salesName] = matchingCustomers;
            }
        }
        renderGeneratedMessages(customersBySales, selectedMonth, selectedStatuses, selectedSales);
    }

    function renderGeneratedMessages(customersBySales, selectedMonth, selectedStatuses, selectedSales) {
        messageGeneratorOutput.innerHTML = '';
        messageGeneratorOutput.style.display = 'block';
        const monthName = selectedMonth ? selectedMonth.replace('Billing ', '').split(' ')[0].toUpperCase() : new Date().toLocaleString('default', { month: 'short' }).toUpperCase();
        const statusText = selectedStatuses.join(', ');

        if (Object.keys(customersBySales).length === 0) {
            messageGeneratorOutput.innerHTML = `<p>Tidak ada pelanggan dengan status "${statusText}" yang cocok dengan kriteria.</p>`;
            return;
        }

        const salesTitle = selectedSales === 'all' ? "ALLSALESTELDA" : `Sales: ${selectedSales.toUpperCase()}`;
        for (const salesName in customersBySales) {
            const customers = customersBySales[salesName];
            const messageBlock = document.createElement('div');
            messageBlock.className = 'sales-message-block';
            let titleMonth = (selectedStatuses.includes('PAID') || selectedStatuses.includes('UNPAID')) ? `BULAN ${monthName}` : `PERIODE ${new Date().toLocaleString('default', { month: 'short' }).toUpperCase()}`;
            let messageContent = `*${statusText} ${titleMonth}*\n*${salesTitle}*\n\n`;

            if (selectedSales === 'all') {
                 messageContent += `*Sales: ${salesName.toUpperCase()}*\n`;
            }
            
            customers.forEach((customer, index) => {
                const name = customer['Nama Pelanggan'] || '';
                const noInternet = customer['Nomor Internet'] || '';
                const noTelepon = customer['No Customer'] || '';
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

    function populateSalesFilter() { const salesNames = Object.keys(salesPerformance).sort(); salesNames.forEach(name => { const option = document.createElement('option'); option.value = name; option.textContent = name; salesFilter.appendChild(option); }); }
    function renderLeaderboardTable(salesData) { const container = document.getElementById('leaderboard-table-container'); if (!container) return; const table = document.createElement('table'); table.className = 'customer-table'; const thead = document.createElement('thead'); const tbody = document.createElement('tbody'); thead.innerHTML = `<tr><th>Rank</th><th>Sales Name</th><th>Total Pelanggan</th></tr>`; salesData.forEach((sales, index) => { const tr = document.createElement('tr'); tr.innerHTML = `<td>${index + 1}</td><td>${sales.name}</td><td>${sales.totalCustomers}</td>`; tbody.appendChild(tr); }); table.appendChild(thead); table.appendChild(tbody); container.innerHTML = ''; container.appendChild(table); }
    function renderAllSalesView() { const salesNames = Object.keys(salesPerformance); const salesData = salesNames.map(name => ({ name: name, totalCustomers: salesPerformance[name].totalCustomers })).sort((a, b) => b.totalCustomers - a.totalCustomers); const totalSales = salesData.length; const totalPelanggan = salesData.reduce((sum, sales) => sum + sales.totalCustomers, 0); const avgPerSales = totalSales > 0 ? (totalPelanggan / totalSales).toFixed(1) : 0; const topPerformer = totalSales > 0 ? salesData[0].name : '-'; document.getElementById('summary-total-sales').textContent = totalSales; document.getElementById('summary-total-pelanggan').textContent = totalPelanggan; document.getElementById('summary-avg-per-sales').textContent = avgPerSales; document.getElementById('summary-top-performer').textContent = topPerformer; const chartLabels = salesData.map(s => s.name); const chartData = salesData.map(s => s.totalCustomers); const ctx = document.getElementById('allSalesChart').getContext('2d'); if (allSalesChart) allSalesChart.destroy(); const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim() || '#d9363e'; const gradient = ctx.createLinearGradient(0, 0, 600, 0); gradient.addColorStop(0, primaryColor); gradient.addColorStop(1, '#ff7e5f'); allSalesChart = new Chart(ctx, { type: 'bar', data: { labels: chartLabels, datasets: [{ label: 'Jumlah Pelanggan', data: chartData, backgroundColor: gradient, borderRadius: 4, borderWidth: 0 }] }, options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { backgroundColor: '#fff', titleColor: '#333', bodyColor: '#666', borderColor: '#ddd', borderWidth: 1, padding: 10, callbacks: { label: (context) => ` ${context.raw} Pelanggan` } } }, scales: { x: { beginAtZero: true, grid: { drawBorder: false, }, ticks: { font: { family: "'Poppins', sans-serif" } } }, y: { grid: { display: false }, ticks: { font: { family: "'Poppins', sans-serif" } } } } } }); renderLeaderboardTable(salesData); }
    
    function renderSingleSalesView(salesName) {
        const salesData = salesPerformance[salesName];
        if (!salesData) return;

        document.getElementById('total-pelanggan-sales').textContent = salesData.totalCustomers;
        let paidCustomers = 0;
        let unpaidCustomers = 0;
        const billingColumns = Object.keys(salesData.customers[0] || {}).filter(h => h.toLowerCase().startsWith('billing'));
        const sortedBillingColumns = billingColumns.sort((a, b) => {
            const dateA = _parseHeaderDate(a); const dateB = _parseHeaderDate(b);
            if (!dateA || !dateB) return 0;
            return dateA - dateB;
        });

        salesData.customers.forEach(customer => {
            let latestStatus = '';
            for (let i = sortedBillingColumns.length - 1; i >= 0; i--) {
                const col = sortedBillingColumns[i];
                const status = (customer[col] || '').trim().toLowerCase();
                if (status && status !== 'n/a') {
                    latestStatus = status;
                    break;
                }
            }
            if (latestStatus === 'paid') paidCustomers++;
            else if (latestStatus === 'unpaid') unpaidCustomers++;
        });

        document.getElementById('paid-customers-sales').textContent = paidCustomers;
        document.getElementById('unpaid-customers-sales').textContent = unpaidCustomers;

        const monthlyAcquisitions = {};
        salesData.customers.forEach(customer => {
            for (const monthColumn of sortedBillingColumns) {
                const status = (customer[monthColumn] || '').trim();
                if (status && status.toUpperCase() !== 'N/A') {
                    const acquisitionDate = _parseHeaderDate(monthColumn);
                    if (acquisitionDate) {
                        const monthYear = `${acquisitionDate.getMonth() + 1}/${acquisitionDate.getFullYear()}`;
                        monthlyAcquisitions[monthYear] = (monthlyAcquisitions[monthYear] || 0) + 1;
                        break;
                    }
                }
            }
        });

        const sortedAcquisitionMonths = Object.keys(monthlyAcquisitions).sort((a, b) => {
            const [m1, y1] = a.split('/'); const [m2, y2] = b.split('/');
            return new Date(y1, m1 - 1) - new Date(y2, m2 - 1);
        });

        const chartLabels = sortedAcquisitionMonths;
        const chartData = sortedAcquisitionMonths.map(month => monthlyAcquisitions[month]);
        const ctx = document.getElementById('singleSalesChart').getContext('2d');
        if (singleSalesChart) singleSalesChart.destroy();
        
        const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim() || '#d9363e';
        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, primaryColor);
        gradient.addColorStop(1, 'rgba(217, 54, 62, 0.1)');

        singleSalesChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartLabels,
                datasets: [{
                    label: 'New Customers', data: chartData, backgroundColor: gradient, borderColor: primaryColor,
                    borderWidth: 2, pointBackgroundColor: '#fff', pointBorderColor: primaryColor,
                    pointHoverRadius: 7, pointHoverBackgroundColor: primaryColor, pointHoverBorderColor: '#fff',
                    fill: true, tension: 0.4
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
            }
        });
    }

    function updateView() { const selectedSales = salesFilter.value; if (selectedSales === 'all') { allSalesView.style.display = 'block'; singleSalesView.style.display = 'none'; renderAllSalesView(); } else { allSalesView.style.display = 'none'; singleSalesView.style.display = 'block'; renderSingleSalesView(selectedSales); } }

    function setupEventListeners() {
        salesFilter.addEventListener('change', updateView);

        if (generateMessageBtn) {
            generateMessageBtn.addEventListener('click', generateBillingMessages);
        }

        const statusSelectBox = document.getElementById('status-select-box');
        const statusCheckboxes = document.getElementById('status-checkboxes');
        
        if (statusSelectBox) {
            statusSelectBox.addEventListener('click', function() {
                statusCheckboxes.classList.toggle('visible');
            });

            statusCheckboxes.addEventListener('change', function() {
                const selected = Array.from(statusCheckboxes.querySelectorAll('input:checked')).map(cb => cb.parentElement.innerText.trim());
                if (selected.length) {
                    statusSelectBox.innerHTML = `<span class="selected-items">${selected.map(s => `<span class="selected-item-pill">${s}</span>`).join('')}</span>`;
                } else {
                    statusSelectBox.innerHTML = `<span class="placeholder">Pilih status...</span>`;
                }
            });

            document.addEventListener('click', function(e) {
                if (!statusSelectBox.contains(e.target) && !statusCheckboxes.contains(e.target)) {
                    statusCheckboxes.classList.remove('visible');
                }
            });
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

    function getCurrentMonthColumnName() {
        const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
        const d = new Date();
        const month = months[d.getMonth()];
        const year = String(d.getFullYear()).slice(-2);
        return `Billing ${month} ${year}`;
    }

    async function init() {
        showSkeletonLoader();
        const success = await loadAndProcessSalesData();
        hideSkeletonLoader();
        if (success) {
            populateSalesFilter();
            populateBillingMonthFilter(); 
            
            const currentMonthColumn = getCurrentMonthColumnName();
            if (billingMonthFilter.querySelector(`option[value="${currentMonthColumn}"]`)) {
                billingMonthFilter.value = currentMonthColumn;
            }

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
