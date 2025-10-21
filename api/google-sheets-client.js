const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { google } = require('googleapis');

// Constants
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
console.log('Backend SPREADSHEET_ID:', SPREADSHEET_ID);

let serviceAccountKey;
if (!process.env.SERVICE_ACCOUNT_KEY) {
    throw new Error('SERVICE_ACCOUNT_KEY environment variable is not set.');
}

try {
    serviceAccountKey = JSON.parse(process.env.SERVICE_ACCOUNT_KEY);
} catch (error) {
    console.error('CRITICAL: Failed to parse SERVICE_ACCOUNT_KEY.', error);
    throw new Error('SERVICE_ACCOUNT_KEY is not a valid JSON.');
}

// Google Sheets Client Initialization
const auth = new google.auth.GoogleAuth({
    credentials: {
        client_email: serviceAccountKey.client_email,
        private_key: serviceAccountKey.private_key.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    projectId: serviceAccountKey.project_id,
});

async function getSheetsClient() {
    const authClient = await auth.getClient();
    return google.sheets({ version: 'v4', auth: authClient });
}

module.exports = { getSheetsClient, SPREADSHEET_ID };

const namedRangesCache = {
    timestamp: 0,
    data: null,
};
const NAMED_RANGES_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

async function getNamedRangesMap() {
    const now = Date.now();
    if (now - namedRangesCache.timestamp < NAMED_RANGES_CACHE_DURATION && namedRangesCache.data) {
        return namedRangesCache.data;
    }

    try {
        const sheets = await getSheetsClient();
        const response = await sheets.spreadsheets.get({
            spreadsheetId: SPREADSHEET_ID,
            fields: 'namedRanges(name,range)'
        });

        const namedRangesMap = {};
        if (response.data.namedRanges) {
            console.log('Fetched named ranges:', JSON.stringify(response.data.namedRanges, null, 2));
            response.data.namedRanges.forEach(nr => {
                namedRangesMap[nr.name] = nr.range.a1Notation;
            });
        }
        namedRangesCache.timestamp = now;
        namedRangesCache.data = namedRangesMap;
        return namedRangesMap;
    } catch (error) {
        console.error('Error fetching named ranges:', error);
        throw new Error('Failed to fetch named ranges.');
    }
}

module.exports = { getSheetsClient, SPREADSHEET_ID, getNamedRangesMap };

async function logActivity(userEmail, action, details) {
    try {
        const sheets = await getSheetsClient();
        const timestamp = new Date().toISOString();
        const logSheetName = "'Log Aktivitas'!A:D"; 

        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: logSheetName,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [[timestamp, userEmail || 'N/A', action, JSON.stringify(details)]],
            },
        });
    } catch (error) {
        console.error('CRITICAL: Failed to log activity:', error);
        // We don't re-throw the error, as logging failure should not break the main operation.
    }
}

module.exports = { getSheetsClient, SPREADSHEET_ID, getNamedRangesMap, logActivity };
