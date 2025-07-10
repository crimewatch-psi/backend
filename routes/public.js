const express = require("express");
const router = express.Router();
const db = require("../db");

// Get public heatmap data
router.get("/heatmap", async (req, res) => {
  try {
    const { data: heatmapData, error: heatmapError } = await db
      .from('heatmap')
      .select(`
        mapid,
        nama_lokasi,
        latitude,
        longitude,
        status,
        data_kriminal(id)
      `)
      .eq('status', 'aktif');

    if (heatmapError) {
      console.error("Database error:", heatmapError);
      return res.status(500).json({ 
        error: "Gagal mengambil data heatmap",
        details: heatmapError.message 
      });
    }

    // Transform data to match frontend interface
    const transformedData = heatmapData.map((row) => {
      const crimeCount = row.data_kriminal?.length || 0;
      let crimeRate = 'Lowest';
      
      if (crimeCount >= 10) crimeRate = 'Highest';
      else if (crimeCount >= 7) crimeRate = 'High';
      else if (crimeCount >= 4) crimeRate = 'Medium';
      else if (crimeCount >= 1) crimeRate = 'Low';

      return {
        id: row.mapid,
        name: row.nama_lokasi,
        lat: parseFloat(row.latitude),
        lng: parseFloat(row.longitude),
        crimeRate: crimeRate,
        crimeCount: crimeCount,
        category: "General",
        date: new Date()
      };
    }).sort((a, b) => b.crimeCount - a.crimeCount);

    res.json({
      success: true,
      data: transformedData,
      total: transformedData.length
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
router.get("/location/:mapid/stats", async (req, res) => {
  const { mapid } = req.params;

  try {
    const { data: locationData, error: locationError } = await db
      .from('heatmap')
      .select(`
        nama_lokasi,
        latitude,
        longitude,
        data_kriminal(id, jenis_kejahatan, waktu)
      `)
      .eq('mapid', mapid)
      .eq('status', 'aktif');

    if (locationError) {
      console.error("Database error:", locationError);
      return res.status(500).json({ 
        error: "Gagal mengambil statistik lokasi",
        details: locationError.message 
      });
    }

    if (!locationData || locationData.length === 0) {
      return res.status(404).json({ 
        error: "Lokasi tidak ditemukan" 
      });
    }

    const location = locationData[0];
    const crimes = location.data_kriminal || [];
    
    // Calculate recent crimes (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentCrimes = crimes.filter(crime => 
      new Date(crime.waktu) >= thirtyDaysAgo
    );

    // Get unique crime types
    const crimeTypes = [...new Set(crimes.map(crime => crime.jenis_kejahatan))];

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
          total_crimes: crimes.length,
          recent_crimes: recentCrimes.length,
          crime_types: crimeTypes
        }
      }
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
router.get("/recent-crimes", async (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit) : 10;
  const offset = req.query.offset ? parseInt(req.query.offset) : 0;

  try {
    const { data: crimesData, error: crimesError } = await db
      .from('data_kriminal')
      .select(`
        id,
        jenis_kejahatan,
        waktu,
        deskripsi,
        heatmap!inner(nama_lokasi, latitude, longitude, status)
      `)
      .eq('heatmap.status', 'aktif')
      .order('waktu', { ascending: false })
      .range(offset, offset + limit - 1);

    if (crimesError) {
      console.error("Database error:", crimesError);
      return res.status(500).json({ 
        error: "Gagal mengambil data kejahatan terbaru",
        details: crimesError.message 
      });
    }

    const crimes = crimesData.map(row => ({
      id: row.id,
      type: row.jenis_kejahatan,
      date: row.waktu,
      location: row.heatmap.nama_lokasi,
      coordinates: {
        lat: parseFloat(row.heatmap.latitude),
        lng: parseFloat(row.heatmap.longitude)
      },
      description: row.deskripsi ? row.deskripsi.substring(0, 100) : ''
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
  } catch (error) {
    console.error("Error in recent crimes endpoint:", error);
    res.status(500).json({ 
      error: "Terjadi kesalahan server",
      details: error.message 
    });
  }
});

module.exports = router;