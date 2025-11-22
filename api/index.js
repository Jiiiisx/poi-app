// ==================================================================
// MEGA-FILE: SINGLE API ENDPOINT
// All backend logic is consolidated into this single file
// to work around Vercel's Serverless Function limits on the Hobby plan.
// ==================================================================

// 1. DEPENDENCIES
// ------------------------------------------------------------------
require('dotenv').config();
const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// 2. HELPER MODULES (formerly separate files)
// ------------------------------------------------------------------

// --- From _google-sheets-client.js ---
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
let serviceAccountKey;
try {
    if (!process.env.SERVICE_ACCOUNT_KEY) {
        throw new Error('SERVICE_ACCOUNT_KEY environment variable is not set.');
    }
    serviceAccountKey = JSON.parse(process.env.SERVICE_ACCOUNT_KEY);
} catch (error) {
    console.error("CRITICAL: Could not parse SERVICE_ACCOUNT_KEY. Ensure it's a valid JSON string in your environment variables.", error);
    // In a real scenario, you might want to stop the process if the key is essential for startup.
}
const googleAuth = new google.auth.GoogleAuth({
    credentials: {
        client_email: serviceAccountKey ? serviceAccountKey.client_email : '',
        private_key: serviceAccountKey ? (serviceAccountKey.private_key || '').replace(/\\n/g, '\n') : '',
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    projectId: serviceAccountKey ? serviceAccountKey.project_id : '',
});
async function getSheetsClient() {
    const authClient = await googleAuth.getClient();
    return google.sheets({ version: 'v4', auth: authClient });
}
async function logActivity(userEmail, action, details) {
    try {
        const sheets = await getSheetsClient();
        const timestamp = new Date().toISOString();
        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: "'Log Aktivitas'!A:D",
            valueInputOption: 'USER_ENTERED',
            resource: { values: [[timestamp, userEmail || 'N/A', action, JSON.stringify(details)]] },
        });
    } catch (error) {
        console.error('CRITICAL: Failed to log activity:', error);
    }
}

// --- From _authMiddleware.js ---
const JWT_SECRET = process.env.JWT_SECRET;
function authenticate(req, res) {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: 'Akses ditolak. Token tidak ada atau format salah.' });
      return null;
    }
    const token = authHeader.split(' ')[1];
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    res.status(401).json({ message: 'Akses ditolak. Token tidak valid atau kedaluwarsa.' });
    return null;
  }
}

// --- From _googleAuthMiddleware.js ---
const GOOGLE_CLIENT_ID = '167078370634-de0ou8c3hikdba9pq6evimmfekbkk9o6.apps.googleusercontent.com';
const googleApiClient = new OAuth2Client(GOOGLE_CLIENT_ID);
async function verifyGoogleToken(token) {
    try {
        const ticket = await googleApiClient.verifyIdToken({
            idToken: token,
            audience: GOOGLE_CLIENT_ID,
        });
        return ticket.getPayload();
    } catch (error) {
        return null;
    }
}
async function authenticateGoogleUser(req, res) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ message: 'Akses ditolak. Format token Google salah.' });
        return null;
    }
    const token = authHeader.split(' ')[1];
    const userPayload = await verifyGoogleToken(token);
    if (!userPayload) {
        res.status(401).json({ message: 'Akses ditolak. Token Google tidak valid.' });
        return null;
    }
    return userPayload;
}


// 3. HANDLER LOGIC (formerly separate files)
// ------------------------------------------------------------------

async function handleLogin(req, res) {
  const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
  const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Username dan password harus diisi.' });
    }
    const isUsernameMatch = username === ADMIN_USERNAME;
    const isPasswordMatch = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
    if (isUsernameMatch && isPasswordMatch) {
      const token = jwt.sign({ username: ADMIN_USERNAME }, JWT_SECRET, { expiresIn: '8h' });
      return res.status(200).json({ message: 'Login berhasil!', token: token });
    } else {
      return res.status(401).json({ message: 'Username atau password salah.' });
    }
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
  }
}

async function handleAddCustomer(req, res) {
    const user = authenticate(req, res);
    if (!user) return;
    if (req.method !== 'POST') return res.status(405).json({ message: 'Only POST requests are allowed' });
    const { values } = req.body;
    if (!values) return res.status(400).json({ message: 'Missing values in request body' });
    try {
        const sheets = await getSheetsClient();
        const response = await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: "'REKAP CALON PELANGGAN BY SPARTA'!A:H",
            valueInputOption: 'USER_ENTERED',
            resource: { values: [values] },
        });
        await logActivity(user.username, 'ADD_CUSTOMER', { values });
        res.status(200).json(response.data);
    } catch (error) {
        console.error('Error adding customer:', error);
        res.status(500).json({ message: 'Failed to add customer', error: error.message });
    }
}

