const { getSheetsClient, SPREADSHEET_ID, logActivity } = require('./google-sheets-client');

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Only POST requests are allowed' });
    }

    const { rowIndex, sheetName, userEmail } = req.body;

    if (rowIndex === undefined || !sheetName || !userEmail) {
        return res.status(400).json({ message: 'Missing rowIndex, sheetName, or userEmail in request body' });
    }

    try {
        const sheets = await getSheetsClient();

        const spreadsheetInfo = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
        const sheet = spreadsheetInfo.data.sheets.find(s => s.properties.title === sheetName);

        if (!sheet) {
            return res.status(404).json({ message: `Sheet with name "${sheetName}" not found.` });
        }
        const sheetId = sheet.properties.sheetId;

        const response = await sheets.spreadsheets.batchUpdate({
            spreadsheetId: SPREADSHEET_ID,
            resource: {
                requests: [{
                    deleteDimension: {
                        range: {
                            sheetId: sheetId,
                            dimension: 'ROWS',
                            startIndex: parseInt(rowIndex) + 1, 
                            endIndex: parseInt(rowIndex) + 2
                        }
                    }
                }]
            }
        });

        await logActivity(userEmail, 'DELETE_ROW', { rowIndex, sheetName });

        res.status(200).json(response.data);
    } catch (error) {
        console.error('Error deleting row:', error);
        res.status(500).json({ message: 'Failed to delete row', error: error.message });
    }
}
