const express = require('express');
const router = express.Router();
const db = require('../db');
const { isAdmin } = require('../middleware/auth'); // Import middleware admin

// =================================================================
// 1. FUNGSI MANAGE USER
// =================================================================

// Endpoint untuk mendapatkan semua data user (berguna untuk admin)
// GET /api/admin/users
router.get('/users', isAdmin, (req, res) => {
    // Ambil semua kolom kecuali password untuk keamanan
    const query = 'SELECT id, nama, email, role, status FROM user';
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: 'Kesalahan server saat mengambil data user.' });
        res.json(results);
    });
});


// Endpoint untuk mengubah status user (aktif/nonaktif)
// PATCH /api/admin/users/:id/status
router.patch('/users/:id/status', isAdmin, (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    // Validasi input status
    if (status !== 'aktif' && status !== 'nonaktif') {
        return res.status(400).json({ error: "Status tidak valid. Gunakan 'aktif' atau 'nonaktif'." });
    }
    
    // Mencegah admin menonaktifkan dirinya sendiri
    if (parseInt(id, 10) === req.session.user.id) {
        return res.status(403).json({ error: "Admin tidak dapat menonaktifkan akunnya sendiri." });
    }

    const query = 'UPDATE user SET status = ? WHERE id = ?';
    db.query(query, [status, id], (err, results) => {
        if (err) return res.status(500).json({ error: 'Kesalahan server.' });
        if (results.affectedRows === 0) {
            return res.status(404).json({ error: 'User tidak ditemukan.' });
        }
        res.json({ message: `Status user dengan ID ${id} berhasil diubah menjadi ${status}.` });
    });
});

// =================================================================
// 2. FUNGSI MANAGE LOKASI (HEATMAP)
// =================================================================

// Endpoint untuk mengubah status lokasi (aktif/mati)
// PATCH /api/admin/heatmap/:mapid/status
router.patch('/heatmap/:mapid/status', isAdmin, (req, res) => {
    const { mapid } = req.params;
    const { status } = req.body;

    // Validasi input status
    if (status !== 'aktif' && status !== 'mati') {
        return res.status(400).json({ error: "Status tidak valid. Gunakan 'aktif' atau 'mati'." });
    }

    const query = 'UPDATE heatmap SET status = ? WHERE mapid = ?';
    db.query(query, [status, mapid], (err, results) => {
        if (err) return res.status(500).json({ error: 'Kesalahan server.' });
        if (results.affectedRows === 0) {
            return res.status(404).json({ error: 'Lokasi tidak ditemukan.' });
        }
        res.json({ message: `Status lokasi dengan mapid ${mapid} berhasil diubah menjadi ${status}.` });
    });
});

// =================================================================
// 3. FUNGSI UPLOAD DATA KRIMINAL BARU
// =================================================================

// Endpoint untuk menambah data kriminal baru
// POST /api/admin/kriminal
router.post('/kriminal', isAdmin, (req, res) => {
    const { mapid, jenis_kejahatan, waktu, deskripsi } = req.body;

    // Validasi input dasar
    if (!mapid || !jenis_kejahatan || !waktu || !deskripsi) {
        return res.status(400).json({ error: 'Semua field wajib diisi: mapid, jenis_kejahatan, waktu, deskripsi.' });
    }

    const query = 'INSERT INTO data_kriminal (mapid, jenis_kejahatan, waktu, deskripsi) VALUES (?, ?, ?, ?)';
    db.query(query, [mapid, jenis_kejahatan, waktu, deskripsi], (err, results) => {
        if (err) {
            // Cek jika error karena foreign key constraint (mapid tidak ada di tabel heatmap)
            if(err.code === 'ER_NO_REFERENCED_ROW_2') {
                return res.status(404).json({ error: `Lokasi dengan mapid ${mapid} tidak ditemukan.`});
            }
            return res.status(500).json({ error: 'Kesalahan server saat menyimpan data.' });
        }
        res.status(201).json({ message: 'Data kriminal baru berhasil ditambahkan.', id: results.insertId });
    });
});

module.exports = router;