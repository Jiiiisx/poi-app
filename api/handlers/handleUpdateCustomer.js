const { authenticate } = require('../_authMiddleware.js');
const { getSheetsClient, SPREADSHEET_ID, logActivity } = require('../_google-sheets-client.js');

async function handleUpdateCustomer(req, res) {
    const user = authenticate(req, res);
    if (!user) {
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Only POST requests are allowed' });
    }

    const { rowIndex, values } = req.body;

    if (rowIndex === undefined || !values) {
        return res.status(400).json({ message: 'Missing rowIndex or values in request body' });
    }

    try {
        const sheets = await getSheetsClient();
        const range = `'REKAP CALON PELANGGAN BY SPARTA'!A${parseInt(rowIndex) + 2}:H${parseInt(rowIndex) + 2}`;

        const response = await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: range,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [values],
            },
        });

        await logActivity(user.username, 'UPDATE_CUSTOMER', { rowIndex, values });

        res.status(200).json(response.data);
    } catch (error) {
        console.error('Error updating customer:', error);
        res.status(500).json({ message: 'Failed to update customer', error: error.message });
    }
}

module.exports = { handleUpdateCustomer };