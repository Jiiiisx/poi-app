document.addEventListener('DOMContentLoaded', function () {
    const ctx = document.getElementById('salesChart').getContext('2d');

    // Gradient fill
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(217, 54, 62, 0.2)');
    gradient.addColorStop(1, 'rgba(217, 54, 62, 0)');

    const salesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Performa Sales',
                data: [750, 800, 780, 900, 850, 1050, 1100],
                borderColor: '#d9363e',
                backgroundColor: gradient,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#d9363e',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: '#d9363e',
                borderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
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
                    beginAtZero: false,
                    grid: {
                        drawBorder: false,
                    },
                    ticks: {
                        stepSize: 250
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

    // Existing code for loading customer data can go here
    // For example:
    // loadCustomerData(); 
});
