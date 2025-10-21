let allCustomerData = [];
let filteredCustomerData = []; // Data after search and school/non-school filter
let currentPage = 1;
const itemsPerPage = 25;
let customerTableContainer = null; // To store the container element
let tableHeaders = []; // To store headers globally
let currentSearchTerm = '';
let currentSchoolFilter = 'all'; // 'all', 'school', 'nonSchool'

// --- SchoolDataFilter Logic (Integrated) ---
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
    'INSTITUT AGAMA ISLAM', 'INSTITUT TEKNOLOGI', 'INSTITUT SENI', 'ROUDHOTUL', 'GLORIA 2', 'YAYASAN', 'SDIT', 'KINDERGROW', 'SLB', 'KELOMPOK BERMAIN', 'BERKLEE AZRA',
    'EDUCATION', 'LEARNING', 'ACADEMI', 'FITSTEP', 'TAHFIDZ', 'DRIVING', 'THERESIA', 'BIMBA', 'ROBOTICS'
];

let schoolFilteredData = {
    school: [],
    nonSchool: []
};

function isSchoolData(row) {
    const namaCalonPelangganIndex = tableHeaders.indexOf('Nama Calon Pelanggan');
    if (namaCalonPelangganIndex === -1) return false; // Should not happen if headers are loaded

    const searchText = String(row[namaCalonPelangganIndex] || '').toLowerCase();
    console.log(`isSchoolData: Processing searchText: "${searchText}"`);

    const cleanedSearchText = searchText.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, " ").replace(/\s{2,}/g, " ");
    console.log(`isSchoolData: Cleaned searchText: "${cleanedSearchText}"`);

    if (cleanedSearchText.includes('.com')) {
        console.log(`isSchoolData: Excluded due to .com: "${cleanedSearchText}"`);
        return false;
    }

    const isSchool = schoolKeywords.some(keyword => {
        const lowerCaseKeyword = keyword.toLowerCase();
        const regex = new RegExp(lowerCaseKeyword, 'i'); // Removed word boundaries for more flexible matching
        const match = regex.test(cleanedSearchText);
        if (match) {
            console.log(`isSchoolData: Matched keyword: "${keyword}" in "${cleanedSearchText}"`);
        }
        return match;
    });
    console.log(`isSchoolData: Final result for "${searchText}": ${isSchool}`);
    return isSchool;
}

function filterSchoolData() {
    schoolFilteredData.school = [];
    schoolFilteredData.nonSchool = [];

    allCustomerData.forEach(row => {
        if (isSchoolData(row)) {
            schoolFilteredData.school.push(row);
        } else {
            schoolFilteredData.nonSchool.push(row);
        }
    });
}

function updateFilterStats() {
    const stats = document.getElementById('filterStats');
    if (stats) {
        stats.textContent = `Total: ${allCustomerData.length} | Sekolah: ${schoolFilteredData.school.length} | Non-Sekolah: ${schoolFilteredData.nonSchool.length}`;
    }
}

