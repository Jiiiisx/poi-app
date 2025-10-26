document.addEventListener('DOMContentLoaded', function () {
    console.log('laporan.js loaded');

    // --- START: State and Variables ---
    let salesPerformance = {};
    let allSalesChart = null;
    let singleSalesChart = null;

    // Copy of salesDataRanges from dashboard.js
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

    // --- Skeleton Loader --- 
    const skeletonLoader = document.querySelector('.skeleton-loader');

    function showSkeletonLoader() {
        let cardsHTML = '';
        for (let i = 0; i < 4; i++) {
            cardsHTML += '<div class="skeleton-card-item"></div>';
        }
        skeletonLoader.querySelector('.skeleton-cards').innerHTML = cardsHTML;

        let tableRowsHTML = '';
        for (let i = 0; i < 5; i++) { // 5 rows for leaderboard
            tableRowsHTML += '<div class="skeleton-row"></div>';
        }
        skeletonLoader.querySelector('.skeleton-table').innerHTML = tableRowsHTML;

        allSalesView.style.display = 'none';
        singleSalesView.style.display = 'none';
        skeletonLoader.style.display = 'block';
    }

    function hideSkeletonLoader() {
        skeletonLoader.style.display = 'none';
    }

    // --- START: Data Fetching and Processing ---

    // Simplified date parser for acquisition trends
    function parseDate(dateString) {
        if (!dateString || typeof dateString !== 'string') return null;
        // Assuming format "DD/MM/YYYY" or "DD-MM-YYYY"
        const parts = dateString.split(/[/\-]/);
        if (parts.length !== 3) return null;
        // Month is 0-indexed in JS
        const date = new Date(parts[2], parts[1] - 1, parts[0]);
        return isNaN(date.getTime()) ? null : date;
    }

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
                    const customers = valueRange.values.slice(1).map(row => {
                        const customerData = {};
                        headers.forEach((header, index) => {
                            customerData[header] = row[index] || '';
                        });
                        return customerData;
                    });

                    // --- New logic for acquisitionDate ---
                    const billingColumns = headers.filter(h => h.toLowerCase().startsWith('billing'));
                    
                    // Helper to parse month and year from "Billing [Month] [YY]"
                    const parseBillingMonth = (billingHeader) => {
                        const parts = billingHeader.split(' ');
                        if (parts.length !== 3) return null;
                        const monthName = parts[1];
                        const year = `20${parts[2]}`;
                        const monthIndex = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'].findIndex(m => m.toLowerCase() === monthName.toLowerCase());
                        if (monthIndex === -1) return null;
                        return new Date(year, monthIndex, 1);
                    };

                    // Sort billing columns chronologically
                    billingColumns.sort((a, b) => {
                        const dateA = parseBillingMonth(a);
                        const dateB = parseBillingMonth(b);
                        if (!dateA || !dateB) return 0;
                        return dateA - dateB;
                    });

                    customers.forEach(c => {
                        c.acquisitionDate = null;
                        for (const col of billingColumns) {
                            if (c[col]) {
                                c.acquisitionDate = parseBillingMonth(col);
                                break; // Found the first billing month, so we can stop
                            }
                        }
                    });

                    performanceData[salesName] = {
                        customers: customers,
                        totalCustomers: customers.length,
                    };
                }
            });
        }
        return performanceData;
    }

    async function loadAndProcessSalesData() {
        const requestedRanges = Object.values(salesDataRanges);
        const ranges = requestedRanges.join(',');
        try {
            const response = await fetch(`/api/fetch-monitoring?ranges=${ranges}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            salesPerformance = processApiResponse(data);
            return true;
        } catch (error) {
            console.error('Failed to load sales data:', error);
            return false;
        }
    }

    // --- START: Rendering Logic ---

    function populateSalesFilter() {
        const salesNames = Object.keys(salesPerformance).sort();
        salesNames.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            salesFilter.appendChild(option);
        });
    }

    function renderLeaderboardTable(salesData) {
        const container = document.getElementById('leaderboard-table-container');
        if (!container) return;

        const table = document.createElement('table');
        table.className = 'customer-table'; // Reuse existing table style
        const thead = document.createElement('thead');
        const tbody = document.createElement('tbody');

        thead.innerHTML = `
            <tr>
                <th>Rank</th>
                <th>Sales Name</th>
                <th>Total Pelanggan</th>
            </tr>
        `;

        salesData.forEach((sales, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${index + 1}</td>
                <td>${sales.name}</td>
                <td>${sales.totalCustomers}</td>
            `;
            tbody.appendChild(tr);
        });

        table.appendChild(thead);
        table.appendChild(tbody);
        container.innerHTML = '';
        container.appendChild(table);
    }

    function renderAllSalesView() {
        const salesNames = Object.keys(salesPerformance);
        const salesData = salesNames.map(name => ({
            name: name,
            totalCustomers: salesPerformance[name].totalCustomers
        })).sort((a, b) => b.totalCustomers - a.totalCustomers);

        // --- Summary Cards ---
        const totalSales = salesData.length;
        const totalPelanggan = salesData.reduce((sum, sales) => sum + sales.totalCustomers, 0);
        const avgPerSales = totalSales > 0 ? (totalPelanggan / totalSales).toFixed(1) : 0;
        const topPerformer = totalSales > 0 ? salesData[0].name : '-';

        document.getElementById('summary-total-sales').textContent = totalSales;
        document.getElementById('summary-total-pelanggan').textContent = totalPelanggan;
        document.getElementById('summary-avg-per-sales').textContent = avgPerSales;
        document.getElementById('summary-top-performer').textContent = topPerformer;

        // --- Chart ---
        const chartLabels = salesData.map(s => s.name);
        const chartData = salesData.map(s => s.totalCustomers);

        const ctx = document.getElementById('allSalesChart').getContext('2d');
        if (allSalesChart) allSalesChart.destroy();

        const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim() || '#d9363e';
        const gradient = ctx.createLinearGradient(0, 0, 600, 0);
        gradient.addColorStop(0, primaryColor);
        gradient.addColorStop(1, '#ff7e5f');


        allSalesChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: chartLabels,
                datasets: [{
                    label: 'Jumlah Pelanggan',
                    data: chartData,
                    backgroundColor: gradient,
                    borderRadius: 4,
                    borderWidth: 0
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: '#fff',
                        titleColor: '#333',
                        bodyColor: '#666',
                        borderColor: '#ddd',
                        borderWidth: 1,
                        padding: 10,
                        callbacks: {
                            label: (context) => ` ${context.raw} Pelanggan`
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        grid: {
                            drawBorder: false,
                        },
                        ticks: {
                            font: {
                                family: "'Poppins', sans-serif"
                            }
                        }
                    },
                    y: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            font: {
                                family: "'Poppins', sans-serif"
                            }
                        }
                    }
                }
            }
        });

        // --- Leaderboard Table ---
        renderLeaderboardTable(salesData);
    }

    function getCurrentMonthColumnName() {
        const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
        const d = new Date();
        const month = months[d.getMonth()];
        const year = String(d.getFullYear()).slice(-2);
        return `Billing ${month} ${year}`;
    }

    function renderSingleSalesView(salesName) {
        const salesData = salesPerformance[salesName];
        if (!salesData) return;

        // 1. Update stat cards
        document.getElementById('total-pelanggan-sales').textContent = salesData.totalCustomers;

        const currentMonthColumn = getCurrentMonthColumnName();
        let paidCustomers = 0;
        let unpaidCustomers = 0;
        if (salesData.customers.length > 0 && salesData.customers[0].hasOwnProperty(currentMonthColumn)) {
            salesData.customers.forEach(customer => {
                const status = customer[currentMonthColumn]?.toLowerCase();
                if (status === 'paid') {
                    paidCustomers++;
                } else if (status === 'unpaid') {
                    unpaidCustomers++;
                }
            });
        }
        document.getElementById('paid-customers-sales').textContent = paidCustomers;
        document.getElementById('unpaid-customers-sales').textContent = unpaidCustomers;

        // 2. Process data for trend chart (monthly acquisitions)
        const monthlyAcquisitions = {};
        salesData.customers.forEach(customer => {
            if (customer.acquisitionDate) {
                const monthYear = `${customer.acquisitionDate.getMonth() + 1}/${customer.acquisitionDate.getFullYear()}`;
                monthlyAcquisitions[monthYear] = (monthlyAcquisitions[monthYear] || 0) + 1;
            }
        });

        const sortedMonths = Object.keys(monthlyAcquisitions).sort((a, b) => {
            const [m1, y1] = a.split('/');
            const [m2, y2] = b.split('/');
            return new Date(y1, m1 - 1) - new Date(y2, m2 - 1);
        });

        const chartLabels = sortedMonths;
        const chartData = sortedMonths.map(month => monthlyAcquisitions[month]);

        // 3. Render trend chart
        const ctx = document.getElementById('singleSalesChart').getContext('2d');
        if (singleSalesChart) singleSalesChart.destroy();

        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(40, 167, 69, 0.6)');
        gradient.addColorStop(1, 'rgba(40, 167, 69, 0)');

        singleSalesChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartLabels,
                datasets: [{
                    label: 'Akuisisi per Bulan',
                    data: chartData,
                    backgroundColor: gradient,
                    borderColor: '#28a745',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#28a745',
                    pointHoverRadius: 7,
                    pointRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            drawBorder: false
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    function updateView() {
        const selectedSales = salesFilter.value;
        if (selectedSales === 'all') {
            allSalesView.style.display = 'block';
            singleSalesView.style.display = 'none';
            renderAllSalesView();
        } else {
            allSalesView.style.display = 'none';
            singleSalesView.style.display = 'block';
            renderSingleSalesView(selectedSales);
        }
    }

    // --- START: Event Listeners ---
    salesFilter.addEventListener('change', updateView);

    // --- Initial Load ---
    async function init() {
        showSkeletonLoader();
        const success = await loadAndProcessSalesData();
        hideSkeletonLoader();
        if (success) {
            populateSalesFilter();
            updateView();
            document.dispatchEvent(new Event('page-rendered'));
        } else {
            // Optionally handle the error case, e.g., show an error message
            document.getElementById('all-sales-view').innerHTML = '<p>Failed to load report data.</p>';
            document.getElementById('all-sales-view').style.display = 'block';
        }
    }

    init();
});