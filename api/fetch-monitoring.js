const { getSheetsClient, SPREADSHEET_ID } = require('./google-sheets-client');

// Helper function for retrying with exponential backoff
async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(fn, retries = 3, delayMs = 1000) {
    let attempt = 0;
    while (attempt < retries) {
        try {
            return await fn();
        } catch (error) {
            attempt++;
            if (attempt >= retries) {
                throw error;
            }
            console.warn(`Attempt ${attempt} failed. Retrying in ${delayMs * attempt}ms...`);
            await delay(delayMs * attempt);
        }
    }
}

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

        const response = await fetchWithRetry(() => sheets.spreadsheets.values.batchGet({
            spreadsheetId: SPREADSHEET_ID,
            ranges: requestedRanges,
        }));

        const valueRanges = response.data.valueRanges;

        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
        res.status(200).json({ valueRanges: valueRanges });

    } catch (error) {
        console.error('Error in fetch-monitoring handler:', error);
        res.status(500).json({ message: 'Failed to fetch monitoring data', error: error.message });
    }
}
