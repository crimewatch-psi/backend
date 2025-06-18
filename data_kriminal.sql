CREATE TABLE data_kriminal (
    id INT PRIMARY KEY AUTO_INCREMENT,
    mapid INT,
    jenis_kejahatan VARCHAR(255),
    waktu TIMESTAMP,
    deskripsi TEXT,
    FOREIGN KEY (mapid) REFERENCES heatmap(mapid)
);