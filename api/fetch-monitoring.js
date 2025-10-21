const { getSheetsClient, SPREADSHEET_ID, getNamedRangesMap } = require('./google-sheets-client');

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Only GET requests are allowed' });
    }

    try {
        const sheets = await getSheetsClient();
        const namedRangesMap = await getNamedRangesMap();

        const rangesQuery = req.query.ranges;
        if (!rangesQuery) {
            return res.status(400).json({ message: 'Missing ranges in request query string.' });
        }
        const namedRangesFromFrontend = rangesQuery.split(',');

        const a1Notations = namedRangesFromFrontend.map(namedRangeName => {
            const a1 = namedRangesMap[namedRangeName];
            if (!a1) {
                console.warn(`Named range "${namedRangeName}" not found.`);
                return null;
            }
            return a1;
        }).filter(a1 => a1 !== null);

        if (a1Notations.length === 0) {
            // Return 200 OK with empty data instead of 404, as the request was valid.
            return res.status(200).json({ valueRanges: [] });
        }

        console.log('A1 Notations for batchGet:', a1Notations); // Added for debugging
        const response = await sheets.spreadsheets.values.batchGet({
            spreadsheetId: SPREADSHEET_ID,
            ranges: a1Notations,
        });

        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
        res.status(200).json(response.data);

    } catch (error) {
        console.error('Error fetching monitoring data:', error);
        res.status(500).json({ message: 'Failed to fetch monitoring data', error: error.message });
    }
}
