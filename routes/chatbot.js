const express = require("express");
const router = express.Router();
const db = require("../db");
const { OpenAI } = require("openai");
const dotenv = require("dotenv");
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

router.post("/", async (req, res) => {
  const { mapid, question } = req.body;

  if (!mapid || !question) {
    return res
      .status(400)
      .json({ error: "Parameter mapid dan question wajib diisi." });
  }

  if (question.length > 500) {
    return res
      .status(400)
      .json({ error: "Pertanyaan terlalu panjang. Maksimal 500 karakter." });
  }

  const query = `
    SELECT id, mapid, jenis_kejahatan, waktu, deskripsi 
    FROM data_kriminal 
    WHERE mapid = ? 
    ORDER BY waktu DESC 
    LIMIT 100
  `;

  db.query(query, [mapid], async (err, results) => {
    if (err)
      return res.status(500).json({ error: "Gagal ambil data kriminal." });
    if (results.length === 0) {
      return res
        .status(404)
        .json({ error: "Tidak ada data kriminal untuk lokasi ini." });
    }

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4.1",
        messages: [
          {
            role: "system",
            content:
              `Anda adalah asisten keamanan cerdas. Anda diberi data JSON berisi daftar kejahatan terbaru (maksimal 100 kasus) pada satu lokasi wisata tertentu. Gunakan data ini sebagai referensi untuk menjawab pertanyaan berikut:\n\n` +
              `${JSON.stringify(results)}`,
          },
          {
            role: "user",
            content: question,
          },
        ],
        temperature: 0.7,
      });

      const aiReply = response.choices[0].message.content;
      res.json({ reply: aiReply });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Gagal menghubungi OpenAI API." });
    }
  });
});

module.exports = router;
