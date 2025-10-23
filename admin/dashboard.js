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
    const sheetName = 'REKAP CALON PELANGGAN BY SPARTA';

    const tableContainer = document.getElementById('customer-table-container');
    const searchInput = document.getElementById('searchInput');
    const prevPageButton = document.getElementById('prevPage');
    const nextPageButton = document.getElementById('nextPage');
    const pageInfo = document.getElementById('pageInfo');
    const btnShowAll = document.getElementById('btnTableShowAll');
    const btnShowSchool = document.getElementById('btnTableShowSchool');
    const btnShowNonSchool = document.getElementById('btnTableShowNonSchool');

    const schoolKeywords = [
        'SEKOLAH', 'SCHOOL', 'SMA', 'SMK', 'SMP', 'SMPIT', 'SMIT', 'SDN', 'MI', 'MTS', 'MA', 'MAK',
        'UNIVERSITAS', 'UNIV', 'INSTITUT', 'INST', 'POLITEKNIK', 'POLTEK', 'STIKES',
        'STAI', 'IAKN', 'SD', 'TK', 'PAUD', 'KB', 'RA',
        'PESANTREN', 'PONDOK PESANTREN', 'PONPES', 'MADRASAH',
        'SEKOLAH DASAR', 'SEKOLAH MENENGAH', 'SEKOLAH TINGGI', 'AKADEMI',
        'ISLAMIC', 'PENDIDIKAN', 'PELATIHAN', 'BIMBINGAN', 'KURSUS', 'LES', 'PUSAT BELAJAR',
        'PLAYGROUP', 'KAMPUS', 'FAKULTAS', 'JURUSAN', 'PRODI', 'DIKLAT',
        'TPQ', 'TPA', 'ASRAMA', 'BOARDING', 'SEMINAR', 'TRAINING',
        'BIMBEL', 'BIMBINGAN BELAJAR', 'LKP', 'LEMBAGA KURSUS DAN PELATIHAN', 'PKBM', 'PUSAT KEGIATAN BELAJAR MASYARAKAT',
        'PERGURUAN TINGGI', 'PTN', 'PTS', 'NEGERI', 'SWASTA', 'INTERNATIONAL', 'GLOBAL', 'NASIONAL',
        'YAYASAN PENDIDIKAN', 'YAYASAN ISLAM', 'YAYASAN KRISTEN', 'YAYASAN KATOLIK', 'YAYASAN BUDDHA', 'YAYASAN HINDU',
        'KEMENTERIAN PENDIDIKAN', 'DINAS PENDIDIKAN', 'KANTOR PENDIDIKAN', 'BALAI PENDIDIKAN',
        'SEKOLAH TINGGI ILMU', 'SEKOLAH TINGGI AGAMA', 'SEKOLAH TINGGI KESEHATAN', 'SEKOLAH TINGGI EKONOMI',
        'POLITEKNIK KESEHATAN', 'POLITEKNIK NEGERI', 'POLITEKNIK SWASTA',
        'UNIVERSITAS TERBUKA', 'UT', 'UNIVERSITAS ISLAM', 'UNIVERSITAS KRISTEN', 'UNIVERSITAS KATOLIK',
        'UNIVERSITAS BUDDHA', 'UNIVERSITAS HINDU', 'UNIVERSITAS NEGERI', 'UNIVERSITAS SWASTA', 'RAUDHATUL',
        'INSTITUT AGAMA ISLAM', 'INSTITUT TEKNOLOGI', 'INSTITUT SENI', 'ROUDHOTUL', 'GLORIA 2', 'YAYASAN', 'SDIT', 'KINDERGROW', 'SLB', 'KELOMPOK BERMAIN', 'BERKLEE AZRA' ,
        'EDUCATION', 'LEARNING', 'ACADEMI', 'FITSTEP', 'TAHFIDZ', 'DRIVING', 'THERESIA', 'BIMBA', 'ROBOTICS'
    ];

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

        paginatedData.forEach((rowData, rowIndex) => {
            const tr = document.createElement('tr');
            for (let i = 0; i < headers.length; i++) {
                const td = document.createElement('td');
                const cellData = rowData[i] || '';
                td.dataset.row = start + rowIndex;
                td.dataset.col = i;

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
                    td.contentEditable = true;
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
                    td.contentEditable = true;
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

    async function handleCellUpdate(e) {
        const td = e.target;
        if (td.tagName !== 'TD' || !td.contentEditable) return;

        const newValue = td.textContent;
        const rowIndex = parseInt(td.dataset.row, 10) + 2; // +2 because sheets are 1-based and we have a header
        const colIndex = parseInt(td.dataset.col, 10);
        const colLetter = String.fromCharCode('A'.charCodeAt(0) + colIndex);
        const range = `'${sheetName}'!${colLetter}${rowIndex}`;

        td.style.backgroundColor = '#fdffab'; // Yellow background while saving

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

            td.style.backgroundColor = '#d4edda'; // Green background on success
            setTimeout(() => { td.style.backgroundColor = ''; }, 2000);

        } catch (error) {
            console.error('Error updating cell:', error);
            td.style.backgroundColor = '#f8d7da'; // Red background on error
        }
    }

    tableContainer.addEventListener('blur', handleCellUpdate, true);

    function updatePagination() {
        const totalPages = Math.ceil(filteredData.length / rowsPerPage);
        pageInfo.textContent = `Page ${currentPage} of ${totalPages || 1}`;
        prevPageButton.disabled = currentPage === 1;
        nextPageButton.disabled = currentPage === totalPages;
    }

    function isSchool(name) {
        if (!name) {
            return false;
        }
        const cleanedName = name.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, " ").replace(/\s{2,}/g, " ");
        if (cleanedName.includes('.com')) {
            return false;
        }
        return schoolKeywords.some(keyword => {
            const lowerCaseKeyword = keyword.toLowerCase();
            const regex = new RegExp('\\b' + lowerCaseKeyword + '\\b', 'i');
            return regex.test(cleanedName);
        });
    }

    function filterData(searchTerm, filterType) {
        let data = allData;

        if (filterType === 'school') {
            data = data.filter(row => isSchool(row[1]));
        } else if (filterType === 'non-school') {
            data = data.filter(row => !isSchool(row[1]));
        }

        if (searchTerm) {
            const lowercasedSearchTerm = searchTerm.toLowerCase();
            data = data.filter(row =>
                row.some(cell => cell && cell.toString().toLowerCase().includes(lowercasedSearchTerm))
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
        'Tri Susantohadi': 'TriSusantohadiData',
        'Dedi Kurniawan': 'DediKurniawanData',
        'Muhammad Arifin': 'MuhammadArifinData',
        'Fajar Sodik': 'FajarSodikData',
        'Ichrima': 'IchrimaData',
        'Muhamad Ferdi Ridwan': 'MuhamadFerdiRidwanData',
        'Suprihatin': 'SuprihatinData',
        'Fini Fadilah Handayani': 'FiniFadilahHandayaniData',
        'Hinduntomy Wijaya': 'HinduntomyWijayaData'
    };

    async function loadBillingData() {
        try {
            const requestedRanges = Object.values(salesDataRanges);
            const ranges = requestedRanges.join(',');
            const response = await fetch(`/api/fetch-monitoring?ranges=${ranges}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            processAndCalculateBillingData(data);
        } catch (error) {
            console.error('Error fetching billing data for stats cards:', error);
        }
    }

    function processAndCalculateBillingData(data) {
        const customerMap = new Map();
        let currentMonthHeader = '';

        if (data.valueRanges && data.valueRanges.length > 0 && data.valueRanges[0].values) {
            const firstHeaders = data.valueRanges[0].values[0] || [];
            const date = new Date();
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
            const monthName = months[date.getMonth()];
            const year = date.getFullYear().toString().slice(-2);
            currentMonthHeader = `Billing ${monthName} ${year}`;
        }

        if (!currentMonthHeader) {
            console.error("Could not determine current month's billing column.");
            return;
        }

        data.valueRanges.forEach(valueRange => {
            if (!valueRange.values || valueRange.values.length < 2) return;

            const headers = valueRange.values[0];
            const nameIndex = headers.findIndex(h => h.toLowerCase() === 'nama pelanggan');
            const noInternetIndex = headers.findIndex(h => h.toLowerCase() === 'nomor internet');
            const billingIndex = headers.findIndex(h => h.toLowerCase() === currentMonthHeader.toLowerCase());

            if (nameIndex === -1 || noInternetIndex === -1) return;

            const rows = valueRange.values.slice(1);
            rows.forEach(row => {
                const customerId = row[noInternetIndex] || row[nameIndex];
                if (customerId && customerId.trim() !== '' && !customerMap.has(customerId)) {
                    const status = billingIndex !== -1 ? (row[billingIndex] || '').toLowerCase().trim() : '';
                    customerMap.set(customerId, { status: status });
                }
            });
        });

        const totalPelanggan = customerMap.size;
        let paidThisMonth = 0;
        let unpaidThisMonth = 0;

        for (const customer of customerMap.values()) {
            if (customer.status === 'paid') {
                paidThisMonth++;
            } else if (customer.status === 'unpaid') {
                unpaidThisMonth++;
            }
        }

        const totalBilled = paidThisMonth + unpaidThisMonth;
        const closingRate = totalBilled > 0 ? Math.round((paidThisMonth / totalBilled) * 100) : 0;

        updateStatsCards({
            totalPelanggan,
            paidThisMonth,
            unpaidThisMonth,
            closingRate
        });
    }

    function updateStatsCards(stats) {
        const cards = document.querySelector('.stats-cards');
        cards.children[0].querySelector('span').textContent = stats.totalPelanggan.toLocaleString('id-ID');
        cards.children[1].querySelector('span').textContent = stats.paidThisMonth.toLocaleString('id-ID');
        cards.children[2].querySelector('span').textContent = stats.unpaidThisMonth.toLocaleString('id-ID');
        cards.children[3].querySelector('span').textContent = `${stats.closingRate}%`;
    }

    loadBillingData();
});
