document.addEventListener('DOMContentLoaded', function () {
    const salesDataRanges = {
        'Andi': 'AndiData',
        'April': 'AprilData',
        'Nandi': 'NandiData',
        'Octa': 'OctaData',
        'Yandi': 'YandiData',
        'Totong': 'TotongData',
        'Yusdhi': 'YusdhiData',
        'Nursyarif': 'NursyarifData',
        'Reynaldi': 'ReynaldiData',
        'Andri': 'AndriData',
        'TRI SUSANTOHADI': 'TriSusantohadiData',
        'DEDI KURNIAWAN': 'DediKurniawanData',
        'MUHAMMAD ARIFIN': 'MuhammadArifinData',
        'FAJAR SODIK': 'FajarSodikData',
        'ICHRIMA': 'IchrimaData',
        'MUHAMAD  FERDI  RIDWAN': 'MuhamadFerdiRidwanData',
        'SUPRIHATIN': 'SuprihatinData',
        'FINI FADILAH HANDAYANI': 'FiniFadilahHandayaniData',
        'HINDUNTOMY WIJAYA': 'HinduntomyWijayaData'
    };

    let monitoringDataBySales = {};
    let monitoringDataHeadersBySales = {};
    let filteredData = [];
    let currentPage = 1;
    const rowsPerPage = 10;
    let selectedSales = 'Andi'; // Default to first sales person

    const tableContainer = document.getElementById('billing-table-container');
    const searchInput = document.getElementById('searchInput');
    const prevPageButton = document.getElementById('prevPage');
    const nextPageButton = document.getElementById('nextPage');
    const pageInfo = document.getElementById('pageInfo');
    const salesListElement = document.getElementById('sales-list');
    const selectedSalesElement = document.getElementById('selected-sales');
    const salesPerformanceSummaryElement = document.getElementById('sales-performance-summary');

    async function loadMonitoringData() {
        try {
            const ranges = Object.values(salesDataRanges).join(',');
            const response = await fetch(`/api/fetch-monitoring?ranges=${ranges}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            console.log('Raw monitoring data:', data);
            processMonitoringData(data);
            populateSalesList();
            filterBySales(selectedSales);
        } catch (error) {
            console.error('Error fetching monitoring data:', error);
            tableContainer.innerHTML = '<p>Error loading billing data. Please try again later.</p>';
        }
    }

    function processMonitoringData(data) {
        const rangeToSalesKey = {};
        for (const key in salesDataRanges) {
            rangeToSalesKey[salesDataRanges[key]] = key;
        }

        data.valueRanges.forEach(valueRange => {
            const salesName = rangeToSalesKey[valueRange.range.split('!')[0]];
            if (salesName && valueRange.values && valueRange.values.length > 1) {
                const headers = valueRange.values[0];
                const rows = valueRange.values.slice(1);
                monitoringDataHeadersBySales[salesName] = headers;
                monitoringDataBySales[salesName] = rows;
            }
        });
        console.log('Processed monitoring data:', monitoringDataBySales);
    }

    function populateSalesList() {
        salesListElement.innerHTML = '';
        for (const salesName in monitoringDataBySales) {
            const li = document.createElement('li');
            li.textContent = salesName;
            if (salesName === selectedSales) {
                li.classList.add('active');
            }
            li.addEventListener('click', () => {
                selectedSales = salesName;
                selectedSalesElement.textContent = salesName;
                filterBySales(salesName);
                document.querySelectorAll('#sales-list li').forEach(item => item.classList.remove('active'));
                li.classList.add('active');
            });
            salesListElement.appendChild(li);
        }
    }

    function filterBySales(salesName) {
        filteredData = monitoringDataBySales[salesName] || [];
        console.log('Filtered data for', salesName, filteredData);
        currentPage = 1;
        renderBillingTable();
        updatePagination();
        renderSalesSummary(salesName);
    }

    function renderSalesSummary(salesName) {
        const salesData = monitoringDataBySales[salesName] || [];
        const totalCustomers = salesData.length;

        salesPerformanceSummaryElement.innerHTML = `
            <div class="summary-card">
                <p>Total Pelanggan</p>
                <span>${totalCustomers}</span>
            </div>
        `;
    }

    function renderBillingTable() {
        const start = (currentPage - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        const paginatedData = filteredData.slice(start, end);

        if (paginatedData.length === 0) {
            tableContainer.innerHTML = '<p>No billing data found.</p>';
            return;
        }

        const table = document.createElement('table');
        table.className = 'customer-table';
        const thead = document.createElement('thead');
        const tbody = document.createElement('tbody');

        const headerRow = document.createElement('tr');
        const headers = monitoringDataHeadersBySales[selectedSales] || [];
        headers.forEach(headerText => {
            const th = document.createElement('th');
            th.textContent = headerText;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);

        paginatedData.forEach((rowData, rowIndex) => {
            const tr = document.createElement('tr');
            rowData.forEach((cellData, colIndex) => {
                const td = document.createElement('td');
                td.textContent = cellData || '';
                td.dataset.row = start + rowIndex;
                td.dataset.col = colIndex;
                if (headers[colIndex] && headers[colIndex].toLowerCase().startsWith('billing')) {
                    td.contentEditable = true;
                }
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });

        table.appendChild(thead);
        table.appendChild(tbody);
        tableContainer.innerHTML = '';
        tableContainer.appendChild(table);
    }

    function updatePagination() {
        const totalPages = Math.ceil(filteredData.length / rowsPerPage);
        pageInfo.textContent = `Page ${currentPage} of ${totalPages || 1}`;
        prevPageButton.disabled = currentPage === 1;
        nextPageButton.disabled = currentPage === totalPages;
    }

    tableContainer.addEventListener('blur', async (e) => {
        const td = e.target;
        if (td.tagName !== 'TD' || !td.contentEditable) return;

        const newValue = td.textContent;
        const rowIndex = parseInt(td.dataset.row, 10) + 2; // +2 for header and 1-based index
        const colIndex = parseInt(td.dataset.col, 10);
        const colLetter = String.fromCharCode('A'.charCodeAt(0) + colIndex);
        const sheetName = 'REKAP PS AR KALIABANG';
        const range = `'${sheetName}'!${colLetter}${rowIndex}`;

        td.style.backgroundColor = '#fdffab';

        try {
            const response = await fetch('/api/update-cell', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ range, value: newValue }),
            });

            if (!response.ok) {
                throw new Error('Failed to update sheet');
            }

            td.style.backgroundColor = '#d4edda';
            setTimeout(() => { td.style.backgroundColor = ''; }, 2000);

        } catch (error) {
            console.error('Error updating cell:', error);
            td.style.backgroundColor = '#f8d7da';
        }
    }, true);

    searchInput.addEventListener('input', () => {
        const searchTerm = searchInput.value.toLowerCase();
        let data = monitoringDataBySales[selectedSales] || [];
        if (searchTerm) {
            data = data.filter(row =>
                row.some(cell => cell && cell.toString().toLowerCase().includes(searchTerm))
            );
        }
        filteredData = data;
        currentPage = 1;
        renderBillingTable();
        updatePagination();
    });

    prevPageButton.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderBillingTable();
            updatePagination();
        }
    });

    nextPageButton.addEventListener('click', () => {
        const totalPages = Math.ceil(filteredData.length / rowsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderBillingTable();
            updatePagination();
        }
    });

    loadMonitoringData();
});
