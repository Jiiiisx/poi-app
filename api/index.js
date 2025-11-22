// Single entry point for all API requests to solve Vercel's function limit.

// Import all handlers
const { handleLogin } = require('./handlers/handleLogin.js');
const { handleAddCustomer } = require('./handlers/handleAddCustomer.js');
const { handleCustomerData } = require('./handlers/handleCustomerData.js');
const { handleDeleteRow } = require('./handlers/handleDeleteRow.js');
const { handleFetchAnalytics } = require('./handlers/handleFetchAnalytics.js');
const { handleFetchHistory } = require('./handlers/handleFetchHistory.js');
const { handleFetchMonitoring } = require('./handlers/handleFetchMonitoring.js');
const { handleGovernmentData } = require('./handlers/handleGovernmentData.js');
const { handleLogView } = require('./handlers/handleLogView.js');
const { handleUpdateCell } = require('./handlers/handleUpdateCell.js');
const { handleUpdateCustomer } = require('./handlers/handleUpdateCustomer.js');
const { handleAdminUpdateCell } = require('./handlers/handleAdminUpdateCell.js');

module.exports = async (req, res) => {
    // Extract the 'action' from the query parameters
    const { action } = req.query;

    // Route the request to the appropriate handler based on the action
    switch (action) {
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
        
        default:
            // If no action or an unknown action is provided, return 404
            return res.status(404).json({ message: 'API action not found.' });
    }
};
