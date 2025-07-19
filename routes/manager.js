const express = require("express");
const router = express.Router();
const supabase = require("../db");
const { verifyToken, requireManager } = require("../middleware/auth");
const OpenAI = require("openai");
const analyticsCache = require("../utils/cache");
const Logger = require("../utils/logger");

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

router.get("/analytics", verifyToken, requireManager, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const userId = req.user.id;
    Logger.info("Analytics request started", { userId });

    // Fetch manager details with join using Supabase
    try {
      const { data: managerResults, error: managerError } = await supabase
        .from('manager_details')
        .select(`
          organization,
          location_url,
          latitude,
          longitude,
          user!inner(
            nama
          )
        `)
        .eq('user_id', userId)
        .single();

      if (managerError) {
        console.error("Error fetching manager details:", managerError);
        return res.status(500).json({
          success: false,
          error: "Gagal mengambil detail manajer.",
        });
      }

      if (!managerResults) {
        return res.status(404).json({
          success: false,
          error: "Detail manajer tidak ditemukan.",
        });
      }

      // Flatten the user data from the join
      const manager = {
        organization: managerResults.organization,
        location_url: managerResults.location_url,
        latitude: managerResults.latitude,
        longitude: managerResults.longitude,
        nama: managerResults.user.nama
      };
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

      // Optimize: First get locations within reasonable geographic bounds
      // This reduces the dataset before calculating exact distances
      const latRange = 0.2; // Approximately 20km in latitude degrees
      const lngRange = 0.2; // Approximately 20km in longitude degrees
      
      const { data: crimeResults, error: crimeError } = await supabase
        .from('heatmap')
        .select(`
          mapid,
          nama_lokasi,
          latitude,
          longitude,
          data_kriminal!left(
            id,
            jenis_kejahatan,
            waktu,
            deskripsi
          )
        `)
        .eq('status', 'aktif')
        .gte('latitude', managerCoords.latitude - latRange)
        .lte('latitude', managerCoords.latitude + latRange)
        .gte('longitude', managerCoords.longitude - lngRange)
        .lte('longitude', managerCoords.longitude + lngRange)
        .order('waktu', { ascending: false, referencedTable: 'data_kriminal' })
        .limit(100); // Limit locations to process

      if (crimeError) {
        console.error("Error fetching crime data:", crimeError);
        return res.status(500).json({
          success: false,
          error: "Gagal mengambil data kriminal.",
        });
      }

        const nearbyLocations = [];
        const nearbyLocationMap = new Map();
        let totalCrimesProcessed = 0;
        const maxCrimesToProcess = 1000; // Limit crimes for performance

        // Process Supabase results - optimized for performance
        for (const location of crimeResults) {
          // Skip if we've processed enough crimes
          if (totalCrimesProcessed >= maxCrimesToProcess) break;
          
          const distance = calculateDistance(
            managerCoords.latitude,
            managerCoords.longitude,
            location.latitude,
            location.longitude
          );

          if (distance <= 20) {
            if (!nearbyLocationMap.has(location.mapid)) {
              nearbyLocationMap.set(location.mapid, {
                mapid: location.mapid,
                nama_lokasi: location.nama_lokasi,
                latitude: location.latitude,
                longitude: location.longitude,
                distance: Math.round(distance * 100) / 100,
                crimes: [],
              });
              nearbyLocations.push(nearbyLocationMap.get(location.mapid));
            }

            // Process crimes for this location with limit
            if (location.data_kriminal && location.data_kriminal.length > 0) {
              const crimesToAdd = location.data_kriminal.slice(0, 50); // Max 50 crimes per location
              crimesToAdd.forEach((crime) => {
                if (totalCrimesProcessed < maxCrimesToProcess) {
                  nearbyLocationMap.get(location.mapid).crimes.push({
                    id: crime.id,
                    jenis_kejahatan: crime.jenis_kejahatan,
                    waktu: crime.waktu,
                    deskripsi: crime.deskripsi,
                  });
                  totalCrimesProcessed++;
                }
              });
            }
          }
        }

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
                mapid: nearbyLocations[0]?.mapid || null,
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

        // Check cache first
        const dataHash = analyticsCache.hashCrimeData(dataForAI);
        const cachedAnalysis = analyticsCache.get(userId, dataHash);
        
        if (cachedAnalysis) {
          // Return cached result immediately
          return res.json({
            success: true,
            data: {
              manager_info: {
                nama: manager.nama,
                organization: manager.organization,
                mapid: nearbyLocations[0]?.mapid || null,
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
              ai_analysis: cachedAnalysis.ai_analysis,
              recommendations: cachedAnalysis.recommendations,
            },
          });
        }

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

          // Cache the AI analysis results
          const analysisToCache = {
            ai_analysis: parsedAiAnalysis,
            recommendations: aiRecommendations,
          };
          analyticsCache.set(userId, dataHash, analysisToCache);

          res.json({
            success: true,
            data: {
              manager_info: {
                nama: manager.nama,
                organization: manager.organization,
                mapid: nearbyLocations[0]?.mapid || null,
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
                mapid: nearbyLocations[0]?.mapid || null,
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
    } catch (crimeError) {
      console.error("Error in crime data processing:", crimeError);
      return res.status(500).json({
        success: false,
        error: "Gagal memproses data kriminal.",
      });
    }
  } catch (error) {
    console.error("Error in analytics endpoint:", error);
    res.status(500).json({
      success: false,
      error: "Terjadi kesalahan saat menganalisis data kriminal.",
    });
  }
});

// Quick stats endpoint for faster initial load
router.get("/analytics/quick", verifyToken, requireManager, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get manager basic info
    const { data: managerResults, error: managerError } = await supabase
      .from('manager_details')
      .select(`
        organization,
        latitude,
        longitude,
        user!inner(nama)
      `)
      .eq('user_id', userId)
      .single();

    if (managerError || !managerResults) {
      return res.status(404).json({
        success: false,
        error: "Detail manajer tidak ditemukan.",
      });
    }

    const manager = {
      organization: managerResults.organization,
      latitude: managerResults.latitude,
      longitude: managerResults.longitude,
      nama: managerResults.user.nama
    };

    if (!manager.latitude || !manager.longitude) {
      return res.status(400).json({
        success: false,
        error: "Koordinat lokasi tidak tersedia.",
      });
    }

    // Get quick crime count within bounds
    const latRange = 0.2;
    const lngRange = 0.2;
    
    // Use RPC function or a simpler approach for quick stats
    const quickStats = {
      estimated_crimes: 0, // We'll calculate this differently
      radius_km: 20,
      last_updated: new Date().toISOString()
    };

    // For now, return basic structure - in production you'd want a database view or RPC
    try {
      const { count } = await supabase
        .from('heatmap')
        .select('*', { count: 'exact', head: true })
        .gte('latitude', manager.latitude - latRange)
        .lte('latitude', manager.latitude + latRange)
        .gte('longitude', manager.longitude - lngRange)
        .lte('longitude', manager.longitude + lngRange)
        .eq('status', 'aktif');
      
      quickStats.estimated_crimes = (count || 0) * 10; // Rough estimate
    } catch (error) {
      console.error("Quick count error:", error);
    }

    const responseData = {
      manager_info: {
        nama: manager.nama,
        organization: manager.organization,
        coordinates: {
          latitude: manager.latitude,
          longitude: manager.longitude
        }
      },
      quick_stats: quickStats
    };

    res.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error("Error fetching quick analytics:", error);
    res.status(500).json({
      success: false,
      error: "Gagal mengambil statistik cepat."
    });
  }
});

router.get("/profile", verifyToken, requireManager, async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch manager profile with join using Supabase
    const { data: profileData, error: profileError } = await supabase
      .from('user')
      .select(`
        nama,
        email,
        manager_details!inner(
          organization,
          location_url
        )
      `)
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error("Error fetching manager profile:", profileError);
      return res.status(500).json({
        success: false,
        error: "Gagal mengambil profil manajer.",
      });
    }

    if (!profileData) {
      return res.status(404).json({
        success: false,
        error: "Profil manajer tidak ditemukan.",
      });
    }

    // Flatten the response structure
    const flattenedData = {
      nama: profileData.nama,
      email: profileData.email,
      organization: profileData.manager_details.organization,
      location_url: profileData.manager_details.location_url
    };

    res.json({
      success: true,
      data: flattenedData,
    });
  } catch (error) {
    console.error("Error in profile endpoint:", error);
    res.status(500).json({
      success: false,
      error: "Terjadi kesalahan saat mengambil profil manajer.",
    });
  }
});

module.exports = router;
