const isManager = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "Anda harus login terlebih dahulu." });
  }

  if (req.session.user.role !== "manager") {
    return res.status(403).json({
      error: "Hanya manajer wisata yang dapat mengakses halaman ini.",
    });
  }

  if (req.session.user.status !== "aktif") {
    return res
      .status(403)
      .json({ error: "Akun Anda tidak aktif. Hubungi administrator." });
  }

  next();
};

module.exports = { isManager };
