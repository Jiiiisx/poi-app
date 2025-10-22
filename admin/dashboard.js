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

    let allData = [];
    let filteredData = [];
    let currentPage = 1;
    const rowsPerPage = 10;

    const tableContainer = document.getElementById('customer-table-container');
    const searchInput = document.getElementById('searchInput');
    const prevPageButton = document.getElementById('prevPage');
    const nextPageButton = document.getElementById('nextPage');
    const pageInfo = document.getElementById('pageInfo');
    const btnShowAll = document.getElementById('btnTableShowAll');
    const btnShowSchool = document.getElementById('btnTableShowSchool');
    const btnShowNonSchool = document.getElementById('btnTableShowNonSchool');

    async function loadCustomerData() {
        try {
            const response = await fetch('/api/customer-data');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            allData = data.values.slice(1); // Remove header row
            filteredData = allData;
            currentPage = 1;
            renderTable();
            updatePagination();
        } catch (error) {
            console.error('Error fetching customer data:', error);
            tableContainer.innerHTML = '<p>Error loading customer data. Please try again later.</p>';
        }
    }

    function renderTable() {
        const start = (currentPage - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        const paginatedData = filteredData.slice(start, end);

        if (paginatedData.length === 0) {
            tableContainer.innerHTML = '<p>No customer data found.</p>';
            return;
        }

        const table = document.createElement('table');
        table.className = 'customer-table';
        const thead = document.createElement('thead');
        const tbody = document.createElement('tbody');

        const headerRow = document.createElement('tr');
        const headers = ['ODP Terdekat', 'Nama', 'Alamat', 'No. Telepon', 'Nama Sales', 'Visit', 'Status', 'Keterangan', 'Gambar'];
        headers.forEach(headerText => {
            const th = document.createElement('th');
            th.textContent = headerText;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);

        paginatedData.forEach(rowData => {
            const tr = document.createElement('tr');
            for (let i = 0; i < headers.length; i++) {
                const td = document.createElement('td');
                const cellData = rowData[i] || '';

                if (i === 2) { // Alamat column
                    const a = document.createElement('a');
                    a.href = cellData;
                    a.textContent = 'View on Map';
                    a.target = '_blank';
                    a.className = 'action-btn btn-view-map';
                    td.appendChild(a);
                } else if (i === 6) { // Status column
                    const statusBadge = document.createElement('span');
                    statusBadge.className = 'status-badge';
                    if (cellData.toLowerCase().includes('sekolah')) {
                        statusBadge.classList.add('status-sekolah');
                    } else if (cellData.toLowerCase().includes('non-sekolah')) {
                        statusBadge.classList.add('status-non-sekolah');
                    } else {
                        statusBadge.classList.add('status-default');
                    }
                    statusBadge.textContent = cellData;
                    td.appendChild(statusBadge);
                } else if (i === 8) { // Gambar column
                    const imageUrl = rowData[rowData.length - 1];
                    if (imageUrl) {
                        const button = document.createElement('button');
                        button.textContent = 'View Image';
                        button.className = 'action-btn btn-view-image';
                        button.onclick = () => {
                            window.open(imageUrl, '_blank');
                        };
                        td.appendChild(button);
                    }
                } else {
                    td.textContent = cellData;
                }
                tr.appendChild(td);
            }
            tbody.appendChild(tr);
        });

        table.appendChild(thead);
        table.appendChild(tbody);
        tableContainer.innerHTML = '';
        tableContainer.appendChild(table);
    }

    function updatePagination() {
        const totalPages = Math.ceil(filteredData.length / rowsPerPage);
        pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
        prevPageButton.disabled = currentPage === 1;
        nextPageButton.disabled = currentPage === totalPages;
    }

    function filterData(searchTerm, filterType) {
        let data = allData;

        if (filterType === 'school') {
            data = data.filter(row => row[6] && row[6].toLowerCase().includes('sekolah'));
        } else if (filterType === 'non-school') {
            data = data.filter(row => !row[6] || !row[6].toLowerCase().includes('sekolah'));
        }

        if (searchTerm) {
            const lowercasedSearchTerm = searchTerm.toLowerCase();
            data = data.filter(row =>
                row.some(cell => cell && cell.toLowerCase().includes(lowercasedSearchTerm))
            );
        }

        filteredData = data;
        currentPage = 1;
        renderTable();
        updatePagination();
    }

    searchInput.addEventListener('input', () => {
        const filterType = document.querySelector('.filter-buttons .active').id.replace('btnTableShow', '').toLowerCase();
        filterData(searchInput.value, filterType);
    });

    btnShowAll.addEventListener('click', () => {
        setActiveFilter(btnShowAll);
        filterData(searchInput.value, 'all');
    });

    btnShowSchool.addEventListener('click', () => {
        setActiveFilter(btnShowSchool);
        filterData(searchInput.value, 'school');
    });

    btnShowNonSchool.addEventListener('click', () => {
        setActiveFilter(btnShowNonSchool);
        filterData(searchInput.value, 'non-school');
    });

    function setActiveFilter(activeButton) {
        [btnShowAll, btnShowSchool, btnShowNonSchool].forEach(button => {
            button.classList.remove('active');
        });
        activeButton.classList.add('active');
    }

    prevPageButton.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderTable();
            updatePagination();
        }
    });

    nextPageButton.addEventListener('click', () => {
        const totalPages = Math.ceil(filteredData.length / rowsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderTable();
            updatePagination();
        }
    });

    loadCustomerData();
});