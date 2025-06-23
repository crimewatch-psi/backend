const isAdmin = (req, res, next) => {
// Cek apakah ada sesi user yang aktif
  if (!req.session.user) {
    return res.status(401).json({ error: 'Maaf, Anda harus login dulu.' });
  }

// Cek apakah role user adalah 'admin'
  if (req.session.user.role !== 'admin') {
    return res.status(403).json({ error: 'Maaf, hanya Admin yang boleh masuk.' });
  }

// Jika user adalah admin, lanjutkan ke fungsi selanjutnya
  next();
};

module.exports = { isAdmin };