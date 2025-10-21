const { getSheetsClient, SPREADSHEET_ID, logActivity } = require('./google-sheets-client');

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Only POST requests are allowed' });
    }

    // TODO: Add validation logic here, since express-validator is not available.
    const { values, userEmail } = req.body;

    if (!values || !userEmail) {
        return res.status(400).json({ message: 'Missing values or userEmail in request body' });
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

        await logActivity(userEmail, 'ADD_CUSTOMER', { values });

        res.status(200).json(response.data);
    } catch (error) {
        console.error('Error adding customer:', error);
        res.status(500).json({ message: 'Failed to add customer', error: error.message });
    }
}
