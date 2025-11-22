const { authenticate } = require('../_authMiddleware.js');
const { getSheetsClient, SPREADSHEET_ID } = require('../_google-sheets-client.js');

async function handleAdminUpdateCell(req, res) {
    // Menggunakan otentikasi ADMIN yang benar
    const user = authenticate(req, res);
    if (!user) {
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Only POST requests are allowed' });
    }

    const { range, value } = req.body;

    if (!range || value === undefined) {
        return res.status(400).json({ message: 'Missing "range" or "value" in request body' });
    }

    try {
        const sheets = await getSheetsClient();
        const response = await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: range,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [[value]],
            },
        });

        res.status(200).json(response.data);
    } catch (error) {
        console.error('Error updating cell (admin):', error);
        res.status(500).json({ message: 'Failed to update cell', error: error.message });
    }
}

module.exports = { handleAdminUpdateCell };
