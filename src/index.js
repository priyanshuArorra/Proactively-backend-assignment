const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');

const mysql = require('mysql2');
const jwt = require('jsonwebtoken'); // Added for token-based authentication

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Secret key for JWT
const JWT_SECRET = 'your_jwt_secret_key';

// Database connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'hahahaha',
    database: 'reachout_db',
});



db.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err);
        return;
    }
    console.log('Connected to the database');
});

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});
app.post('/api/signup', async (req, res) => {
    const { firstName, lastName, email, password, role } = req.body;

    // Validate all fields including role
    if (!firstName || !lastName || !email || !password || !role) {
        return res.status(400).json({ success: false, message: 'All fields are required!' });
    }

    // Optional: Validate role
    const validRoles = ['user', 'speaker'];
    if (!validRoles.includes(role)) {
        return res.status(400).json({ success: false, message: 'Invalid role selected' });
    }

    try {
        const query = 'SELECT * FROM Users WHERE email = ?';
        db.query(query, [email], async (err, results) => {
            if (err) {
                console.error('Error checking user:', err);
                return res.status(500).json({ success: false, message: 'Internal server error' });
            }

            if (results.length > 0) {
                return res.status(400).json({ success: false, message: 'User already exists with this email' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            
            // Modified INSERT query to include role
            const insertQuery = 'INSERT INTO Users (name, email, password, role) VALUES (?, ?, ?, ?)';
            db.query(insertQuery, [`${firstName} ${lastName}`, email, hashedPassword, role], (err, result) => {
                if (err) {
                    console.error('Error inserting user:', err);
                    return res.status(500).json({ success: false, message: 'Error saving user' });
                }

                const otp = Math.floor(100000 + Math.random() * 900000);
                const otpExpiry = new Date(Date.now() + 5 * 60000);

                const otpQuery = 'UPDATE Users SET otp = ?, otp_expiry = ? WHERE email = ?';
                db.query(otpQuery, [otp, otpExpiry, email], (err) => {
                    if (err) {
                        console.error('Error saving OTP:', err);
                        return res.status(500).json({ success: false, message: 'Error saving OTP' });
                    }

                    const transporter = nodemailer.createTransport({
                        service: 'gmail',
                        auth: {
                            user: 'priyanshuarora502@gmail.com',
                            pass: 'ssst akac nefs qhir',
                        },
                    });

                    const mailOptions = {
                        from: 'your_email@gmail.com',
                        to: email,
                        subject: 'Your OTP Code',
                        text: `Your OTP code is: ${otp}`,
                    };

                    transporter.sendMail(mailOptions, (err) => {
                        if (err) {
                            console.error('Error sending OTP email:', err);
                            return res.status(500).json({ success: false, message: 'Error sending OTP' });
                        }
                        res.json({ 
                            success: true, 
                            message: 'Signup successful! Check your email for the OTP.',
                            role: role // Optional: send back the role for frontend confirmation
                        });
                    });
                });
            });
        });
    } catch (err) {
        console.error('Error during signup:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Verify OTP API
app.post('/api/verify-otp', (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.status(400).json({ success: false, message: 'Email and OTP are required!' });
    }

    const otpQuery = 'SELECT otp, otp_expiry FROM Users WHERE email = ?';
    db.query(otpQuery, [email], (err, results) => {
        if (err) {
            console.error('Error fetching OTP:', err);
            return res.status(500).json({ success: false, message: 'Error verifying OTP' });
        }

        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const { otp: storedOtp, otp_expiry } = results[0];
        if (new Date() > new Date(otp_expiry)) {
            return res.status(400).json({ success: false, message: 'OTP has expired' });
        }

        if (otp === storedOtp.toString()) {
            res.json({ success: true, message: 'OTP verified successfully!' });
        } else {
            res.status(400).json({ success: false, message: 'Invalid OTP' });
        }
    });
});

app.post('/api/login', (req, res) => {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
        return res.status(400).json({ success: false, message: 'Email, password, and role are required!' });
    }

    const userQuery = 'SELECT * FROM Users WHERE email = ? AND role = ?';
    db.query(userQuery, [email, role], async (err, userResults) => {
        if (err) {
            console.error('Error fetching user:', err);
            return res.status(500).json({ success: false, message: 'Internal server error' });
        }

        if (userResults.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: role === 'speaker' 
                    ? 'No speaker account found with this email' 
                    : 'No user account found with this email' 
            });
        }

        const user = userResults[0];
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(400).json({ success: false, message: 'Invalid password' });
        }

        // Handle different login roles
        if (role === 'speaker') {
            // Check if speaker profile exists
            const speakerQuery = 'SELECT * FROM Speakers WHERE user_id = ?';
            db.query(speakerQuery, [user.user_id], (speakerErr, speakerResults) => {
                if (speakerErr) {
                    console.error('Error checking speaker profile:', speakerErr);
                    return res.status(500).json({ success: false, message: 'Internal server error' });
                }

                // Determine redirect based on profile existence
                const hasProfile = speakerResults.length > 0;
                res.json({ 
                    success: true, 
                    message: 'Login successful!',
                    hasProfile: hasProfile,
                    redirectTo: hasProfile ? '/speaker-dashboard' : '/speaker-profile',
                    userData: {
                        id: user.user_id,
                        name: user.name,
                        email: user.email,
                        role: user.role
                    }
                });
            });
        } else if (role === 'user') {
            // For regular users, redirect to user dashboard
            res.json({ 
                success: true, 
                message: 'Login successful!',
                redirectTo: '/user-dashboard',
                userData: {
                    id: user.user_id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                }
            });
        } else {
            // Invalid role
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid login role' 
            });
        }
    });
});

