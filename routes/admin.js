const express = require("express");
const router = express.Router();
const db = require("../db");
const { isAdmin } = require("../middleware/adminauth");
const bcrypt = require("bcrypt");
const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");

const SALT_ROUNDS = 10;

const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 1 * 1024 * 1024 }, // file max 1 MB
}); // Temporary upload folder (pastikan folder ini ada)

router.post("/register-manager", isAdmin, async (req, res) => {
  const { email, password, nama, organization, latitude, longitude } = req.body;

  if (!email || !password || !nama || !organization) {
    return res
      .status(400)
      .json({ error: "Email, password, nama, dan organization wajib diisi." });
  }

  // Validate latitude and longitude if provided
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

  // Generate location URL in the format that can be processed by AI
  let locationUrl = null;
  if (latitude && longitude) {
    locationUrl = `https://maps.google.com/@${latitude},${longitude}`;
  }

  try {
    const checkQuery = "SELECT * FROM user WHERE email = ?";
    db.query(checkQuery, [email], async (err, results) => {
      if (err) {
        console.error("Error checking existing user:", err);
        return res.status(500).json({ error: "Kesalahan server." });
      }

      if (results.length > 0) {
        return res.status(400).json({ error: "Email sudah terdaftar." });
      }

      try {
        // Hash password
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        // Start transaction
        db.beginTransaction(async (err) => {
          if (err) {
            console.error("Error starting transaction:", err);
            return res.status(500).json({ error: "Kesalahan server." });
          }

          // Insert user
          const insertUserQuery =
            "INSERT INTO user (email, password, nama, role, status) VALUES (?, ?, ?, 'manager', 'aktif')";
          db.query(
            insertUserQuery,
            [email, hashedPassword, nama],
            (err, userResult) => {
              if (err) {
                return db.rollback(() => {
                  console.error("Error creating user:", err);
                  res.status(500).json({ error: "Gagal membuat user baru." });
                });
              }

              const userId = userResult.insertId;

              // Insert manager details with latitude and longitude
              const insertManagerQuery =
                "INSERT INTO manager_details (user_id, organization, location_url, latitude, longitude) VALUES (?, ?, ?, ?, ?)";
              db.query(
                insertManagerQuery,
                [
                  userId,
                  organization,
                  locationUrl,
                  latitude || null,
                  longitude || null,
                ],
                (err, managerResult) => {
                  if (err) {
                    return db.rollback(() => {
                      console.error("Error creating manager details:", err);
                      res
                        .status(500)
                        .json({ error: "Gagal membuat detail manager." });
                    });
                  }

                  // Commit transaction
                  db.commit((err) => {
                    if (err) {
                      return db.rollback(() => {
                        console.error("Error committing transaction:", err);
                        res.status(500).json({
                          error: "Kesalahan server saat menyimpan data.",
                        });
                      });
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
                  });
                }
              );
            }
          );
        });
      } catch (hashError) {
        console.error("Error hashing password:", hashError);
        res
          .status(500)
          .json({ error: "Kesalahan server saat mengenkripsi password." });
      }
    });
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
router.get("/users", isAdmin, (req, res) => {
  const query = `
    SELECT 
      u.id, 
      u.nama as name, 
      u.email, 
      u.role, 
      CASE 
        WHEN u.status = 'aktif' THEN 'active'
        WHEN u.status = 'nonaktif' THEN 'inactive'
        ELSE u.status
      END as status,
      u.last_login,
      md.organization,
      md.location_url as location
    FROM user u
    INNER JOIN manager_details md ON u.id = md.user_id
    WHERE u.role = 'manager'
    ORDER BY u.id ASC
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching users:", err);
      return res.status(500).json({
        success: false,
        error: "Kesalahan server saat mengambil data user.",
      });
    }

    res.json({
      success: true,
      users: results,
    });
  });
});

//mengubah detail user (nama, email, organisasi, lokasi)
// PATCH /api/admin/users/:id
router.patch("/users/:id", isAdmin, (req, res) => {
  const { id } = req.params;
  const { nama, email, organization, location } = req.body;

  db.beginTransaction((err) => {
    if (err) {
      console.error("Error starting transaction:", err);
      return res.status(500).json({
        success: false,
        error: "Kesalahan server saat memulai transaksi.",
      });
    }

    const userQuery = "UPDATE user SET nama = ?, email = ? WHERE id = ?";
    db.query(userQuery, [nama, email, id], (err, userResults) => {
      if (err) {
        return db.rollback(() => {
          console.error("Error updating user:", err);
          res.status(500).json({
            success: false,
            error: "Kesalahan server saat mengubah data user.",
          });
        });
      }

      const managerQuery =
        "UPDATE manager_details SET organization = ?, location_url = ? WHERE user_id = ?";
      db.query(
        managerQuery,
        [organization, location, id],
        (err, managerResults) => {
          if (err) {
            return db.rollback(() => {
              console.error("Error updating manager details:", err);
              res.status(500).json({
                success: false,
                error: "Kesalahan server saat mengubah detail manager.",
              });
            });
          }

          db.commit((err) => {
            if (err) {
              return db.rollback(() => {
                console.error("Error committing transaction:", err);
                res.status(500).json({
                  success: false,
                  error: "Kesalahan server saat menyimpan perubahan.",
                });
              });
            }

            res.json({
              success: true,
              message: "Detail manager berhasil diubah.",
            });
          });
        }
      );
    });
  });
});

//mengubah status user (aktif/nonaktif)
// PATCH /api/admin/users/:id/status
router.patch("/users/:id/status", isAdmin, (req, res) => {
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

  const query = "UPDATE user SET status = ? WHERE id = ?";
  db.query(query, [backendStatus, id], (err, results) => {
    if (err) {
      console.error("Error updating user status:", err);
      return res.status(500).json({
        success: false,
        error: "Kesalahan server.",
      });
    }
    if (results.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: "User tidak ditemukan.",
      });
    }
    res.json({
      success: true,
      message: `Status user dengan ID ${id} berhasil diubah menjadi ${status}.`,
    });
  });
});

// 2. FUNGSI MANAGE LOKASI (HEATMAP)
// Endpoint untuk mendapatkan semua data heatmap
// GET /api/admin/heatmap
router.get("/heatmap", isAdmin, (req, res) => {
  const query = "SELECT * FROM heatmap ORDER BY mapid DESC";
  db.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching heatmap data:", err);
      return res.status(500).json({
        success: false,
        error: "Kesalahan server saat mengambil data heatmap.",
      });
    }
    res.json({
      success: true,
      data: results,
      message: "Data heatmap berhasil diambil",
    });
  });
});

// Endpoint untuk menambah lokasi heatmap baru (manual input)
// POST /api/admin/heatmap/upload
router.post("/heatmap/upload", isAdmin, (req, res) => {
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

  // Insert new location
  const query = `
    INSERT INTO heatmap (nama_lokasi, latitude, longitude, gmaps_url, status)
    VALUES (?, ?, ?, ?, 'aktif')
  `;

  db.query(
    query,
    [nama_lokasi, latitude, longitude, gmaps_url],
    (err, result) => {
      if (err) {
        console.error("Error adding heatmap location:", err);
        return res.status(500).json({
          success: false,
          error: "Kesalahan server saat menambah lokasi.",
        });
      }

      res.status(201).json({
        success: true,
        message: "Lokasi berhasil ditambahkan",
        data: {
          mapid: result.insertId,
          nama_lokasi,
          latitude,
          longitude,
          gmaps_url,
          status: "aktif",
        },
      });
    }
  );
});

// Endpoint untuk upload CSV heatmap locations
// POST /api/admin/heatmap/upload-csv
router.post(
  "/heatmap/upload-csv",
  isAdmin,
  upload.single("file"),
  (req, res) => {
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
      .on("end", () => {
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

        // Prepare values for insertion
        const values = validLocations.map((row) => [
          row.nama_lokasi.trim(),
          parseFloat(row.latitude),
          parseFloat(row.longitude),
          row.gmaps_url.trim(),
          "aktif",
        ]);

        const query =
          "INSERT INTO heatmap (nama_lokasi, latitude, longitude, gmaps_url, status) VALUES ?";
        db.query(query, [values], (err, result) => {
          fs.unlinkSync(req.file.path); // Remove temp file
          if (err) {
            console.error("Error importing heatmap locations:", err);
            return res.status(500).json({
              success: false,
              error: "Gagal import data lokasi.",
              detail: err.message,
            });
          }
          res.json({
            success: true,
            message: `Import lokasi berhasil. ${result.affectedRows} lokasi ditambahkan.`,
            data: { imported: result.affectedRows },
          });
        });
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
router.patch("/heatmap/:mapid", isAdmin, (req, res) => {
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

  const query = `
    UPDATE heatmap 
    SET nama_lokasi = ?, latitude = ?, longitude = ?, gmaps_url = ? 
    WHERE mapid = ?
  `;

  db.query(
    query,
    [nama_lokasi, latitude, longitude, gmaps_url, mapid],
    (err, results) => {
      if (err) {
        console.error("Error updating heatmap location:", err);
        return res.status(500).json({
          success: false,
          error: "Kesalahan server saat mengubah lokasi.",
        });
      }

      if (results.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          error: "Lokasi tidak ditemukan.",
        });
      }

      res.json({
        success: true,
        message: "Lokasi berhasil diperbarui.",
      });
    }
  );
});

// Endpoint untuk menghapus lokasi heatmap
// DELETE /api/admin/heatmap/:mapid
router.delete("/heatmap/:mapid", isAdmin, (req, res) => {
  const { mapid } = req.params;

  // First check if there are crime data associated with this location
  const checkQuery =
    "SELECT COUNT(*) as count FROM data_kriminal WHERE mapid = ?";
  db.query(checkQuery, [mapid], (err, results) => {
    if (err) {
      console.error("Error checking crime data:", err);
      return res.status(500).json({
        success: false,
        error: "Kesalahan server saat memeriksa data terkait.",
      });
    }

    const crimeCount = results[0].count;
    if (crimeCount > 0) {
      return res.status(400).json({
        success: false,
        error: `Tidak dapat menghapus lokasi. Masih ada ${crimeCount} data kriminal yang terkait dengan lokasi ini.`,
      });
    }

    // If no crime data, proceed with deletion
    const deleteQuery = "DELETE FROM heatmap WHERE mapid = ?";
    db.query(deleteQuery, [mapid], (err, results) => {
      if (err) {
        console.error("Error deleting heatmap location:", err);
        return res.status(500).json({
          success: false,
          error: "Kesalahan server saat menghapus lokasi.",
        });
      }

      if (results.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          error: "Lokasi tidak ditemukan.",
        });
      }

      res.json({
        success: true,
        message: "Lokasi berhasil dihapus.",
      });
    });
  });
});

// Endpoint untuk mengubah status lokasi (aktif/mati)
// PATCH /api/admin/heatmap/:mapid/status
router.patch("/heatmap/:mapid/status", isAdmin, (req, res) => {
  const { mapid } = req.params;
  const { status } = req.body;

  // Validasi input status
  if (status !== "aktif" && status !== "mati") {
    return res.status(400).json({
      success: false,
      error: "Status tidak valid. Gunakan 'aktif' atau 'mati'.",
    });
  }

  const query = "UPDATE heatmap SET status = ? WHERE mapid = ?";
  db.query(query, [status, mapid], (err, results) => {
    if (err) {
      console.error("Error updating location status:", err);
      return res.status(500).json({
        success: false,
        error: "Kesalahan server.",
      });
    }
    if (results.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: "Lokasi tidak ditemukan.",
      });
    }
    res.json({
      success: true,
      message: `Status lokasi dengan mapid ${mapid} berhasil diubah menjadi ${status}.`,
    });
  });
});

// 3. FUNGSI MANAGE DATA KRIMINAL
// Endpoint untuk mendapatkan semua data kriminal
// GET /api/admin/kriminal
router.get("/kriminal", isAdmin, (req, res) => {
  const query = `
    SELECT dk.*, h.nama_lokasi 
    FROM data_kriminal dk 
    LEFT JOIN heatmap h ON dk.mapid = h.mapid 
    ORDER BY dk.waktu DESC
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching crime data:", err);
      return res.status(500).json({
        success: false,
        error: "Kesalahan server saat mengambil data kriminal.",
      });
    }

    res.json({
      success: true,
      data: results,
      message: "Data kriminal berhasil diambil",
    });
  });
});

// Endpoint untuk menambah data kriminal secara manual
// POST /api/admin/kriminal/add
router.post("/kriminal/add", isAdmin, (req, res) => {
  const { mapid, jenis_kejahatan, waktu, deskripsi } = req.body;

  // Validate required fields
  if (!mapid || !jenis_kejahatan || !waktu) {
    return res.status(400).json({
      success: false,
      error: "Field mapid, jenis_kejahatan, dan waktu wajib diisi.",
    });
  }

  // Validate mapid exists
  const checkLocationQuery = "SELECT mapid FROM heatmap WHERE mapid = ?";
  db.query(checkLocationQuery, [mapid], (err, results) => {
    if (err) {
      console.error("Error checking location:", err);
      return res.status(500).json({
        success: false,
        error: "Kesalahan server saat memvalidasi lokasi.",
      });
    }

    if (results.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Lokasi dengan mapid tersebut tidak ditemukan.",
      });
    }

    // Insert crime data
    const insertQuery = `
      INSERT INTO data_kriminal (mapid, jenis_kejahatan, waktu, deskripsi)
      VALUES (?, ?, ?, ?)
    `;

    db.query(
      insertQuery,
      [mapid, jenis_kejahatan, waktu, deskripsi || ""],
      (err, result) => {
        if (err) {
          console.error("Error adding crime data:", err);
          return res.status(500).json({
            success: false,
            error: "Kesalahan server saat menambah data kriminal.",
          });
        }

        res.status(201).json({
          success: true,
          message: "Data kriminal berhasil ditambahkan",
          data: {
            id: result.insertId,
            mapid,
            jenis_kejahatan,
            waktu,
            deskripsi: deskripsi || "",
          },
        });
      }
    );
  });
});

// Endpoint: Upload CSV and import data_kriminal
// POST /api/admin/kriminal/upload
router.post("/kriminal/upload", isAdmin, upload.single("file"), (req, res) => {
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
    .on("end", () => {
      // Insert each row into data_kriminal
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

      const values = validRows.map((row) => [
        parseInt(row.mapid, 10),
        row.jenis_kejahatan.trim(),
        isNaN(Date.parse(row.waktu)) ? null : new Date(row.waktu),
        row.deskripsi || "",
      ]);

      const query =
        "INSERT INTO data_kriminal (mapid, jenis_kejahatan, waktu, deskripsi) VALUES ?";
      db.query(query, [values], (err, result) => {
        fs.unlinkSync(req.file.path); // Remove temp file
        if (err) {
          console.error("Error importing crime data:", err);
          return res.status(500).json({
            success: false,
            error: "Gagal import data kriminal.",
            detail: err.message,
          });
        }
        res.json({
          success: true,
          message: `Import data kriminal berhasil. ${result.affectedRows} data ditambahkan.`,
          data: { imported: result.affectedRows },
        });
      });
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
