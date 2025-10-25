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

            // filterAndRenderTable(); // This function is not defined
        } catch (error) {
            console.error('Error fetching history data:', error);
            tableContainer.innerHTML = '<p>Failed to load history data. Please try again.</p>';
        }
    }

    // Initial Load
    loadAnalyticsData();
    loadHistoryData();
    // setupEventListeners(); // This function is not defined
});