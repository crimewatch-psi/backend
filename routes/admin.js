const express = require("express");
const router = express.Router();
const db = require("../db");
const { verifyToken, requireAdmin } = require("../middleware/auth");
const { createClient } = require('@supabase/supabase-js');
const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");
const bcrypt = require("bcrypt");
require('dotenv').config();

const SALT_ROUNDS = 12;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 1 * 1024 * 1024 }
});

router.post("/register-manager", verifyToken, requireAdmin, async (req, res) => {
  const { email, password, nama, organization, latitude, longitude } = req.body;

  if (!email || !password || !nama || !organization) {
    return res
      .status(400)
      .json({ error: "Email, password, nama, dan organization wajib diisi." });
  }

  if ((latitude && !longitude) || (!latitude && longitude)) {
    return res
      .status(400)
      .json({
        error:
          "Latitude dan longitude harus diisi bersamaan atau tidak sama sekali.",
      });
  }

  if (latitude && (latitude < -90 || latitude > 90)) {
    return res.status(400).json({ error: "Latitude harus antara -90 dan 90." });
  }

  if (longitude && (longitude < -180 || longitude > 180)) {
    return res
      .status(400)
      .json({ error: "Longitude harus antara -180 dan 180." });
  }

  let locationUrl = null;
  if (latitude && longitude) {
    locationUrl = `https://maps.google.com/@${latitude},${longitude}`;
  }

  try {
    // Check if user already exists
    const { data: existingUser, error: checkError } = await db
      .from('user')
      .select('*')
      .eq('email', email)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error("Error checking existing user:", checkError);
      return res.status(500).json({ error: "Kesalahan server." });
    }

    if (existingUser) {
      return res.status(400).json({ error: "Email sudah terdaftar." });
    }

    try {
      // First create user in Supabase Auth
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          nama,
          role: 'manager',
          organization
        }
      });

      if (authError) {
        console.error("Error creating auth user:", authError);
        return res.status(500).json({ error: "Gagal membuat user authentication." });
      }

      const authUserId = authUser.user.id;

      // Hash password for local database
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

      // Insert user in local database with auth_user_id reference
      const { data: newUser, error: userError } = await db
        .from('user')
        .insert({
          auth_user_id: authUserId,
          email,
          password: hashedPassword,
          nama,
          role: 'manager',
          status: 'aktif'
        })
        .select()
        .single();

      if (userError) {
        // Cleanup: delete auth user if database insertion fails
        await supabase.auth.admin.deleteUser(authUserId);
        console.error("Error creating user:", userError);
        return res.status(500).json({ error: "Gagal membuat user baru." });
      }

      const userId = newUser.id;

      // Insert manager details
      const { data: managerDetails, error: managerError } = await db
        .from('manager_details')
        .insert({
          user_id: userId,
          organization,
          location_url: locationUrl,
          latitude: latitude || null,
          longitude: longitude || null
        })
        .select()
        .single();

      if (managerError) {
        // Cleanup: delete both auth user and database user if manager details insertion fails
        await supabase.auth.admin.deleteUser(authUserId);
        await db.from('user').delete().eq('id', userId);
        console.error("Error creating manager details:", managerError);
        return res.status(500).json({ error: "Gagal membuat detail manager." });
      }

      res.status(201).json({
        success: true,
        message: "Manager berhasil didaftarkan",
        user: {
          id: userId,
          email,
          nama,
          role: "manager",
          status: "aktif",
          organization,
          location_url: locationUrl,
          latitude: latitude || null,
          longitude: longitude || null,
        },
      });

    } catch (hashError) {
      console.error("Error hashing password:", hashError);
      res
        .status(500)
        .json({ error: "Kesalahan server saat mengenkripsi password." });
    }
  } catch (error) {
    console.error("Error in manager registration:", error);
    res
      .status(500)
      .json({ error: "Kesalahan server saat registrasi manager." });
  }
});
// 1. FUNGSI MANAGE USER
//mendapatkan semua data user (berguna untuk admin)
// GET /api/admin/users
router.get("/users", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { data: users, error } = await db
      .from('user')
      .select(`
        id,
        nama,
        email,
        role,
        status,
        last_login,
        manager_details!inner(organization, location_url)
      `)
      .eq('role', 'manager')
      .order('id', { ascending: true });

    if (error) {
      console.error("Error fetching users:", error);
      return res.status(500).json({
        success: false,
        error: "Kesalahan server saat mengambil data user.",
      });
    }

    const transformedUsers = users.map(user => ({
      id: user.id,
      name: user.nama,
      email: user.email,
      role: user.role,
      status: user.status === 'aktif' ? 'active' : 'inactive',
      last_login: user.last_login,
      organization: user.manager_details.organization,
      location: user.manager_details.location_url
    }));

    res.json({
      success: true,
      users: transformedUsers,
    });
  } catch (error) {
    console.error("Error in users endpoint:", error);
    res.status(500).json({
      success: false,
      error: "Kesalahan server saat mengambil data user.",
    });
  }
});

