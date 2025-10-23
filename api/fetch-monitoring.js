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
        const requestedRanges = rangesQuery.split(',');

        if (requestedRanges.length === 0) {
            return res.status(200).json({ valueRanges: [] });
        }

        const promises = requestedRanges.map(range =>
            sheets.spreadsheets.values.get({
                spreadsheetId: SPREADSHEET_ID,
                range: range,
            })
        );

        const results = await Promise.allSettled(promises);

        const valueRanges = results.map((result, index) => {
            if (result.status === 'fulfilled') {
                // The response from 'get' has the data directly
                return result.value.data;
            } else {
                // Log the error for the specific range that failed
                console.warn(`Failed to fetch named range "${requestedRanges[index]}":`, result.reason.message);
                // Return an empty ValueRange-like object to maintain the order for the frontend
                return { range: requestedRanges[index], values: [] };
            }
        });


        res.status(200).json({ valueRanges: valueRanges });

    } catch (error) {
        console.error('Error in fetch-monitoring handler:', error);
        res.status(500).json({ message: 'Failed to fetch monitoring data', error: error.message });
    }
}
