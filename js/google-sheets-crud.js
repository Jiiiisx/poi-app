class GoogleSheetsCRUD {
    constructor() {
        this.spreadsheetId = '15Yu8_PcUFvrQFIL3qy7TfvDJNg4XPSbqPJOU6Wh8Q1A';
        this.sheetName = 'REKAP CALON PELANGGAN BY SPARTA';
    }

    // CREATE - Menambah data baru via backend
    async addCustomer(customerData) {
        try {
            const url = `/api/add-customer?t=${Date.now()}`;

            // The backend expects an object with a 'values' property which is an array.
            const requestBody = {
                userEmail: window.currentUserEmail, // Added for audit trail
                values: [
                    customerData.odp_terdekat,
                    customerData.nama,
                    customerData.alamat,
                    customerData.no_telepon,
                    customerData.nama_sales,
                    customerData.visit,
                    customerData.status,
                    customerData.keterangan_tambahan
                ]
            };

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
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

            const result = await response.json();
            NotificationHandler.show('Customer added successfully!', 'success');
            return result;

        } catch (error) {
            console.error('Add customer error:', error);
            ModalHandler.show('Error', `Failed to add data: ${error.message}`);
            throw new Error(`Gagal menambah data: ${error.message}`);
        }
    }

    // Validation functions
    validateCustomerData(data) {
        const required = ['nama', 'no_telepon', 'alamat', 'odp_terdekat', 'nama_sales'];
        const missing = required.filter(field => !data[field] || data[field].trim() === '');
        
        if (missing.length > 0) {
            throw new Error(`Field wajib tidak lengkap: ${missing.join(', ')}`);
        }
        
        // Validasi nomor telepon
        if (!/^[0-9]{10,13}$/.test(data.no_telepon)) {
            throw new Error('Nomor telepon harus 10-13 digit angka');
        }
        
        return true;
    }
}

const googleSheetsCRUD = new GoogleSheetsCRUD();

document.dispatchEvent(new CustomEvent('crudReady'));
window.googleSheetsCRUD = googleSheetsCRUD;

