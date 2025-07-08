const express = require("express");
const router = express.Router();
const db = require("../db");
const bcrypt = require("bcrypt");

const SALT_ROUNDS = 10;

// router.post("/hash-passwords", async (req, res) => {
//   try {
//     const getUsersQuery = "SELECT id, password FROM user";

//     db.query(getUsersQuery, async (err, users) => {
//       if (err) {
//         console.error("Error fetching users:", err);
//         return res.status(500).json({ error: "Database error" });
//       }

//       let updateCount = 0;

//       for (const user of users) {
//         if (!user.password.startsWith("$2b$")) {
//           try {
//             const hashedPassword = await bcrypt.hash(
//               user.password,
//               SALT_ROUNDS
//             );

//             const updateQuery = "UPDATE user SET password = ? WHERE id = ?";
//             await new Promise((resolve, reject) => {
//               db.query(
//                 updateQuery,
//                 [hashedPassword, user.id],
//                 (err, result) => {
//                   if (err) reject(err);
//                   else resolve(result);
//                 }
//               );
//             });

//             updateCount++;
//           } catch (hashError) {
//             console.error(
//               `Error hashing password for user ${user.id}:`,
//               hashError
//             );
//           }
//         }
//       }

//       res.json({
//         message: `Successfully hashed ${updateCount} passwords`,
//         totalUsers: users.length,
//       });
//     });
//   } catch (error) {
//     console.error("Error in hash-passwords:", error);
//     res.status(500).json({ error: "Server error" });
//   }
// });

router.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email dan password wajib diisi." });
  }

  const query = "SELECT * FROM user WHERE email = ?";
  db.query(query, [email], async (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ error: "Kesalahan server." });
    }

    if (results.length === 0) {
      return res.status(401).json({ error: "Akun tidak ditemukan." });
    }

    const user = results[0];

    try {
      let isPasswordValid = false;

      if (user.password.startsWith("$2b$")) {
        isPasswordValid = await bcrypt.compare(password, user.password);
      } else {
        isPasswordValid = password === user.password;

        if (isPasswordValid) {
          const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
          const updateQuery = "UPDATE user SET password = ? WHERE id = ?";
          db.query(updateQuery, [hashedPassword, user.id], (updateErr) => {
            if (updateErr) {
              console.error("Error updating password hash:", updateErr);
            }
          });
        }
      }

      if (!isPasswordValid) {
        return res.status(401).json({ error: "Password salah." });
      }

      const sanitizedUser = {
        id: user.id,
        nama: user.nama,
        email: user.email,
        role: user.role,
        status: user.status,
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
    res.clearCookie("sessionId");
    res.json({ message: "Logout berhasil" });
  });
});

module.exports = router;
