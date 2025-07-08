const isAdmin = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "Maaf, Anda harus login dulu." });
  }

  if (req.session.user.role !== "admin") {
    return res
      .status(403)
      .json({ error: "Maaf, hanya Admin yang boleh masuk." });
  }
  next();
};

module.exports = { isAdmin };
