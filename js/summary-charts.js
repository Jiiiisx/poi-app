
let totalCustomersChart, avgRedamanLossChart, billingStatusChart;

function createSummaryCharts(chartData) {
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      x: {
        display: false,
      },
      y: {
        display: false,
      },
    },
    elements: {
      point: {
        radius: 0,
      },
      line: {
        tension: 0.4,
        borderWidth: 2,
        borderColor: '#d47272',
      },
    },
  };

  if (totalCustomersChart) {
    totalCustomersChart.destroy();
  }
  const totalCustomersCtx = document.getElementById('totalCustomersChart').getContext('2d');
  totalCustomersChart = new Chart(totalCustomersCtx, {
    type: 'line',
    data: {
        labels: chartData.totalCustomers.labels,
        datasets: [{
            label: 'Total Pelanggan',
            data: chartData.totalCustomers.data,
            fill: false,
        }]
    },
    options: chartOptions,
  });

  if (avgRedamanLossChart) {
    avgRedamanLossChart.destroy();
  }
  const avgRedamanLossCtx = document.getElementById('avgRedamanLossChart').getContext('2d');
  avgRedamanLossChart = new Chart(avgRedamanLossCtx, {
    type: 'line',
    data: {
        labels: chartData.avgRedamanLoss.labels,
        datasets: [{
            label: 'Rata-rata Redaman Loss',
            data: chartData.avgRedamanLoss.data,
            fill: false,
        }]
    },
    options: chartOptions,
  });

  if (billingStatusChart) {
    billingStatusChart.destroy();
  }
  const billingStatusCtx = document.getElementById('billingStatusChart').getContext('2d');
  billingStatusChart = new Chart(billingStatusCtx, {
    type: 'pie',
    data: {
        labels: ['Paid', 'Unpaid', 'N/A'],
        datasets: [{
            label: 'Status Billing',
            data: [chartData.billingStatus.paid, chartData.billingStatus.unpaid, chartData.billingStatus.na],
            backgroundColor: [
                '#28a745',
                '#dc3545',
                '#6c757d'
            ],
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
            },
        },
    },
  });
}