async function handleCustomerData(req, res) {
    if (req.method !== 'GET') return res.status(405).json({ message: 'Only GET requests are allowed' });
    try {
        const sheets = await getSheetsClient();
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: "'REKAP CALON PELANGGAN BY SPARTA'!A1:J1000",
        });
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
        res.status(200).json(response.data);
    } catch (error) {
        console.error('Error fetching customer data:', error);
        res.status(500).json({ message: 'Failed to fetch customer data', error: error.message });
    }
}

async function handleDeleteRow(req, res) {
    const user = authenticate(req, res);
    if (!user) return;
    if (req.method !== 'POST') return res.status(405).json({ message: 'Only POST requests are allowed' });
    const { rowIndex, sheetName } = req.body;
    if (rowIndex === undefined || !sheetName) return res.status(400).json({ message: 'Missing rowIndex or sheetName' });
    try {
        const sheets = await getSheetsClient();
        const spreadsheetInfo = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
        const sheet = spreadsheetInfo.data.sheets.find(s => s.properties.title === sheetName);
        if (!sheet) return res.status(404).json({ message: `Sheet "${sheetName}" not found.` });
        const response = await sheets.spreadsheets.batchUpdate({
            spreadsheetId: SPREADSHEET_ID,
            resource: { requests: [{ deleteDimension: { range: { sheetId: sheet.properties.sheetId, dimension: 'ROWS', startIndex: parseInt(rowIndex) + 1, endIndex: parseInt(rowIndex) + 2 } } }] }
        });
        await logActivity(user.username, 'DELETE_ROW', { rowIndex, sheetName });
        res.status(200).json(response.data);
    } catch (error) {
        console.error('Error deleting row:', error);
        res.status(500).json({ message: 'Failed to delete row', error: error.message });
    }
}

async function handleFetchAnalytics(req, res) {
    const user = authenticate(req, res);
    if (!user) return;
    if (req.method !== 'GET') return res.status(405).json({ message: 'Only GET requests are allowed' });
    try {
        const sheets = await getSheetsClient();
        const response = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: "'Analytics'!A1:B" });
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
        res.status(200).json(response.data);
    } catch (error) {
        if (error.code === 400 && error.errors[0].message.includes('Unable to parse range')) {
            return res.status(200).json({ values: [] });
        }
        console.error('Error fetching analytics data:', error);
        res.status(500).json({ message: 'Failed to fetch analytics data', error: error.message });
    }
}

async function handleFetchHistory(req, res) {
    const user = authenticate(req, res);
    if (!user) return;
    if (req.method !== 'GET') return res.status(405).json({ message: 'Only GET requests are allowed' });
    try {
        const sheets = await getSheetsClient();
        const response = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: "'Log Aktivitas'!A1:D1000" });
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
        res.status(200).json(response.data);
    } catch (error) {
        console.error('Error fetching history data:', error);
        res.status(500).json({ message: 'Failed to fetch history data', error: error.message });
    }
}

async function handleFetchMonitoring(req, res) {
    if (req.method !== 'GET') return res.status(405).json({ message: 'Only GET requests are allowed' });
    try {
        const sheets = await getSheetsClient();
        const { ranges } = req.query;
        if (!ranges) return res.status(400).json({ message: 'Missing ranges in request query string.' });
        const requestedRanges = ranges.split(',');
        if (requestedRanges.length === 0) return res.status(200).json({ valueRanges: [] });
        const promises = requestedRanges.map(range => sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range }));
        const results = await Promise.allSettled(promises);
        const valueRanges = results.map((result, index) => {
            if (result.status === 'fulfilled') return result.value.data;
            console.warn(`Failed to fetch range "${requestedRanges[index]}":`, result.reason.message);
            return { range: requestedRanges[index], values: [] };
        });
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
        res.status(200).json({ valueRanges });
    } catch (error) {
        console.error('Error in fetch-monitoring handler:', error);
        res.status(500).json({ message: 'Failed to fetch monitoring data', error: error.message });
    }
}

async function handleGovernmentData(req, res) {
    if (req.method !== 'GET') return res.status(405).json({ message: 'Only GET requests are allowed' });
    try {
        const sheets = await getSheetsClient();
        const response = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: "'KDMP'!A1:J1000" });
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
        return res.status(200).json(response.data);
    } catch (error) {
        console.error('Failed fetching government data:', error);
        return res.status(500).json({ message: 'Failed to fetch government data', error: error.message });
    }
}

