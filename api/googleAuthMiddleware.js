const { OAuth2Client } = require('google-auth-library');

// CLIENT_ID ini harus sama dengan yang Anda gunakan di frontend.
const CLIENT_ID = '167078370634-de0ou8c3hikdba9pq6evimmfekbkk9o6.apps.googleusercontent.com';

const client = new OAuth2Client(CLIENT_ID);

/**
 * Memverifikasi Google ID Token yang dikirim dari frontend.
 * @param {string} token - Google ID token dari header Authorization.
 * @returns {Promise<object|null>} - Mengembalikan payload token jika valid, atau null jika tidak.
 */
async function verifyGoogleToken(token) {
    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: CLIENT_ID,
        });
        const payload = ticket.getPayload();
        // Verifikasi tambahan (opsional), misalnya memeriksa domain email
        // const domain = payload['hd'];
        return payload;
    } catch (error) {
        console.error('Error verifying Google token:', error);
        return null;
    }
}

/**
 * Middleware untuk rute yang memerlukan otentikasi Google.
 * @param {object} req - Objek request.
 * @param {object} res - Objek response.
 * @returns {Promise<object|null>} - Mengembalikan payload pengguna jika otentikasi berhasil.
 */
async function authenticateGoogleUser(req, res) {
    const authHeader = req.headers['authorization'];
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ message: 'Akses ditolak. Format token salah atau tidak ada.' });
        return null;
    }

    const token = authHeader.split(' ')[1];
    const userPayload = await verifyGoogleToken(token);

    if (!userPayload) {
        res.status(401).json({ message: 'Akses ditolak. Token Google tidak valid.' });
        return null;
    }

    // Sukses, kembalikan payload pengguna
    return userPayload;
}

module.exports = { authenticateGoogleUser };
