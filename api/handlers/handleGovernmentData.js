const { authenticate } = require('../authMiddleware.js');
const { getSheetsClient, SPREADSHEET_ID } = require('../google-sheets-client.js');

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function handleGovernmentData(req, res) {

    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Only GET requests are allowed' });
    }

    const MAX_RETRIES = 3;
    let attempt = 0;

    while (attempt < MAX_RETRIES) {
        try {
            const sheets = await getSheetsClient();
            const range = "'KDMP'!A1:J1000";

            const response = await sheets.spreadsheets.values.get({
                spreadsheetId: SPREADSHEET_ID,
                range,
            });

            res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
            return res.status(200).json(response.data);

        } catch (error) {
            console.error(`Attempt ${attempt + 1} failed fetching government data:`, error);
            attempt++;
            if (attempt >= MAX_RETRIES) {
                return res.status(500).json({ message: 'Failed to fetch government data after multiple attempts', error: error.message });
            }
            await delay(1000 * attempt);
        }
    }
}

module.exports = { handleGovernmentData };