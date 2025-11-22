const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

require('dotenv').config();

const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;
const JWT_SECRET = process.env.JWT_SECRET;

if (!ADMIN_USERNAME || !ADMIN_PASSWORD_HASH || !JWT_SECRET) {
  console.error("CRITICAL: Missing required environment variables for authentication.");
}

async function handleLogin(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username dan password harus diisi.' });
    }

    const isUsernameMatch = username === ADMIN_USERNAME;
    const isPasswordMatch = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);

    if (isUsernameMatch && isPasswordMatch) {
      const token = jwt.sign(
        { username: ADMIN_USERNAME },
        JWT_SECRET,
        { expiresIn: '8h' }
      );

      return res.status(200).json({ 
        message: 'Login berhasil!',
        token: token 
      });

    } else {
      return res.status(401).json({ message: 'Username atau password salah.' });
    }

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
  }
}

module.exports = { handleLogin };
