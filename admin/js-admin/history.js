document.addEventListener('DOMContentLoaded', function () {
    // --- Helper function for authenticated API calls ---
    async function fetchWithAuth(url, options = {}) {
        const token = localStorage.getItem('adminToken');
        if (!token) {
            console.warn('No authentication token found. Redirecting to login.');
            window.location.href = 'login.html';
            return new Promise(() => {}); // Return a promise that never resolves to stop execution
        }
    
        const headers = {
            ...options.headers,
            'Authorization': `Bearer ${token}`
        };
    
        const response = await fetch(url, { ...options, headers });
    
        if (response.status === 401) {
            console.warn('Unauthorized (401) response from API. Redirecting to login.');
            window.location.href = 'login.html';
            throw new Error('Unauthorized');
        }
        return response;
    }

    // --- Existing variables for history table ---
    let allHistoryData = [];
    let filteredHistoryData = [];
    let currentPage = 1;
    const rowsPerPage = 15;

    const tableContainer = document.getElementById('history-table-container');
    const searchInput = document.getElementById('searchInput');
    const prevPageButton = document.getElementById('prevPage');
    const nextPageButton = document.getElementById('nextPage');
    const pageInfo = document.getElementById('pageInfo');

    // --- Skeleton Loader --- 
    const skeletonLoader = document.querySelector('.skeleton-loader');
    const analyticsSection = document.querySelector('.analytics-section');
    const tableContainerArea = document.querySelector('.table-container.content-area');

    function showSkeletonLoader() {
        let cardsHTML = '';
        for (let i = 0; i < 2; i++) { // 2 analytics cards
            cardsHTML += '<div class="skeleton-card-item"></div>';
        }
        skeletonLoader.querySelector('.skeleton-analytics-cards').innerHTML = cardsHTML;

        let tableRowsHTML = '';
        for (let i = 0; i < 15; i++) { // 15 rows for history table
            tableRowsHTML += '<div class="skeleton-row"></div>';
        }
        skeletonLoader.querySelector('.skeleton-table').innerHTML = tableRowsHTML;

        analyticsSection.style.display = 'none';
        tableContainerArea.style.display = 'none';
        skeletonLoader.style.display = 'block';
    }

    function hideSkeletonLoader() {
        skeletonLoader.style.display = 'none';
        analyticsSection.style.display = 'block';
        tableContainerArea.style.display = 'block';
    }

    // --- NEW: Load Analytics Data ---
    async function loadAnalyticsData() {
        try {
            console.log('Fetching analytics data...');
            const response = await fetchWithAuth('/backend?action=fetch-analytics');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            console.log('Received raw analytics data from API:', data);

            if (!data.values || data.values.length < 1) {
                console.log('No analytics data values found. Rendering empty dashboard.');
                processAnalytics([]);
                return;
            }
            const headers = data.values[0];
            const analyticsData = data.values.slice(1).map(row => {
                const rowAsObject = {};
                headers.forEach((header, index) => {
                    rowAsObject[header] = row[index] || '';
                });
                return rowAsObject;
            });
            console.log('Processed analytics data for dashboard:', analyticsData);
            processAnalytics(analyticsData);
        } catch (error) {
            console.error('Error fetching analytics data:', error);
            // Optionally update the UI to show an error for the analytics section
        }
    }

    // --- MODIFIED: Process Analytics Data ---
    function processAnalytics(data) {
        const pageViewsCountEl = document.getElementById('active-users-count');
        const uniquePagesCountEl = document.getElementById('total-activities-count');
        
        // Update card titles
        if (pageViewsCountEl && uniquePagesCountEl) {
            pageViewsCountEl.previousElementSibling.textContent = 'Total Page Views';
            uniquePagesCountEl.previousElementSibling.textContent = 'Unique Pages';

            if (!data || data.length === 0) {
                pageViewsCountEl.textContent = '0';
                uniquePagesCountEl.textContent = '0';
                renderChart({}, []);
                return;
            }

            // Calculate metrics
            const totalPageViews = data.length;
            const uniquePages = new Set(data.map(row => row.Page));

            pageViewsCountEl.textContent = totalPageViews;
            uniquePagesCountEl.textContent = uniquePages.size;
        }


        // Prepare data for the chart (activities per day for the last 7 days)
        const activitiesByDay = {};
        const today = new Date();
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            return d.toISOString().split('T')[0];
        }).reverse();

        last7Days.forEach(day => {
            activitiesByDay[day] = 0;
        });

        if (data) {
            data.forEach(row => {
                if (row.Timestamp) {
                    const rowDate = new Date(row.Timestamp);
                    const day = rowDate.toISOString().split('T')[0];
                    if (activitiesByDay.hasOwnProperty(day)) {
                        activitiesByDay[day]++;
                    }
                }
            });
        }

        renderChart(activitiesByDay, last7Days);
    }

    // --- MODIFIED: Render Chart ---
    function renderChart(activitiesByDay, labels) {
        const rootStyles = getComputedStyle(document.documentElement);
        const textColor = rootStyles.getPropertyValue('--text-secondary').trim() || '#777';
        const gridColor = rootStyles.getPropertyValue('--border-color').trim() || '#e0e0e0';
        const primaryColor = rootStyles.getPropertyValue('--primary-color').trim() || '#d9363e';

        const options = {
            chart: {
                type: 'area',
                height: 350,
                toolbar: { show: false },
                zoom: { enabled: false },
                background: 'transparent'
            },
            colors: [primaryColor],
            series: [{
                name: 'Page Views',
                data: labels.map(day => activitiesByDay[day] || 0)
            }],
            xaxis: {
                categories: labels,
                labels: {
                    style: {
                        colors: textColor
                    }
                },
                axisBorder: {
                    show: false
                },
                axisTicks: {
                    show: false
                }
            },
            yaxis: {
                labels: {
                    style: {
                        colors: textColor
                    }
                }
            },
            dataLabels: { enabled: false },
            stroke: { curve: 'smooth', width: 3 },
            fill: {
                type: 'gradient',
                gradient: {
                    shade: 'light',
                    type: "vertical",
                    shadeIntensity: 0.3,
                    gradientToColors: undefined,
                    inverseColors: false,
                    opacityFrom: 0.7,
                    opacityTo: 0.2,
                    stops: [0, 100]
                }
            },
            grid: {
                borderColor: gridColor,
                strokeDashArray: 4,
                position: 'back'
            },
            tooltip: {
                theme: 'light',
                style: {
                    fontSize: '12px',
                    fontFamily: rootStyles.getPropertyValue('--font-family').trim() || 'sans-serif'
                },
                x: {
                    format: 'dd MMM yyyy'
                }
            },
            legend: {
                show: false
            }
        };

        const chartEl = document.querySelector("#analytics-chart");
        if (chartEl) {
            chartEl.innerHTML = ''; // Clear previous chart
            const chart = new ApexCharts(chartEl, options);
            chart.render();
        }
    }

    // --- Existing functions for history table (from original file) ---
    async function loadHistoryData() {
        try {
            const response = await fetchWithAuth('/backend?action=fetch-history');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            if (!data.values || data.values.length < 1) {
                allHistoryData = [];
                return;
            }
            const headers = data.values[0];
            allHistoryData = data.values.slice(1).map(row => {
                const rowAsObject = {};
                headers.forEach((header, index) => {
                    rowAsObject[header] = row[index] || '';
                });
                return rowAsObject;
            }).reverse(); // Reverse to show newest first

            filterAndRenderTable(); // This function is now defined
        } catch (error) {
            console.error('Error fetching history data:', error);
            tableContainer.innerHTML = '<p>Failed to load history data. Please try again.</p>';
        }
    }

    function renderTable() {
        const start = (currentPage - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        const paginatedData = filteredHistoryData.slice(start, end);

        if (paginatedData.length === 0) {
            tableContainer.innerHTML = '<p>No history data found.</p>';
            updatePagination();
            return;
        }

        const table = document.createElement('table');
        table.className = 'customer-table'; // Reusing styles
        const thead = document.createElement('thead');
        const tbody = document.createElement('tbody');

        // Create headers
        const headerRow = document.createElement('tr');
        if (paginatedData.length > 0) {
            const headers = Object.keys(paginatedData[0]);
            headers.forEach(h => {
                const th = document.createElement('th');
                th.textContent = h;
                headerRow.appendChild(th);
            });
        }
        thead.appendChild(headerRow);

        // Create rows
        paginatedData.forEach(item => {
            const tr = document.createElement('tr');
            Object.values(item).forEach(cellData => {
                const td = document.createElement('td');
                td.textContent = cellData;
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

    function updatePagination() {
        const totalPages = Math.ceil(filteredHistoryData.length / rowsPerPage);
        pageInfo.textContent = `Page ${currentPage} of ${totalPages || 1}`;
        prevPageButton.disabled = currentPage === 1;
        nextPageButton.disabled = currentPage === totalPages || totalPages === 0;
    }

    function filterAndRenderTable() {
        const searchTerm = searchInput.value.toLowerCase();
        
        if (searchTerm) {
            filteredHistoryData = allHistoryData.filter(row => 
                Object.values(row).some(cell => 
                    cell && cell.toString().toLowerCase().includes(searchTerm)
                )
            );
        } else {
            filteredHistoryData = [...allHistoryData];
        }

        currentPage = 1;
        renderTable();
    }

    function setupEventListeners() {
        const menuToggle = document.getElementById('menu-toggle');
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.querySelector('.overlay');

        if (menuToggle && sidebar && overlay) {
            menuToggle.addEventListener('click', () => {
                sidebar.classList.toggle('active');
                overlay.style.display = sidebar.classList.contains('active') ? 'block' : 'none';
            });

            overlay.addEventListener('click', () => {
                sidebar.classList.remove('active');
                overlay.style.display = 'none';
            });
        }

        searchInput.addEventListener('input', filterAndRenderTable);

        prevPageButton.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderTable();
            }
        });

        nextPageButton.addEventListener('click', () => {
            const totalPages = Math.ceil(filteredHistoryData.length / rowsPerPage);
            if (currentPage < totalPages) {
                currentPage++;
                renderTable();
            }
        });
    }

    // Initial Load
    async function init() {
        showSkeletonLoader();
        await Promise.all([loadAnalyticsData(), loadHistoryData()]);
        hideSkeletonLoader();
        setupEventListeners();
        document.dispatchEvent(new Event('page-rendered'));
    }

    init();
});
