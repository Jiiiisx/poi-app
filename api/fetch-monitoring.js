const { getSheetsClient, SPREADSHEET_ID, getNamedRangesMap } = require('./google-sheets-client');

// Note: Vercel automatically parses JSON bodies, so we don't need express.json middleware.

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Only POST requests are allowed' });
    }

    try {
        const sheets = await getSheetsClient();
        const namedRangesMap = await getNamedRangesMap();

        const namedRangesFromFrontend = req.body.ranges;
        if (!namedRangesFromFrontend || !Array.isArray(namedRangesFromFrontend)) {
            return res.status(400).json({ message: 'Missing or invalid ranges in request body.' });
        }

        const a1Notations = namedRangesFromFrontend.map(namedRangeName => {
            const a1 = namedRangesMap[namedRangeName];
            if (!a1) {
                console.warn(`Named range "${namedRangeName}" not found.`);
                return null;
            }
            return a1;
        }).filter(a1 => a1 !== null);

        if (a1Notations.length === 0) {
            return res.status(404).json({ message: 'No valid named ranges found or resolved.' });
        }

        const response = await sheets.spreadsheets.values.batchGet({
            spreadsheetId: SPREADSHEET_ID,
            ranges: a1Notations,
        });

        // Add caching headers
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
        res.status(200).json(response.data);

    } catch (error) {
        console.error('Error fetching monitoring data:', error);
        res.status(500).json({ message: 'Failed to fetch monitoring data', error: error.message });
    }
}
