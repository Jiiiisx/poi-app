import { authenticate } from './authMiddleware.js';
import { getSheetsClient, SPREADSHEET_ID } from './google-sheets-client.js';

export default async function handler(req, res) {
    const user = authenticate(req, res);
    if (!user) {
        return;
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Only GET requests are allowed' });
    }

    try {
        const sheets = await getSheetsClient();
        const range = "'Log Aktivitas'!A1:D1000";
        
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range,
        });
        
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
        res.status(200).json(response.data);
    } catch (error) {
        console.error('Error fetching history data:', error);
        res.status(500).json({ message: 'Failed to fetch history data', error: error.message });
    }
}
