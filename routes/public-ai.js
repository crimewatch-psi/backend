const express = require("express");
const router = express.Router();
const { OpenAI } = require("openai");
const dotenv = require("dotenv");

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Public AI query endpoint for general safety questions
router.post("/query", async (req, res) => {
  const { question, location } = req.body;

  if (!question) {
    return res.status(400).json({ 
      error: "Parameter question wajib diisi.",
      success: false 
    });
  }

  if (question.length > 500) {
    return res.status(400).json({ 
      error: "Pertanyaan terlalu panjang. Maksimal 500 karakter.",
      success: false 
    });
  }

  try {
    // Mock safety data for Yogyakarta tourist areas
    const mockSafetyData = {
      "malioboro": {
        name: "Jalan Malioboro",
        safety_level: "Sedang",
        common_crimes: ["pencopetan", "penipuan", "jambret"],
        peak_times: "19:00-22:00",
        safety_tips: [
          "Jaga barang berharga dengan ketat",
          "Hindari memamerkan gadget mahal",
          "Gunakan pedagang resmi",
          "Waspada dengan calo"
        ]
      },
      "borobudur": {
        name: "Candi Borobudur",
        safety_level: "Rendah",
        common_crimes: ["penipuan tiket", "pemalakan"],
        peak_times: "10:00-15:00",
        safety_tips: [
          "Beli tiket dari loket resmi",
          "Gunakan pemandu wisata resmi",
          "Bawa air dan perlindungan matahari",
          "Ikuti aturan area candi"
        ]
      },
      "kraton": {
        name: "Keraton Yogyakarta",
        safety_level: "Rendah",
        common_crimes: ["pencopetan ringan"],
        peak_times: "11:00-14:00",
        safety_tips: [
          "Hormati aturan keraton",
          "Simpan tas di depan badan",
          "Ikuti jalur yang ditentukan",
          "Tanyakan kepada petugas jika bingung"
        ]
      },
      "parangtritis": {
        name: "Pantai Parangtritis",
        safety_level: "Sedang",
        common_crimes: ["pencopetan", "pemalakan"],
        peak_times: "16:00-19:00",
        safety_tips: [
          "Waspada ombak besar",
          "Jangan berenang terlalu jauh",
          "Gunakan jasa resmi",
          "Hindari area sepi saat malam"
        ]
      },
      "yogyakarta": {
        name: "Kota Yogyakarta",
        safety_level: "Sedang",
        common_crimes: ["pencopetan", "pencurian kendaraan", "penipuan"],
        peak_times: "18:00-22:00",
        safety_tips: [
          "Gunakan transportasi resmi",
          "Hindari jalan sepi malam hari",
          "Simpan dokumen penting terpisah",
          "Waspada di area keramaian"
        ]
      },
      "sleman": {
        name: "Kabupaten Sleman",
        safety_level: "Sedang",
        common_crimes: ["penipuan wisata", "pencurian", "pencopetan"],
        peak_times: "10:00-15:00",
        safety_tips: [
          "Berhati-hati di area wisata",
          "Gunakan pemandu resmi",
          "Waspada penipuan tiket",
          "Jaga barang berharga"
        ]
      },
      "bantul": {
        name: "Kabupaten Bantul",
        safety_level: "Sedang",
        common_crimes: ["penipuan", "pencurian", "pencopetan"],
        peak_times: "16:00-19:00",
        safety_tips: [
          "Waspada di area pantai",
          "Gunakan jasa wisata resmi",
          "Hindari area sepi",
          "Jaga barang pribadi"
        ]
      },
      "kulonprogo": {
        name: "Kabupaten Kulon Progo",
        safety_level: "Rendah",
        common_crimes: ["pencurian ringan", "penipuan"],
        peak_times: "12:00-17:00",
        safety_tips: [
          "Area relatif aman",
          "Tetap waspada di tempat wisata",
          "Gunakan jasa resmi",
          "Simpan barang berharga"
        ]
      },
      "gunungkidul": {
        name: "Kabupaten Gunung Kidul",
        safety_level: "Rendah",
        common_crimes: ["penipuan wisata", "pencurian ringan"],
        peak_times: "11:00-16:00",
        safety_tips: [
          "Waspada di pantai-pantai",
          "Gunakan pemandu lokal resmi",
          "Bawa persediaan air",
          "Hindari jalan terpencil sendirian"
        ]
      }
    };

    // Determine location context
    let locationData = null;
    if (location && location.toLowerCase() in mockSafetyData) {
      locationData = mockSafetyData[location.toLowerCase()];
    } else {
      // Try to extract location from question
      const questionLower = question.toLowerCase();
      for (const [key, data] of Object.entries(mockSafetyData)) {
        if (questionLower.includes(key) || questionLower.includes(data.name.toLowerCase())) {
          locationData = data;
          break;
        }
      }
    }

    // Create system prompt with context
    let systemPrompt = `Anda adalah asisten keamanan wisata untuk Yogyakarta, Indonesia. Berikan jawaban yang informatif, praktis, dan membantu wisatawan.

Informasi umum Yogyakarta:
- Kota yang relatif aman untuk wisatawan
- Tingkat kejahatan umumnya rendah hingga sedang
- Area wisata utama: Malioboro, Borobudur, Kraton, Parangtritis
- Waktu ramai: 10:00-15:00 dan 18:00-21:00
- Musim ramai: Juni-Agustus, Desember-Januari

Tips umum keamanan:
- Simpan dokumen penting dengan aman
- Gunakan transportasi resmi
- Hindari memamerkan barang berharga
- Selalu waspada di keramaian
- Gunakan pemandu/jasa resmi

Nomor darurat:
- Polisi: 110
- Ambulans: 118
- Pemadam: 113
- Polisi Pariwisata: (0274) 566000`;

    if (locationData) {
      systemPrompt += `\n\nInformasi khusus ${locationData.name}:
- Tingkat keamanan: ${locationData.safety_level}
- Kejahatan umum: ${locationData.common_crimes.join(", ")}
- Waktu ramai: ${locationData.peak_times}
- Tips khusus: ${locationData.safety_tips.join(", ")}`;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4", // Use GPT-4 for better responses
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: question
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    const aiReply = response.choices[0].message.content;

    // Create response with additional metadata
    const responseData = {
      success: true,
      reply: aiReply,
      location: locationData ? locationData.name : "Yogyakarta Umum",
      safety_level: locationData ? locationData.safety_level : "Umum",
      timestamp: new Date().toISOString(),
      query_id: `public_${Date.now()}`
    };

    res.json(responseData);

  } catch (error) {
    console.error("Error in public AI query:", error);
    
    // Fallback response if OpenAI fails
    const fallbackResponse = {
      success: true,
      reply: `Terima kasih atas pertanyaan Anda tentang keamanan di Yogyakarta. 

Yogyakarta secara umum adalah kota yang aman untuk wisatawan. Berikut tips umum keamanan:

• Simpan dokumen penting (paspor, ID) di tempat aman
• Hindari memamerkan barang berharga secara berlebihan
• Gunakan transportasi resmi seperti TransJogja atau taksi resmi
• Waspada pencopetan di area ramai seperti Malioboro
• Gunakan pemandu wisata resmi di tempat wisata

Untuk bantuan darurat:
- Polisi: 110
- Polisi Pariwisata: (0274) 566000

Jika Anda memiliki pertanyaan spesifik tentang lokasi tertentu, silakan sebutkan nama tempat yang ingin dikunjungi.`,
      location: location || "Yogyakarta Umum",
      safety_level: "Umum",
      timestamp: new Date().toISOString(),
      query_id: `public_fallback_${Date.now()}`
    };

    res.json(fallbackResponse);
  }
});

// Get popular public queries (for suggestions)
router.get("/popular-queries", (req, res) => {
  const popularQueries = [
    {
      id: 1,
      question: "Apakah Malioboro aman untuk dikunjungi malam hari?",
      category: "safety",
      location: "malioboro"
    },
    {
      id: 2,
      question: "Tips keamanan untuk wisatawan wanita solo di Yogyakarta?",
      category: "safety",
      location: "general"
    },
    {
      id: 3,
      question: "Waktu terbaik mengunjungi Candi Borobudur dari segi keamanan?",
      category: "timing",
      location: "borobudur"
    },
    {
      id: 4,
      question: "Transportasi teraman dari bandara ke pusat kota?",
      category: "transport",
      location: "general"
    },
    {
      id: 5,
      question: "Apakah makanan di pedagang kaki lima aman?",
      category: "food",
      location: "general"
    },
    {
      id: 6,
      question: "Area mana yang harus dihindari wisatawan di Yogyakarta?",
      category: "safety",
      location: "general"
    }
  ];

  res.json({
    success: true,
    data: popularQueries,
    total: popularQueries.length
  });
});

// Get safety tips by location
router.get("/safety-tips/:location", (req, res) => {
  const { location } = req.params;
  
  const safetyDatabase = {
    "malioboro": {
      name: "Jalan Malioboro",
      tips: [
        "Waspada pencopetan di keramaian",
        "Jangan mudah percaya dengan tawaran tur murah",
        "Gunakan pedagang yang memiliki izin resmi",
        "Simpan uang dalam beberapa tempat terpisah",
        "Hindari berjalan sendirian larut malam"
      ],
      emergency_contacts: [
        "Pos Polisi Malioboro: (0274) 562853",
        "Posko Pariwisata: (0274) 566000"
      ]
    },
    "borobudur": {
      name: "Candi Borobudur",
      tips: [
        "Beli tiket hanya dari loket resmi",
        "Gunakan jasa pemandu resmi yang berlisensi",
        "Bawa perlindungan dari sinar matahari",
        "Patuhi aturan dan arahan petugas",
        "Jaga jarak aman dari tepi candi"
      ],
      emergency_contacts: [
        "Kantor Pengelola Borobudur: (0293) 788266",
        "Puskesmas Borobudur: (0293) 788118"
      ]
    },
    "kraton": {
      name: "Keraton Yogyakarta",
      tips: [
        "Hormati aturan dan budaya keraton",
        "Ikuti jalur yang telah ditentukan",
        "Jangan menyentuh benda-benda bersejarah",
        "Tanyakan kepada petugas jika memerlukan bantuan",
        "Simpan tas di depan untuk kemudahan pengawasan"
      ],
      emergency_contacts: [
        "Kantor Keraton: (0274) 373721",
        "Pos Keamanan Keraton: (0274) 375757"
      ]
    }
  };

  const locationData = safetyDatabase[location.toLowerCase()];
  
  if (!locationData) {
    return res.status(404).json({
      success: false,
      error: "Lokasi tidak ditemukan"
    });
  }

  res.json({
    success: true,
    data: locationData
  });
});

module.exports = router;