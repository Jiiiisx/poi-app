document.addEventListener('DOMContentLoaded', function () {
    const customerNameEl = document.getElementById('customer-name');
    const customerStatusEl = document.getElementById('customer-status');
    const customerNoInternetEl = document.getElementById('customer-no-internet');
    const customerAddressEl = document.getElementById('customer-address');
    const customerSalesEl = document.getElementById('customer-sales');
    const currentMonthStatusEl = document.getElementById('current-month-status');
    const totalPaid12mEl = document.getElementById('total-paid-12m');
    const lastPaymentDateEl = document.getElementById('last-payment-date');
    const paymentHistoryBodyEl = document.getElementById('payment-history-body');
    const customerNotesEl = document.getElementById('customer-notes');
    const saveNotesBtn = document.getElementById('save-notes-btn');

    const urlParams = new URLSearchParams(window.location.search);
    const customerName = urlParams.get('name');

    if (!customerName) {
        customerNameEl.textContent = 'Pelanggan Tidak Ditemukan';
        return;
    }

    const decodedCustomerName = decodeURIComponent(customerName);
    customerNameEl.textContent = decodedCustomerName;
    document.title = `Profil: ${decodedCustomerName}`;

    const salesDataRanges = {
        'Andi': 'AndiData', 'April': 'AprilData', 'Nandi': 'NandiData', 'Octa': 'OctaData',
        'Yandi': 'YandiData', 'Totong': 'TotongData', 'Yusdhi': 'YusdhiData', 'Nursyarif': 'NursyarifData',
        'Reynaldi': 'ReynaldiData', 'Andri': 'AndriData', 'Tri Susantohadi': 'TriSusantohadiData',
        'Dedi Kurniawan': 'DediKurniawanData', 'Muhammad Arifin': 'MuhammadArifinData', 'Fajar Sodik': 'FajarSodikData',
        'Ichrima': 'IchrimaData', 'Muhamad Ferdi Ridwan': 'MuhamadFerdiRidwanData', 'Suprihatin': 'SuprihatinData',
        'Fini Fadilah Handayani': 'FiniFadilahHandayaniData', 'Hinduntomy Wijaya': 'HinduntomyWijayaData'
    };

    async function loadCustomerProfile() {
        console.log(`Fetching profile for: ${decodedCustomerName}`);

        try {
            const requestedRanges = Object.values(salesDataRanges);
            const ranges = requestedRanges.join(',');
            const response = await fetch(`/api/fetch-monitoring?ranges=${ranges}`);

            if (!response.ok) {
                throw new Error('Failed to load monitoring data.');
            }

            const data = await response.json();
            findAndRenderCustomer(data);

        } catch (error) {
            console.error('Error loading customer profile:', error);
            customerNameEl.textContent = 'Gagal memuat data pelanggan.';
        }
    }

    function findAndRenderCustomer(data) {
        const rangeToSalesKey = Object.fromEntries(Object.entries(salesDataRanges).map(a => a.reverse()));
        const requestedRanges = Object.values(salesDataRanges);
        let customerData = null;
        let customerSales = null;
        let customerHeaders = null;

        if (data.valueRanges) {
            for (const [index, valueRange] of data.valueRanges.entries()) {
                const salesName = rangeToSalesKey[requestedRanges[index]];
                if (salesName && valueRange.values && valueRange.values.length > 1) {
                    const headers = valueRange.values[0];
                    const nameIndex = headers.findIndex(h => h.toLowerCase() === 'nama pelanggan');
                    
                    if (nameIndex !== -1) {
                        const foundRow = valueRange.values.slice(1).find(row => row[nameIndex] === decodedCustomerName);
                        if (foundRow) {
                            customerData = {};
                            headers.forEach((header, i) => {
                                customerData[header] = foundRow[i] || '';
                            });
                            customerSales = salesName;
                            customerHeaders = headers;
                            break; // Stop searching once found
                        }
                    }
                }
            }
        }

        if (customerData) {
            console.log('Found customer data:', customerData);
            renderProfile(customerData, customerSales, customerHeaders);
        } else {
            console.log('Customer not found in any sales sheet.');
            customerNameEl.textContent = `Pelanggan "${decodedCustomerName}" tidak ditemukan.`;
        }
    }

    function renderProfile(data, sales, headers) {
        // Render details
        customerSalesEl.textContent = sales || '-';
        customerNoInternetEl.textContent = data['Nomor Internet'] || '-';
        customerAddressEl.textContent = data['Alamat'] || '-';

        // Payment history and stats
        const paymentHistory = [];
        const billingHeaders = headers.filter(h => h.toLowerCase().startsWith('billing')).sort((a, b) => _parseHeaderDate(a) - _parseHeaderDate(b));
        
        let paidMonths = 0;
        let lastPayment = null;

        billingHeaders.forEach(header => {
            const status = data[header] ? data[header].toLowerCase() : 'n/a';
            if (status === 'paid') {
                paidMonths++;
                lastPayment = header;
            }
            paymentHistory.push({ month: header.replace('Billing ', ''), status });
        });

        // Render payment history table
        paymentHistoryBodyEl.innerHTML = paymentHistory.reverse().map(p => `
            <tr>
                <td>${p.month}</td>
                <td><span class="status-cell status-${p.status}">${p.status}</span></td>
                <td>-</td>
            </tr>
        `).join('');

        // Render stats
        const currentMonthHeader = `Billing ${new Date().toLocaleString('default', { month: 'short' })} '${String(new Date().getFullYear()).slice(-2)}`;
        currentMonthStatusEl.textContent = data[currentMonthHeader] || 'N/A';
        totalPaid12mEl.textContent = `${paidMonths} Bulan`;
        lastPaymentDateEl.textContent = lastPayment ? lastPayment.replace('Billing ', '') : '-';

        // Notes - for now, just load from a notes column if it exists
        customerNotesEl.value = data['Catatan'] || '';
    }

    function _parseHeaderDate(header) {
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
        if (month === undefined || isNaN(year)) { return null; }
        return new Date(year + 2000, month);
    }

    loadCustomerProfile();
});