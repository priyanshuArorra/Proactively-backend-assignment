const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const db = require('../db'); // Import your database connection

// Secret keys (use .env for production)
const JWT_SECRET = 'your_jwt_secret';
const OTP_SECRET = 'your_otp_secret';

// Simulate OTP store (replace with DB in production)
const otpStore = {};

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'your_email@gmail.com',
        pass: 'your_email_password',
    },
});

exports.signup = async (req, res) => {
    const { first_name, last_name, email, password, user_type } = req.body;
    if (!['user', 'speaker'].includes(user_type)) {
        return res.status(400).send({ message: 'Invalid user type' });
    }
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await db.query(
            `INSERT INTO users (first_name, last_name, email, password, user_type) VALUES (?, ?, ?, ?, ?)`,
            [first_name, last_name, email, hashedPassword, user_type]
        );
        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        otpStore[email] = otp;

        // Send OTP email
        await transporter.sendMail({
            to: email,
            subject: 'Verify Your Account',
            text: `Your OTP is ${otp}`,
        });

        res.status(201).send({ message: 'Signup successful! Verify your OTP.' });
    } catch (error) {
        res.status(500).send({ message: 'Error creating user', error });
    }
};

exports.verifyOTP = (req, res) => {
    const { email, otp } = req.body;
    if (otpStore[email] === otp) {
        db.query(`UPDATE users SET is_verified = TRUE WHERE email = ?`, [email]);
        delete otpStore[email];
        res.send({ message: 'Account verified successfully!' });
    } else {
        res.status(400).send({ message: 'Invalid OTP' });
    }
};

exports.login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const [user] = await db.query(`SELECT * FROM users WHERE email = ?`, [email]);
        if (!user) {
            return res.status(404).send({ message: 'User not found' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).send({ message: 'Invalid credentials' });
        }

        if (!user.is_verified) {
            return res.status(403).send({ message: 'Account not verified' });
        }

        const token = jwt.sign({ id: user.id, user_type: user.user_type }, JWT_SECRET, { expiresIn: '1h' });
        res.send({ message: 'Login successful!', token });
    } catch (error) {
        res.status(500).send({ message: 'Error logging in', error });
    }
};
