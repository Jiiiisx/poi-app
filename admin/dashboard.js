document.addEventListener('DOMContentLoaded', function () {
    // --- Data Fetching and Processing ---
    const salesDataRanges = {
        'Andi': 'AndiData', 'April': 'AprilData', 'Nandi': 'NandiData', 'Octa': 'OctaData',
        'Yandi': 'YandiData', 'Totong': 'TotongData', 'Yusdhi': 'YusdhiData', 'Nursyarif': 'NursyarifData',
        'Reynaldi': 'ReynaldiData', 'Andri': 'AndriData', 'Tri Susantohadi': 'TriSusantohadiData',
        'Dedi Kurniawan': 'DediKurniawanData', 'Muhammad Arifin': 'MuhammadArifinData', 'Fajar Sodik': 'FajarSodikData',
        'Ichrima': 'IchrimaData', 'Muhamad Ferdi Ridwan': 'MuhamadFerdiRidwanData', 'Suprihatin': 'SuprihatinData',
        'Fini Fadilah Handayani': 'FiniFadilahHandayaniData', 'Hinduntomy Wijaya': 'HinduntomyWijayaData'
    };

    async function loadMonitoringData() {
        try {
            const requestedRanges = Object.values(salesDataRanges);
            const ranges = requestedRanges.join(',');
            const response = await fetch(`/api/fetch-monitoring?ranges=${ranges}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            const unpaidData = processUnpaidData(data);
            renderUnpaidTrendChart(unpaidData);
        } catch (error) {
            console.error('Error fetching or processing monitoring data for chart:', error);
            const ctx = document.getElementById('unpaidTrendChart').getContext('2d');
            ctx.font = '16px Arial';
            ctx.fillStyle = '#888';
            ctx.textAlign = 'center';
            ctx.fillText('Gagal memuat data grafik.', ctx.canvas.width / 2, ctx.canvas.height / 2);
        }
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
        if (month === undefined || isNaN(year)) return null;
        return new Date(year + 2000, month);
    }

    function processUnpaidData(apiResponse) {
        const unpaidCountsByMonth = {};
        const allBillingHeaders = new Set();

        if (!apiResponse.valueRanges) {
            return { labels: [], data: [] };
        }

        // First, gather all data and headers
        const allRowsWithHeaders = [];
        apiResponse.valueRanges.forEach(valueRange => {
            if (valueRange.values && valueRange.values.length > 1) {
                const headers = valueRange.values[0];
                const rows = valueRange.values.slice(1);
                rows.forEach(row => {
                    if (row.some(cell => cell && cell.trim() !== '')) { // Ensure row is not empty
                        allRowsWithHeaders.push({ headers, row });
                    }
                });
                headers.forEach(h => {
                    if (h.toLowerCase().startsWith('billing')) {
                        allBillingHeaders.add(h);
                    }
                });
            }
        });

        // Sort headers chronologically
        const sortedBillingHeaders = [...allBillingHeaders].sort((a, b) => {
            const dateA = _parseHeaderDate(a);
            const dateB = _parseHeaderDate(b);
            if (!dateA) return 1;
            if (!dateB) return -1;
            return dateA - dateB;
        });

        // Calculate unpaid counts for each month
        sortedBillingHeaders.forEach(header => {
            let count = 0;
            allRowsWithHeaders.forEach(data => {
                const headerIndex = data.headers.indexOf(header);
                if (headerIndex !== -1) {
                    const status = (data.row[headerIndex] || '').toLowerCase().trim();
                    if (status === 'unpaid') {
                        count++;
                    }
                }
            });
            unpaidCountsByMonth[header] = count;
        });

        return {
            labels: sortedBillingHeaders.map(h => h.replace('Billing ', '')),
            data: sortedBillingHeaders.map(h => unpaidCountsByMonth[h])
        };
    }

    function renderUnpaidTrendChart(chartData) {
        const ctx = document.getElementById('unpaidTrendChart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: chartData.labels,
                datasets: [{
                    label: 'Jumlah Pelanggan Menunggak',
                    data: chartData.data,
                    backgroundColor: 'rgba(217, 54, 62, 0.6)',
                    borderColor: 'rgba(217, 54, 62, 1)',
                    borderWidth: 1,
                    borderRadius: 4,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return ` ${context.raw} Pelanggan`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            drawBorder: false,
                        },
                        ticks: {
                            stepSize: 10 // Adjust step size as needed
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

    // Initial load
    loadMonitoringData();
});