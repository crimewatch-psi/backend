CREATE TABLE user (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nama VARCHAR(255),
    email VARCHAR(255) UNIQUE,
    password VARCHAR(255),
    role ENUM('admin', 'manager', 'polri')
);