//mengubah detail user (nama, email, organisasi, lokasi)
// PATCH /api/admin/users/:id
router.patch("/users/:id", verifyToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { nama, email, organization, location } = req.body;

  try {
    // Update user information
    const { data: userData, error: userError } = await db
      .from('user')
      .update({ nama, email })
      .eq('id', id)
      .select();

    if (userError) {
      console.error("Error updating user:", userError);
      return res.status(500).json({
        success: false,
        error: "Kesalahan server saat mengubah data user.",
      });
    }

    if (!userData || userData.length === 0) {
      return res.status(404).json({
        success: false,
        error: "User tidak ditemukan.",
      });
    }

    // Update manager details
    const { data: managerData, error: managerError } = await db
      .from('manager_details')
      .update({ 
        organization, 
        location_url: location 
      })
      .eq('user_id', id)
      .select();

    if (managerError) {
      console.error("Error updating manager details:", managerError);
      return res.status(500).json({
        success: false,
        error: "Kesalahan server saat mengubah detail manager.",
      });
    }

    res.json({
      success: true,
      message: "Detail manager berhasil diubah.",
    });

  } catch (error) {
    console.error("Error in user update:", error);
    res.status(500).json({
      success: false,
      error: "Kesalahan server saat menyimpan perubahan.",
    });
  }
});

//mengubah status user (aktif/nonaktif)
// PATCH /api/admin/users/:id/status
router.patch("/users/:id/status", verifyToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  // Map frontend status to backend status
  let backendStatus;
  if (status === "active") {
    backendStatus = "aktif";
  } else if (status === "inactive") {
    backendStatus = "nonaktif";
  } else {
    return res.status(400).json({
      success: false,
      error: "Status tidak valid. Gunakan 'active' atau 'inactive'.",
    });
  }

  // Mencegah admin menonaktifkan dirinya sendiri
  if (parseInt(id, 10) === req.session.user.id) {
    return res.status(403).json({
      success: false,
      error: "Admin tidak dapat menonaktifkan akunnya sendiri.",
    });
  }

  try {
    const { data, error } = await db
      .from('user')
      .update({ status: backendStatus })
      .eq('id', id)
      .select();

    if (error) {
      console.error("Error updating user status:", error);
      return res.status(500).json({
        success: false,
        error: "Kesalahan server.",
      });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        error: "User tidak ditemukan.",
      });
    }

    res.json({
      success: true,
      message: `Status user dengan ID ${id} berhasil diubah menjadi ${status}.`,
    });

  } catch (error) {
    console.error("Error updating user status:", error);
    res.status(500).json({
      success: false,
      error: "Kesalahan server.",
    });
  }
});

// 2. FUNGSI MANAGE LOKASI (HEATMAP)
// Endpoint untuk mendapatkan semua data heatmap
// GET /api/admin/heatmap
router.get("/heatmap", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await db
      .from('heatmap')
      .select('*')
      .order('mapid', { ascending: false });

    if (error) {
      console.error("Error fetching heatmap data:", error);
      return res.status(500).json({
        success: false,
        error: "Kesalahan server saat mengambil data heatmap.",
      });
    }

    res.json({
      success: true,
      data: data,
      message: "Data heatmap berhasil diambil",
    });

  } catch (error) {
    console.error("Error fetching heatmap data:", error);
    res.status(500).json({
      success: false,
      error: "Kesalahan server saat mengambil data heatmap.",
    });
  }
});

