console.log("DEBUG: school-data-filter.js START");
class SchoolDataFilter {
    constructor(googleSheetsIntegration) {
        this.googleSheets = googleSheetsIntegration;
        this.schoolKeywords = [
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
        
        this.isActive = false;
        this.filteredData = {
            school: [],
            nonSchool: []
        };
        
        this.init();
    }

    init() {
        this.bindEvents();

        // Hook into googleSheetsIntegration refreshData to update filtered data after data load
        const originalRefreshData = this.googleSheets.refreshData.bind(this.googleSheets);
        this.googleSheets.refreshData = async () => {
            console.log('SchoolDataFilter: Overridden refreshData called.');
            await originalRefreshData();
            this.filterData();
            console.log(`SchoolDataFilter: isActive: ${this.isActive}, activeFilter: ${this.activeFilter}`);
            if (this.isActive) {
                if (this.activeFilter === 'school') {
                    console.log('SchoolDataFilter: Rendering school data after refreshData.');
                    this.googleSheets.renderTable(this.filteredData.school);
                } else if (this.activeFilter === 'nonSchool') {
                    console.log('SchoolDataFilter: Rendering non-school data after refreshData.');
                    this.googleSheets.renderTable(this.filteredData.nonSchool);
                } else {
                    console.log('SchoolDataFilter: Rendering all data after refreshData (activeFilter is all).');
                    this.googleSheets.renderTable();
                }
            }
        };

        // Initial filter data after setup
        this.filterData();
    }

    bindEvents() {
        console.log('Binding filter button events...');
        
        const btnTableShowAll = document.getElementById('btnTableShowAll');
        const btnTableShowSchool = document.getElementById('btnTableShowSchool');
        const btnTableShowNonSchool = document.getElementById('btnTableShowNonSchool');
        const btnTableShowGoverment = document.getElementById('btnTableShowGoverment');

        if (btnTableShowAll) {
            btnTableShowAll.addEventListener('click', () => {
                console.log('btnTableShowAll clicked');
                if (window.googleSheetsIntegration) {
                    window.googleSheetsIntegration.currentDataView = 'customer';
                    window.googleSheetsIntegration.applyCombinedFilters();
                }
                this.showAll();
            });
            console.log('btnTableShowAll event bound');
        }
        if (btnTableShowSchool) {
            btnTableShowSchool.addEventListener('click', () => {
                console.log('btnTableShowSchool clicked');
                if (window.googleSheetsIntegration) {
                    window.googleSheetsIntegration.currentDataView = 'customer';
                    window.googleSheetsIntegration.applyCombinedFilters();
                }
                this.showSchoolOnly();
            });
            console.log('btnTableShowSchool event bound');
        }
        if (btnTableShowNonSchool) {
            btnTableShowNonSchool.addEventListener('click', () => {
                console.log('btnTableShowNonSchool clicked');
                if (window.googleSheetsIntegration) {
                    window.googleSheetsIntegration.currentDataView = 'customer';
                    window.googleSheetsIntegration.applyCombinedFilters();
                }
                this.showNonSchoolOnly();
            });
            console.log('btnTableShowNonSchool event bound');
        }
        if (btnTableShowGoverment) {
            btnTableShowGoverment.addEventListener('click', () => {
                console.log('btnTableShowGoverment clicked');
                this.showGovernmentOnly();
            });
            console.log('btnTableShowGoverment event bound');
        }
    }

    showGovernmentOnly() {
        console.log('showGovernmentOnly called');
        this.isActive = true;
        this.activeFilter = 'government';

        // Set current data view to government and apply filters including sales filter
        if (window.googleSheetsIntegration) {
            window.googleSheetsIntegration.currentDataView = 'government';
            window.googleSheetsIntegration.applyCombinedFilters();
        } else {
            console.warn('googleSheetsIntegration not available');
        }

        this.setActiveButton('btnTableShowGoverment');
    }

    isSchoolData(row) {
        const searchText = `${row.nama || ''}`.toLowerCase();
        let isSchool = false; // Initialize to false
        
        // Limit logging to first few rows to avoid console spam
        if (this.googleSheets.originalData.indexOf(row) < 10) { // Log for first 10 rows
            console.log(`SchoolDataFilter: Debugging isSchoolData for row ${this.googleSheets.originalData.indexOf(row)}`);
            console.log(`SchoolDataFilter: SearchText for current row: "${searchText}"`);
        }

        const cleanedSearchText = searchText.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g," ").replace(/\s{2,}/g," ");

        if (cleanedSearchText.includes('.com')) {
            if (this.googleSheets.originalData.indexOf(row) < 10) {
                console.log(`SchoolDataFilter: Excluding row due to .com in text: "${cleanedSearchText}"`);
            }
            return false;
        }

        const matchedKeywords = [];

        isSchool = this.schoolKeywords.some(keyword => {
            const lowerCaseKeyword = keyword.toLowerCase();
            const regex = new RegExp('\\b' + lowerCaseKeyword + '\\b', 'i'); // Word boundaries on both sides, case-insensitive
            
            const testResult = regex.test(cleanedSearchText);
            
            if (testResult) {
                matchedKeywords.push(lowerCaseKeyword);
            }
            
            if (this.googleSheets.originalData.indexOf(row) < 10 || testResult) { // Log for first 10 rows or if matched
                console.log(`SchoolDataFilter: Testing keyword "${lowerCaseKeyword}" with regex /\\b${lowerCaseKeyword}\\b/i against "${cleanedSearchText}". Result: ${testResult}`);
            }
            
            return testResult;
        });

        if (matchedKeywords.length > 0) {
            console.log(`SchoolDataFilter: Matched keywords for row: ${matchedKeywords.join(', ')}`);
        }

        if (isSchool && !this.schoolKeywords.some(keyword => {
            const lowerCaseKeyword = keyword.toLowerCase();
            return cleanedSearchText.includes(lowerCaseKeyword);
        })) {
            console.warn(`SchoolDataFilter: Warning - Row classified as school but no keyword found in text: "${cleanedSearchText}"`);
        }
        
        if (this.googleSheets.originalData.indexOf(row) < 10) { // Log for first 10 rows
            console.log(`SchoolDataFilter: Final IsSchool for current row: ${isSchool}`);
        }
        
        return isSchool;
    }

filterData() {
    if (!this.googleSheets.originalData) {
        console.log('SchoolDataFilter: originalData is not available for filtering.');
        return;
    }
    
    this.filteredData.school = [];
    this.filteredData.nonSchool = [];
    
    this.googleSheets.originalData.forEach(row => {
        const isSchool = this.isSchoolData(row);
        if (isSchool) {
            this.filteredData.school.push(row);
        } else {
            this.filteredData.nonSchool.push(row);
        }
        console.log(`SchoolDataFilter: Row classified as ${isSchool ? 'school' : 'non-school'} - Name: "${row.nama}", Address: "${row.alamat}"`);
    });
    
    console.log(`SchoolDataFilter: filterData results - Original: ${this.googleSheets.originalData.length}, School: ${this.filteredData.school.length}, Non-School: ${this.filteredData.nonSchool.length}`);
}

