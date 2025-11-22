const { authenticate } = require('../_authMiddleware.js');
const { getSheetsClient, SPREADSHEET_ID } = require('../_google-sheets-client.js');

async function handleFetchAnalytics(req, res) {
    const user = authenticate(req, res);
    if (!user) {
        return;
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Only GET requests are allowed' });
    }

    try {
        const sheets = await getSheetsClient();
        const range = "'Analytics'!A1:B";
        
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range,
        });
        
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
        res.status(200).json(response.data);
    } catch (error) {
        if (error.code === 400 && error.errors[0].message.includes('Unable to parse range')) {
            return res.status(200).json({ values: [] });
        }
        console.error('Error fetching analytics data:', error);
        res.status(500).json({ message: 'Failed to fetch analytics data', error: error.message });
    }
}

module.exports = { handleFetchAnalytics };