// Endpoint untuk menambah lokasi heatmap baru (manual input)
// POST /api/admin/heatmap/upload
router.post("/heatmap/upload", verifyToken, requireAdmin, async (req, res) => {
  const { nama_lokasi, latitude, longitude, gmaps_url } = req.body;

  // Validate required fields
  if (!nama_lokasi || !latitude || !longitude || !gmaps_url) {
    return res.status(400).json({
      success: false,
      error:
        "Semua field (nama_lokasi, latitude, longitude, gmaps_url) wajib diisi.",
    });
  }

  // Validate latitude (-90 to 90)
  if (latitude < -90 || latitude > 90) {
    return res.status(400).json({
      success: false,
      error: "Latitude harus berada di antara -90 dan 90 derajat.",
    });
  }

  // Validate longitude (-180 to 180)
  if (longitude < -180 || longitude > 180) {
    return res.status(400).json({
      success: false,
      error: "Longitude harus berada di antara -180 dan 180 derajat.",
    });
  }

  try {
    // Insert new location
    const { data, error } = await db
      .from('heatmap')
      .insert({
        nama_lokasi,
        latitude,
        longitude,
        gmaps_url,
        status: 'aktif'
      })
      .select()
      .single();

    if (error) {
      console.error("Error adding heatmap location:", error);
      return res.status(500).json({
        success: false,
        error: "Kesalahan server saat menambah lokasi.",
      });
    }

    res.status(201).json({
      success: true,
      message: "Lokasi berhasil ditambahkan",
      data: {
        mapid: data.mapid,
        nama_lokasi,
        latitude,
        longitude,
        gmaps_url,
        status: "aktif",
      },
    });

  } catch (error) {
    console.error("Error adding heatmap location:", error);
    res.status(500).json({
      success: false,
      error: "Kesalahan server saat menambah lokasi.",
    });
  }
});

// Endpoint untuk upload CSV heatmap locations
// POST /api/admin/heatmap/upload-csv
router.post(
  "/heatmap/upload-csv",
  verifyToken,
  requireAdmin,
  upload.single("file"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "File CSV tidak ditemukan.",
      });
    }

    const results = [];
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on("data", (data) => results.push(data))
      .on("end", async () => {
        try {
          // Validate and filter data
          const validLocations = results.filter((row) => {
            const lat = parseFloat(row.latitude);
            const lng = parseFloat(row.longitude);
            return (
              row.nama_lokasi &&
              row.nama_lokasi.trim() !== "" &&
              !isNaN(lat) &&
              lat >= -90 &&
              lat <= 90 &&
              !isNaN(lng) &&
              lng >= -180 &&
              lng <= 180 &&
              row.gmaps_url &&
              row.gmaps_url.trim() !== ""
            );
          });

          if (validLocations.length === 0) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({
              success: false,
              error: "Tidak ada data lokasi yang valid dalam file CSV.",
            });
          }

          // Prepare data for insertion
          const insertData = validLocations.map((row) => ({
            nama_lokasi: row.nama_lokasi.trim(),
            latitude: parseFloat(row.latitude),
            longitude: parseFloat(row.longitude),
            gmaps_url: row.gmaps_url.trim(),
            status: "aktif",
          }));

          // Insert data using Supabase
          const { data, error } = await db
            .from('heatmap')
            .insert(insertData)
            .select();

          fs.unlinkSync(req.file.path); // Remove temp file

          if (error) {
            console.error("Error importing heatmap locations:", error);
            return res.status(500).json({
              success: false,
              error: "Gagal import data lokasi.",
              detail: error.message,
            });
          }

          res.json({
            success: true,
            message: `Import lokasi berhasil. ${data.length} lokasi ditambahkan.`,
            data: { imported: data.length },
          });

        } catch (error) {
          fs.unlinkSync(req.file.path);
          console.error("Error processing CSV:", error);
          res.status(500).json({
            success: false,
            error: "Gagal memproses file CSV.",
            detail: error.message,
          });
        }
      })
      .on("error", (err) => {
        fs.unlinkSync(req.file.path);
        res.status(500).json({
          success: false,
          error: "Gagal membaca file CSV.",
          detail: err.message,
        });
      });
  }
);

