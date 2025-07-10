-- Supabase Schema for CrimeWatch Application
-- This recreates the MySQL schema for use with Supabase PostgreSQL

-- Enable Row Level Security (optional, can be configured later)
-- ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- 1. User table
CREATE TABLE IF NOT EXISTS "user" (
  id SERIAL PRIMARY KEY,
  nama VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'polri' CHECK (role IN ('admin', 'manager', 'polri')),
  status VARCHAR(20) NOT NULL DEFAULT 'aktif' CHECK (status IN ('aktif', 'nonaktif')),
  last_login TIMESTAMP DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Heatmap table
CREATE TABLE IF NOT EXISTS heatmap (
  mapid SERIAL PRIMARY KEY,
  nama_lokasi VARCHAR(255) NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  gmaps_url TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'aktif' CHECK (status IN ('aktif', 'mati')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Crime data table
CREATE TABLE IF NOT EXISTS data_kriminal (
  id SERIAL PRIMARY KEY,
  mapid INTEGER NOT NULL,
  jenis_kejahatan VARCHAR(255) NOT NULL,
  waktu TIMESTAMP NOT NULL,
  deskripsi TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (mapid) REFERENCES heatmap(mapid) ON DELETE CASCADE
);

-- 4. Manager details table
CREATE TABLE IF NOT EXISTS manager_details (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL,
  organization VARCHAR(255) NOT NULL,
  location_url TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_email ON "user"(email);
CREATE INDEX IF NOT EXISTS idx_user_role ON "user"(role);
CREATE INDEX IF NOT EXISTS idx_heatmap_status ON heatmap(status);
CREATE INDEX IF NOT EXISTS idx_data_kriminal_mapid ON data_kriminal(mapid);
CREATE INDEX IF NOT EXISTS idx_data_kriminal_waktu ON data_kriminal(waktu);
CREATE INDEX IF NOT EXISTS idx_manager_details_user_id ON manager_details(user_id);

-- Insert default admin user (password: admin123, will be hashed by the application)
INSERT INTO "user" (nama, email, password, role, status) 
VALUES ('Administrator', 'admin@crimewatch.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 'aktif')
ON CONFLICT (email) DO NOTHING;

-- Insert sample heatmap locations (Yogyakarta tourism areas)
INSERT INTO heatmap (nama_lokasi, latitude, longitude, gmaps_url, status) VALUES 
('Jalan Malioboro', -7.7939, 110.3684, 'https://maps.google.com/@-7.7939,110.3684,17z', 'aktif'),
('Candi Borobudur', -7.6079, 110.2038, 'https://maps.google.com/@-7.6079,110.2038,17z', 'aktif'),
('Keraton Yogyakarta', -7.8058, 110.3644, 'https://maps.google.com/@-7.8058,110.3644,17z', 'aktif'),
('Pantai Parangtritis', -8.0253, 110.3207, 'https://maps.google.com/@-8.0253,110.3207,17z', 'aktif'),
('Taman Sari', -7.8102, 110.3588, 'https://maps.google.com/@-7.8102,110.3588,17z', 'aktif')
ON CONFLICT DO NOTHING;

-- Note: Sample crime data and manager data can be inserted later through the application
-- or imported via CSV files using the existing admin functionality

-- Enable Row Level Security (RLS) - Optional for additional security
-- You can configure RLS policies in the Supabase dashboard if needed