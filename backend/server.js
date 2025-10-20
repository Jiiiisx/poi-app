const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Constants
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;

// Check for required environment variables
if (!process.env.SERVICE_ACCOUNT_KEY) {
    throw new Error('SERVICE_ACCOUNT_KEY environment variable is not set.');
}

const serviceAccountKey = JSON.parse(process.env.SERVICE_ACCOUNT_KEY);

// Google Sheets Client Initialization
const auth = new google.auth.GoogleAuth({
    credentials: {
        client_email: serviceAccountKey.client_email,
        private_key: serviceAccountKey.private_key.replace(/\\n/g, '\n'), // Ensure newlines are correctly formatted
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    projectId: serviceAccountKey.project_id, // Explicitly set the project ID
});

async function getSheetsClient() {
    const authClient = await auth.getClient();
    return google.sheets({ version: 'v4', auth: authClient });
}

// --- Audit Trail Logger ---
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


// --- API Endpoints ---

// 1. Get Customer Data
app.get('/api/customer-data', async (req, res) => {
    try {
        const sheets = await getSheetsClient();
        const range = "'REKAP CALON PELANGGAN BY SPARTA'!A1:J1000";
        
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range,
        });
        
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching customer data:', error);
        res.status(500).json({ message: 'Failed to fetch customer data', error: error.message });
    }
});

// 2. Get Government Data
app.get('/api/government-data', async (req, res) => {
    try {
        const sheets = await getSheetsClient();
        const range = "'KDMP'!A1:I1000";

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range,
        });

        res.json(response.data);
    } catch (error) {
        console.error('Error fetching government data:', error);
        res.status(500).json({ message: 'Failed to fetch government data', error: error.message });
    }
});

// 3. Get Monitoring Data (Batch Get)
const monitoringDataCache = {
    timestamp: 0,
    data: null,
};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

app.get('/api/monitoring-data', async (req, res) => {
    const now = Date.now();
    if (now - monitoringDataCache.timestamp < CACHE_DURATION && monitoringDataCache.data) {
        return res.json(monitoringDataCache.data);
    }

    // These ranges were previously in the frontend
    const salesDataRanges = [
        "'REKAP PS AR KALIABANG'!A1:W105",
        "'REKAP PS AR KALIABANG'!Y1:AT105",
        "'REKAP PS AR KALIABANG'!AV1:BR105",
        "'REKAP PS AR KALIABANG'!BT1:CK105",
        "'REKAP PS AR KALIABANG'!CM1:DI105",
        "'REKAP PS AR KALIABANG'!DK1:EG105",
        "'REKAP PS AR KALIABANG'!EI1:FE105",
        "'REKAP PS AR KALIABANG'!FF1:GA105",
        "'REKAP PS AR KALIABANG'!GC1:GT105",
        "'REKAP PS AR KALIABANG'!GV1:HI105",
        "'REKAP PS AR KALIABANG'!A111:W205",
        "'REKAP PS AR KALIABANG'!Y111:AT205",
        "'REKAP PS AR KALIABANG'!AV111:BJ205",
        "'REKAP PS AR KALIABANG'!BL111:CA205",
        "'REKAP PS AR KALIABANG'!CC111:CP205",
        "'REKAP PS AR KALIABANG'!CR111:DN205",
        "'REKAP PS AR KALIABANG'!DP111:EC205",
    ];

    try {
        const sheets = await getSheetsClient();
        const response = await sheets.spreadsheets.values.batchGet({
            spreadsheetId: SPREADSHEET_ID,
            ranges: salesDataRanges,
        });

        monitoringDataCache.timestamp = now;
        monitoringDataCache.data = response.data;

        res.json(response.data);
    } catch (error) {
        console.error('Error fetching monitoring data:', error);
        res.status(500).json({ message: 'Failed to fetch monitoring data', error: error.message });
    }
});

// 4. Update a Cell
app.post('/api/update-cell', async (req, res) => {
    const { range, value } = req.body;

    if (!range || value === undefined) {
        return res.status(400).json({ message: 'Missing "range" or "value" in request body' });
    }

    try {
        const sheets = await getSheetsClient();
        const response = await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: range,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [[value]],
            },
        });

        res.json(response.data);
    } catch (error) {
        console.error('Error updating cell:', error);
        res.status(500).json({ message: 'Failed to update cell', error: error.message });
    }
});