// Endpoint untuk edit lokasi heatmap
// PATCH /api/admin/heatmap/:mapid
router.patch("/heatmap/:mapid", verifyToken, requireAdmin, async (req, res) => {
  const { mapid } = req.params;
  const { nama_lokasi, latitude, longitude, gmaps_url } = req.body;

  // Validate required fields
  if (!nama_lokasi || !latitude || !longitude || !gmaps_url) {
    return res.status(400).json({
      success: false,
      error:
        "Semua field (nama_lokasi, latitude, longitude, gmaps_url) wajib diisi.",
    });
  }

  // Validate latitude and longitude
  if (latitude < -90 || latitude > 90) {
    return res.status(400).json({
      success: false,
      error: "Latitude harus berada di antara -90 dan 90 derajat.",
    });
  }

  if (longitude < -180 || longitude > 180) {
    return res.status(400).json({
      success: false,
      error: "Longitude harus berada di antara -180 dan 180 derajat.",
    });
  }

  try {
    const { data, error } = await db
      .from('heatmap')
      .update({
        nama_lokasi,
        latitude,
        longitude,
        gmaps_url
      })
      .eq('mapid', mapid)
      .select();

    if (error) {
      console.error("Error updating heatmap location:", error);
      return res.status(500).json({
        success: false,
        error: "Kesalahan server saat mengubah lokasi.",
      });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Lokasi tidak ditemukan.",
      });
    }

    res.json({
      success: true,
      message: "Lokasi berhasil diperbarui.",
    });

  } catch (error) {
    console.error("Error updating heatmap location:", error);
    res.status(500).json({
      success: false,
      error: "Kesalahan server saat mengubah lokasi.",
    });
  }
});

// Endpoint untuk menghapus lokasi heatmap
// DELETE /api/admin/heatmap/:mapid
router.delete("/heatmap/:mapid", verifyToken, requireAdmin, async (req, res) => {
  const { mapid } = req.params;

  try {
    // First check if there are crime data associated with this location
    const { count, error: countError } = await db
      .from('data_kriminal')
      .select('*', { count: 'exact', head: true })
      .eq('mapid', mapid);

    if (countError) {
      console.error("Error checking crime data:", countError);
      return res.status(500).json({
        success: false,
        error: "Kesalahan server saat memeriksa data terkait.",
      });
    }

    if (count > 0) {
      return res.status(400).json({
        success: false,
        error: `Tidak dapat menghapus lokasi. Masih ada ${count} data kriminal yang terkait dengan lokasi ini.`,
      });
    }

    // If no crime data, proceed with deletion
    const { data, error } = await db
      .from('heatmap')
      .delete()
      .eq('mapid', mapid)
      .select();

    if (error) {
      console.error("Error deleting heatmap location:", error);
      return res.status(500).json({
        success: false,
        error: "Kesalahan server saat menghapus lokasi.",
      });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Lokasi tidak ditemukan.",
      });
    }

    res.json({
      success: true,
      message: "Lokasi berhasil dihapus.",
    });

  } catch (error) {
    console.error("Error deleting heatmap location:", error);
    res.status(500).json({
      success: false,
      error: "Kesalahan server saat menghapus lokasi.",
    });
  }
});

// Endpoint untuk mengubah status lokasi (aktif/mati)
// PATCH /api/admin/heatmap/:mapid/status
router.patch("/heatmap/:mapid/status", verifyToken, requireAdmin, async (req, res) => {
  const { mapid } = req.params;
  const { status } = req.body;

  // Validasi input status
  if (status !== "aktif" && status !== "mati") {
    return res.status(400).json({
      success: false,
      error: "Status tidak valid. Gunakan 'aktif' atau 'mati'.",
    });
  }

  try {
    const { data, error } = await db
      .from('heatmap')
      .update({ status })
      .eq('mapid', mapid)
      .select();

    if (error) {
      console.error("Error updating location status:", error);
      return res.status(500).json({
        success: false,
        error: "Kesalahan server.",
      });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Lokasi tidak ditemukan.",
      });
    }

    res.json({
      success: true,
      message: `Status lokasi dengan mapid ${mapid} berhasil diubah menjadi ${status}.`,
    });

  } catch (error) {
    console.error("Error updating location status:", error);
    res.status(500).json({
      success: false,
      error: "Kesalahan server.",
    });
  }
});

// 3. FUNGSI MANAGE DATA KRIMINAL
// Endpoint untuk mendapatkan semua data kriminal
// GET /api/admin/kriminal
router.get("/kriminal", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await db
      .from('data_kriminal')
      .select(`
        *,
        heatmap!inner(nama_lokasi)
      `)
      .order('waktu', { ascending: false });

    if (error) {
      console.error("Error fetching crime data:", error);
      return res.status(500).json({
        success: false,
        error: "Kesalahan server saat mengambil data kriminal.",
      });
    }

    // Transform data to match the previous structure
    const transformedData = data.map(item => ({
      ...item,
      nama_lokasi: item.heatmap.nama_lokasi
    }));

    res.json({
      success: true,
      data: transformedData,
      message: "Data kriminal berhasil diambil",
    });

  } catch (error) {
    console.error("Error fetching crime data:", error);
    res.status(500).json({
      success: false,
      error: "Kesalahan server saat mengambil data kriminal.",
    });
  }
});