app.get('/speaker-profile', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'speaker.html'));
});

app.get('/speaker-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'speaker-dashboard.html'));
});


app.post('/api/save-speaker-profile', (req, res) => {
    const { email, name, expertise, price } = req.body;

    // Validate input
    if (!email || !name || !expertise || !price) {
        return res.status(400).json({ success: false, message: 'All fields are required!' });
    }

    // First, find the user ID - note the change to user_id
    const userQuery = 'SELECT user_id FROM Users WHERE email = ?';
    db.query(userQuery, [email], (userErr, userResults) => {
        if (userErr) {
            console.error('Detailed error finding user:', userErr);
            return res.status(500).json({ 
                success: false, 
                message: 'Internal server error finding user',
                errorDetails: userErr.message // Log full error details
            });
        }

        if (userResults.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const userId = userResults[0].user_id; // Changed from id to user_id

        // Insert or update speaker profile
        const insertQuery = `
            INSERT INTO Speakers (user_id, name, expertise, price) 
            VALUES (?, ?, ?, ?) 
            ON DUPLICATE KEY UPDATE 
            name = VALUES(name), 
            expertise = VALUES(expertise), 
            price = VALUES(price)
        `;

        db.query(insertQuery, [userId, name, expertise, price], (err, result) => {
            if (err) {
                console.error('Full error details saving profile:', err);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Error saving profile',
                    errorDetails: err.message
                });
            }

            // Respond with success and redirect
            res.json({ 
                success: true, 
                message: 'Speaker profile saved successfully!', 
                redirectTo: '/speaker-dashboard'
            });
        });
    });
});

// Get Speaker Profile API (modified to fetch by email)
app.post('/api/get-speaker-profile', (req, res) => {
    const { email } = req.body;

    if (!email) {
        console.error('No email provided');
        return res.status(400).json({ success: false, message: 'Email is required' });
    }

    console.log('Attempting to fetch profile for email:', email);

    // Modify the query to print out more diagnostic information
    const query = `
        SELECT 
            u.user_id, 
            u.email, 
            u.name as user_name,
            s.* 
        FROM Users u
        LEFT JOIN Speakers s ON u.user_id = s.user_id
        WHERE u.email = ?
    `;

    db.query(query, [email], (err, results) => {
        if (err) {
            console.error('FULL Database Error:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'Error fetching profile',
                errorDetails: err.message 
            });
        }

        console.log('Query Results:', results);

        if (results.length === 0) {
            console.error('No user found with this email');
            return res.status(404).json({ 
                success: false, 
                message: 'No user found with this email' 
            });
        }

        // Check if speaker profile exists
        const profileExists = results[0].id !== null;
        console.log('Profile Exists:', profileExists);

        if (!profileExists) {
            return res.status(404).json({ 
                success: false, 
                message: 'Speaker profile not found' 
            });
        }

        res.json({ 
            success: true, 
            profile: results[0] 
        });
    });
});

// Add these routes to your existing server.js file
app.get('/speaker', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'speaker.html'));
});

app.get('/speaker-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'speaker-dashboard.html'));
});

