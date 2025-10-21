export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Only GET requests are allowed' });
    }

    const rangesQuery = req.query.ranges;

    if (!rangesQuery) {
        return res.status(400).json({ message: 'Missing ranges in request query string.' });
    }

    // Just echo the received query parameters
    res.status(200).json({ 
        message: 'Function invoked successfully. Received ranges query:',
        ranges: rangesQuery 
    });
}