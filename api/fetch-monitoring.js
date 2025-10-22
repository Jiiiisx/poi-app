const { getSheetsClient, SPREADSHEET_ID } = require('./google-sheets-client');

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Only GET requests are allowed' });
    }

    try {
        const sheets = await getSheetsClient();
        
        const rangesQuery = req.query.ranges;
        if (!rangesQuery) {
            return res.status(400).json({ message: 'Missing ranges in request query string.' });
        }
        const namedRangesFromFrontend = rangesQuery.split(',');

        if (namedRangesFromFrontend.length === 0) {
            return res.status(200).json({ valueRanges: [] });
        }

        // Directly use the named ranges from the frontend in the batchGet call.
        // The Google Sheets API can resolve named ranges by itself.
        const response = await sheets.spreadsheets.values.batchGet({
            spreadsheetId: SPREADSHEET_ID,
            ranges: namedRangesFromFrontend,
        });

        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
        res.status(200).json(response.data);

    } catch (error) {
        console.error('Error fetching monitoring data:', error);
        // The error from Google's API might contain useful info if a named range is not found.
        res.status(500).json({ message: 'Failed to fetch monitoring data', error: error.message });
    }
}