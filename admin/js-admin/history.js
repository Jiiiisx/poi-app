document.addEventListener('DOMContentLoaded', function () {
    let allHistoryData = [];
    let filteredHistoryData = [];
    let currentPage = 1;
    const rowsPerPage = 15;

    const tableContainer = document.getElementById('history-table-container');
    const searchInput = document.getElementById('searchInput');
    const prevPageButton = document.getElementById('prevPage');
    const nextPageButton = document.getElementById('nextPage');
    const pageInfo = document.getElementById('pageInfo');

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