async function handleLogView(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Only POST requests are allowed' });
    try {
        const { page } = req.body;
        if (!page) return res.status(400).json({ message: 'Page path is required' });
        const sheets = await getSheetsClient();
        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: "'Analytics'!A:B",
            valueInputOption: 'USER_ENTERED',
            resource: { values: [[new Date().toISOString(), page]] },
        });
        res.status(200).json({ message: 'View logged successfully' });
    } catch (error) {
        console.error('Error logging view:', error);
        res.status(500).json({ message: 'Failed to log view', error: error.message });
    }
}

async function handleUpdateCell(req, res) {
    const user = await authenticateGoogleUser(req, res);
    if (!user) return;
    if (req.method !== 'POST') return res.status(405).json({ message: 'Only POST requests are allowed' });
    const { range, value } = req.body;
    if (!range || value === undefined) return res.status(400).json({ message: 'Missing "range" or "value"' });
    try {
        const sheets = await getSheetsClient();
        const response = await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: range,
            valueInputOption: 'USER_ENTERED',
            resource: { values: [[value]] },
        });
        res.status(200).json(response.data);
    } catch (error) {
        console.error('Error updating cell:', error);
        res.status(500).json({ message: 'Failed to update cell', error: error.message });
    }
}

async function handleAdminUpdateCell(req, res) {
    const user = authenticate(req, res);
    if (!user) return;
    if (req.method !== 'POST') return res.status(405).json({ message: 'Only POST requests are allowed' });
    const { range, value } = req.body;
    if (!range || value === undefined) return res.status(400).json({ message: 'Missing "range" or "value"' });
    try {
        const sheets = await getSheetsClient();
        const response = await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: range,
            valueInputOption: 'USER_ENTERED',
            resource: { values: [[value]] },
        });
        res.status(200).json(response.data);
    } catch (error) {
        console.error('Error updating cell (admin):', error);
        res.status(500).json({ message: 'Failed to update cell', error: error.message });
    }
}

async function handleUpdateCustomer(req, res) {
    const user = authenticate(req, res);
    if (!user) return;
    if (req.method !== 'POST') return res.status(405).json({ message: 'Only POST requests are allowed' });
    const { rowIndex, values } = req.body;
    if (rowIndex === undefined || !values) return res.status(400).json({ message: 'Missing rowIndex or values' });
    try {
        const sheets = await getSheetsClient();
        const range = `'REKAP CALON PELANGGAN BY SPARTA'!A${parseInt(rowIndex) + 2}:H${parseInt(rowIndex) + 2}`;
        const response = await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: range,
            valueInputOption: 'USER_ENTERED',
            resource: { values: [values] },
        });
        await logActivity(user.username, 'UPDATE_CUSTOMER', { rowIndex, values });
        res.status(200).json(response.data);
    } catch (error) {
        console.error('Error updating customer:', error);
        res.status(500).json({ message: 'Failed to update customer', error: error.message });
    }
}


// 4. MAIN ROUTER
// ------------------------------------------------------------------
module.exports = async (req, res) => {
    const { action } = req.query;

    switch (action) {
<<<<<<< HEAD
        case 'login': return handleLogin(req, res);
        case 'add-customer': return handleAddCustomer(req, res);
        case 'customer-data': return handleCustomerData(req, res);
        case 'delete-row': return handleDeleteRow(req, res);
        case 'fetch-analytics': return handleFetchAnalytics(req, res);
        case 'fetch-history': return handleFetchHistory(req, res);
        case 'fetch-monitoring': return handleFetchMonitoring(req, res);
        case 'government-data': return handleGovernmentData(req, res);
        case 'log-view': return handleLogView(req, res);
        case 'update-cell': return handleUpdateCell(req, res);
        case 'admin-update-cell': return handleAdminUpdateCell(req, res);
        case 'update-customer': return handleUpdateCustomer(req, res);
=======
        case 'login':
            return handleLogin(req, res);
        case 'add-customer':
            return handleAddCustomer(req, res);
        case 'customer-data':
            return handleCustomerData(req, res);
        case 'delete-row':
            return handleDeleteRow(req, res);
        case 'fetch-analytics':
            return handleFetchAnalytics(req, res);
        case 'fetch-history':
            return handleFetchHistory(req, res);
        case 'fetch-monitoring':
            return handleFetchMonitoring(req, res);
        case 'government-data':
            return handleGovernmentData(req, res);
        case 'log-view':
            return handleLogView(req, res);
        case 'update-cell':
            return handleUpdateCell(req, res);
        case 'admin-update-cell':
            return handleAdminUpdateCell(req, res);
        case 'update-customer':
            return handleUpdateCustomer(req, res);
>>>>>>> 143db7fae345427646d74314349df97d50486534
        
default:
            return res.status(404).json({ message: `API action not found for action: ${action}` });
    }
};