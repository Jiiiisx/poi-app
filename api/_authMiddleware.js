require('dotenv').config();
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * @param {object} req
 * @param {object} res
 * @returns {object|null}
 */
function authenticate(req, res) {
  try {
    const authHeader = req.headers['authorization'];
    
    if (!authHeader) {
      res.status(401).json({ message: 'Akses ditolak. Tidak ada token yang diberikan.' });
      return null;
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      res.status(401).json({ message: 'Akses ditolak. Format token salah.' });
      return null;
    }

    const decodedPayload = jwt.verify(token, JWT_SECRET);
    
    return decodedPayload;

  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ message: 'Akses ditolak. Token telah kedaluwarsa.' });
    } else if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ message: 'Akses ditolak. Token tidak valid.' });
    } else {
      console.error('Auth middleware error:', error);
      res.status(500).json({ message: 'Terjadi kesalahan internal saat otentikasi.' });
    }
    return null;
  }
}

module.exports = { authenticate };
