-- Migration: Add latitude and longitude columns to manager_details table
-- Run this query to update existing manager_details table structure

ALTER TABLE `manager_details` 
ADD COLUMN `latitude` FLOAT DEFAULT NULL,
ADD COLUMN `longitude` FLOAT DEFAULT NULL;

-- Update existing records with proper coordinates from their Google Maps URLs
-- These coordinates are extracted from the current location_url format

-- Justin's Lava Bantal (already has coordinates in URL)
UPDATE `manager_details` 
SET `latitude` = -7.7924, `longitude` = 110.3659, 
    `location_url` = 'https://maps.google.com/@-7.7924,110.3659'
WHERE `user_id` = 9;

-- Update other records with estimated coordinates (you may need to adjust these)
-- Malioboro Street
UPDATE `manager_details` 
SET `latitude` = -7.7924, `longitude` = 110.3659,
    `location_url` = 'https://maps.google.com/@-7.7924,110.3659'
WHERE `organization` = 'Wisata Malioboro';

-- Prambanan Temple
UPDATE `manager_details` 
SET `latitude` = -7.7520, `longitude` = 110.4915,
    `location_url` = 'https://maps.google.com/@-7.7520,110.4915'
WHERE `organization` = 'Wisata Candi Prambanan';

-- Alun-Alun Kidul
UPDATE `manager_details` 
SET `latitude` = -7.8124, `longitude` = 110.3638,
    `location_url` = 'https://maps.google.com/@-7.8124,110.3638'
WHERE `organization` = 'Wisata Alun-Alun Kidul';

-- Titik Nol
UPDATE `manager_details` 
SET `latitude` = -7.7998, `longitude` = 110.3657,
    `location_url` = 'https://maps.google.com/@-7.7998,110.3657'
WHERE `organization` = 'Wisata Titik Nol';
