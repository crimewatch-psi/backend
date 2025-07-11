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

  try {
    const { data: results, error } = await db
      .from("data_kriminal")
      .select("id, mapid, jenis_kejahatan, waktu, deskripsi")
      .eq("mapid", mapid)
      .order("waktu", { ascending: false })
      .limit(100);

    if (error) {
      return res.status(500).json({ error: "Gagal ambil data kriminal." });
    }

    if (!results || results.length === 0) {
      return res
        .status(404)
        .json({ error: "Tidak ada data kriminal untuk lokasi ini." });
    }

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content:
              `Anda adalah asisten keamanan cerdas. Anda diberi data JSON berisi daftar kejahatan terbaru (maksimal 100 kasus) pada satu lokasi wisata tertentu. Jangan menggunakan istilah tech, seperti JSON. Pastikan Anda menggunakan bahasa yang mudah dipahami. Ambil data dari berita-berita kriminal terbaru di Daerah Istimewa Yogyakarta. Gunakan data ini sebagai referensi untuk menjawab pertanyaan berikut:\n\n` +
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
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Gagal ambil data kriminal." });
  }
});

module.exports = router;
