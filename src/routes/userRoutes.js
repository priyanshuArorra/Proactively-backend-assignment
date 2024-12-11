const express = require('express');
const router = express.Router();

// Example route for signup
router.post('/signup', (req, res) => {
    const { firstName, lastName, email, password } = req.body;
    // Your signup logic here
    res.send('Signup route');
});

// Example route for login
router.post('/login', (req, res) => {
    const { email, password } = req.body;
    // Your login logic here
    res.send('Login route');
});

// Example route for OTP verification
router.post('/verify-otp', (req, res) => {
    const { otp } = req.body;
    // Your OTP verification logic here
    res.send('OTP verification route');
});

module.exports = router;
