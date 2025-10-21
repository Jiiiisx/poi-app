const { getSheetsClient, SPREADSHEET_ID } = require('./google-sheets-client');

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Only GET requests are allowed' });
    }

    try {
        const sheets = await getSheetsClient();
        const range = "'REKAP CALON PELANGGAN BY SPARTA'!A1:J1000";
        
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range,
        });
        
        // Add caching headers
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
        res.status(200).json(response.data);
    } catch (error) {
        console.error('Error fetching customer data:', error);
        res.status(500).json({ message: 'Failed to fetch customer data', error: error.message });
    }
}