// Endpoint untuk menambah data kriminal secara manual
// POST /api/admin/kriminal/add
router.post("/kriminal/add", verifyToken, requireAdmin, async (req, res) => {
  const { mapid, jenis_kejahatan, waktu, deskripsi } = req.body;

  // Validate required fields
  if (!mapid || !jenis_kejahatan || !waktu) {
    return res.status(400).json({
      success: false,
      error: "Field mapid, jenis_kejahatan, dan waktu wajib diisi.",
    });
  }

  try {
    // Validate mapid exists
    const { data: locationData, error: locationError } = await db
      .from('heatmap')
      .select('mapid')
      .eq('mapid', mapid)
      .single();

    if (locationError && locationError.code !== 'PGRST116') {
      console.error("Error checking location:", locationError);
      return res.status(500).json({
        success: false,
        error: "Kesalahan server saat memvalidasi lokasi.",
      });
    }

    if (!locationData) {
      return res.status(400).json({
        success: false,
        error: "Lokasi dengan mapid tersebut tidak ditemukan.",
      });
    }

    // Insert crime data
    const { data, error } = await db
      .from('data_kriminal')
      .insert({
        mapid,
        jenis_kejahatan,
        waktu,
        deskripsi: deskripsi || ""
      })
      .select()
      .single();

    if (error) {
      console.error("Error adding crime data:", error);
      return res.status(500).json({
        success: false,
        error: "Kesalahan server saat menambah data kriminal.",
      });
    }

    res.status(201).json({
      success: true,
      message: "Data kriminal berhasil ditambahkan",
      data: {
        id: data.id,
        mapid,
        jenis_kejahatan,
        waktu,
        deskripsi: deskripsi || "",
      },
    });

  } catch (error) {
    console.error("Error adding crime data:", error);
    res.status(500).json({
      success: false,
      error: "Kesalahan server saat menambah data kriminal.",
    });
  }
});

// Endpoint: Upload CSV and import data_kriminal
// POST /api/admin/kriminal/upload
router.post("/kriminal/upload", verifyToken, requireAdmin, upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: "File CSV tidak ditemukan.",
    });
  }

  const results = [];
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on("data", (data) => results.push(data))
    .on("end", async () => {
      try {
        // Filter and validate rows
        const validRows = results.filter(
          (row) =>
            Number.isInteger(Number(row.mapid)) &&
            typeof row.jenis_kejahatan === "string" &&
            row.jenis_kejahatan.trim() !== "" &&
            !isNaN(Date.parse(row.waktu))
        );

        if (validRows.length === 0) {
          fs.unlinkSync(req.file.path);
          return res.status(400).json({
            success: false,
            error: "Tidak ada data kriminal yang valid dalam file CSV.",
          });
        }

        // Prepare data for insertion
        const insertData = validRows.map((row) => ({
          mapid: parseInt(row.mapid, 10),
          jenis_kejahatan: row.jenis_kejahatan.trim(),
          waktu: isNaN(Date.parse(row.waktu)) ? null : new Date(row.waktu).toISOString(),
          deskripsi: row.deskripsi || ""
        }));

        // Insert data using Supabase
        const { data, error } = await db
          .from('data_kriminal')
          .insert(insertData)
          .select();

        fs.unlinkSync(req.file.path); // Remove temp file

        if (error) {
          console.error("Error importing crime data:", error);
          return res.status(500).json({
            success: false,
            error: "Gagal import data kriminal.",
            detail: error.message,
          });
        }

        res.json({
          success: true,
          message: `Import data kriminal berhasil. ${data.length} data ditambahkan.`,
          data: { imported: data.length },
        });

      } catch (error) {
        fs.unlinkSync(req.file.path);
        console.error("Error processing CSV:", error);
        res.status(500).json({
          success: false,
          error: "Gagal memproses file CSV.",
          detail: error.message,
        });
      }
    })
    .on("error", (err) => {
      fs.unlinkSync(req.file.path);
      res.status(500).json({
        success: false,
        error: "Gagal membaca file CSV.",
        detail: err.message,
      });
    });
});
module.exports = router;