app.get('/api/get-all-speakers', (req, res) => {
    const query = `
        SELECT s.id, s.name, s.expertise, s.price
        FROM Speakers s
        JOIN Users u ON s.user_id = u.user_id
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching speakers:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'Error retrieving speakers',
                error: err.message 
            });
        }

        if (results.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'No speakers found' 
            });
        }

        res.json({ 
            success: true, 
            speakers: results 
        });
    });
});

// Book Session API
const nodemailer = require('nodemailer');

app.post('/api/book-session', (req, res) => {
    const { userEmail, speakerName, time } = req.body;

    if (!userEmail || !speakerName || !time) {
        return res.status(400).json({ 
            success: false, 
            message: 'All booking details are required' 
        });
    }

    // Create a transporter for sending emails
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'priyanshuarora502@gmail.com', // Replace with your email
            pass: 'ssst akac nefs qhir' // Replace with your email password or app-specific password
        }
    });

    // First, find the user and speaker details
    const findDetailsQuery = `
    SELECT 
        (SELECT user_id FROM Users WHERE email = ?) AS userId, 
        (SELECT id FROM Speakers WHERE name = ?) AS speakerId,
        (SELECT name FROM Users WHERE email = ?) AS userName,
        (SELECT email FROM Users WHERE name = ?) AS speakerEmail
    `;

    db.query(findDetailsQuery, [userEmail, speakerName, userEmail, speakerName], (err, detailResults) => {
        if (err) {
            console.error('Error finding user/speaker details:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'Internal server error',
                error: err.message 
            });
        }

        if (detailResults.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'User or speaker not found' 
            });
        }

        const { userId, speakerId, userName, speakerEmail } = detailResults[0];

        // Create a new table for bookings if it doesn't exist
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS Bookings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                speaker_id INT NOT NULL,
                booking_time VARCHAR(20) NOT NULL,
                booking_date DATE NOT NULL,
                status ENUM('PENDING', 'CONFIRMED', 'CANCELLED') DEFAULT 'PENDING',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES Users(user_id),
                FOREIGN KEY (speaker_id) REFERENCES Speakers(id),
                UNIQUE KEY unique_speaker_booking (speaker_id, booking_date, booking_time)
            )
        `;

        db.query(createTableQuery, (tableErr) => {
            if (tableErr) {
                console.error('Error creating bookings table:', tableErr);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Error setting up bookings',
                    error: tableErr.message 
                });
            }

            // Check for existing booking for the same speaker, date, and time
            const checkBookingQuery = `
                SELECT * FROM Bookings 
                WHERE speaker_id = ? 
                AND booking_date = CURDATE() 
                AND booking_time = ? 
                AND status != 'CANCELLED'
            `;

            db.query(checkBookingQuery, [speakerId, time], (checkErr, existingBookings) => {
                if (checkErr) {
                    console.error('Error checking existing bookings:', checkErr);
                    return res.status(500).json({ 
                        success: false, 
                        message: 'Error checking existing bookings',
                        error: checkErr.message 
                    });
                }

                // If a booking already exists, prevent double booking
                if (existingBookings.length > 0) {
                    return res.status(400).json({ 
                        success: false, 
                        message: 'This time slot is already booked' 
                    });
                }

                // Insert booking if no existing booking found
                const insertBookingQuery = `
                    INSERT INTO Bookings 
                    (user_id, speaker_id, booking_time, booking_date, status) 
                    VALUES (?, ?, ?, CURDATE(), 'PENDING')
                `;

                db.query(insertBookingQuery, [userId, speakerId, time], (insertErr, result) => {
                    if (insertErr) {
                        console.error('Error inserting booking:', insertErr);
                        return res.status(500).json({ 
                            success: false, 
                            message: 'Error booking session',
                            error: insertErr.message 
                        });
                    }

                    // Send email to user
                    const userMailOptions = {
                        from: 'your_email@gmail.com',
                        to: userEmail,
                        subject: 'Session Booked Successfully',
                        text: `Congratulations ${userName}! 
                        
Your session with ${speakerName} has been booked for ${time} today.

Note: We recommend adding this to your Google Calendar manually or using your preferred calendar app.

Best regards,
Your Booking Team`
                    };

                    // Send email to speaker
                    const speakerMailOptions = {
                        from: 'your_email@gmail.com',
                        to: speakerEmail,
                        subject: 'New Booking Received',
                        text: `Hello ${speakerName}!
                        
You have a new booking with ${userName} for ${time} today.

Session Details:
- Client: ${userName}
- Time: ${time}
- Date: Today

Best regards,
Your Booking Team`
                    };

                    // Send emails
                    transporter.sendMail(userMailOptions, (userMailErr) => {
                        if (userMailErr) {
                            console.error('Error sending email to user:', userMailErr);
                        }

                        transporter.sendMail(speakerMailOptions, (speakerMailErr) => {
                            if (speakerMailErr) {
                                console.error('Error sending email to speaker:', speakerMailErr);
                            }

                            res.json({ 
                                success: true, 
                                message: 'Session booked successfully! Emails sent.',
                                bookingId: result.insertId 
                            });
                        });
                    });
                });
            });
        });
    });
});


// Add route for user dashboard
app.get('/user-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'user-dashboard.html'));
});

app.post('/api/get-speaker-bookings', (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ 
            success: false, 
            message: 'Email is required' 
        });
    }

    // Query to get bookings for a specific speaker
    const query = `
        SELECT 
            b.id AS booking_id,
            b.booking_date AS date,
            b.booking_time AS time,
            b.status,
            u.name AS clientName,
            b.created_at
        FROM Bookings b
        JOIN Users u ON b.user_id = u.user_id
        JOIN Speakers s ON b.speaker_id = s.id
        JOIN Users su ON s.user_id = su.user_id
        WHERE su.email = ?
        ORDER BY b.booking_date DESC, b.booking_time
    `;

    db.query(query, [email], (err, results) => {
        if (err) {
            console.error('Error fetching speaker bookings:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'Error retrieving bookings',
                error: err.message 
            });
        }

        if (results.length === 0) {
            return res.json({ 
                success: true, 
                bookings: [],
                message: 'No bookings found' 
            });
        }

        res.json({ 
            success: true, 
            bookings: results 
        });
    });
});

// Start server
const PORT = 1111;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});