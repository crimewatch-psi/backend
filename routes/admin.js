const express = require('express');
const router = express.Router();
const db = require('../db');
const { isAdmin } = require('../middleware/adminauth');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const upload = multer({
    dest: 'uploads/',
    limits: { fileSize: 1 * 1024 * 1024 } // file max 1 MB
}); // Temporary upload folder (pastikan folder ini ada)

// 1. FUNGSI MANAGE USER
//mendapatkan semua data user (berguna untuk admin)
// GET /api/admin/users
router.get('/users', isAdmin, (req, res) => {
        // Ambil semua kolom kecuali password untuk keamanan
        const query = 'SELECT id, nama, email, role, status FROM user';
        db.query(query, (err, results) => {
                if (err) return res.status(500).json({ error: 'Kesalahan server saat mengambil data user.' });
                res.json(results);
        });
});


//mengubah status user (aktif/nonaktif)
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

// 2. FUNGSI MANAGE LOKASI (HEATMAP)
// Endpoint untuk mendapatkan semua data heatmap
// GET /api/admin/heatmap
router.get('/heatmap', isAdmin, (req, res) => {
        const query = 'SELECT * FROM heatmap';
        db.query(query, (err, results) => {
                if (err) return res.status(500).json({ error: 'Kesalahan server saat mengambil data heatmap.' });
                res.json(results);
        });
});

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

// Endpoint: Upload CSV and import data_kriminal
// POST /api/admin/kriminal/upload
router.post('/kriminal/upload', isAdmin, upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'File CSV tidak ditemukan.' });
    }

    const results = [];
    fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => {
            // Insert each row into data_kriminal
            const values = results
             .filter(row =>
             Number.isInteger(Number(row.mapid)) &&
             typeof row.jenis_kejahatan === 'string' &&
             row.jenis_kejahatan.trim() !== '' &&
             !isNaN(Date.parse(row.waktu))
           )
            .map(row => [
             parseInt(row.mapid, 10),
             row.jenis_kejahatan.trim(),
             (isNaN(Date.parse(row.waktu)) ? null : new Date(row.waktu)),
             row.deskripsi || ''
          ]);
            const query = 'INSERT INTO data_kriminal (mapid, jenis_kejahatan, waktu, deskripsi) VALUES ?';
            db.query(query, [values], (err, result) => {
                fs.unlinkSync(req.file.path); // Remove temp file
                if (err) {
                    return res.status(500).json({ error: 'Gagal import data.', detail: err });
                }
                res.json({ message: 'Import data berhasil', imported: result.affectedRows });
            });
        })
        .on('error', (err) => {
            fs.unlinkSync(req.file.path);
            res.status(500).json({ error: 'Gagal membaca file CSV.', detail: err });
        });
});
module.exports = router;