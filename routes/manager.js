const express = require("express");
const router = express.Router();
const db = require("../db");
const { isManager } = require("../middleware/managerauth");
const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return d;
}

function extractCoordinatesFromUrl(url) {
  if (!url) return null;

  // Pattern untuk berbagai format Google Maps URL
  const patterns = [
    /@(-?\d+\.?\d*),(-?\d+\.?\d*)/, // @lat,lng
    /!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/, // !3dlat!4dlng
    /q=(-?\d+\.?\d*),(-?\d+\.?\d*)/, // q=lat,lng
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return {
        latitude: parseFloat(match[1]),
        longitude: parseFloat(match[2]),
      };
    }
  }

  return null;
}

router.get("/analytics", isManager, async (req, res) => {
  try {
    const userId = req.session.user.id;

    const managerQuery = `
    SELECT md.organization, md.location_url, md.latitude, md.longitude, u.nama 
    FROM manager_details md 
    JOIN user u ON md.user_id = u.id 
    WHERE md.user_id = ?
  `;

    db.query(managerQuery, [userId], async (err, managerResults) => {
      if (err) {
        console.error("Error fetching manager details:", err);
        return res.status(500).json({
          success: false,
          error: "Gagal mengambil detail manajer.",
        });
      }

      if (managerResults.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Detail manajer tidak ditemukan.",
        });
      }

      const manager = managerResults[0];
      let managerCoords = null;

      // Use database coordinates if available, otherwise try to parse from URL
      if (manager.latitude && manager.longitude) {
        managerCoords = {
          latitude: manager.latitude,
          longitude: manager.longitude,
        };
      } else {
        managerCoords = extractCoordinatesFromUrl(manager.location_url);
      }

      if (!managerCoords) {
        return res.status(400).json({
          success: false,
          error:
            "Koordinat lokasi bisnis tidak valid. Pastikan latitude dan longitude sudah tersimpan di database atau URL Google Maps sudah benar.",
        });
      }

      const criminalQuery = `
        SELECT h.mapid, h.nama_lokasi, h.latitude, h.longitude,
               dk.id as crime_id, dk.jenis_kejahatan, dk.waktu, dk.deskripsi
        FROM heatmap h
        LEFT JOIN data_kriminal dk ON h.mapid = dk.mapid
        WHERE h.status = 'aktif'
        ORDER BY dk.waktu DESC
      `;

      db.query(criminalQuery, async (err, crimeResults) => {
        if (err) {
          console.error("Error fetching crime data:", err);
          return res.status(500).json({
            success: false,
            error: "Gagal mengambil data kriminal.",
          });
        }

        const nearbyLocations = [];
        const nearbyLocationMap = new Map();

        crimeResults.forEach((row) => {
          const distance = calculateDistance(
            managerCoords.latitude,
            managerCoords.longitude,
            row.latitude,
            row.longitude
          );

          if (distance <= 20) {
            if (!nearbyLocationMap.has(row.mapid)) {
              nearbyLocationMap.set(row.mapid, {
                mapid: row.mapid,
                nama_lokasi: row.nama_lokasi,
                latitude: row.latitude,
                longitude: row.longitude,
                distance: Math.round(distance * 100) / 100, // Round to 2 decimal places
                crimes: [],
              });
              nearbyLocations.push(nearbyLocationMap.get(row.mapid));
            }

            if (row.crime_id) {
              nearbyLocationMap.get(row.mapid).crimes.push({
                id: row.crime_id,
                jenis_kejahatan: row.jenis_kejahatan,
                waktu: row.waktu,
                deskripsi: row.deskripsi,
              });
            }
          }
        });

        const allCrimes = nearbyLocations.flatMap(
          (location) => location.crimes
        );
        const totalCrimes = allCrimes.length;

        if (totalCrimes === 0) {
          return res.json({
            success: true,
            data: {
              manager_info: {
                nama: manager.nama,
                organization: manager.organization,
                coordinates: managerCoords,
              },
              crime_summary: {
                total_crimes: 0,
                nearby_locations: [],
                crime_types: {},
                time_analysis: {},
                ai_analysis:
                  "Tidak ada data kriminal dalam radius 20km dari lokasi bisnis Anda. Ini adalah kabar baik untuk keamanan area bisnis Anda.",
                recommendations: [
                  "Tetap waspada dan pertahankan sistem keamanan yang ada",
                  "Lakukan koordinasi berkala dengan pihak keamanan setempat",
                  "Pantau perkembangan situasi keamanan di area sekitar",
                ],
              },
            },
          });
        }

        const crimeTypes = {};
        allCrimes.forEach((crime) => {
          crimeTypes[crime.jenis_kejahatan] =
            (crimeTypes[crime.jenis_kejahatan] || 0) + 1;
        });

        const timeAnalysis = {};
        allCrimes.forEach((crime) => {
          const month = new Date(crime.waktu).toLocaleDateString("id-ID", {
            month: "long",
            year: "numeric",
          });
          timeAnalysis[month] = (timeAnalysis[month] || 0) + 1;
        });

        const dataForAI = {
          lokasi_bisnis: {
            nama: manager.organization,
            koordinat: managerCoords,
          },
          total_kejahatan: totalCrimes,
          lokasi_kriminal_terdekat: nearbyLocations.map((loc) => ({
            nama: loc.nama_lokasi,
            jarak: loc.distance,
            jumlah_kejahatan: loc.crimes.length,
          })),
          jenis_kejahatan: crimeTypes,
          distribusi_waktu: timeAnalysis,
          kejahatan_terbaru: allCrimes.slice(0, 10).map((crime) => ({
            jenis: crime.jenis_kejahatan,
            waktu: crime.waktu,
            deskripsi: crime.deskripsi,
          })),
        };

        try {
          const aiResponse = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
              {
                role: "system",
                content: `Anda adalah konsultan keamanan wisata yang ahli. Berikan analisis mendalam dalam Bahasa Indonesia tentang tingkat kriminalitas di area bisnis wisata berdasarkan data berikut dalam format JSON dengan struktur:
{
  "ringkasan": "Ringkasan singkat situasi keamanan secara umum",
  "analisis_risiko": {
    "tingkat_risiko": "Rendah/Sedang/Tinggi",
    "detail": "Penjelasan detail tingkat risiko"
  },
  "pola_kriminalitas": {
    "tren": "Tren kriminalitas yang terlihat",
    "waktu_rawan": "Periode waktu yang perlu perhatian khusus",
    "area_rawan": "Area yang perlu perhatian khusus"
  },
  "dampak_bisnis": {
    "langsung": "Dampak langsung terhadap bisnis",
    "tidak_langsung": "Dampak tidak langsung terhadap bisnis"
  },
  "kesimpulan": "Kesimpulan dan saran utama"
}

Data kriminal: ${JSON.stringify(dataForAI)}`,
              },
              {
                role: "user",
                content:
                  "Berikan analisis komprehensif dalam format JSON yang diminta.",
              },
            ],
            temperature: 0.7,
            max_tokens: 1500,
            response_format: { type: "json_object" },
          });

          let parsedAiAnalysis;
          try {
            parsedAiAnalysis = JSON.parse(
              aiResponse.choices[0].message.content
            );
          } catch (parseError) {
            console.error("Error parsing AI response:", parseError);
            parsedAiAnalysis = {
              ringkasan: aiResponse.choices[0].message.content,
              analisis_risiko: { tingkat_risiko: "N/A", detail: "" },
              pola_kriminalitas: { tren: "", waktu_rawan: "", area_rawan: "" },
              dampak_bisnis: { langsung: "", tidak_langsung: "" },
              kesimpulan: "",
            };
          }

          const recommendationResponse = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
              {
                role: "system",
                content: `Anda adalah konsultan keamanan wisata. Berikan 5-8 rekomendasi praktis dan spesifik dalam Bahasa Indonesia untuk manajer wisata berdasarkan data kriminal berikut: ${JSON.stringify(
                  dataForAI
                )}`,
              },
              {
                role: "user",
                content:
                  "Berikan rekomendasi praktis yang dapat langsung diterapkan untuk meningkatkan keamanan wisatawan dan melindungi bisnis wisata.",
              },
            ],
            temperature: 0.7,
            max_tokens: 800,
          });

          const aiRecommendations =
            recommendationResponse.choices[0].message.content
              .split("\n")
              .filter(
                (line) =>
                  line.trim().length > 0 &&
                  (line.includes(".") || line.includes("-"))
              )
              .map((line) =>
                line
                  .replace(/^\d+\.\s*/, "")
                  .replace(/^-\s*/, "")
                  .trim()
              )
              .filter((line) => line.length > 10);

          res.json({
            success: true,
            data: {
              manager_info: {
                nama: manager.nama,
                organization: manager.organization,
                coordinates: managerCoords,
              },
              crime_summary: {
                total_crimes: totalCrimes,
                nearby_locations: nearbyLocations,
                crime_types: crimeTypes,
                time_analysis: timeAnalysis,
                radius_km: 20,
                analysis_date: new Date().toISOString(),
              },
              ai_analysis: parsedAiAnalysis,
              recommendations: aiRecommendations.slice(0, 8), // Maksimal 8 rekomendasi
            },
          });
        } catch (aiError) {
          console.error("Error with AI analysis:", aiError);

          const fallbackAnalysis = `Berdasarkan data kriminal dalam radius 20km dari lokasi bisnis ${
            manager.organization
          }, terdapat ${totalCrimes} kejadian kriminal yang tercatat. 
          
Jenis kejahatan yang paling sering terjadi adalah ${
            Object.keys(crimeTypes)[0]
          } dengan ${
            Object.values(crimeTypes)[0]
          } kasus. Hal ini menunjukkan perlunya peningkatan kewaspadaan dan implementasi sistem keamanan yang lebih baik.

Lokasi terdekat dengan aktivitas kriminal adalah ${
            nearbyLocations[0]?.nama_lokasi
          } yang berjarak ${nearbyLocations[0]?.distance}km dari bisnis Anda.`;

          const fallbackRecommendations = [
            "Tingkatkan sistem keamanan di area bisnis dengan CCTV dan petugas keamanan",
            "Koordinasi dengan pihak kepolisian setempat untuk patroli rutin",
            "Berikan briefing keamanan kepada wisatawan yang berkunjung",
            "Pasang pencahayaan yang memadai di area sekitar bisnis",
            "Buat sistem pelaporan insiden untuk monitoring keamanan",
            "Koordinasi dengan pengelola wisata lain di sekitar area",
          ];

          res.json({
            success: true,
            data: {
              manager_info: {
                nama: manager.nama,
                organization: manager.organization,
                coordinates: managerCoords,
              },
              crime_summary: {
                total_crimes: totalCrimes,
                nearby_locations: nearbyLocations,
                crime_types: crimeTypes,
                time_analysis: timeAnalysis,
                radius_km: 20,
                analysis_date: new Date().toISOString(),
              },
              ai_analysis: fallbackAnalysis,
              recommendations: fallbackRecommendations,
            },
          });
        }
      });
    });
  } catch (error) {
    console.error("Error in analytics endpoint:", error);
    res.status(500).json({
      success: false,
      error: "Terjadi kesalahan saat menganalisis data kriminal.",
    });
  }
});

router.get("/profile", isManager, (req, res) => {
  const userId = req.session.user.id;

  const query = `
    SELECT u.nama, u.email, md.organization, md.location_url
    FROM user u
    JOIN manager_details md ON u.id = md.user_id
    WHERE u.id = ?
  `;

  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error("Error fetching manager profile:", err);
      return res.status(500).json({
        success: false,
        error: "Gagal mengambil profil manajer.",
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Profil manajer tidak ditemukan.",
      });
    }

    res.json({
      success: true,
      data: results[0],
    });
  });
});

module.exports = router;
