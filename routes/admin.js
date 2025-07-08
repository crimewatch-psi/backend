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
  const { email, password, nama, organization, location } = req.body;

  if (!email || !password || !nama || !organization) {
    return res
      .status(400)
      .json({ error: "Email, password, nama, dan organization wajib diisi." });
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

              // Insert manager details
              const insertManagerQuery =
                "INSERT INTO manager_details (user_id, organization, location_url) VALUES (?, ?, ?)";
              db.query(
                insertManagerQuery,
                [userId, organization, location || null],
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
                        location: location || null,
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
  const query = "SELECT * FROM heatmap";
  db.query(query, (err, results) => {
    if (err)
      return res
        .status(500)
        .json({ error: "Kesalahan server saat mengambil data heatmap." });
    res.json(results);
  });
});

// Endpoint untuk mengubah status lokasi (aktif/mati)
// PATCH /api/admin/heatmap/:mapid/status
router.patch("/heatmap/:mapid/status", isAdmin, (req, res) => {
  const { mapid } = req.params;
  const { status } = req.body;

  // Validasi input status
  if (status !== "aktif" && status !== "mati") {
    return res
      .status(400)
      .json({ error: "Status tidak valid. Gunakan 'aktif' atau 'mati'." });
  }

  const query = "UPDATE heatmap SET status = ? WHERE mapid = ?";
  db.query(query, [status, mapid], (err, results) => {
    if (err) return res.status(500).json({ error: "Kesalahan server." });
    if (results.affectedRows === 0) {
      return res.status(404).json({ error: "Lokasi tidak ditemukan." });
    }
    res.json({
      message: `Status lokasi dengan mapid ${mapid} berhasil diubah menjadi ${status}.`,
    });
  });
});

// Endpoint: Upload CSV and import data_kriminal
// POST /api/admin/kriminal/upload
router.post("/kriminal/upload", isAdmin, upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "File CSV tidak ditemukan." });
  }

  const results = [];
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on("data", (data) => results.push(data))
    .on("end", () => {
      // Insert each row into data_kriminal
      const values = results
        .filter(
          (row) =>
            Number.isInteger(Number(row.mapid)) &&
            typeof row.jenis_kejahatan === "string" &&
            row.jenis_kejahatan.trim() !== "" &&
            !isNaN(Date.parse(row.waktu))
        )
        .map((row) => [
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
          return res
            .status(500)
            .json({ error: "Gagal import data.", detail: err });
        }
        res.json({
          message: "Import data berhasil",
          imported: result.affectedRows,
        });
      });
    })
    .on("error", (err) => {
      fs.unlinkSync(req.file.path);
      res.status(500).json({ error: "Gagal membaca file CSV.", detail: err });
    });
});
module.exports = router;
