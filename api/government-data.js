const { getSheetsClient, SPREADSHEET_ID } = require('./google-sheets-client');

// Helper function for retrying with exponential backoff
async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Only GET requests are allowed' });
    }

    const MAX_RETRIES = 3;
    let attempt = 0;

    while (attempt < MAX_RETRIES) {
        try {
            const sheets = await getSheetsClient();
            const range = "'KDMP'!A1:I1000";

            const response = await sheets.spreadsheets.values.get({
                spreadsheetId: SPREADSHEET_ID,
                range,
            });

            // Add caching headers
            res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
            return res.status(200).json(response.data); // Success, exit the loop and function

        } catch (error) {
            console.error(`Attempt ${attempt + 1} failed fetching government data:`, error);
            attempt++;
            if (attempt >= MAX_RETRIES) {
                // If it's the last attempt, send the error response
                return res.status(500).json({ message: 'Failed to fetch government data after multiple attempts', error: error.message });
            }
            // Wait for a bit before retrying (e.g., 1 second on first retry)
            await delay(1000 * attempt);
        }
    }
}
