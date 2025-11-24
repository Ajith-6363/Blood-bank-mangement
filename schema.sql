CREATE DATABASE IF NOT EXISTS blood_bank;
USE blood_bank;

CREATE TABLE IF NOT EXISTS inventory (
  blood_group VARCHAR(5) PRIMARY KEY,
  units INT NOT NULL DEFAULT 0,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS donors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(100),
  blood_group VARCHAR(5) NOT NULL,
  city VARCHAR(100),
  last_donated DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  blood_group VARCHAR(5) NOT NULL,
  units_needed INT NOT NULL DEFAULT 1,
  city VARCHAR(100),
  status ENUM('pending','fulfilled','rejected') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO inventory (blood_group, units) VALUES
('A+', 10), ('A-', 5), ('B+', 8), ('B-', 3), ('AB+', 4), ('AB-',1), ('O+', 12), ('O-',4)
ON DUPLICATE KEY UPDATE units=VALUES(units);
