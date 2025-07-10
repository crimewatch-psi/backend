const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/", async (req, res) => {
  const mapid = parseInt(req.query.mapid, 10);
  if (!mapid) {
    return res
      .status(400)
      .json({ error: "Parameter mapid wajib ada dan valid." });
  }

  try {
    const { data: crimeData, error } = await db
      .from('data_kriminal')
      .select('*')
      .eq('mapid', mapid);

    if (error) {
      return res
        .status(500)
        .json({ error: "Gagal mengambil data.", detail: error });
    }

    res.json(crimeData);
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Gagal mengambil data.", detail: err });
  }
});

module.exports = router;
