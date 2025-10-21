// Helper function to wait for googleSheetsCRUD to be defined
async function waitForGoogleSheetsCRUD(timeout = 5000) {
    const startTime = Date.now();
    while (!window.googleSheetsCRUD && Date.now() - startTime < timeout) {
        await new Promise(resolve => setTimeout(resolve, 100)); // wait 100ms
    }
    if (!window.googleSheetsCRUD) {
        console.error("GoogleSheetsCRUD did not become available in time.");
        throw new Error("GoogleSheetsCRUD did not become available in time.");
    }
}

class GoogleSheetsIntegration {
    constructor() {
        this.spreadsheetId = '15Yu8_PcUFvrQFIL3qy7TfvDJNg4XPSbqPJOU6Wh8Q1A';

        this.data = [];
        this.originalData = [];
        this.governmentData = []; 
        this.originalGovernmentData = [];
        this.filteredGovernmentData = []; 
        this.monitoringData = [];
        this.originalMonitoringData = [];

        this.isInitialized = false;
        this.retryCount = 0;
        this.maxRetries = 3;
        this.currentPage = 1;
        this.itemsPerPage = window.innerWidth <= 768 ? 10 : 25;
        this.totalPages = 1;

        this.currentSchoolFilter = 'all';
        this.currentSalesFilter = 'All';
        this.currentDataView = 'customer'; 
        this.currentTeam = 'telda';
        this.nonTeldaSales = [
            'Tri Susantohadi',
            'Muhamad Ferdi Ridwan',
            'Dedi Kurniawan',
            'Muhammad Arifin',
            'Fajar Sodik',
            'Suprihatin',
            'Fini Fadilah Handayani',
            'Hinduntomy Wijaya',
            'Ichrima'
        ];

        this.currentBillingFilter = 'all'; 

        this.governmentItemsPerPage = window.innerWidth <= 768 ? 10 : 25;
        this.governmentCurrentPage = 1;
        this.governmentTotalPages = 1;

        this.filterBySales = this.filterBySales.bind(this);
        this.applyCombinedFilters = this.applyCombinedFilters.bind(this);
        this.handleMonthFilterChange = this.handleMonthFilterChange.bind(this);

        window.addEventListener('resize', () => {
            this.itemsPerPage = window.innerWidth <= 768 ? 10 : 25;
            this.renderTable();
            this.renderPaginationControls();
        });

        this.selectedBillingMonth = 'all';

        // Pagination and view state for monitoring table
        this.monitoringCurrentPage = 1;
        this.monitoringItemsPerPage = 10;
        this.monitoringTotalPages = 1;
        this.monitoringView = 'card';
        this.monitoringSearchQuery = '';

        this.salesDataRanges = {
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
    }

    formatWhatsappNumber(phone) {
        if (!phone || typeof phone !== 'string') {
            return '';
        }
        // Remove non-numeric characters
        let cleaned = phone.replace(/[^0-9]/g, '');
        // Replace leading 0 with 62 for Indonesian numbers
        if (cleaned.startsWith('0')) {
            cleaned = '62' + cleaned.substring(1);
        }
        return cleaned;
    }

    // Caching helper functions
    setCachedData(key, data) {
        try {
            const cacheEntry = {
                timestamp: Date.now(),
                data: data
            };
            localStorage.setItem(key, JSON.stringify(cacheEntry));
        } catch (e) {
            console.warn("Could not write to localStorage:", e);
        }
    }

    getCachedData(key, ttl = 5 * 60 * 1000) { 
        try {
            const cacheEntry = localStorage.getItem(key);
            if (!cacheEntry) return null;

            const { timestamp, data } = JSON.parse(cacheEntry);
            if (Date.now() - timestamp > ttl) {
                console.log(`Cache for ${key} is stale.`);
                localStorage.removeItem(key);
                return null;
            }

            console.log(`Using cached data for ${key}.`);
            return data;
        } catch (e) {
            console.warn("Could not read from localStorage:", e);
            return null;
        }
    }

    async setup() {
        try {
            this.setupUIElements();
            await this.loadData();
            await this.loadMonitoringData();
            await this.loadGovernmentData();
            
            if (window.schoolDataFilter) {
                window.schoolDataFilter.filterData();
            }
            this.updateStats();
            this.updateUIVisibility();

        } catch (error) {
            this.handleLoadError(error);
            this.showError('Gagal menginisialisasi: ' + error.message);
        }
    }



    setupUIElements() {
        if (!document.getElementById('customerTable')) {
            console.error('Customer table not found');
            return false;
        }
        this.createLoadingIndicator();
        this.createErrorDisplay();

        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('keyup', (e) => {
                this.currentSearchQuery = e.target.value;
                this.currentPage = 1;
                this.applyCombinedFilters();
            });
        }

        const govEditForm = document.getElementById('gov-edit-form');
        if (govEditForm) {
            govEditForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveGovernmentEdit();
            });
        }

        const teamTeldaRadio = document.getElementById('teamTelda');
        if (teamTeldaRadio) {
            teamTeldaRadio.addEventListener('change', () => this.handleTeamChange('telda'));
        }

        const teamNonTeldaRadio = document.getElementById('teamNonTelda');
        if (teamNonTeldaRadio) {
            teamNonTeldaRadio.addEventListener('change', () => this.handleTeamChange('non-telda'));
        }

        const btnBillingAll = document.getElementById('btnBillingAll');
        if (btnBillingAll) {
            btnBillingAll.addEventListener('click', () => this.setBillingFilter('all'));
        }

        const btnBillingPaid = document.getElementById('btnBillingPaid');
        if (btnBillingPaid) {
            btnBillingPaid.addEventListener('click', () => this.setBillingFilter('paid'));
        }

        const btnBillingUnpaid = document.getElementById('btnBillingUnpaid');
        if (btnBillingUnpaid) {
            btnBillingUnpaid.addEventListener('click', () => this.setBillingFilter('unpaid'));
        }

        const btnBillingPraNPC = document.getElementById('btnBillingPraNPC');
        if (btnBillingPraNPC) {
            btnBillingPraNPC.addEventListener('click', () => this.setBillingFilter('pra npc'));
        }

        const btnBillingCT0 = document.getElementById('btnBillingCT0');
        if (btnBillingCT0) {
            btnBillingCT0.addEventListener('click', () => this.setBillingFilter('ct0'));
        }

        const monitoringSearchInput = document.getElementById('monitoringSearchInput');
        if (monitoringSearchInput) {
            monitoringSearchInput.addEventListener('input', (e) => {
                this.monitoringSearchQuery = e.target.value;
                this.monitoringCurrentPage = 1;
                this.renderMonitoringView();
            });
        }

        const viewToggleCard = document.getElementById('viewToggleCard');
        if (viewToggleCard) {
            viewToggleCard.addEventListener('click', () => this.setMonitoringView('card'));
        }

        const viewToggleTable = document.getElementById('viewToggleTable');
        if (viewToggleTable) {
            viewToggleTable.addEventListener('click', () => this.setMonitoringView('table'));
        }

        return true;
    }

    createLoadingIndicator() {
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'loadingIndicator';
        loadingDiv.innerHTML = `<div style="text-align: center; padding: 40px;"><div class="spinner"></div><p>Memuat data...</p></div>`;
        const tbody = document.querySelector('#customerTable tbody');
        if (tbody) {
            tbody.innerHTML = '';
            tbody.appendChild(loadingDiv);
        }
    }

    createErrorDisplay() {
        const errorDiv = document.createElement('div');
        errorDiv.id = 'errorDisplay';
        errorDiv.style.display = 'none';
        errorDiv.className = 'error-message';
        document.body.appendChild(errorDiv);
    }

    async loadData() {
        const cacheKey = 'mainData';
        const cachedData = this.getCachedData(cacheKey);

        if (cachedData) {
            this.processData(cachedData);
            if (this.loggedInSalesName) {
                this.filterBySales(this.loggedInSalesName);
            }
            this.isInitialized = true;
            return;
        }

        try {
            this.showLoading(true);
            console.log('Loading main data from backend...');
            const response = await fetch('/api/customer-data');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            if (!data.values || data.values.length === 0) {
                console.warn('No data found in main sheet from backend');
                this.showWarning('Tidak ada data di sheet utama');
                this.loadFallbackData();
                return;
            }

            this.setCachedData(cacheKey, data.values);
            this.processData(data.values);

            if (this.loggedInSalesName) {
                this.filterBySales(this.loggedInSalesName);
            }

            this.isInitialized = true;
        } catch (error) {
            console.error('❌ Load main data error:', error);
            this.handleLoadError(error);
        } finally {
            this.showLoading(false);
        }
    }

    async loadMonitoringData() {
        const cacheKey = 'monitoringData';
        const cachedData = this.getCachedData(cacheKey);

        if (cachedData) {
            this.processMonitoringData(cachedData);
            if (this.loggedInSalesName) {
                this.filterBySales(this.loggedInSalesName);
            }
            return;
        }

        try {
            this.showLoading(true);
            console.log('🔄 Loading monitoring data from backend...');
            
            const namedRanges = Object.values(this.salesDataRanges).filter(range => range !== '');

            const response = await fetch('/api/monitoring-data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ranges: namedRanges }),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            if (!data.valueRanges || data.valueRanges.length === 0) {
                console.warn('⚠️ No monitoring data found from backend');
                this.showWarning('Data monitoring tidak ditemukan');
                return;
            }

            this.setCachedData(cacheKey, data);
            this.processMonitoringData(data);

            if (this.loggedInSalesName) {
                this.filterBySales(this.loggedInSalesName);
            }

        } catch (error) {
            console.error('❌ Load monitoring data error:', error);
            this.showError('Gagal memuat data monitoring: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }
    
    processMonitoringData(data) {
        console.log(JSON.stringify(data, null, 2));
        this.monitoringDataBySales = {};
        this.monitoringDataHeadersBySales = {};

        data.valueRanges.forEach(valueRange => {
            const fullRange = valueRange.range.replace(/'/g, "");
            const salesName = Object.keys(this.salesDataRanges).find(key => this.salesDataRanges[key].replace(/\'/g, "") === fullRange);
            
            if (salesName && valueRange.values && valueRange.values.length > 1) {
                const rawData = valueRange.values;
                const headers = rawData[0].map(cell => cell.toString().trim());

                const rangeAddress = fullRange.split('!')[1];
                const startRow = parseInt(rangeAddress.match(/(\d+)/)[0]);
                
                const nameIndex = headers.findIndex(h => h.toLowerCase() === 'nama pelanggan');
                const noCustomerIndex = headers.findIndex(h => h.toLowerCase() === 'no customer');
                const noInternetIndex = headers.findIndex(h => h.toLowerCase() === 'nomor internet');
                const redamanIndex = headers.findIndex(h => h.toLowerCase() === 'redaman loss');
                const fupIndex = headers.findIndex(h => h.toLowerCase() === 'fup');
                const historiIndex = headers.findIndex(h => h.toLowerCase() === 'histori gangguan');
                const tglBayarIndex = headers.findIndex(h => h.toLowerCase() === 'tanggal pembayaran');

                const tableRows = rawData.slice(1).filter(row => row[nameIndex] && row[nameIndex].trim() !== '').map((row, index) => {
                    const originalRowIndex = startRow + index + 1;
                    const rowData = { originalRowIndex };

                    if (nameIndex !== -1) rowData['Nama Pelanggan'] = this.sanitizeValue(row[nameIndex] || '');
                    if (noCustomerIndex !== -1) rowData['No Customer'] = this.sanitizeValue(row[noCustomerIndex] || '');
                    if (noInternetIndex !== -1) rowData['No Internet'] = this.sanitizeValue(row[noInternetIndex] || '');
                    if (redamanIndex !== -1) rowData['Redaman Loss'] = this.sanitizeValue(row[redamanIndex] || '');
                    if (fupIndex !== -1) rowData['FUP'] = this.sanitizeValue(row[fupIndex] || '');
                    if (historiIndex !== -1) rowData['Histori Gangguan'] = this.sanitizeValue(row[historiIndex] || '');
                    if (tglBayarIndex !== -1) rowData['Tanggal Pembayaran'] = this.sanitizeValue(row[tglBayarIndex] || '');

                    headers.forEach((header, idx) => {
                        if (header.toLowerCase().startsWith('billing')) {
                            rowData[header] = this.sanitizeValue(row[idx] || '');
                        }
                    });

                    return rowData;
                });

                this.monitoringDataBySales[salesName.toLowerCase()] = tableRows;
                this.monitoringDataHeadersBySales[salesName.toLowerCase()] = headers;
            }
        });

        console.log('✅ Processed monitoring data by sales:', Object.keys(this.monitoringDataBySales));
    }

    async loadGovernmentData() {
        const cacheKey = 'governmentData';
        const cachedData = this.getCachedData(cacheKey);

        if (cachedData) {
            this.processGovernmentData(cachedData);
            return;
        }

        try {
            this.showLoading(true);
            console.log('🔄 Loading government data from backend...');
            const response = await fetch('/api/government-data');

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            if (!data.values || data.values.length === 0) {
                console.warn('⚠️ No data found in government sheet from backend');
                this.showWarning('Tidak ada data di sheet pemerintah');
                this.originalGovernmentData = [];
                this.governmentData = [];
                return;
            }
            
            this.setCachedData(cacheKey, data.values);
            this.processGovernmentData(data.values);

        } catch (error) {
            console.error('❌ Load government data error:', error);
            this.showError('Gagal memuat data pemerintah: ' + error.message);
            this.originalGovernmentData = [];
            this.governmentData = [];
        } finally {
            this.showLoading(false);
        }
    }

    processGovernmentData(values) {
        this.originalGovernmentData = values.slice(1).map((row, index) => {
            const getVal = (arr, idx) => this.sanitizeValue(arr[idx] || '');
            return {
                id: index + 1,
                nama_koperasi: getVal(row, 0),
                alamat: getVal(row, 1),
                kabupaten_kota: getVal(row, 2),
                kecamatan: getVal(row, 3),
                desa: getVal(row, 4),
                latitude: getVal(row, 5),
                longitude: getVal(row, 6),
                sales: getVal(row, 7),
                keterangan: getVal(row, 8)
            };
        });
        this.governmentData = [...this.originalGovernmentData];
        console.log('✅ Processed government data:', this.governmentData.length, 'rows');
    }

    processData(rawData) {
        this.originalData = rawData.slice(1).map((row, index) => {
            const getVal = (arr, idx) => this.sanitizeValue(arr[idx] || '');
            let tanggalDitambahkanStr = getVal(row, 8);
            let tanggalDitambahkan = null;
            if (tanggalDitambahkanStr) {
                tanggalDitambahkan = new Date(tanggalDitambahkanStr);
                if (isNaN(tanggalDitambahkan.getTime())) {
                    tanggalDitambahkan = null;
                }
            }
            const extractedImageUrl = getVal(row, 9);
            return {
                id: index + 1,
                odp_terdekat: getVal(row, 0),
                nama: getVal(row, 1),
                alamat: getVal(row, 2),
                no_telepon: getVal(row, 3),
                nama_sales: getVal(row, 4),
                visit: getVal(row, 5),
                status: getVal(row, 6),
                keterangan_tambahan: getVal(row, 7),
                tanggal_ditambahkan: tanggalDitambahkan,
                image_url: extractedImageUrl
            };
        }).filter(row => row.nama || row.no_telepon);

        console.log('✅ Processed main data:', this.originalData.length, 'valid rows');
        this.renderTable();
        this.updateSalesList();
        this.updateSalesDropdown();
    }

    columnIndexToLetter(index) {
        let temp, letter = '';
        while (index >= 0) {
            temp = index % 26;
            letter = String.fromCharCode(temp + 65) + letter;
            index = Math.floor(index / 26) - 1;
        }
        return letter;
    }

    async updateSheetCell(rowIndex, colHeader, newValue) {
        try {
            if (newValue === undefined || newValue === null) {
                console.error('❌ updateSheetCell called with undefined or null newValue:', newValue);
                this.showError('Gagal memperbarui status: nilai status tidak valid.');
                return;
            }

            const salesName = this.currentSalesFilter.toLowerCase();
            const headers = this.monitoringDataHeadersBySales[salesName];
            if (!headers) {
                console.error(`❌ Headers for sales '${salesName}' not found.`);
                this.showError('Gagal memperbarui: Headers tidak ditemukan.');
                return;
            }

            const colIndex = headers.indexOf(colHeader);
            if (colIndex === -1) {
                console.error(`❌ Header kolom '${colHeader}' tidak ditemukan.`);
                this.showError(`Gagal memperbarui status: Header kolom '${colHeader}' tidak ditemukan.`);
                return;
            }

            const colLetter = this.columnIndexToLetter(colIndex);
            const range = `'REKAP PS AR KALIABANG'!${colLetter}${rowIndex}`;

            const response = await fetch('/api/update-cell', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ range, value: newValue }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP ${response.status}`);
            }

            // Update local data
            const data = this.monitoringDataBySales[salesName];
            if (data) {
                const item = data.find(d => d.originalRowIndex === rowIndex);
                if (item) {
                    item[colHeader] = newValue;
                }
            }

            this.showMessage('Data berhasil diperbarui!', 'success');
        } catch (error) {
            console.error('❌ Update cell error:', error);
            this.showError('Gagal memperbarui data: ' + (error.message || 'Terjadi kesalahan.'));
        }
    }

    async updateTanggalPembayaran(originalRowIndex, selectElement) {
        const newValue = selectElement.value;
        await this.updateSheetCell(originalRowIndex, 'Tanggal Pembayaran', newValue);
    }

    editBillingStatus(originalRowIndex, colHeader, currentValue) {
        const currentStatus = String(currentValue).toLowerCase();
        let nextStatus = 'PAID';
        if (currentStatus === 'paid') nextStatus = 'UNPAID';
        else if (currentStatus === 'unpaid') nextStatus = '';

        const rowElement = document.querySelector(`#monitoringTable .billing-cell[data-row='${originalRowIndex}'][data-col='${colHeader}']`);
        if (rowElement) {
            rowElement.textContent = nextStatus || 'N/A';
            rowElement.className = `billing-status ${this.getBillingStatusClass(nextStatus)}`;
        }

        this.updateSheetCell(originalRowIndex, colHeader, nextStatus);
    }

    renderTable(filteredData = null) {
        const tableContainer = document.getElementById('tableContainer');
        const cardContainer = document.getElementById('cardContainer');
        tableContainer.style.display = 'block';
        cardContainer.style.display = 'none';

        const table = document.getElementById('customerTable');
        if (!table) return;

        const thead = table.querySelector('thead');
        if (thead) {
            thead.innerHTML = `
                <tr>
                    <th>ODP TERDEKAT</th>
                    <th>NAMA</th>
                    <th>ALAMAT</th>
                    <th>NO TELEPON</th>
                    <th>NAMA SALES</th>
                    <th>VISIT</th>
                    <th>STATUS</th>
                    <th>KETERANGAN TAMBAHAN</th>
                    <th>ACTIONS</th>
                </tr>
            `;
        }

        const tbody = table.querySelector('tbody');
        if (!tbody) return;
        tbody.className = 'customer-view';

        const dataToRender = filteredData || this.originalData;
        this.totalPages = Math.ceil(dataToRender.length / this.itemsPerPage);
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const paginatedData = dataToRender.slice(startIndex, endIndex);

        if (paginatedData.length === 0) {
            tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; padding: 40px;"><div class="no-data-placeholder">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              <h4>Tidak ada data</h4>
              <p>Tidak ada data yang tersedia untuk pilihan ini.</p>
            </div></td></tr>`;
            this.renderPaginationControls();
            return;
        }

        tbody.innerHTML = '';
        paginatedData.forEach((row, index) => {
            const rowIndex = row.originalIndex !== undefined ? row.originalIndex : (startIndex + index);
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td colspan="9">
                    <div class="mobile-card-wrapper">
                        <div class="card-image-container"></div>
                        <div class="card-content">
                            <div class="card-header">
                                <div class="card-header-main">
                                    <div class="card-title">${this.escapeHtml(row.nama)}</div>
                                    <div class="card-location-button">
                                        <button class="btn-shareloc" onclick="trackLocationView('${this.escapeHtml(row.nama)}', '${this.escapeHtml(row.odp_terdekat)}', '${row.alamat}')">Lihat Lokasi</button>
                                    </div>
                                </div>
                                <div class="card-toggle">
                                    <button class="btn-icon btn-toggle-details" title="Lihat Detail"><i class="fas fa-chevron-down"></i></button>
                                </div>
                            </div>
                            <div class="card-details">
                                <div class="detail-item"><strong>ODP Terdekat:</strong><span>${this.escapeHtml(row.odp_terdekat)}</span></div>
                                <div class="detail-item"><strong>No Telepon:</strong><span>${this.escapeHtml(row.no_telepon)}</span></div>
                                <div class="detail-item"><strong>Nama Sales:</strong><span>${this.escapeHtml(row.nama_sales)}</span></div>
                                <div class="detail-item"><strong>Visit:</strong><span><span class="badge ${this.getVisitBadgeClass(row.visit)}">${this.escapeHtml(row.visit)}</span></span></div>
                                <div class="detail-item"><strong>Status:</strong><span><span class="status ${this.getStatusClass(row.status)}">${this.escapeHtml(row.status)}</span></span></div>
                                <div class="detail-item"><strong>Keterangan:</strong><span>${this.escapeHtml(row.keterangan_tambahan)}</span></div>
                                <div class="detail-item card-actions-expanded">
                                    <button class="btn-icon" title="Edit" onclick="googleSheetsIntegration.editRow(${rowIndex})"><i class="fas fa-edit"></i></button>
                                    <button class="btn-icon" title="Delete" onclick="googleSheetsIntegration.deleteRow(${rowIndex})"><i class="fas fa-trash"></i></button>
                                </div>
                            </div>
                        </div>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
            this.updateCardWithPlaceImage(tr.querySelector('.mobile-card-wrapper'), row.nama, row);
        });
        this.renderPaginationControls();
    }

    toggleActionsColumn() {
        const actionsHeader = document.getElementById('actionsHeader');
        if (actionsHeader) {
            actionsHeader.style.display = this.currentSalesFilter === 'All' ? 'none' : '';
        }
    }

    renderMonitoringView() {
        if (this.monitoringView === 'card') {
            this.renderMonitoringAsCards();
        } else {
            this.renderMonitoringAsTable();
        }
    }

    setMonitoringView(view) {
        this.monitoringView = view;
        this.monitoringCurrentPage = 1;

        const cardContainer = document.getElementById('monitoringCardsContainer');
        const tableContainer = document.getElementById('monitoringTableContainer');
        const btnCard = document.getElementById('viewToggleCard');
        const btnTable = document.getElementById('viewToggleTable');

        if (view === 'card') {
            cardContainer.style.display = 'grid';
            tableContainer.style.display = 'none';
            btnCard.classList.add('active');
            btnTable.classList.remove('active');
        } else {
            cardContainer.style.display = 'none';
            tableContainer.style.display = 'block';
            btnCard.classList.remove('active');
            btnTable.classList.add('active');
        }

        this.renderMonitoringView();
    }

    _applyBillingFilter(data) {
        const salesName = this.currentSalesFilter.toLowerCase();
        const allHeaders = this.monitoringDataHeadersBySales[salesName] || [];
        const billingHeaders = allHeaders.filter(h => h.toLowerCase().startsWith('billing'));

        if (this.currentBillingFilter === 'pra npc') {
            const now = new Date();
            const sortedBillingHeaders = billingHeaders
                .filter(header => this._parseHeaderDate(header) <= now)
                .sort((a, b) => this._parseHeaderDate(a) - this._parseHeaderDate(b));

            const lastTwoMonthsHeaders = sortedBillingHeaders.slice(-2);

            if (lastTwoMonthsHeaders.length < 2) {
                return [];
            }

            return data.filter(item => {
                const isUnpaidLastMonth = (item[lastTwoMonthsHeaders[1]] || '').toLowerCase() === 'unpaid';
                const isUnpaidTwoMonthsAgo = (item[lastTwoMonthsHeaders[0]] || '').toLowerCase() === 'unpaid';
                return isUnpaidLastMonth && isUnpaidTwoMonthsAgo;
            });
        }

        if (this.currentBillingFilter === 'ct0') {
            const now = new Date();
            const sortedBillingHeaders = billingHeaders
                .filter(header => this._parseHeaderDate(header) <= now)
                .sort((a, b) => this._parseHeaderDate(a) - this._parseHeaderDate(b));

            if (sortedBillingHeaders.length < 2) {
                return [];
            }

            return data.filter(item => {
                for (let i = 0; i <= sortedBillingHeaders.length - 2; i++) {
                    const header1 = sortedBillingHeaders[i];
                    const header2 = sortedBillingHeaders[i+1];

                    const isUnpaid1 = (item[header1] || '').toLowerCase() === 'unpaid';
                    const isUnpaid2 = (item[header2] || '').toLowerCase() === 'unpaid';

                    if (isUnpaid1 && isUnpaid2) {
                        return true;
                    }
                }
                return false;
            });
        }

        if (this.selectedBillingMonth === 'all') {
            if (this.currentBillingFilter !== 'all') {
                return data.filter(item => {
                    return billingHeaders.some(header => {
                        const billingStatus = (item[header] || 'n/a').toLowerCase();
                        return billingStatus === this.currentBillingFilter;
                    });
                });
            }
        } else {
            const currentBillingColumn = this.selectedBillingMonth;
            if (this.currentBillingFilter !== 'all') {
                return data.filter(item => {
                    const billingStatus = (item[currentBillingColumn] || 'n/a').toLowerCase();
                    return billingStatus === this.currentBillingFilter;
                });
            }
        }
        return data;
    }

    _parseHeaderDate(header) {
        const monthMap = {
            'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'mei': 4, 'jun': 5,
            'jul': 6, 'agu': 7, 'sep': 8, 'okt': 9, 'nov': 10, 'des': 11
        };
        const parts = header.replace('Billing ', '').split(' ');
        const month = monthMap[parts[0].toLowerCase()];
        const year = parseInt(parts[1], 10) + 2000;
        return new Date(year, month);
    }

    renderMonitoringAsCards() {
        const monitoringCardsContainer = document.getElementById('monitoringCardsContainer');
        if (!monitoringCardsContainer) return;

        let dataToRender = this.filteredMonitoringData || [];

        if (this.monitoringSearchQuery) {
            const query = this.monitoringSearchQuery.toLowerCase();
            dataToRender = dataToRender.filter(item => 
                item['Nama Pelanggan'].toLowerCase().includes(query)
            );
        }

        dataToRender = this._applyBillingFilter(dataToRender);

        const salesName = this.currentSalesFilter.toLowerCase();
        const allHeaders = this.monitoringDataHeadersBySales[salesName] || [];
        const billingHeaders = allHeaders.filter(h => h.toLowerCase().startsWith('billing'));

        this.monitoringTotalPages = Math.ceil(dataToRender.length / this.monitoringItemsPerPage);
        const startIndex = (this.monitoringCurrentPage - 1) * this.monitoringItemsPerPage;
        const endIndex = startIndex + this.monitoringItemsPerPage;
        const paginatedData = dataToRender.slice(startIndex, endIndex);

        if (paginatedData.length === 0) {
            monitoringCardsContainer.innerHTML = `<div class="no-data-placeholder">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              <h4>Tidak ada data</h4>
              <p>Tidak ada data monitoring yang tersedia untuk pilihan ini.</p>
            </div>`;
            this.renderMonitoringPaginationControls();
            return;
        }

        let content = '';
        paginatedData.forEach(item => {
            const redamanLossValue = item['Redaman Loss'] ? parseFloat(item['Redaman Loss']) : NaN;
            let dbValueClass = '';
            let redamanLossText = item['Redaman Loss'] ? `${item['Redaman Loss']} dB` : 'N/A';

            if (!isNaN(redamanLossValue) && redamanLossValue < -23) {
                dbValueClass = 'db-value-red';
            }
            
            const fupString = item['FUP'];
            let fupProgressHtml = '';
            let fupText = item['FUP'] || 'N/A';

            if (fupString && fupString.includes('/')) {
                const parts = fupString.replace(/GB/i, '').split('/');
                if (parts.length === 2) {
                    const used = parseFloat(parts[0]);
                    const total = parseFloat(parts[1]);
                    if (!isNaN(used) && !isNaN(total) && total > 0) {
                        const percentage = Math.min((used / total) * 100, 100);
                        let barClass = 'fup-bar-green';
                        if (percentage >= 90) barClass = 'fup-bar-red';
                        else if (percentage >= 70) barClass = 'fup-bar-blue';
                        fupProgressHtml = `<div class="monitoring-card-fup-progress"><div class="monitoring-card-fup-bar ${barClass}" style="width: ${percentage}%;"></div></div>`;
                        fupText = `${used} / ${total} GB`;
                    }
                }
            }

            const tanggalPembayaran = item['Tanggal Pembayaran'] || '';
            const tanggalPembayaranHtml = `
                <select class="payment-date-select" onchange="googleSheetsIntegration.updateTanggalPembayaran(${item.originalRowIndex}, this); googleSheetsIntegration.setPaymentDateSelectColor(this)" disabled>
                    <option value="" ${tanggalPembayaran === '' ? 'selected' : ''}>N/A</option>
                    <option value=">20" ${tanggalPembayaran === '>20' ? 'selected' : ''}>>20</option>
                    <option value="<20" ${tanggalPembayaran === '<20' ? 'selected' : ''}><20</option>
                </select>
            `;

            let billingStatusHtml;
            if (this.selectedBillingMonth === 'all') {
                billingStatusHtml = '<div class="monitoring-card-billing-multi">';
                billingHeaders.forEach(header => {
                    const billingStatus = item[header] || 'N/A';
                    const billingStatusClass = this.getBillingStatusClass(billingStatus);
                    const monthName = header.replace(/billing/i, '').trim();
                    billingStatusHtml += `<div class="billing-item"><span class="billing-month">${monthName}:</span> <span class="billing-status-badge ${billingStatusClass}">${billingStatus}</span></div>`;
                });
                billingStatusHtml += '</div>';
            } else {
                const billingStatus = item[this.selectedBillingMonth] || 'N/A';
                const billingStatusClass = this.getBillingStatusClass(billingStatus);
                billingStatusHtml = `<div class="card-info-row"><strong>Billing:</strong> <span class="billing-status-badge ${billingStatusClass}">${billingStatus}</span></div>`;
            }

            content += `
                <div class="monitoring-card">
                    <div class="card-section">
                        <div class="monitoring-card-title">${this.escapeHtml(item['Nama Pelanggan'])}</div>
                        <div class="monitoring-card-db-value ${dbValueClass}">${redamanLossText}</div>
                    </div>

                    <div class="card-section">
                        <div class="card-info-row"><strong>No. Inet:</strong> <span>${this.escapeHtml(item['No Internet'] || 'N/A')}</span></div>
                        <div class="card-info-row">
                            <strong>No. Cust:</strong>
                            <span>
                                <a href="https://wa.me/${this.formatWhatsappNumber(item['No Customer'])}" target="_blank" rel="noopener noreferrer" class="btn-whatsapp" title="Chat on WhatsApp">
                                    ${this.escapeHtml(item['No Customer'] || 'N/A')}
                                </a>
                            </span>
                        </div>
                    </div>

                    <div class="card-section">
                        <div class="card-info-row"><strong>Histori Gangguan:</strong> <span>${this.escapeHtml(item['Histori Gangguan'] || 'N/A')}</span></div>
                        <div class="card-info-row"><strong>Tgl. Bayar:</strong> <span>${tanggalPembayaranHtml}</span></div>
                    </div>

                    <div class="card-section fup-section">
                        <div class="card-info-row"><strong>FUP:</strong> <span>${fupText}</span></div>
                        ${fupProgressHtml}
                    </div>

                    <div class="card-section billing-section">
                        ${billingStatusHtml}
                    </div>
                </div>
            `;
        });
        monitoringCardsContainer.innerHTML = content;
        monitoringCardsContainer.querySelectorAll('.payment-date-select').forEach(select => {
            this.setPaymentDateSelectColor(select);
        });
        this.renderMonitoringPaginationControls();
    }

    renderMonitoringAsTable() {
        const tableContainer = document.getElementById('monitoringTableContainer');
        const table = tableContainer.querySelector('#monitoringTable');
        const thead = table.querySelector('thead');
        const tbody = table.querySelector('tbody');
        if (!table || !thead || !tbody) return;

        let dataToRender = this.filteredMonitoringData || [];

        if (this.monitoringSearchQuery) {
            const query = this.monitoringSearchQuery.toLowerCase();
            dataToRender = dataToRender.filter(item => 
                item['Nama Pelanggan'].toLowerCase().includes(query)
            );
        }

        dataToRender = this._applyBillingFilter(dataToRender);

        const salesName = this.currentSalesFilter.toLowerCase();
        const allHeaders = this.monitoringDataHeadersBySales[salesName] || [];
        const billingHeaders = allHeaders.filter(h => h.toLowerCase().startsWith('billing'));

        this.monitoringTotalPages = Math.ceil(dataToRender.length / this.monitoringItemsPerPage);
        const startIndex = (this.monitoringCurrentPage - 1) * this.monitoringItemsPerPage;
        const endIndex = startIndex + this.monitoringItemsPerPage;
        const paginatedData = dataToRender.slice(startIndex, endIndex);

        thead.innerHTML = '';
        tbody.innerHTML = '';

        const staticHeaders = ['Nama Pelanggan', 'No Internet', 'No Customer', 'Redaman Loss', 'FUP', 'Histori Gangguan', 'Tanggal Pembayaran'];
        const dynamicHeaders = [...staticHeaders, ...billingHeaders];
        
        if (paginatedData.length === 0) {
            tbody.innerHTML = `<tr><td colspan="${dynamicHeaders.length}" style="text-align: center; padding: 40px;"><div class="no-data-placeholder">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              <h4>Tidak ada data</h4>
              <p>Tidak ada data monitoring yang tersedia untuk pilihan ini.</p>
            </div></td></tr>`;
            this.renderMonitoringPaginationControls();
            return;
        }

        const headerRow = document.createElement('tr');
        dynamicHeaders.forEach(headerText => {
            const th = document.createElement('th');
            th.textContent = headerText;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);

        paginatedData.forEach(item => {
            const tr = document.createElement('tr');
            
            const fupString = item['FUP'];
            let fupHtml = 'N/A';
            if (fupString && fupString.includes('/')) {
                const parts = fupString.replace(/GB/i, '').split('/');
                if (parts.length === 2) {
                    const used = parseFloat(parts[0]);
                    const total = parseFloat(parts[1]);
                    if (!isNaN(used) && !isNaN(total) && total > 0) {
                        const percentage = Math.min((used / total) * 100, 100);
                        let barClass = 'fup-bar-green';
                        if (percentage >= 90) barClass = 'fup-bar-red';
                        else if (percentage >= 70) barClass = 'fup-bar-blue';
                        fupHtml = `
                            <div class="fup-cell-container">
                                <span class="fup-text">${this.escapeHtml(fupString)}</span>
                                <div class="fup-progress-bar-container">
                                    <div class="fup-progress-bar ${barClass}" style="width: ${percentage}%;"></div>
                                </div>
                            </div>
                        `;
                    }
                }
            }

            const tanggalPembayaran = item['Tanggal Pembayaran'] || '';
            const tanggalPembayaranHtml = `
                <select class="payment-date-select" onchange="googleSheetsIntegration.updateTanggalPembayaran(${item.originalRowIndex}, this); googleSheetsIntegration.setPaymentDateSelectColor(this)" disabled>
                    <option value="" ${tanggalPembayaran === '' ? 'selected' : ''}>N/A</option>
                    <option value=">20" ${tanggalPembayaran === '>20' ? 'selected' : ''}>>20</option>
                    <option value="<20" ${tanggalPembayaran === '<20' ? 'selected' : ''}><20</option>
                </select>
            `;

            let rowHtml = `
                <td>${this.escapeHtml(item['Nama Pelanggan'])}</td>
                <td>${this.escapeHtml(item['No Internet'])}</td>
                <td>
                    <a href="https://wa.me/${this.formatWhatsappNumber(item['No Customer'])}" target="_blank" class="btn-whatsapp" title="Chat on WhatsApp">
                        ${this.escapeHtml(item['No Customer'] || 'N/A')}
                    </a>
                </td>
                <td>${this.escapeHtml(item['Redaman Loss'])}</td>
                <td>${fupHtml}</td>
                <td>${this.escapeHtml(item['Histori Gangguan'])}</td>
                <td>${tanggalPembayaranHtml}</td>
            `;

            billingHeaders.forEach(header => {
                const billingStatus = item[header] || 'N/A';
                const billingStatusClass = this.getBillingStatusClass(billingStatus);
                rowHtml += `<td><span class="${billingStatusClass}">${this.escapeHtml(billingStatus)}</span></td>`;
            });

            tr.innerHTML = rowHtml;
            tbody.appendChild(tr);
            const select = tr.querySelector('.payment-date-select');
            if (select) {
                this.setPaymentDateSelectColor(select);
            }
        });

        this.renderMonitoringPaginationControls();
    }

    renderMonitoringPaginationControls() {
        const paginationContainer = document.getElementById('monitoringPaginationControls');
        if (!paginationContainer) return;

        paginationContainer.innerHTML = '';
        if (this.monitoringTotalPages <= 1) return;

        const createButton = (content, pageNum) => {
            const button = document.createElement('button');
            button.innerHTML = content;
            button.className = 'page-btn';
            if (pageNum === this.monitoringCurrentPage) button.classList.add('active');
            button.onclick = () => this.goToMonitoringPage(pageNum);
            return button;
        };

        const createEllipsis = () => {
            const span = document.createElement('span');
            span.textContent = '...';
            span.className = 'page-ellipsis';
            return span;
        };

        const prevButton = createButton('<i class="fas fa-chevron-left"></i>', this.monitoringCurrentPage - 1);
        if (this.monitoringCurrentPage === 1) prevButton.disabled = true;
        paginationContainer.appendChild(prevButton);

        const pageNumbers = new Set([1, this.monitoringTotalPages, this.monitoringCurrentPage]);
        if (this.monitoringCurrentPage > 1) pageNumbers.add(this.monitoringCurrentPage - 1);
        if (this.monitoringCurrentPage < this.monitoringTotalPages) pageNumbers.add(this.monitoringCurrentPage + 1);

        const sortedPages = [...pageNumbers].sort((a, b) => a - b);
        let lastPage = 0;
        sortedPages.forEach(page => {
            if (page > lastPage + 1) {
                paginationContainer.appendChild(createEllipsis());
            }
            paginationContainer.appendChild(createButton(page, page));
            lastPage = page;
        });

        const nextButton = createButton('<i class="fas fa-chevron-right"></i>', this.monitoringCurrentPage + 1);
        if (this.monitoringCurrentPage === this.monitoringTotalPages) nextButton.disabled = true;
        paginationContainer.appendChild(nextButton);
    }

    goToMonitoringPage(pageNum) {
        if (pageNum >= 1 && pageNum <= this.monitoringTotalPages) {
            this.monitoringCurrentPage = pageNum;
            this.renderMonitoringView();
        }
    }

    populateMonthFilter(headers) {
        const monthFilter = document.getElementById('monthFilter');
        if (!monthFilter) return;

        const billingMonths = headers.filter(h => h.toLowerCase().startsWith('billing'));
        
        const currentSelection = this.selectedBillingMonth;
        monthFilter.innerHTML = '<option value="all">Tampilkan Semua Bulan</option>';

        billingMonths.forEach(month => {
            const option = document.createElement('option');
            option.value = month;
            option.textContent = month;
            monthFilter.appendChild(option);
        });

        monthFilter.value = currentSelection;
    }

    handleMonthFilterChange(event) {
        this.selectedBillingMonth = event.target.value;
        this.monitoringCurrentPage = 1;
        this.renderMonitoringView();
    }

    setBillingFilter(filter) {
        this.currentBillingFilter = filter;
        this.monitoringCurrentPage = 1;
        this.renderMonitoringView();

        ['All', 'Paid', 'Unpaid', 'PraNPC', 'CT0'].forEach(f => {
            const btn = document.getElementById(`btnBilling${f}`);
            if (btn) {
                let filterName = f.toLowerCase();
                if (f === 'PraNPC') {
                    filterName = 'pra npc';
                } else if (f === 'CT0') {
                    filterName = 'ct0';
                }
                if (filterName === filter) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            }
        });
    }

    getBillingStatusClass(status) {
        const s = String(status).toLowerCase();
        if (s === 'paid') return 'status-paid';
        if (s === 'unpaid') return 'status-unpaid';
        if (s === 'n/a' || s === '') return 'status-kosong';
        if (s === 'zero billing') return 'status-zero-billing';
        return 'status-kosong';
    }

    setPaymentDateSelectColor(selectElement) {
        selectElement.classList.remove('value-over-20', 'value-under-20', 'value-na');
        if (selectElement.value === '>20') {
            selectElement.classList.add('value-over-20');
        } else if (selectElement.value === '<20') {
            selectElement.classList.add('value-under-20');
        } else {
            selectElement.classList.add('value-na');
        }
    }

    _calculateSalesSummary(data) {
        const summary = {
            totalCustomers: data.length,
            totalRedamanLoss: 0,
            redamanLossCount: 0,
            paidBilling: 0,
            unpaidBilling: 0,
            naBilling: 0
        };

        const chartData = {
            totalCustomers: { labels: [], data: [] },
            avgRedamanLoss: { labels: [], data: [] },
            billingStatus: { paid: 0, unpaid: 0, na: 0 }
        };

        const billingColumns = Object.keys(data[0] || {}).filter(h => h.toLowerCase().startsWith('billing'));
        const currentMonthColumn = this.getCurrentMonthColumnName();

        billingColumns.forEach(col => {
            let totalRedaman = 0;
            let redamanCount = 0;

            data.forEach(row => {
                const redamanLossValue = parseFloat(row['Redaman Loss']);
                if (!isNaN(redamanLossValue)) {
                    totalRedaman += redamanLossValue;
                    redamanCount++;
                }
            });

            const month = col.replace('Billing ', '');
            chartData.totalCustomers.labels.push(month);
            chartData.totalCustomers.data.push(data.length);

            chartData.avgRedamanLoss.labels.push(month);
            chartData.avgRedamanLoss.data.push(redamanCount > 0 ? (totalRedaman / redamanCount).toFixed(2) : 0);
        });

        data.forEach(row => {
            const redamanLossValue = parseFloat(row['Redaman Loss']);
            if (!isNaN(redamanLossValue)) {
                summary.totalRedamanLoss += redamanLossValue;
                summary.redamanLossCount++;
            }

            const billingStatus = String(row[currentMonthColumn]).toLowerCase();
            if (billingStatus === 'paid') {
                summary.paidBilling++;
                chartData.billingStatus.paid++;
            } else if (billingStatus === 'unpaid') {
                summary.unpaidBilling++;
                chartData.billingStatus.unpaid++;
            } else {
                summary.naBilling++;
                chartData.billingStatus.na++;
            }
        });

        summary.avgRedamanLoss = summary.redamanLossCount > 0
            ? (summary.totalRedamanLoss / summary.redamanLossCount).toFixed(2)
            : 'N/A';

        return { summary, chartData };
    }

    getCurrentMonthColumnName() {
        const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
        const d = new Date();
        const month = months[d.getMonth()];
        const year = String(d.getFullYear()).slice(-2);
        return `Billing ${month} ${year}`;
    }

    filterBySales(salesName, isNonTelda = false) {
        this._applySalesFilter(salesName, isNonTelda);
    }

    _applySalesFilter(salesName, isNonTelda = false) {
        this.currentSalesFilter = salesName;
        this.toggleActionsColumn();
        this.applyCombinedFilters();

        setTimeout(() => {
            if (isNonTelda) {
                this.updateNonTeldaSalesListActiveState(salesName);
            } else {
                this.updateSalesListActiveState(salesName);
            }
        }, 0);

        const activeFilterDisplay = document.getElementById('active-filter-display');
        if (activeFilterDisplay) {
            if (salesName && salesName !== 'All') {
                activeFilterDisplay.innerHTML = `Filter: ${salesName} <button class="btn-remove-filter" onclick="googleSheetsIntegration.filterBySales('All')">&times;</button>`;
                activeFilterDisplay.style.display = 'inline-flex';
            } else {
                activeFilterDisplay.style.display = 'none';
            }
        }

        const monitoringSection = document.getElementById('monthlyMonitoringSection');
        const salesNameDisplay = document.getElementById('monitoringSalesName');
        const monthFilterContainer = document.querySelector('.month-filter-container');
        const salesSummarySection = document.getElementById('salesSummarySection');
        const tabNavigation = document.querySelector('.tab-navigation');

        if (salesName && salesName !== 'All') {
            // Only show tabs for the 'telda' team view
            if (tabNavigation && this.currentTeam === 'telda') {
                tabNavigation.style.display = 'flex'; // Show tabs
            }

            const normalizedSalesName = salesName.toLowerCase();
            this.filteredMonitoringData = this.monitoringDataBySales[normalizedSalesName] || [];

            const availableHeaders = this.monitoringDataHeadersBySales[normalizedSalesName] || [];
            this.populateMonthFilter(availableHeaders);

            const targetMonthColumn = this.getCurrentMonthColumnName();
            const actualHeader = availableHeaders.find(h => h.toLowerCase() === targetMonthColumn.toLowerCase());

            this.selectedBillingMonth = actualHeader ? actualHeader : 'all';
            this.monitoringCurrentPage = 1;
            
            // Switch to the monitoring tab first
            if (window.switchToTab) {
                window.switchToTab('monitoring');
            }

            this.renderMonitoringView();

            salesNameDisplay.textContent = `untuk: ${salesName}`;
            if (monthFilterContainer) monthFilterContainer.style.display = 'flex';
            if (monitoringSection) {
                monitoringSection.style.display = 'block';
                setTimeout(() => monitoringSection.classList.add('visible'), 10);
            }

            if (salesSummarySection) {
                const { summary, chartData } = this._calculateSalesSummary(this.filteredMonitoringData);
                const summarySalesName = document.getElementById('summarySalesName');
                if (summarySalesName) summarySalesName.textContent = salesName;

                const totalCustomersSummary = document.getElementById('totalCustomersSummary');
                if (totalCustomersSummary) totalCustomersSummary.textContent = summary.totalCustomers;

                const avgRedamanLossSummary = document.getElementById('avgRedamanLossSummary');
                if (avgRedamanLossSummary) avgRedamanLossSummary.textContent = summary.avgRedamanLoss;

                const billingStatusSummary = document.getElementById('billingStatusSummary');
                if (billingStatusSummary) billingStatusSummary.textContent = `${summary.paidBilling} Paid, ${summary.unpaidBilling} Unpaid, ${summary.naBilling} N/A`;

                salesSummarySection.style.display = 'block';
                createSummaryCharts(chartData);
            }

        } else {
            if (tabNavigation) tabNavigation.style.display = 'none'; // Hide tabs

            // Switch back to the customer list tab
            if (window.switchToTab) {
                window.switchToTab('pelanggan');
            }
        }
    }

    updateSalesListActiveState(salesName) {
        const salesListItems = document.querySelectorAll('.sales-list .sales-item');
        salesListItems.forEach(item => {
            if (item.dataset.salesName === salesName) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    applyCombinedFilters() {
        let filteredData;
        const tableContainer = document.getElementById('tableContainer');
        const cardContainer = document.getElementById('cardContainer');

        if (this.currentDataView === 'government') {
            tableContainer.style.display = 'none';
            cardContainer.style.display = 'block';

            filteredData = this.originalGovernmentData;

            if (this.currentSearchQuery) {
                const query = this.currentSearchQuery.toLowerCase();
                filteredData = filteredData.filter(row =>
                    (row.nama_koperasi && row.nama_koperasi.toLowerCase().includes(query)) ||
                    (row.alamat && row.alamat.toLowerCase().includes(query)) ||
                    (row.kabupaten_kota && row.kabupaten_kota.toLowerCase().includes(query)) ||
                    (row.kecamatan && row.kecamatan.toLowerCase().includes(query)) ||
                    (row.desa && row.desa.toLowerCase().includes(query)) ||
                    (row.sales && row.sales.toLowerCase().includes(query))
                );
            }

            if (this.currentSalesFilter && this.currentSalesFilter !== 'All') {
                const currentFilter = this.currentSalesFilter.toLowerCase();
                filteredData = filteredData.filter(row => row.sales && row.sales.toLowerCase() === currentFilter);
            }

            this.filteredGovernmentData = filteredData.map(row => ({
                ...row,
                originalIndex: this.originalGovernmentData.indexOf(row)
            }));

            this.governmentData = this.filteredGovernmentData;
            this.renderGovernmentAsCards();
            
            if (window.schoolDataFilter) {
                setTimeout(() => {
                    window.schoolDataFilter.setActiveButton('btnTableShowGoverment');
                }, 0);
            }

        } else { // currentDataView is 'customer'
            tableContainer.style.display = 'block';
            cardContainer.style.display = 'none';

            filteredData = this.originalData;

            if (this.currentSearchQuery) {
                const query = this.currentSearchQuery.toLowerCase();
                filteredData = filteredData.filter(row =>
                    (row.nama && row.nama.toLowerCase().includes(query)) ||
                    (row.alamat && row.alamat.toLowerCase().includes(query)) ||
                    (row.no_telepon && row.no_telepon.toLowerCase().includes(query)) ||
                    (row.nama_sales && row.nama_sales.toLowerCase().includes(query))
                );
            }

            if (this.currentSchoolFilter === 'school') {
                filteredData = filteredData.filter(row => window.schoolDataFilter.isSchoolData(row));
            } else if (this.currentSchoolFilter === 'nonSchool') {
                filteredData = filteredData.filter(row => !window.schoolDataFilter.isSchoolData(row));
            }

            if (this.currentSalesFilter && this.currentSalesFilter !== 'All') {
                const currentFilter = this.currentSalesFilter.toLowerCase();
                filteredData = filteredData.filter(row => row.nama_sales && row.nama_sales.toLowerCase() === currentFilter);
            }

            const finalFilteredData = filteredData.map(row => ({
                ...row,
                originalIndex: this.originalData.indexOf(row)
            }));

            this.renderTable(finalFilteredData);
        }
    }

    sanitizeValue(value) {
        return value ? String(value).trim() : '';
    }

    renderPaginationControls() {
        const paginationContainer = document.getElementById('paginationControls');
        if (!paginationContainer) return;

        let totalPages, currentPage;

        if (this.currentDataView === 'government') {
            totalPages = this.governmentTotalPages;
            currentPage = this.governmentCurrentPage;
        } else {
            totalPages = this.totalPages;
            currentPage = this.currentPage;
        }

        paginationContainer.innerHTML = '';
        if (totalPages <= 1) return;

        const createButton = (content, pageNum) => {
            const button = document.createElement('button');
            button.innerHTML = content;
            button.className = 'page-btn';
            if (pageNum === currentPage) button.classList.add('active');
            button.onclick = () => this.goToPage(pageNum);
            return button;
        };

        const createEllipsis = () => {
            const span = document.createElement('span');
            span.textContent = '...';
            span.className = 'page-ellipsis';
            return span;
        };

        const prevButton = createButton('<i class="fas fa-chevron-left"></i>', currentPage - 1);
        if (currentPage === 1) prevButton.disabled = true;
        paginationContainer.appendChild(prevButton);

        const pageNumbers = new Set([1, totalPages, currentPage]);
        if (currentPage > 1) pageNumbers.add(currentPage - 1);
        if (currentPage < totalPages) pageNumbers.add(currentPage + 1);

        const sortedPages = [...pageNumbers].sort((a, b) => a - b);
        
        let lastPage = 0;
        sortedPages.forEach(page => {
            if (page > lastPage + 1) {
                paginationContainer.appendChild(createEllipsis());
            }
            paginationContainer.appendChild(createButton(page, page));
            lastPage = page;
        });

        const nextButton = createButton('<i class="fas fa-chevron-right"></i>', currentPage + 1);
        if (currentPage === totalPages) nextButton.disabled = true;
        paginationContainer.appendChild(nextButton);
    }

    renderGovernmentAsCards() {
        const cardContainer = document.getElementById('cardContainer');
        if (!cardContainer) return;

        const dataToRender = this.governmentData;
        this.governmentTotalPages = Math.ceil(dataToRender.length / this.governmentItemsPerPage);
        const startIndex = (this.governmentCurrentPage - 1) * this.governmentItemsPerPage;
        const endIndex = startIndex + this.governmentItemsPerPage;
        const paginatedData = dataToRender.slice(startIndex, endIndex);

        if (paginatedData.length === 0) {
            cardContainer.innerHTML = `<div class="no-data-placeholder">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              <h4>Tidak ada data</h4>
              <p>Tidak ada data pemerintahan yang tersedia untuk pilihan ini.</p>
            </div>`;
            this.renderPaginationControls();
            return;
        }

        cardContainer.innerHTML = ''; // Clear existing content
        const cardGrid = document.createElement('div');
        cardGrid.className = 'monitoring-cards-grid government-view';

        paginatedData.forEach((row, index) => {
            const originalIndex = this.originalGovernmentData.indexOf(row);
            const card = document.createElement('div');
            card.className = 'monitoring-card';

            let alamatHtml = '';
            if (row.alamat && row.alamat.startsWith('http')) {
                alamatHtml = `<p><i class="fas fa-map-marker-alt"></i> <button class="btn-maps" onclick="window.open('${this.escapeHtml(row.alamat)}', '_blank')">Buka di Google Maps</button></p>`;
            } else {
                alamatHtml = `<p><i class="fas fa-map-marker-alt"></i> ${this.escapeHtml(row.alamat)}</p>`;
            }

            card.innerHTML = `
                <div class="card-header">
                    ${this.escapeHtml(row.nama_koperasi)}
                </div>
                <div class="card-content">
                    ${alamatHtml}
                    <p><i class="fas fa-city"></i> ${this.escapeHtml(row.kabupaten_kota)}</p>
                    <p><i class="fas fa-building"></i> ${this.escapeHtml(row.kecamatan)}</p>
                    <p><i class="fas fa-home"></i> ${this.escapeHtml(row.desa)}</p>
                    <p><i class="fas fa-user-tie"></i> ${this.escapeHtml(row.sales)}</p>
                    <p><i class="fas fa-info-circle"></i> ${this.escapeHtml(row.keterangan)}</p>
                </div>
                <div class="card-actions">
                    <button class="btn-icon" title="Edit" onclick="googleSheetsIntegration.editGovernmentRow(${originalIndex})"><i class="fas fa-edit"></i></button>
                    <button class="btn-icon" title="Delete" onclick="googleSheetsIntegration.deleteGovernmentRow(${originalIndex})"><i class="fas fa-trash"></i></button>
                    <button class="btn-icon" title="View History" onclick="googleSheetsIntegration.viewGovernmentHistory(${originalIndex})"><i class="fas fa-history"></i></button>
                </div>
            `;
            cardGrid.appendChild(card);
        });
        cardContainer.appendChild(cardGrid);
        this.renderPaginationControls();
    }

    renderGovernmentTable() {
        const table = document.getElementById('customerTable'); // Assuming the same table element is used
        if (!table) return;

        const thead = table.querySelector('thead');
        if (thead) {
            thead.innerHTML = `
                <tr>
                    <th>NAMA KOPERASI</th>
                    <th>ALAMAT</th>
                    <th>KABUPATEN/KOTA</th>
                    <th>KECAMATAN</th>
                    <th>DESA</th>
                    <th>SALES</th>
                    <th>KETERANGAN</th>
                    <th>ACTIONS</th>
                </tr>
            `;
        }

        const tbody = table.querySelector('tbody');
        if (!tbody) return;

        const dataToRender = this.governmentData;
        this.governmentTotalPages = Math.ceil(dataToRender.length / this.governmentItemsPerPage);
        const startIndex = (this.governmentCurrentPage - 1) * this.governmentItemsPerPage;
        const endIndex = startIndex + this.governmentItemsPerPage;
        const paginatedData = dataToRender.slice(startIndex, endIndex);

        if (paginatedData.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 40px;"><div class="no-data-placeholder">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              <h4>Tidak ada data</h4>
              <p>Tidak ada data pemerintahan yang tersedia untuk pilihan ini.</p>
            </div></td></tr>`;
            this.renderPaginationControls();
            return;
        }

        tbody.innerHTML = '';
        paginatedData.forEach((row, index) => {
            const originalIndex = this.originalGovernmentData.indexOf(row);
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${this.escapeHtml(row.nama_koperasi)}</td>
                <td>${this.escapeHtml(row.alamat)}</td>
                <td>${this.escapeHtml(row.kabupaten_kota)}</td>
                <td>${this.escapeHtml(row.kecamatan)}</td>
                <td>${this.escapeHtml(row.desa)}</td>
                <td>${this.escapeHtml(row.sales)}</td>
                <td>${this.escapeHtml(row.keterangan)}</td>
                <td>
                    <button class="btn-icon" title="Edit" onclick="googleSheetsIntegration.editGovernmentRow(${originalIndex})"><i class="fas fa-edit"></i></button>
                    <button class="btn-icon" title="Delete" onclick="googleSheetsIntegration.deleteGovernmentRow(${originalIndex})"><i class="fas fa-trash"></i></button>
                    <button class="btn-icon" title="View History" onclick="googleSheetsIntegration.viewGovernmentHistory(${originalIndex})"><i class="fas fa-history"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        this.renderPaginationControls();
    }

    goToPage(pageNumber) {
        if (this.currentDataView === 'government') {
            this.goToGovernmentPage(pageNumber);
            return;
        }
        if (pageNumber >= 1 && pageNumber <= this.totalPages) {
            this.currentPage = pageNumber;
            this.applyCombinedFilters();
        }
    }

    goToGovernmentPage(pageNumber) {
        if (pageNumber >= 1 && pageNumber <= this.governmentTotalPages) {
            this.governmentCurrentPage = pageNumber;
            this.applyCombinedFilters();
        }
    }

    nextPage() { this.goToPage(this.currentPage + 1); }
    prevPage() { this.goToPage(this.currentPage - 1); }

    updateSalesList() {
        const salesList = document.querySelector('.sales-list');
        if (!salesList) return;

        const salesNamesSet = new Set();
        this.originalData.forEach(row => {
            if (row.nama_sales && row.nama_sales.trim() !== '') {
                salesNamesSet.add(row.nama_sales.trim());
            }
        });

        const salesNames = ['All', ...Array.from(salesNamesSet).sort()];

        salesList.innerHTML = '';
        const self = this;

        salesNames.forEach(name => {
            const li = document.createElement('li');
            li.className = 'sales-item';
            if (name === 'All') li.classList.add('active');
            li.dataset.salesName = name;
            li.innerHTML = `<span>${name}</span>`;
            li.onclick = function() {
                self.filterBySales(name);
            };
            salesList.appendChild(li);
        });
    }

    updateNonTeldaSalesList() {
        const salesList = document.querySelector('.non-telda-sales-list');
        if (!salesList) return;

        const salesNames = this.nonTeldaSales;

        salesList.innerHTML = '';
        const self = this;

        salesNames.forEach((name, index) => {
            const li = document.createElement('li');
            li.className = 'sales-item';
            if (index === 0) li.classList.add('active');
            li.dataset.salesName = name;
            li.innerHTML = `<span>${name}</span>`;
            li.onclick = function() {
                self.filterBySales(name, true);
            };
            salesList.appendChild(li);
        });
    }

    updateActiveSalesItem(selectedLi) {
        document.querySelectorAll('.sales-list .sales-item').forEach(item => item.classList.remove('active'));
        selectedLi.classList.add('active');
    }

    updateNonTeldaSalesListActiveState(salesName) {
        const salesListItems = document.querySelectorAll('.non-telda-sales-list .sales-item');
        salesListItems.forEach(item => {
            if (item.dataset.salesName === salesName) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    updateStats() {
        const totalPoiElement = document.getElementById('totalPoi');
        const totalSekolahElement = document.getElementById('totalSekolah');
        const totalNonSekolahElement = document.getElementById('totalNonSekolah');
        const totalPemerintahanElement = document.getElementById('totalPemerintahan');

        if (totalPoiElement) {
            totalPoiElement.textContent = this.originalData.length + this.originalGovernmentData.length;
        }

        if (window.schoolDataFilter && totalSekolahElement && totalNonSekolahElement) {
            const schoolCount = window.schoolDataFilter.filteredData.school.length;
            const nonSchoolCount = window.schoolDataFilter.filteredData.nonSchool.length;
            totalSekolahElement.textContent = schoolCount;
            totalNonSekolahElement.textContent = nonSchoolCount;
        }

        if (totalPemerintahanElement) {
            totalPemerintahanElement.textContent = this.originalGovernmentData.length;
        }
    }

    updateSalesDropdown() {
        try {
            const salesSelects = document.querySelectorAll('#inputSales, #editSales, #assignedSales');
            const salesNames = ['Andi', 'Andry', 'April', 'Nandi', 'Nursyarif', 'Octa', 'Reynaldi', 'Totong', 'Yandi', 'Yusdhi'];

            salesSelects.forEach(select => {
                if (select.tagName !== 'SELECT') return;
                const currentValue = select.value;
                select.innerHTML = '<option value="">Pilih Sales</option>';
                salesNames.forEach(name => {
                    const option = document.createElement('option');
                    option.value = name;
                    option.textContent = name;
                    select.appendChild(option);
                });
                if (salesNames.includes(currentValue)) {
                    select.value = currentValue;
                }
            });
        } catch (error) {
            console.error('❌ Update sales dropdown error:', error);
        }
    }

    handleTeamChange(newTeam) {
        this.currentTeam = newTeam;
        this.updateUIVisibility();
        if (newTeam === 'non-telda') {
            this.updateNonTeldaSalesList();
            this.filterBySales('TRI SUSANTOHADI', true);
            this.updateNonTeldaSalesListActiveState('TRI SUSANTOHADI');
        } else {
            this.updateSalesList();
            this.filterBySales('All');
        }
    }

    showNonTeldaMonitoring() {
        let combinedData = [];
        this.nonTeldaSales.forEach(salesName => {
            const normalizedSalesName = salesName.toLowerCase();
            const salesData = this.monitoringDataBySales[normalizedSalesName];
            if (salesData) {
                combinedData = combinedData.concat(salesData);
            }
        });

        this.filteredMonitoringData = combinedData;
        this.monitoringCurrentPage = 1;
        this.renderMonitoringView();

        const monitoringSection = document.getElementById('monthlyMonitoringSection');
        const salesNameDisplay = document.getElementById('monitoringSalesName');
        const monthFilterContainer = document.querySelector('.month-filter-container');

        if (salesNameDisplay) salesNameDisplay.textContent = 'untuk: Team Sales Non Telda';
        if (monthFilterContainer) monthFilterContainer.style.display = 'flex';
        if (monitoringSection) {
            monitoringSection.style.display = 'block';
            setTimeout(() => monitoringSection.classList.add('visible'), 10);
        }
    }

    updateUIVisibility() {
        const statsOverview = document.querySelector('.stats-overview');
        const addCustomerSection = document.getElementById('add-customer-section');
        const contentGrid = document.querySelector('.content-grid');
        const monthlyMonitoringSection = document.getElementById('monthlyMonitoringSection');
        const salesAccount = document.querySelector('.sales-account');
        const nonTeldaSalesAccount = document.querySelector('.non-telda-sales-account');
        const salesSummarySection = document.getElementById('salesSummarySection');
        const tabNavigation = document.querySelector('.tab-navigation');

        if (this.currentTeam === 'non-telda') {
            if (statsOverview) statsOverview.style.display = 'none';
            if (addCustomerSection) addCustomerSection.style.display = 'none';
            if (contentGrid) contentGrid.style.display = 'none';
            if (monthlyMonitoringSection) monthlyMonitoringSection.style.display = 'block';
            if (salesAccount) salesAccount.style.display = 'none';
            if (nonTeldaSalesAccount) nonTeldaSalesAccount.style.display = 'block';
            if (tabNavigation) tabNavigation.style.display = 'none';
        } else {
            if (statsOverview) statsOverview.style.display = '';
            if (addCustomerSection) addCustomerSection.style.display = 'none';
            if (contentGrid) contentGrid.style.display = '';
            if (monthlyMonitoringSection) monthlyMonitoringSection.style.display = 'none';
            if (salesAccount) salesAccount.style.display = '';
            if (nonTeldaSalesAccount) nonTeldaSalesAccount.style.display = 'none';
            // The _applySalesFilter function will handle showing/hiding the tabs as needed
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }

    getVisitBadgeClass(visit) {
        const v = String(visit).toLowerCase();
        if (v.includes('visited')) return 'badge-success';
        if (v.includes('pending')) return 'badge-warning';
        if (v.includes('scheduled')) return 'badge-info';
        return 'badge-secondary';
    }

    getStatusClass(status) {
        const s = String(status).toLowerCase();
        if (s.includes('diterima')) return 'status-diterima';
        if (s.includes('tidak diterima')) return 'status-tidak-diterima';
        return 'status-secondary';
    }

    async updateCardWithPlaceImage(cardWrapperElement, placeName, rowData) {
        if (!placeName) return;

        const imageContainer = cardWrapperElement.querySelector('.card-image-container');
        if (!imageContainer) return;

        const directImageUrl = rowData.image_url;

        if (directImageUrl && typeof directImageUrl === 'string' && directImageUrl.startsWith('http')) {
            imageContainer.innerHTML = '<div class="image-loading-spinner"></div>';
            imageContainer.dataset.src = directImageUrl;

            const observer = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const container = entry.target;
                        const imageUrl = container.dataset.src;
                        
                        const img = new Image();
                        img.src = imageUrl;
                        img.alt = placeName;
                        img.className = 'place-image';
                        
                        img.onload = () => {
                            container.innerHTML = '';
                            container.appendChild(img);
                        };
                        
                        img.onerror = () => {
                            container.innerHTML = '<div class="no-image-placeholder">Gagal memuat</div>';
                        };

                        observer.unobserve(container);
                    }
                });
            });

            observer.observe(imageContainer);

        } else {
            imageContainer.innerHTML = '<div class="no-image-placeholder no-image-placeholder-enhanced"><i class="fas fa-image"></i><br>Tidak ada gambar</div>';
        }
    }

    showLoading(show) {
        const indicator = document.getElementById('loadingIndicator');
        if(indicator) indicator.style.display = show ? 'block' : 'none';
    }
    
    handleLoadError(error) {
        console.error('❌ Load error details:', error);
        this.showError('Gagal memuat data: ' + error.message);
        this.loadFallbackData();
    }

    loadFallbackData() {
        console.log('🔄 Loading fallback data for testing...');
        const fallbackData = [
            ['ODP', 'NAMA', 'ALAMAT', 'NO TELEPON', 'NAMA SALES', 'VISIT', 'STATUS'],
            ['ODP-BDG-001', 'Budi Santoso', 'Jl. Merdeka No.1, Bandung', '081234567890', 'Nandi', 'Visited', 'Diterima'],
        ];
        this.processData(fallbackData);
        this.showWarning('Menggunakan data demo.');
    }

    showError(message) { this.showMessage(message, 'error'); }
    showWarning(message) { this.showMessage(message, 'warning'); }

    showMessage(message, type = 'info') {
        NotificationHandler.show(message, type);
    }

    editRow(index) {
        console.log('✏️ Edit row:', index);
        const originalIndex = (typeof index === 'object' && index.originalIndex !== undefined) ? index.originalIndex : index;
        const rowData = this.originalData[originalIndex];
        if (rowData) {
            document.getElementById('editRowIndex').value = originalIndex;
            document.getElementById('editOdp').value = rowData.odp_terdekat || '';
            document.getElementById('editNama').value = rowData.nama || '';
            document.getElementById('editAlamat').value = rowData.alamat || '';
            document.getElementById('editTelepon').value = rowData.no_telepon || '';
            document.getElementById('editSales').value = rowData.nama_sales || '';
            document.getElementById('editVisit').value = rowData.visit || '';
            document.getElementById('editStatus').value = rowData.status || '';
            document.getElementById('editKeteranganTambahan').value = rowData.keterangan_tambahan || '';
            this.updateSalesDropdown();
            document.getElementById('editModal').style.display = 'block';
            document.getElementById('editForm').resetWizard();
        }
    }

    async saveEdit() {
        try {
            const rowIndex = document.getElementById('editRowIndex').value;
            const values = [
                document.getElementById('editOdp').value,
                document.getElementById('editNama').value,
                document.getElementById('editAlamat').value,
                document.getElementById('editTelepon').value,
                document.getElementById('editSales').value,
                document.getElementById('editVisit').value,
                document.getElementById('editStatus').value,
                document.getElementById('editKeteranganTambahan').value
            ];

            const response = await fetch('/api/update-customer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ rowIndex, values, userEmail: window.currentUserEmail }),
            });

            if (!response.ok) {
                if (response.status === 400) {
                    const errorData = await response.json();
                    const errorMessages = errorData.errors.map(err => `<li>${err.msg}</li>`).join('');
                    ModalHandler.show('Oops! Data Tidak Valid', `Harap perbaiki kesalahan berikut:<ul>${errorMessages}</ul>`, 'error');
                } else {
                    const errorText = await response.text();
                    ModalHandler.show('Server Error', `Terjadi kesalahan pada server: ${errorText}`, 'error');
                }
                throw new Error(`Server returned ${response.status}`);
            }

            this.showMessage('Data berhasil diperbarui!', 'success');
            this.closeEditModal();
            this.refreshData(); // This function needs to be created
        } catch (error) {
            console.error('❌ Update row error:', error);
            this.showError('Gagal memperbarui data: ' + error.message);
        }
    }



    closeEditModal() {
        const editModal = document.getElementById('editModal');
        if (editModal) editModal.style.display = 'none';
    }

    async deleteRow(originalIndex) {
        try {
            const rowData = this.originalData[originalIndex];
            if (!rowData) {
                this.showError('Data tidak ditemukan untuk dihapus.');
                return;
            }
            const expectedNama = rowData.nama;
            if (!expectedNama) {
                this.showError('Data tidak memiliki nilai NAMA yang valid.');
                return;
            }

            ModalHandler.show(
                'Konfirmasi Penghapusan',
                `Apakah Anda yakin ingin menghapus data dengan NAMA: ${expectedNama}?`,
                async () => {
                    try {
                        const response = await fetch('/api/delete-row', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ 
                                rowIndex: originalIndex, 
                                sheetName: 'REKAP CALON PELANGGAN BY SPARTA',
                                userEmail: window.currentUserEmail
                            }),
                        });

                        if (!response.ok) {
                            const errorData = await response.json();
                            throw new Error(errorData.message || `HTTP ${response.status}`);
                        }

                        this.showMessage('Data berhasil dihapus!', 'success');
                        this.refreshData();
                    } catch (error) {
                        console.error('❌ Delete row error:', error);
                        this.showError('Gagal menghapus data: ' + error.message);
                    }
                }
            );
        } catch (error) {
            console.error('❌ Delete row error:', error);
            this.showError('Gagal menghapus data: ' + error.message);
        }
    }

    async refreshData() {
        console.log('🔄 Refreshing data...');
        // Clear cache and re-load all data
        localStorage.removeItem('mainData');
        localStorage.removeItem('governmentData');
        localStorage.removeItem('monitoringData');
        await this.setup();
    }







    async viewGovernmentHistory(index) {
        try {
            const rowData = this.originalGovernmentData[index];
            if (!rowData) {
                this.showError('Data pemerintah tidak ditemukan untuk riwayat.');
                return;
            }
            const location = rowData.nama_koperasi || '';
            const modal = document.getElementById('viewHistoryModal');
            const historyLoading = document.getElementById('historyLoading');
            const historyContent = document.getElementById('historyContent');
            const historyError = document.getElementById('historyError');
            const historyTableBody = document.getElementById('historyTableBody');
            const historyLocationId = document.getElementById('historyLocationId');

            historyTableBody.innerHTML = '';
            historyLocationId.textContent = `Riwayat Kunjungan Lokasi: ${location}`;
            historyLoading.style.display = 'block';
            historyContent.style.display = 'none';
            historyError.style.display = 'none';

            await ensureAuthenticatedGapiClient();
            const range = 'USER VIEW TRACKING!A2:C1000';
            const response = await gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: this.spreadsheetId,
                range: range
            });
            const values = response.result.values || [];

            const threeMonthsAgo = new Date();
            threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

            const filteredHistory = values.filter(row => {
                const locationMatch = row[1] === location;
                if (!locationMatch) return false;

                const timestamp = new Date(row[2]);
                return timestamp >= threeMonthsAgo;
            });

            const latestHistory = new Map();
            filteredHistory.forEach(row => {
                const userEmail = row[0];
                const timestamp = new Date(row[2]);

                if (!latestHistory.has(userEmail) || timestamp > new Date(latestHistory.get(userEmail)[2])) {
                    latestHistory.set(userEmail, row);
                }
            });

            const finalHistory = Array.from(latestHistory.values());

            if (finalHistory.length === 0) {
                historyLoading.style.display = 'none';
                historyContent.style.display = 'none';
                historyError.style.display = 'block';
                historyError.querySelector('p').textContent = 'Tidak ada riwayat kunjungan untuk lokasi ini dalam 3 bulan terakhir.';
                modal.style.display = 'block';
                return;
            }

            finalHistory.forEach(row => {
                const tr = document.createElement('tr');
                const userEmail = row[0] || '';
                const timestamp = row[2] || '';
                tr.innerHTML = `<td>${this.escapeHtml(userEmail)}</td><td>${this.escapeHtml(timestamp)}</td>`;
                historyTableBody.appendChild(tr);
            });

            historyLoading.style.display = 'none';
            historyContent.style.display = 'block';
            historyError.style.display = 'none';

            modal.style.display = 'block';

        } catch (error) {
            console.error('❌ Error loading government view history:', error);
            this.showError('Gagal memuat riwayat pemerintah: ' + error.message);
        }
    }

    async viewHistory(rowIndex) {
        try {
            const originalIndex = (typeof rowIndex === 'object' && rowIndex.originalIndex !== undefined) ? rowIndex.originalIndex : rowIndex;
            const rowData = this.originalData[originalIndex];
            if (!rowData) {
                this.showError('Data tidak ditemukan untuk riwayat.');
                return;
            }
            const location = rowData.odp_terdekat || rowData.nama || '';
            const modal = document.getElementById('viewHistoryModal');
            const historyLoading = document.getElementById('historyLoading');
            const historyContent = document.getElementById('historyContent');
            const historyError = document.getElementById('historyError');
            const historyTableBody = document.getElementById('historyTableBody');
            const historyLocationId = document.getElementById('historyLocationId');

            historyTableBody.innerHTML = '';
            historyLocationId.textContent = `Riwayat Kunjungan Lokasi: ${location}`;
            historyLoading.style.display = 'block';
            historyContent.style.display = 'none';
            historyError.style.display = 'none';

            await ensureAuthenticatedGapiClient();
            const range = 'USER VIEW TRACKING!A2:C1000';
            const response = await gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: this.spreadsheetId,
                range: range
            });
            const values = response.result.values || [];

            const threeMonthsAgo = new Date();
            threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

            const filteredHistory = values.filter(row => {
                const locationMatch = row[1] === location;
                if (!locationMatch) return false;

                const timestamp = new Date(row[2]);
                return timestamp >= threeMonthsAgo;
            });

            const latestHistory = new Map();
            filteredHistory.forEach(row => {
                const userEmail = row[0];
                const timestamp = new Date(row[2]);

                if (!latestHistory.has(userEmail) || timestamp > new Date(latestHistory.get(userEmail)[2])) {
                    latestHistory.set(userEmail, row);
                }
            });

            const finalHistory = Array.from(latestHistory.values());

            if (finalHistory.length === 0) {
                historyLoading.style.display = 'none';
                historyContent.style.display = 'none';
                historyError.style.display = 'block';
                historyError.querySelector('p').textContent = 'Tidak ada riwayat kunjungan untuk lokasi ini dalam 3 bulan terakhir.';
                modal.style.display = 'block';
                return;
            }

            finalHistory.forEach(row => {
                const tr = document.createElement('tr');
                const userEmail = row[0] || '';
                const timestamp = row[2] || '';
                tr.innerHTML = `<td>${this.escapeHtml(userEmail)}</td><td>${this.escapeHtml(timestamp)}</td>`;
                historyTableBody.appendChild(tr);
            });

            historyLoading.style.display = 'none';
            historyContent.style.display = 'block';
            historyError.style.display = 'none';

            modal.style.display = 'block';

        } catch (error) {
            console.error('❌ Error loading view history:', error);
            this.showError('Gagal memuat riwayat: ' + error.message);
        }
    }

    async logViewHistory(userEmail, location) {
        try {
            if (!userEmail || !location) {
                console.warn('User email or location missing for logging view history');
                return;
            }
            const token = await ensureAuthenticatedGapiClient();
            if (!token || !token.access_token) {
                console.error('No access token available for logging view history');
                return;
            }
            const timestamp = new Date().toISOString();
            const values = [[userEmail, location, timestamp]];
            const range = 'USER VIEW TRACKING!A:C';

            const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ values: values })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error.message || 'Failed to append view history');
            }

            console.log('✅ Logged view history');
        } catch (error) {
            console.error('❌ Error logging view history:', error);
        }
    }

    async getSheetIdByName(sheetName) {
        try {
            const sheetInfo = await this.getSheetInfo();
            const sheet = sheetInfo.sheets.find(s => s.properties.title === sheetName);
            return sheet ? sheet.properties.sheetId : null;
        } catch (error) {
            console.error('❌ Get sheet ID error:', error);
            throw error;
        }
    }

    async getSheetInfo() {
        try {
            await ensureAuthenticatedGapiClient();
            const response = await gapi.client.sheets.spreadsheets.get({
                spreadsheetId: this.spreadsheetId
            });
            return response.result;
        } catch (error) {
            console.error('❌ Get sheet ID error:', error);
            throw error;
        }
    }

    async refreshData() {
        console.log('🔄 Refreshing data...');
        this.retryCount = 0;
        // Clear cache before refreshing
        localStorage.removeItem('mainData');
        localStorage.removeItem('monitoringData');
        localStorage.removeItem('governmentData');
        
        await this.loadData();
        await this.loadMonitoringData();
        await this.loadGovernmentData();
    }
}

// Global instance
let googleSheetsIntegration;

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM loaded, initializing Google Sheets Integration...');
    googleSheetsIntegration = new GoogleSheetsIntegration();
    window.googleSheetsIntegration = googleSheetsIntegration;
    const event = new CustomEvent('googleSheetsIntegrationReady');
    document.dispatchEvent(event);
});

function trackLocationView(customerName, odpTerdekat, address) {
    if (address && (address.startsWith('http://') || address.startsWith('https://'))) {
        window.open(address, '_blank');
    } else if (address) {
        window.open('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(address), '_blank');
    } else {
        alert('Alamat tidak tersedia.');
    }

    if (window.googleSheetsIntegration && typeof window.googleSheetsIntegration.logViewHistory === 'function') {
        const userEmail = currentUserEmail || '';
        const location = odpTerdekat || customerName || '';
        window.googleSheetsIntegration.logViewHistory(userEmail, location);
    }
}

function closeViewHistoryModal() {
    const modal = document.getElementById('viewHistoryModal');
    if (modal) modal.style.display = 'none';
}