    updateStats() {
        const stats = document.getElementById('filterStats');
        if (stats) {
            stats.textContent = `Total: ${this.googleSheets.originalData.length} | Sekolah: ${this.filteredData.school.length} | Non-Sekolah: ${this.filteredData.nonSchool.length}`;
        }
    }

    showAll() {
        console.log('showAll called');
        this.isActive = false;
        this.activeFilter = 'all';

        // Update GoogleSheetsIntegration filter state and apply combined filters
        this.googleSheets.currentSchoolFilter = 'all';
        if (typeof this.googleSheets.applyCombinedFilters === 'function') {
            this.googleSheets.applyCombinedFilters();
        } else {
            this.googleSheets.renderTable();
        }

        this.setActiveButton('btnTableShowAll');
    }

    showSchoolOnly() {
        console.log('showSchoolOnly called');
        this.isActive = true;
        this.activeFilter = 'school';

        // Update GoogleSheetsIntegration filter state and apply combined filters
        this.googleSheets.currentSchoolFilter = 'school';
        if (typeof this.googleSheets.applyCombinedFilters === 'function') {
            this.googleSheets.applyCombinedFilters();
        } else {
            this.googleSheets.renderTable(this.filteredData.school);
        }

        this.setActiveButton('btnTableShowSchool');
    }

