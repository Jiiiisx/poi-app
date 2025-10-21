const { getSheetsClient, SPREADSHEET_ID, logActivity } = require('./google-sheets-client');

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Only POST requests are allowed' });
    }

    // TODO: Add validation logic here, since express-validator is not available.
    const { rowIndex, values, userEmail } = req.body;

    if (rowIndex === undefined || !values || !userEmail) {
        return res.status(400).json({ message: 'Missing rowIndex, values, or userEmail in request body' });
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

        await logActivity(userEmail, 'UPDATE_CUSTOMER', { rowIndex, values });

        res.status(200).json(response.data);
    } catch (error) {
        console.error('Error updating customer:', error);
        res.status(500).json({ message: 'Failed to update customer', error: error.message });
    }
}
