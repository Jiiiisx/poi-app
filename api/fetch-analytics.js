const { getSheetsClient, SPREADSHEET_ID } = require('./google-sheets-client');

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Only GET requests are allowed' });
    }

    try {
        const sheets = await getSheetsClient();
        const range = "'Analytics'!A1:B"; // Read all data from columns A and B
        
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range,
        });
        
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
        res.status(200).json(response.data);
    } catch (error) {
        // If the sheet doesn't exist, it will throw an error. Return an empty array.
        if (error.code === 400 && error.errors[0].message.includes('Unable to parse range')) {
            return res.status(200).json({ values: [] });
        }
        console.error('Error fetching analytics data:', error);
        res.status(500).json({ message: 'Failed to fetch analytics data', error: error.message });
    }
}