    showNonSchoolOnly() {
        console.log('showNonSchoolOnly called');
        this.isActive = true;
        this.activeFilter = 'nonSchool';

        // Update GoogleSheetsIntegration filter state and apply combined filters
        this.googleSheets.currentSchoolFilter = 'nonSchool';
        if (typeof this.googleSheets.applyCombinedFilters === 'function') {
            this.googleSheets.applyCombinedFilters();
        } else {
            this.googleSheets.renderTable(this.filteredData.nonSchool);
        }

        this.setActiveButton('btnTableShowNonSchool');
    }

    setActiveButton(buttonId) {
        const allButtonIds = [
            'btnTableShowAll', 'btnTableShowSchool', 'btnTableShowNonSchool', 'btnTableShowGoverment'
        ];
        
        allButtonIds.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.classList.remove('active');
            }
        });
        
        const activeBtn = document.getElementById(buttonId);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
    }

    exportFilteredData(type) {
        let dataToExport;
        let filename;
        
        switch(type) {
            case 'school':
                dataToExport = this.filteredData.school;
                filename = 'data-sekolah.csv';
                break;
            case 'nonSchool':
                dataToExport = this.filteredData.nonSchool;
                filename = 'data-non-sekolah.csv';
                break;
            default:
                dataToExport = this.googleSheets.originalData;
                filename = 'semua-data.csv';
        }
        
        if (dataToExport.length === 0) {
            alert('Tidak ada data untuk diekspor');
            return;
        }
        
        this.downloadCSV(dataToExport, filename);
    }

    downloadCSV(data, filename) {
        const headers = ['ODP', 'Nama', 'Alamat', 'No Telepon', 'Nama Sales', 'Visit', 'Keterangan', 'Status', 'Keterangan Tambahan'];
        const csvContent = [
            headers.join(','),
            ...data.map(row => [
                row.odp_terdekat, row.nama, row.alamat, row.no_telepon, 
                row.nama_sales, row.visit, row.keterangan, row.status, row.keterangan_tambahan
            ].map(field => `"${(field || '').toString().replace(/"/g, '""')}"`).join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
    }
}

// CSS untuk filter buttons
const schoolFilterCSS = `
<style>
#schoolFilterContainer .btn {
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 14px;
}

#schoolFilterContainer .btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

#schoolFilterContainer .btn.active {
    transform: scale(1.05);
    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
}

#schoolFilterContainer .btn-primary {
    background: #007bff;
    color: white;
}

#schoolFilterContainer .btn-success {
    background: #28a745;
    color: white;
}

#schoolFilterContainer .btn-secondary {
    background: #6c757d;
    color: white;
}

.badge-school {
    background: #28a745;
    color: white;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 12px;
}

.badge-non-school {
    background: #6c757d;
    color: white;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 12px;
}
</style>
`;

// Inject CSS
document.head.insertAdjacentHTML('beforeend', schoolFilterCSS);

console.log('DEBUG: school-data-filter.js loaded (self-init removed)');

// Instantiate SchoolDataFilter with googleSheetsIntegration when available
document.addEventListener('googleSheetsIntegrationReady', function() {
    if (window.googleSheetsIntegration && !window.schoolDataFilter) {
        window.schoolDataFilter = new SchoolDataFilter(window.googleSheetsIntegration);
        console.log('SchoolDataFilter instance created and linked to googleSheetsIntegration');
    }
});
