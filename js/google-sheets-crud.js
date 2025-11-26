class GoogleSheetsCRUD {
    constructor() {
        this.spreadsheetId = '15Yu8_PcUFvrQFIL3qy7TfvDJNg4XPSbqPJOU6Wh8Q1A';
        this.sheetName = 'REKAP CALON PELANGGAN BY SPARTA';
    }

    async addCustomer(customerData) {
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            const googleIdToken = userInfo ? userInfo.token : null;

            if (!googleIdToken) {
                ModalHandler.show('Error', 'Otentikasi pengguna tidak ditemukan. Silakan login ulang.', 'error');
                throw new Error('User not authenticated');
            }

            const url = `/api?action=add-customer&t=${Date.now()}`;

            const requestBody = {
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
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${googleIdToken}`
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json();
                ModalHandler.show('Oops! Gagal Menyimpan', errorData.message, 'error');
                throw new Error(`Server returned ${response.status}`);
            }

            const result = await response.json();
            NotificationHandler.show('Customer added successfully!', 'success');
            return result;

        } catch (error) {
            // ModalHandler sudah menampilkan error di atas, jadi tidak perlu lagi di sini
            throw new Error(`Gagal menambah data: ${error.message}`);
        }
    }

    validateCustomerData(data) {
        const required = ['nama', 'no_telepon', 'alamat', 'odp_terdekat', 'nama_sales'];
        const missing = required.filter(field => !data[field] || data[field].trim() === '');
        
        if (missing.length > 0) {
            throw new Error(`Field wajib tidak lengkap: ${missing.join(', ')}`);
        }
        
        if (!/^[0-9]{10,13}$/.test(data.no_telepon)) {
            throw new Error('Nomor telepon harus 10-13 digit angka');
        }
        
        return true;
    }
}

const googleSheetsCRUD = new GoogleSheetsCRUD();

document.dispatchEvent(new CustomEvent('crudReady'));
window.googleSheetsCRUD = googleSheetsCRUD;