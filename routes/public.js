const express = require("express");
const router = express.Router();
const db = require("../db");

// Get public heatmap data
router.get("/heatmap", (req, res) => {
  try {
    const query = `
      SELECT 
        h.mapid,
        h.nama_lokasi as name,
        h.latitude as lat,
        h.longitude as lng,
        h.status,
        COUNT(dk.id) as crime_count,
        CASE 
          WHEN COUNT(dk.id) >= 10 THEN 'Highest'
          WHEN COUNT(dk.id) >= 7 THEN 'High'
          WHEN COUNT(dk.id) >= 4 THEN 'Medium'
          WHEN COUNT(dk.id) >= 1 THEN 'Low'
          ELSE 'Lowest'
        END as crimeRate
      FROM heatmap h
      LEFT JOIN data_kriminal dk ON h.mapid = dk.mapid
      WHERE h.status = 'aktif'
      GROUP BY h.mapid, h.nama_lokasi, h.latitude, h.longitude, h.status
      ORDER BY crime_count DESC
    `;

    db.query(query, (err, results) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ 
          error: "Gagal mengambil data heatmap",
          details: err.message 
        });
      }

      // Transform data to match frontend interface
      const heatmapData = results.map((row, index) => ({
        id: row.mapid,
        name: row.name,
        lat: parseFloat(row.lat),
        lng: parseFloat(row.lng),
        crimeRate: row.crimeRate,
        crimeCount: row.crime_count,
        category: "General", // Default category
        date: new Date() // Current date as default
      }));

      res.json({
        success: true,
        data: heatmapData,
        total: heatmapData.length
      });
    });
  } catch (error) {
    console.error("Error in heatmap endpoint:", error);
    res.status(500).json({ 
      error: "Terjadi kesalahan server",
      details: error.message 
    });
  }
});

// Get crime statistics for a specific location
router.get("/location/:mapid/stats", (req, res) => {
  const { mapid } = req.params;

  try {
    const query = `
      SELECT 
        h.nama_lokasi,
        h.latitude,
        h.longitude,
        COUNT(dk.id) as total_crimes,
        COUNT(CASE WHEN dk.waktu >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as recent_crimes,
        GROUP_CONCAT(DISTINCT dk.jenis_kejahatan) as crime_types
      FROM heatmap h
      LEFT JOIN data_kriminal dk ON h.mapid = dk.mapid
      WHERE h.mapid = ? AND h.status = 'aktif'
      GROUP BY h.mapid, h.nama_lokasi, h.latitude, h.longitude
    `;

    db.query(query, [mapid], (err, results) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ 
          error: "Gagal mengambil statistik lokasi",
          details: err.message 
        });
      }

      if (results.length === 0) {
        return res.status(404).json({ 
          error: "Lokasi tidak ditemukan" 
        });
      }

      const location = results[0];
      const crimeTypes = location.crime_types ? location.crime_types.split(',') : [];

      res.json({
        success: true,
        data: {
          mapid: parseInt(mapid),
          name: location.nama_lokasi,
          coordinates: {
            lat: parseFloat(location.latitude),
            lng: parseFloat(location.longitude)
          },
          statistics: {
            total_crimes: location.total_crimes,
            recent_crimes: location.recent_crimes,
            crime_types: crimeTypes
          }
        }
      });
    });
  } catch (error) {
    console.error("Error in location stats endpoint:", error);
    res.status(500).json({ 
      error: "Terjadi kesalahan server",
      details: error.message 
    });
  }
});

// Get recent crimes for public display (limited data)
router.get("/recent-crimes", (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit) : 10;
  const offset = req.query.offset ? parseInt(req.query.offset) : 0;

  try {
    const query = `
      SELECT 
        dk.id,
        dk.jenis_kejahatan as type,
        dk.waktu as date,
        h.nama_lokasi as location,
        h.latitude,
        h.longitude,
        LEFT(dk.deskripsi, 100) as description
      FROM data_kriminal dk
      JOIN heatmap h ON dk.mapid = h.mapid
      WHERE h.status = 'aktif'
      ORDER BY dk.waktu DESC
      LIMIT ? OFFSET ?
    `;

    db.query(query, [limit, offset], (err, results) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ 
          error: "Gagal mengambil data kejahatan terbaru",
          details: err.message 
        });
      }

      const crimes = results.map(row => ({
        id: row.id,
        type: row.type,
        date: row.date,
        location: row.location,
        coordinates: {
          lat: parseFloat(row.latitude),
          lng: parseFloat(row.longitude)
        },
        description: row.description
      }));

      res.json({
        success: true,
        data: crimes,
        total: crimes.length,
        pagination: {
          limit,
          offset,
          hasMore: crimes.length === limit
        }
      });
    });
  } catch (error) {
    console.error("Error in recent crimes endpoint:", error);
    res.status(500).json({ 
      error: "Terjadi kesalahan server",
      details: error.message 
    });
  }
});

module.exports = router;