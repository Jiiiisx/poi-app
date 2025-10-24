const { getNamedRangesMap } = require('./google-sheets-client');

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Only GET requests are allowed' });
    }

    try {
        const namedRanges = await getNamedRangesMap();
        res.setHeader('Cache-Control', 'no-cache');
        res.status(200).json({ namedRanges });
    } catch (error) {
        console.error('Error in get-named-ranges handler:', error);
        res.status(500).json({ message: 'Failed to get named ranges', error: error.message });
    }
}
