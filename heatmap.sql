CREATE TABLE heatmap (
    mapid INT PRIMARY KEY AUTO_INCREMENT,
    nama_lokasi VARCHAR(255),
    latitude FLOAT,
    longitude FLOAT,
    gmaps_url TEXT,
    status ENUM('aktif', 'mati'),
    FOREIGN KEY (userid) REFERENCES user(id)
);