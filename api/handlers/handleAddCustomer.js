const { authenticate } = require('../_authMiddleware.js');
const { getSheetsClient, SPREADSHEET_ID, logActivity } = require('../_google-sheets-client.js');

async function handleAddCustomer(req, res) {
    const user = authenticate(req, res);
    if (!user) {
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Only POST requests are allowed' });
    }

    const { values } = req.body;

    if (!values) {
        return res.status(400).json({ message: 'Missing values in request body' });
    }

    try {
        const sheets = await getSheetsClient();
        const response = await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: "'REKAP CALON PELANGGAN BY SPARTA'!A:H",
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [values],
            },
        });

        await logActivity(user.username, 'ADD_CUSTOMER', { values });

        res.status(200).json(response.data);
    } catch (error) {
        console.error('Error adding customer:', error);
        res.status(500).json({ message: 'Failed to add customer', error: error.message });
    }
}

module.exports = { handleAddCustomer };
