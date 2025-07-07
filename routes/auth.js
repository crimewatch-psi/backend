const express = require("express");
const router = express.Router();
const db = require("../db");
const bcrypt = require("bcrypt");

const SALT_ROUNDS = 10;

router.post("/register", async (req, res) => {
  const { email, password, nama, role } = req.body;

  if (!email || !password || !nama || !role) {
    return res.status(400).json({ error: "Semua field wajib diisi." });
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

      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

      const insertQuery =
        "INSERT INTO user (email, password, nama, role) VALUES (?, ?, ?, ?)";
      db.query(
        insertQuery,
        [email, hashedPassword, nama, role],
        (err, result) => {
          if (err) {
            console.error("Error creating user:", err);
            return res.status(500).json({ error: "Gagal membuat user baru." });
          }

          res.status(201).json({
            message: "Registrasi berhasil",
            user: {
              id: result.insertId,
              email,
              nama,
              role,
            },
          });
        }
      );
    });
  } catch (error) {
    console.error("Error in registration:", error);
    res.status(500).json({ error: "Kesalahan server saat registrasi." });
  }
});

router.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email dan password wajib diisi." });
  }

  const query = "SELECT * FROM user WHERE email = ?";
  db.query(query, [email], async (err, results) => {
    if (err) return res.status(500).json({ error: "Kesalahan server." });

    if (results.length === 0) {
      return res.status(401).json({ error: "Akun tidak ditemukan." });
    }

    const user = results[0];

    try {
      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return res.status(401).json({ error: "Password salah." });
      }

      const sanitizedUser = {
        id: user.id,
        nama: user.nama,
        email: user.email,
        role: user.role,
      };

      req.session.user = sanitizedUser;

      res.json({
        message: "Login berhasil",
        user: sanitizedUser,
      });
    } catch (error) {
      console.error("Error comparing passwords:", error);
      return res
        .status(500)
        .json({ error: "Kesalahan server saat verifikasi password." });
    }
  });
});

router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: "Gagal logout" });
    res.clearCookie("connect.sid");
    res.json({ message: "Logout berhasil" });
  });
});

module.exports = router;