const { body, validationResult } = require('express-validator');

// Define the validation chain
const customerValidationRules = [
    body('userEmail').isEmail().withMessage('User email is required for logging.'),
    body('values.0').trim().escape(),
    body('values.1').notEmpty({ ignore_whitespace: true }).withMessage('Nama tidak boleh kosong.').trim().escape(),
    body('values.2').notEmpty({ ignore_whitespace: true }).withMessage('Alamat tidak boleh kosong.').trim().escape(),
    body('values.3').isMobilePhone('id-ID').withMessage('Format nomor telepon tidak valid.'),
    body('values.4').notEmpty({ ignore_whitespace: true }).withMessage('Nama Sales tidak boleh kosong.').trim().escape(),
    body('values.5').optional({ checkFalsy: true }).trim().escape(),
    body('values.6').optional({ checkFalsy: true }).trim().escape(),
    body('values.7').optional({ checkFalsy: true }).trim().escape(),
];

// 5. Add a new customer (Append Row)
app.post('/api/add-customer', customerValidationRules, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'Data tidak valid.', errors: errors.array() });
    }

    const { values, userEmail } = req.body;

    try {
        const sheets = await getSheetsClient();
        const response = await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: "'REKAP CALON PELANGGAN BY SPARTA'!A:H",
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [values],
            },
        });

        // Log the activity
        logActivity(userEmail, 'ADD_CUSTOMER', { values });

        res.json(response.data);
    } catch (error) {
        console.error('Error adding customer:', error);
        res.status(500).json({ message: 'Failed to add customer', error: error.message });
    }
});

// 6. Update an existing customer
app.post('/api/update-customer', customerValidationRules, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'Data tidak valid.', errors: errors.array() });
    }

    const { rowIndex, values, userEmail } = req.body;

    if (rowIndex === undefined) {
        return res.status(400).json({ message: 'Missing "rowIndex" in request body' });
    }

    try {
        const sheets = await getSheetsClient();
        const range = `'REKAP CALON PELANGGAN BY SPARTA'!A${parseInt(rowIndex) + 2}:H${parseInt(rowIndex) + 2}`;

        const response = await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: range,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [values],
            },
        });

        // Log the activity
        logActivity(userEmail, 'UPDATE_CUSTOMER', { rowIndex, values });

        res.json(response.data);
    } catch (error) {
        console.error('Error updating customer:', error);
        res.status(500).json({ message: 'Failed to update customer', error: error.message });
    }
});

// 7. Delete a row
app.post('/api/delete-row', async (req, res) => {
    const { rowIndex, sheetName, userEmail } = req.body;

    if (rowIndex === undefined || !sheetName) {
        return res.status(400).json({ message: 'Missing "rowIndex" or "sheetName" in request body' });
    }

    try {
        const sheets = await getSheetsClient();

        const spreadsheetInfo = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
        const sheet = spreadsheetInfo.data.sheets.find(s => s.properties.title === sheetName);

        if (!sheet) {
            return res.status(404).json({ message: `Sheet with name "${sheetName}" not found.` });
        }
        const sheetId = sheet.properties.sheetId;

        const response = await sheets.spreadsheets.batchUpdate({
            spreadsheetId: SPREADSHEET_ID,
            resource: {
                requests: [{
                    deleteDimension: {
                        range: {
                            sheetId: sheetId,
                            dimension: 'ROWS',
                            startIndex: parseInt(rowIndex) + 1, 
                            endIndex: parseInt(rowIndex) + 2
                        }
                    }
                }]
            }
        });

        // Log the activity
        logActivity(userEmail, 'DELETE_ROW', { rowIndex, sheetName });

        res.json(response.data);
    } catch (error) {
        console.error('Error deleting row:', error);
        res.status(500).json({ message: 'Failed to delete row', error: error.message });
    }
});


// Root endpoint
app.get('/', (req, res) => {
    res.send('Backend server is running. Ready to serve data to the POI application.');
});

// Export the app for Vercel
module.exports = app;