document.addEventListener('DOMContentLoaded', function () {
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

    // --- NEW: Load Analytics Data ---
    async function loadAnalyticsData() {
        try {
            console.log('Fetching analytics data...');
            const response = await fetch('/api/fetch-analytics');
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

        data.forEach(row => {
            if (row.Timestamp) {
                const rowDate = new Date(row.Timestamp);
                const day = rowDate.toISOString().split('T')[0];
                if (activitiesByDay.hasOwnProperty(day)) {
                    activitiesByDay[day]++;
                }
            }
        });

        renderChart(activitiesByDay, last7Days);
    }

    // --- MODIFIED: Render Chart ---
    function renderChart(activitiesByDay, labels) {
        const options = {
            chart: {
                type: 'area',
                height: 350,
                toolbar: { show: false },
                zoom: { enabled: false }
            },
            series: [{
                name: 'Page Views',
                data: labels.map(day => activitiesByDay[day] || 0)
            }],
            xaxis: {
                categories: labels,
                labels: { style: { colors: '#999' } }
            },
            yaxis: {
                labels: { style: { colors: '#999' } }
            },
            dataLabels: { enabled: false },
            stroke: { curve: 'smooth', width: 2 },
            fill: {
                type: 'gradient',
                gradient: { shadeIntensity: 1, opacityFrom: 0.7, opacityTo: 0.3, stops: [0, 90, 100] }
            },
            grid: { borderColor: '#444' },
            tooltip: { theme: 'dark' }
        };

        const chartEl = document.querySelector("#analytics-chart");
        chartEl.innerHTML = ''; // Clear previous chart
        const chart = new ApexCharts(chartEl, options);
        chart.render();
    }

    // --- Existing functions for history table (from original file) ---
    async function loadHistoryData() {
        try {
            const response = await fetch('/api/fetch-history');
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

            filterAndRenderTable();
        } catch (error) {
            console.error('Error fetching history data:', error);
            tableContainer.innerHTML = '<p>Failed to load history data. Please try again.</p>';
        }
    }

    function processAnalytics(data) {
        const activeUsersCount = document.getElementById('active-users-count');
        const totalActivitiesCount = document.getElementById('total-activities-count');

        if (!data || data.length === 0) {
            activeUsersCount.textContent = '0';
            totalActivitiesCount.textContent = '0';
            renderChart({});
            return;
        }

        // Calculate metrics
        const uniqueUsers = new Set(data.map(row => row.Email));
        const totalActivities = data.length;

        activeUsersCount.textContent = uniqueUsers.size;
        totalActivitiesCount.textContent = totalActivities;

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

        data.forEach(row => {
            const rowDate = new Date(row.Waktu.split('Z')[0]); // Handle timestamp format
            const day = rowDate.toISOString().split('T')[0];
            if (activitiesByDay.hasOwnProperty(day)) {
                activitiesByDay[day]++;
            }
        });

        renderChart(activitiesByDay, last7Days);
    }

    function renderChart(activitiesByDay, labels) {
        const options = {
            chart: {
                type: 'area',
                height: 350,
                toolbar: {
                    show: false
                },
                zoom: {
                    enabled: false
                }
            },
            series: [{
                name: 'Activities',
                data: labels.map(day => activitiesByDay[day])
            }],
            xaxis: {
                categories: labels,
                labels: {
                    style: {
                        colors: '#999'
                    }
                }
            },
            yaxis: {
                labels: {
                    style: {
                        colors: '#999'
                    }
                }
            },
            dataLabels: {
                enabled: false
            },
            stroke: {
                curve: 'smooth',
                width: 2
            },
            fill: {
                type: 'gradient',
                gradient: {
                    shadeIntensity: 1,
                    opacityFrom: 0.7,
                    opacityTo: 0.3,
                    stops: [0, 90, 100]
                }
            },
            grid: {
                borderColor: '#444'
            },
            tooltip: {
                theme: 'dark'
            }
        };

        const chart = new ApexCharts(document.querySelector("#analytics-chart"), options);
        chart.render();
    }

    function filterAndRenderTable() {
        const searchTerm = searchInput.value.toLowerCase();
        filteredHistoryData = allHistoryData.filter(row => 
            Object.values(row).some(cell => 
                cell && cell.toString().toLowerCase().includes(searchTerm)
            )
        );
        currentPage = 1;
        renderTable();
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
        table.className = 'customer-table'; // Reusing existing table style
        const thead = document.createElement('thead');
        const tbody = document.createElement('tbody');
        const headerRow = document.createElement('tr');

        const headers = Object.keys(paginatedData[0]);
        headers.forEach(headerText => {
            const th = document.createElement('th');
            th.textContent = headerText;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);

        paginatedData.forEach(item => {
            const tr = document.createElement('tr');
            headers.forEach(header => {
                const td = document.createElement('td');
                let cellData = item[header] || '';
                
                // Attempt to parse JSON in 'Details' column for better readability
                if (header.toLowerCase() === 'details' && typeof cellData === 'string' && cellData.startsWith('{')) {
                    try {
                        const parsedDetails = JSON.parse(cellData);
                        let formattedDetails = '';
                        if (item.Action === 'ADD_CUSTOMER' || item.Action === 'UPDATE_CUSTOMER') {
                            formattedDetails = 'Values: ' + parsedDetails.values.join(', ');
                        } else if (item.Action === 'DELETE_ROW') {
                            formattedDetails = `Row: ${parsedDetails.rowIndex}, Sheet: ${parsedDetails.sheetName}`;
                        } else {
                            formattedDetails = JSON.stringify(parsedDetails, null, 2);
                        }
                        cellData = formattedDetails;
                    } catch (e) {
                        // If parsing fails, just display the raw string
                    }
                }

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

    function setupEventListeners() {
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
    loadHistoryData();
    setupEventListeners();
});