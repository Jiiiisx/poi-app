const { getSheetsClient, SPREADSHEET_ID } = require('../_google-sheets-client.js');

async function handleLogView(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Only POST requests are allowed' });
    }

    try {
        const { page } = req.body;
        if (!page) {
            return res.status(400).json({ message: 'Page path is required' });
        }

        const sheets = await getSheetsClient();
        const sheetName = 'Analytics';
        const timestamp = new Date().toISOString();

        const spreadsheetInfo = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
        const sheetExists = spreadsheetInfo.data.sheets.some(s => s.properties.title === sheetName);

        if (!sheetExists) {
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId: SPREADSHEET_ID,
                resource: {
                    requests: [{
                        addSheet: {
                            properties: {
                                title: sheetName
                            }
                        }
                    }]
                }
            });
            await sheets.spreadsheets.values.append({
                spreadsheetId: SPREADSHEET_ID,
                range: `${sheetName}!A1`,
                valueInputOption: 'USER_ENTERED',
                resource: {
                    values: [['Timestamp', 'Page']],
                },
            });
        }

        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: `${sheetName}!A:B`,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [[timestamp, page]],
            },
        });

        res.status(200).json({ message: 'View logged successfully' });
    } catch (error) {
        console.error('Error logging view:', error);
        res.status(500).json({ message: 'Failed to log view', error: error.message });
    }
}

module.exports = { handleLogView };