const express = require('express');
const router = express.Router();
const db = require('../db');

// ambil data kriminal sesuai mapid
router.get('/', (req, res) => {
  const mapid = parseInt(req.query.mapid, 10);
  if (!mapid) {
    return res.status(400).json({ error: 'Parameter mapid wajib ada dan valid.' });
  }

  const query = 'SELECT * FROM data_kriminal WHERE mapid = ?';
  db.query(query, [mapid], (err, results) => {
    if (err) return res.status(500).json({ error: 'Gagal mengambil data.', detail: err });
    res.json(results);
  });
});

module.exports = router;