const express = require("express");
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Session check endpoint for JWT token validation
router.get("/session", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.json({ isAuthenticated: false });
    }

    const token = authHeader.substring(7);
    
    // Verify the JWT token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.json({ isAuthenticated: false });
    }

    // Get user data from users table
    const serviceClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ROLE_KEY
    );
    
    const { data: userData, error: userError } = await serviceClient
      .from('user')
      .select('id, email, nama, role, status')
      .eq('email', user.email)
      .single();

    if (userError || !userData || (userData.status !== 'active' && userData.status !== 'aktif')) {
      return res.json({ isAuthenticated: false });
    }

    res.json({
      isAuthenticated: true,
      user: {
        id: userData.id,
        nama: userData.nama,
        email: userData.email,
        role: userData.role,
        status: userData.status
      }
    });
  } catch (error) {
    console.error("Session check error:", error);
    res.json({ isAuthenticated: false });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email dan password wajib diisi." });
  }

  try {

    // Use Supabase Auth to sign in the user
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      return res.status(401).json({ error: "Email atau password salah." });
    }

    if (!authData.user || !authData.session) {
      return res.status(401).json({ error: "Login gagal." });
    }

    // Get user data from users table using service role client
    const serviceClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ROLE_KEY
    );
    
    const { data: userData, error: userError } = await serviceClient
      .from('user')
      .select('id, email, nama, role, status')
      .eq('email', email)
      .single();

    if (userError || !userData) {
      return res.status(401).json({ error: "Data pengguna tidak ditemukan." });
    }

    // Check if user is active (can be 'active' or 'aktif')
    if (userData.status !== 'active' && userData.status !== 'aktif') {
      return res.status(403).json({ error: "Akun tidak aktif. Hubungi administrator." });
    }

    const sanitizedUser = {
      id: userData.id,
      nama: userData.nama,
      email: userData.email,
      role: userData.role,
      status: userData.status
    };


    res.json({
      message: "Login berhasil",
      user: sanitizedUser,
      token: authData.session.access_token,
      refreshToken: authData.session.refresh_token
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Kesalahan server." });
  }
});

router.post("/logout", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut(token);
      
      if (error) {
        console.error("Supabase logout error:", error);
      }
    }

    res.json({ message: "Logout berhasil" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ error: "Gagal logout" });
  }
});

module.exports = router;
