const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');

// endpoint POST /login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email dan password wajib diisi.' });
  }

  const query = 'SELECT * FROM user WHERE email = ?';
  db.query(query, [email], async (err, results) => {
    if (err) return res.status(500).json({ error: 'Kesalahan server.' });

    if (results.length === 0) {
      return res.status(401).json({ error: 'Akun tidak ditemukan.' });
    }

    const user = results[0];

    // Verifikasi
    const match = password === user.password;
    if (!match) {
      return res.status(401).json({ error: 'Password salah.' });
    }

    // Berhasil
    res.json({
      message: 'Login berhasil',
      user: {
        id: user.id,
        nama: user.nama,
        email: user.email,
        role: user.role
      }
    });
  });
});

module.exports = router;