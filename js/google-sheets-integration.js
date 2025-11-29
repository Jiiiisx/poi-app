async function waitForGoogleSheetsCRUD(timeout = 5000) {
    const startTime = Date.now();
    while (!window.googleSheetsCRUD && Date.now() - startTime < timeout) {
        await new Promise(resolve => setTimeout(resolve, 100)); // wait 100ms
    }
    if (!window.googleSheetsCRUD) {
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
        this.monitoringDataBySales = {};
        this.monitoringDataHeadersBySales = {};

        this.isInitialized = false;
        this.retryCount = 0;
        this.maxRetries = 3;
        this.currentPage = 1;
        this.itemsPerPage = window.innerWidth <= 768 ? 10 : 25;
        this.totalPages = 1;

        this.currentSchoolFilter = 'all';
        this.currentSalesFilter = 'Home';
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
    }

    formatWhatsappNumber(phone) {
        if (!phone || typeof phone !== 'string') {
            return '';
        }
        let cleaned = phone.replace(/[^0-9]/g, '');
        if (cleaned.startsWith('0')) {
            cleaned = '62' + cleaned.substring(1);
        }
        return cleaned;
    }

    setCachedData(key, data) {
        try {
            const cacheEntry = {
                timestamp: Date.now(),
                data: data
            };
            localStorage.setItem(key, JSON.stringify(cacheEntry));
        } catch (e) {
        }
    }

    getCachedData(key, ttl = 5 * 60 * 1000) { 
        try {
            const cacheEntry = localStorage.getItem(key);
            if (!cacheEntry) return null;

            const { timestamp, data } = JSON.parse(cacheEntry);
            if (Date.now() - timestamp > ttl) {
                localStorage.removeItem(key);
                return null;
            }

            return data;
        } catch (e) {
            return null;
        }
    }

    async setup() {
        try {
            this.setupUIElements();
            await this.loadData();
            await this.loadMonitoringData();
            await this.loadGovernmentData();
            
            this.updateStats();
            this.updateUIVisibility();

        } catch (error) {
            this.handleLoadError(error);
            this.showError('Gagal menginisialisasi: ' + error.message);
        }
    }



    setupUIElements() {
        if (!document.getElementById('customerTable')) {
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
            const response = await fetch('/api?action=customer-data');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            if (!data.values || data.values.length === 0) {
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
            this.handleLoadError(error);
        } finally {
            this.showLoading(false);
        }
    }

    async loadMonitoringData() {
        // This method is intentionally left empty.
        // Monitoring data is now loaded on-demand by `ensureMonitoringDataForSales`
        // when a user selects a sales representative.
        return Promise.resolve();
    }

    async ensureMonitoringDataForSales(salesName) {
        const normalizedSalesName = salesName.toLowerCase();
        if (this.monitoringDataBySales[normalizedSalesName]) {
            return; // Data already loaded.
        }

        const rangeName = this.salesDataRanges[salesName];
        if (!rangeName) {
            this.showError(`Data range for sales '${salesName}' not found.`);
            return;
        }

        const cacheKey = `monitoringData_${normalizedSalesName}`;
        const cachedData = this.getCachedData(cacheKey);

        if (cachedData) {
            this.processMonitoringData(cachedData, [rangeName]);
            return;
        }

        const MAX_RETRIES = 2;
        let attempt = 0;
        while (attempt < MAX_RETRIES) {
            try {
                this.showLoading(true);
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 30000); // 30-second timeout

                const response = await fetch(`/api?action=fetch-monitoring&ranges=${rangeName}`, {
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();
                if (!data.valueRanges || data.valueRanges.length === 0) {
                    throw new Error("API returned no valueRanges.");
                }
                
                this.setCachedData(cacheKey, data);
                this.processMonitoringData(data, [rangeName]);
                return; // Success

            } catch (error) {
                attempt++;
                if (attempt >= MAX_RETRIES) {
                    this.showError(`Gagal memuat data untuk ${salesName}: ${error.message}`);
                } else {
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                }
            } finally {
                this.showLoading(false);
            }
        }
    }
    
    processMonitoringData(data, requestedRanges) {
        const rangeToSalesKey = Object.fromEntries(Object.entries(this.salesDataRanges).map(([k, v]) => [v, k]));

        data.valueRanges.forEach((valueRange, index) => {
            const requestedRangeName = requestedRanges[index];
            const salesName = rangeToSalesKey[requestedRangeName];

            if (!salesName) {
                return;
            }
            
            if (valueRange.values && valueRange.values.length > 1) {
                const rawData = valueRange.values;
                const headers = rawData[0].map(cell => cell.toString().trim());

                const rangeAddress = valueRange.range.split('!')[1];
                const startRowMatch = rangeAddress ? rangeAddress.match(/(\d+)/) : null;
                if (!startRowMatch) {
                    return;
                }
                const startRow = parseInt(startRowMatch[0]);
                
                const nameIndex = headers.findIndex(h => h.toLowerCase() === 'nama pelanggan');

                const tableRows = rawData.slice(1).filter(row => row[nameIndex] && row[nameIndex].trim() !== '').map((row, index) => {
                    const originalRowIndex = startRow + index + 1;
                    const rowData = { originalRowIndex };

                    headers.forEach((header, idx) => {
                        rowData[header] = this.sanitizeValue(row[idx] || '');
                    });

                    return rowData;
                });

                this.monitoringDataBySales[salesName.toLowerCase()] = tableRows;
                this.monitoringDataHeadersBySales[salesName.toLowerCase()] = headers;
            }
        });
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
            const response = await fetch('/api?action=government-data');

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            if (!data.values || data.values.length === 0) {
                this.showWarning('Tidak ada data di sheet pemerintah');
                this.originalGovernmentData = [];
                this.governmentData = [];
                return;
            }
            
            this.setCachedData(cacheKey, data.values);
            this.processGovernmentData(data.values);

        } catch (error) {
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
        document.dispatchEvent(new CustomEvent('governmentDataProcessed'));
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

        this.renderTable();
        this.updateSalesList();
        this.updateSalesDropdown();
        document.dispatchEvent(new CustomEvent('mainDataProcessed'));
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
                this.showError('Gagal memperbarui status: nilai status tidak valid.');
                return;
            }

            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            const googleIdToken = userInfo ? userInfo.token : null;

            if (!googleIdToken) {
                this.showError('Otentikasi pengguna tidak ditemukan. Silakan login ulang.');
                return;
            }

            const salesName = this.currentSalesFilter.toLowerCase();
            const headers = this.monitoringDataHeadersBySales[salesName];
            if (!headers) {
                this.showError('Gagal memperbarui: Headers tidak ditemukan.');
                return;
            }

            const colIndex = headers.indexOf(colHeader);
            if (colIndex === -1) {
                this.showError(`Gagal memperbarui status: Header kolom '${colHeader}' tidak ditemukan.`);
                return;
            }

            const colLetter = this.columnIndexToLetter(colIndex);
            const range = `'REKAP PS AR KALIABANG'!${colLetter}${rowIndex}`;

            const response = await fetch('/api?action=update-cell', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${googleIdToken}`
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
            actionsHeader.style.display = this.currentSalesFilter === 'Home' ? 'none' : '';
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

    _isNonPayment(status) {
        const lowerStatus = (status || '').toLowerCase();
        return lowerStatus === 'unpaid' || lowerStatus === 'zero billing' || lowerStatus === 'n/a' || lowerStatus === '';
    }

    _applyBillingFilter(data) {
        const salesName = this.currentSalesFilter.toLowerCase();
        const allHeaders = this.monitoringDataHeadersBySales[salesName] || [];
        const billingHeaders = allHeaders.filter(h => h.toLowerCase().startsWith('billing'));

        const countConsecutiveUnpaid = (item, sortedBillingHeaders) => {
            let consecutiveUnpaid = 0;
            for (let i = sortedBillingHeaders.length - 1; i >= 0; i--) {
                const header = sortedBillingHeaders[i];
                if (this._isNonPayment(item[header])) {
                    consecutiveUnpaid++;
                } else {
                    break; // Streak is broken
                }
            }
            return consecutiveUnpaid;
        };

        if (this.currentBillingFilter === 'pra npc' || this.currentBillingFilter === 'ct0') {
            const now = new Date();
            const sortedBillingHeaders = billingHeaders
                .filter(header => this._parseHeaderDate(header) <= now)
                .sort((a, b) => this._parseHeaderDate(a) - this._parseHeaderDate(b));

            return data.filter(item => {
                const unpaidCount = countConsecutiveUnpaid(item, sortedBillingHeaders);
                if (this.currentBillingFilter === 'pra npc') {
                    return unpaidCount === 2;
                }
                if (this.currentBillingFilter === 'ct0') {
                    return unpaidCount >= 3;
                }
                return false; // Should not be reached
            });
        }

        if (this.currentBillingFilter === 'all') {
            return data;
        }

        if (this.selectedBillingMonth !== 'all') {
            const currentBillingColumn = this.selectedBillingMonth;
            return data.filter(item => {
                const billingStatus = (item[currentBillingColumn] || 'n/a').toLowerCase();
                return billingStatus === this.currentBillingFilter;
            });
        } else {
            const currentMonthColumn = this.getCurrentMonthColumnName();
            if (allHeaders.map(h => h.toUpperCase()).includes(currentMonthColumn.toUpperCase())) {
                 return data.filter(item => {
                    const billingStatus = (item[currentMonthColumn] || 'n/a').toLowerCase();
                    return billingStatus === this.currentBillingFilter;
                });
            } else {
                return data.filter(item =>
                    billingHeaders.some(header => (item[header] || 'n/a').toLowerCase() === this.currentBillingFilter)
                );
            }
        }
    }

    _parseHeaderDate(header) {
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

        if (month === undefined || isNaN(year)) {
            return null;
        }

        return new Date(year + 2000, month);
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
                billingStatusHtml = '<div class="billing-history-grid">';
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
                        <div class="card-info-row"><strong>Tgl. Bayar:</strong> ${tanggalPembayaranHtml}</div>
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
        
        let visibleBillingHeaders = [];
        if (this.selectedBillingMonth !== 'all') {
            if (allHeaders.includes(this.selectedBillingMonth)) {
                visibleBillingHeaders.push(this.selectedBillingMonth);
            }
        } else {
            visibleBillingHeaders = allHeaders.filter(h => h.toLowerCase().startsWith('billing'));
        }

        this.monitoringTotalPages = Math.ceil(dataToRender.length / this.monitoringItemsPerPage);
        const startIndex = (this.monitoringCurrentPage - 1) * this.monitoringItemsPerPage;
        const endIndex = startIndex + this.monitoringItemsPerPage;
        const paginatedData = dataToRender.slice(startIndex, endIndex);

        thead.innerHTML = '';
        tbody.innerHTML = '';

        const staticHeaders = ['Nama Pelanggan', 'No Internet', 'No Customer', 'Redaman Loss', 'FUP', 'Histori Gangguan', 'Tanggal Pembayaran'];
        const dynamicHeaders = [...staticHeaders, ...visibleBillingHeaders];
        
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
                <td class="copyable-cell">
                    ${this.escapeHtml(item['No Internet'])}
                    <button class="btn-copy" onclick="googleSheetsIntegration.copyToClipboard('${this.escapeHtml(item['No Internet'] || '')}')" title="Copy">
                        <i class="fa-solid fa-copy"></i>
                    </button>
                </td>
                <td class="copyable-cell">
                    <a href="https://wa.me/${this.formatWhatsappNumber(item['No Customer'])}" target="_blank" class="btn-whatsapp" title="Chat on WhatsApp">
                        ${this.escapeHtml(item['No Customer'] || 'N/A')}
                    </a>
                    <button class="btn-copy" onclick="googleSheetsIntegration.copyToClipboard('${this.escapeHtml(item['No Customer'] || 'N/A')}')" title="Copy">
                        <i class="fa-solid fa-copy"></i>
                    </button>
                </td>
                <td>${this.escapeHtml(item['Redaman Loss'])}</td>
                <td>${fupHtml}</td>
                <td>${this.escapeHtml(item['Histori Gangguan'])}</td>
                <td>${tanggalPembayaranHtml}</td>
            `;

            visibleBillingHeaders.forEach(header => {
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

    copyToClipboard(text) {
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
            this.showMessage('Copied to clipboard!', 'success');
        }).catch(err => {
            this.showMessage('Failed to copy', 'error');
        });
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

    async _applySalesFilter(salesName, isNonTelda = false) {
        this.currentSalesFilter = salesName;

        // Ensure data is loaded on-demand before proceeding
        if (salesName && salesName !== 'Home') {
            try {
                await this.ensureMonitoringDataForSales(salesName);
            } catch (error) {
                // If data loading fails, show an error and clear the view.
                this.showError(`Gagal memuat data untuk ${salesName}: ${error.message}`);
                this.filteredMonitoringData = [];
                this.renderMonitoringView();
                return;
            }
        }
        
        this.toggleActionsColumn();
        this.applyCombinedFilters();

        document.dispatchEvent(new CustomEvent('salesViewChanged', { detail: { salesName: salesName } }));

        setTimeout(() => {
            if (isNonTelda) {
                this.updateNonTeldaSalesListActiveState(salesName);
            } else {
                this.updateSalesListActiveState(salesName);
            }
        }, 0);

        const activeFilterDisplay = document.getElementById('active-filter-display');
        if (activeFilterDisplay) {
            if (salesName && salesName !== 'Home') {
                activeFilterDisplay.innerHTML = `Filter: ${salesName} <button class="btn-remove-filter" onclick="googleSheetsIntegration.filterBySales('Home')">&times;</button>`;
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

        if (salesName && salesName !== 'Home') {
            if (tabNavigation && this.currentTeam === 'telda') {
                tabNavigation.style.display = 'flex';
            }

            const normalizedSalesName = salesName.toLowerCase();
            this.filteredMonitoringData = this.monitoringDataBySales[normalizedSalesName] || [];

            const availableHeaders = this.monitoringDataHeadersBySales[normalizedSalesName] || [];
            
            const billingHeaders = availableHeaders.filter(h => h.toLowerCase().startsWith('billing'));

            const currentMonthColumn = this.getCurrentMonthColumnName();
            const currentMonthHeader = billingHeaders.find(h => h.toUpperCase() === currentMonthColumn.toUpperCase());

            if (currentMonthHeader) {
                this.selectedBillingMonth = currentMonthHeader;
            } else {
                const sortedBillingHeaders = [...billingHeaders].sort((a, b) => {
                    const dateA = this._parseHeaderDate(a);
                    const dateB = this._parseHeaderDate(b);
                    if (!dateA && !dateB) return 0;
                    if (!dateA) return 1;
                    if (!dateB) return -1;
                    return dateB - dateA;
                });
                this.selectedBillingMonth = sortedBillingHeaders.length > 0 ? sortedBillingHeaders[0] : 'all';
            }

            this.populateMonthFilter(availableHeaders);
            this.monitoringCurrentPage = 1;
            
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
            if (tabNavigation) tabNavigation.style.display = 'none';

            const contentGrid = document.querySelector('.content-grid');
            const monitoringSection = document.getElementById('monthlyMonitoringSection');
            const salesSummarySection = document.getElementById('salesSummarySection');

            if(contentGrid) contentGrid.style.display = 'block';
            if(monitoringSection) monitoringSection.style.display = 'none';
            if(salesSummarySection) salesSummarySection.style.display = 'none';
        }

        if (typeof renderSalesPerformanceChart === 'function') {
            renderSalesPerformanceChart();
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

            if (this.currentSalesFilter && this.currentSalesFilter !== 'Home') {
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
                if (window.schoolDataFilter) {
                   filteredData = filteredData.filter(row => window.schoolDataFilter.isSchoolData(row));
                }
            } else if (this.currentSchoolFilter === 'nonSchool') {
                if (window.schoolDataFilter) {
                    filteredData = filteredData.filter(row => !window.schoolDataFilter.isSchoolData(row));
                }
            }

            if (this.currentSalesFilter && this.currentSalesFilter !== 'Home') {
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

        cardContainer.innerHTML = '';
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
        const table = document.getElementById('customerTable');
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

        const salesNames = ['Home', ...Array.from(salesNamesSet).sort()];

        salesList.innerHTML = '';
        const self = this;

        salesNames.forEach(name => {
            const li = document.createElement('li');
            li.className = 'sales-item';
            if (name === 'Home') li.classList.add('active');
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
        }
    }

    handleTeamChange(newTeam) {
        this.currentTeam = newTeam;
        this.updateUIVisibility();
        if (typeof renderSalesPerformanceChart === 'function') {
            renderSalesPerformanceChart();
        }
        if (newTeam === 'non-telda') {
            this.updateNonTeldaSalesList();
            this.filterBySales('TRI SUSANTOHADI', true);
            this.updateNonTeldaSalesListActiveState('TRI SUSANTOHADI');
        } else {
            this.updateSalesList();
            this.filterBySales('Home');
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

            const maxRetries = 3;
            let retryCount = 0;

            const loadImage = () => {
                const img = new Image();
                img.src = directImageUrl;
                img.alt = placeName;
                img.className = 'place-image';

                img.onload = () => {
                    imageContainer.innerHTML = '';
                    imageContainer.appendChild(img);
                };

                img.onerror = () => {
                    retryCount++;
                    if (retryCount < maxRetries) {
                        setTimeout(loadImage, 1000 * retryCount); // Wait longer each time
                    } else {
                        imageContainer.innerHTML = '<div class="no-image-placeholder">Gagal memuat</div>';
                    }
                };
            };

            loadImage();

        } else {
            imageContainer.innerHTML = '<div class="no-image-placeholder no-image-placeholder-enhanced"><i class="fas fa-image"></i><br>Tidak ada gambar</div>';
        }
    }

    showLoading(show) {
        const indicator = document.getElementById('loadingIndicator');
        if(indicator) indicator.style.display = show ? 'block' : 'none';
    }
    
    handleLoadError(error) {
        this.showError('Gagal memuat data: ' + error.message);
        this.loadFallbackData();
    }

    loadFallbackData() {
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
        const originalIndex = (typeof index === 'object' && index.originalIndex !== undefined) ? index.originalIndex : index;
        const rowData = this.originalData[originalIndex];
        if (!rowData) {
            this.showError('Gagal menyunting baris: Data tidak ditemukan.');
            return;
        }

        document.getElementById('editIndex').value = originalIndex;
        document.getElementById('editOdp').value = rowData.odp_terdekat;
        document.getElementById('editNama').value = rowData.nama;
        document.getElementById('editAlamat').value = rowData.alamat;
        document.getElementById('editTelepon').value = rowData.no_telepon;
        document.getElementById('editSales').value = rowData.nama_sales;
        document.getElementById('editVisit').value = rowData.visit;
        document.getElementById('editStatus').value = rowData.status;
        document.getElementById('editKeterangan').value = rowData.keterangan_tambahan;

        const modal = document.getElementById('editModal');
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    async saveEdit() {
        const index = document.getElementById('editIndex').value;
        const newRowData = {
            odp_terdekat: document.getElementById('editOdp').value,
            nama: document.getElementById('editNama').value,
            alamat: document.getElementById('editAlamat').value,
            no_telepon: document.getElementById('editTelepon').value,
            nama_sales: document.getElementById('editSales').value,
            visit: document.getElementById('editVisit').value,
            status: document.getElementById('editStatus').value,
            keterangan_tambahan: document.getElementById('editKeterangan').value,
            tanggal_ditambahkan: this.originalData[index].tanggal_ditambahkan,
            image_url: this.originalData[index].image_url
        };

        try {
            await window.googleSheetsCRUD.updateRow(parseInt(index) + 2, newRowData);
            this.originalData[index] = newRowData;
            this.applyCombinedFilters();
            document.getElementById('editModal').style.display = 'none';
            this.showMessage('Data berhasil diperbarui', 'success');
        } catch (error) {
            this.showError('Gagal menyimpan perubahan: ' + error.message);
        }
    }

    async deleteRow(index) {
        const confirmed = await Swal.fire({
            title: 'Anda yakin?',
            text: "Anda tidak akan dapat mengembalikan ini!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Ya, hapus!'
        });

        if (confirmed.isConfirmed) {
            try {
                await window.googleSheetsCRUD.deleteRow(parseInt(index) + 2);
                this.originalData.splice(index, 1);
                this.applyCombinedFilters();
                Swal.fire('Terhapus!', 'Data telah dihapus.', 'success');
            } catch (error) {
                this.showError('Gagal menghapus data: ' + error.message);
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await waitForGoogleSheetsCRUD();
        window.googleSheetsIntegration = new GoogleSheetsIntegration();
        await window.googleSheetsIntegration.setup();

        const salesList = document.querySelector('.sales-list');
        if (salesList) {
            salesList.addEventListener('click', function(e) {
                if (e.target.closest('.sales-item')) {
                    const item = e.target.closest('.sales-item');
                    const salesName = item.dataset.salesName;
                    
                    if (salesName !== 'Home') {
                        if (window.switchToTab) {
                           window.switchToTab('monitoring');
                        }
                    } else {
                        const contentGrid = document.querySelector('.content-grid');
                        const monitoringSection = document.getElementById('monthlyMonitoringSection');
                        const salesSummarySection = document.getElementById('salesSummarySection');

                        if(contentGrid) contentGrid.style.display = 'block';
                        if(monitoringSection) monitoringSection.style.display = 'none';
                        if(salesSummarySection) salesSummarySection.style.display = 'none';
                    }

                    window.googleSheetsIntegration.filterBySales(salesName);
                }
            });
        }
        
    } catch (error) {
        const loadingIndicator = document.getElementById('loadingIndicator');
        if (loadingIndicator) {
            loadingIndicator.innerHTML = `<p style="color: red;">${error.message}</p>`;
        }
    }
});

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function assignRowToSales(rowId) {
    document.getElementById('assignRowId').value = rowId;
    const modal = document.getElementById('assignModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

async function saveAssignment() {
    const rowId = document.getElementById('assignRowId').value;
    const salesName = document.getElementById('assignedSales').value;
    if (!salesName) {
        alert('Silakan pilih sales.');
        return;
    }
    
    // Implement logic to update Google Sheet with the assigned sales name for the given rowId
    // This is a placeholder for the actual implementation
    closeModal('assignModal');
}
