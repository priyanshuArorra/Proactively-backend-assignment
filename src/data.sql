-- Create the database
CREATE DATABASE IF NOT EXISTS reachout_db;

-- Use the database
USE reachout_db;

-- Create the Users table
CREATE TABLE Users (
    user_id INT AUTO_INCREMENT PRIMARY KEY, -- Unique user identifier
    name VARCHAR(100) NOT NULL,             -- User's name
    email VARCHAR(100) UNIQUE NOT NULL,     -- User's email
    password VARCHAR(255) NOT NULL,         -- Encrypted password
    otp INT,                                -- OTP code to verify user during signup
    otp_expiry TIMESTAMP,                   -- Expiration time of the OTP
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- Account creation timestamp
);

CREATE TABLE Bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    speaker_id INT NOT NULL,
    booking_time VARCHAR(20) NOT NULL,
    booking_date DATE NOT NULL,
    google_calendar_link VARCHAR(255),
    status ENUM('PENDING', 'CONFIRMED', 'CANCELLED') DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id),
    FOREIGN KEY (speaker_id) REFERENCES Speakers(id),
    UNIQUE KEY unique_speaker_booking (speaker_id, booking_date, booking_time)
);