function setActiveButton(buttonId) {
    const allButtonIds = [
        'btnTableShowAll', 'btnTableShowSchool', 'btnTableShowNonSchool'
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

// --- Main Dashboard Logic ---
document.addEventListener('DOMContentLoaded', () => {
    console.log('Internal dashboard script loaded.');
    customerTableContainer = document.getElementById('customer-table-container');

    loadCustomerData();

    // Add event listeners for pagination buttons
    document.getElementById('prevPage').addEventListener('click', goToPreviousPage);
    document.getElementById('nextPage').addEventListener('click', goToNextPage);

    // Add event listener for search input
    document.getElementById('searchInput').addEventListener('input', (event) => {
        currentSearchTerm = event.target.value.toLowerCase();
        applyAllFilters();
    });

    // Add event listeners for filter buttons
    document.getElementById('btnTableShowAll').addEventListener('click', () => {
        currentSchoolFilter = 'all';
        setActiveButton('btnTableShowAll');
        applyAllFilters();
    });
    document.getElementById('btnTableShowSchool').addEventListener('click', () => {
        currentSchoolFilter = 'school';
        setActiveButton('btnTableShowSchool');
        applyAllFilters();
    });
    document.getElementById('btnTableShowNonSchool').addEventListener('click', () => {
        currentSchoolFilter = 'nonSchool';
        setActiveButton('btnTableShowNonSchool');
        applyAllFilters();
    });
});

async function loadCustomerData() {
    if (!customerTableContainer) return; // Ensure container is available

    try {
        const response = await fetch('/api/customer-data');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        if (data.values && data.values.length > 1) {
            tableHeaders = data.values[0];
            allCustomerData = data.values.slice(1);
            filterSchoolData(); // Initial school/non-school classification
            updateFilterStats();
            applyAllFilters(); // Apply all filters initially
        } else {
            customerTableContainer.innerHTML = '<p>No customer data found.</p>';
        }
    } catch (error) {
        console.error('Error fetching customer data:', error);
        customerTableContainer.innerHTML = '<p class="error">Failed to load customer data. Please try again later.</p>';
    }
}

function applyAllFilters() {
    let dataToFilter = [...allCustomerData];

    // Apply school/non-school filter
    if (currentSchoolFilter === 'school') {
        dataToFilter = schoolFilteredData.school;
    } else if (currentSchoolFilter === 'nonSchool') {
        dataToFilter = schoolFilteredData.nonSchool;
    }

    // Apply search filter
    if (currentSearchTerm) {
        dataToFilter = dataToFilter.filter(row => {
            // Assuming all cells in a row should be searched
            return row.some(cell => String(cell).toLowerCase().includes(currentSearchTerm));
        });
    }

    filteredCustomerData = dataToFilter;
    currentPage = 1; // Reset to first page after filtering
    displayPage(currentPage);
    updateFilterStats(); // Update stats after filtering
}

function displayPage(page) {
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = filteredCustomerData.slice(startIndex, endIndex);

    renderCustomerTable(customerTableContainer, tableHeaders, paginatedData);
    updatePaginationControls(filteredCustomerData.length);
}

function goToPreviousPage() {
    if (currentPage > 1) {
        currentPage--;
        displayPage(currentPage);
    }
}

function goToNextPage() {
    const totalPages = Math.ceil(filteredCustomerData.length / itemsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        displayPage(currentPage);
    }
}

function updatePaginationControls(totalItems) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    document.getElementById('pageInfo').textContent = `Page ${currentPage} of ${totalPages}`;
    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = currentPage === totalPages;
}

function renderCustomerTable(container, headers, rows) {
    let tableHtml = '<table class="customer-table">';
    
    // Find the index of specific columns
    const alamatIndex = headers.indexOf('Alamat');
    const noTelpIndex = headers.indexOf('No. Telp');
    const urlGambarIndex = headers.indexOf('URL Gambar');

    // Table Head
    tableHtml += '<thead><tr>';
    headers.forEach(header => {
        tableHtml += `<th>${header}</th>`;
    });
    tableHtml += '</tr></thead>';

    // Table Body
    tableHtml += '<tbody>';
    rows.forEach((row, rowIndex) => {
        // Calculate the actual row index in the Google Sheet for updating
        // This needs to be the original index from allCustomerData, not just the paginated/filtered index
        const originalRowIndex = allCustomerData.indexOf(row); // Find the original index of the row
        tableHtml += `<tr data-row-index="${originalRowIndex}">`;
        row.forEach((cell, colIndex) => {
            // Add data-col-index to each td for easy identification
            if (colIndex === alamatIndex && String(cell).startsWith('https://www.google.com/maps')) {
                tableHtml += `<td data-col-index="${colIndex}"><a href="${cell}" target="_blank">View on Map</a></td>`;
            } else if (colIndex === noTelpIndex && String(cell).match(/^\+?\d{7,15}$/)) { // Basic phone number regex
                tableHtml += `<td data-col-index="${colIndex}"><a href="tel:${cell}">${cell}</a></td>`;
            } else if (colIndex === urlGambarIndex && String(cell).startsWith('http')) {
                tableHtml += `<td data-col-index="${colIndex}"><a href="${cell}" target="_blank">View Image</a></td>`;
            } else {
                tableHtml += `<td data-col-index="${colIndex}">${cell}</td>`;
            }
        });
        tableHtml += '</tr>';
    });
    tableHtml += '</tbody>';

    tableHtml += '</table>';

    container.innerHTML = tableHtml;

    // Add event listener for inline editing (only once, after the table is rendered)
    const customerTable = container.querySelector('.customer-table');
    if (customerTable && !customerTable.dataset.listenerAdded) {
        customerTable.dataset.listenerAdded = 'true'; // Mark that listener is added
        customerTable.addEventListener('click', async (event) => {
            const target = event.target;
            // Ensure we click on a td, not a link inside it
            if (target.tagName === 'TD' && !target.querySelector('a')) {
                const originalValue = target.textContent;
                const rowIndex = target.closest('tr').dataset.rowIndex; // This is the original index
                const colIndex = target.dataset.colIndex;

                // Create an input field
                const input = document.createElement('input');
                input.type = 'text';
                input.value = originalValue;
                input.className = 'editable-cell-input';

                // Replace td content with input
                target.innerHTML = '';
                target.appendChild(input);
                input.focus();

                const saveChanges = async () => {
                    const newValue = input.value;
                    if (newValue === originalValue) {
                        target.textContent = originalValue; // Revert if no change
                        return;
                    }

                    // Determine the Google Sheet A1 notation range
                    // Assuming data starts from row 2 (0-indexed row 0 in JS is row 1 in sheet, plus header row)
                    const sheetRow = parseInt(rowIndex) + 2; // +1 for 0-indexed to 1-indexed, +1 for header row
                    const sheetCol = String.fromCharCode(65 + parseInt(colIndex)); // Convert 0-indexed col to A, B, C...
                    const range = `'REKAP CALON PELANGGAN BY SPARTA'!${sheetCol}${sheetRow}`;

                    try {
                        const response = await fetch('/api/update-cell', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ range, value: newValue }),
                        });

                        if (!response.ok) {
                            const errorData = await response.json();
                            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
                        }

                        target.textContent = newValue; // Update cell with new value
                        console.log('Cell updated successfully!');
                    } catch (error) {
                        console.error('Error updating cell:', error);
                        target.textContent = originalValue; // Revert on error
                        alert('Failed to update cell: ' + error.message);
                    }
                };

                // Save on blur
                input.addEventListener('blur', saveChanges);

                // Save on Enter key press
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        input.blur(); // Trigger blur event to save changes
                    }
                });
            }
        });
    }
}