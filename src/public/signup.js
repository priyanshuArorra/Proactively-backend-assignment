// Handling Signup Form Submission
document.getElementById('signupForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    console.log("Signup button clicked.");

    // Fetch form values
    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();

    // Basic validation
    if (!firstName || !lastName || !email || !password) {
        alert("All fields are required!");
        return;
    }

    try {
        console.log("Sending signup request:", { firstName, lastName, email, password, role });
        const response = await fetch('/api/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ firstName, lastName, email, password, role }),
        });

        const data = await response.json();
        console.log("Signup response received:", data);

        if (response.ok && data.success) {
            alert(data.message || "Signup successful! Check your email for the OTP.");
            if (role === 'guest') {
                alert("Guests do not need OTP verification. You can log in immediately.");
                window.location.href = '/login';
            } else {
                document.getElementById('otpSection').style.display = 'block'; // Show OTP input section
            }
        } else {
            alert(data.message || "An error occurred during signup.");
        }
    } catch (error) {
        console.error("Signup error:", error);
        alert("Failed to connect to the server. Please try again later.");
    }
});

// Handling OTP Verification
document.getElementById('verifyOtpBtn').addEventListener('click', async function () {
    const email = document.getElementById('email').value.trim();
    const otp = document.getElementById('otp').value.trim();

    // OTP Validation
    if (!email || !otp) {
        alert("Please provide both email and OTP!");
        return;
    }

    try {
        console.log("Sending OTP verification request:", { email, otp });

        // Make API request to backend for OTP verification
        const response = await fetch('/api/verify-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp }),
        });

        const data = await response.json();
        console.log("OTP verification response received:", data);

        // Handle server response
        if (response.ok && data.success) {
            alert(data.message || "OTP verified successfully! You can now log in.");
            window.location.href = '/login'; // Redirect to login page
        } else {
            alert(data.message || "Invalid OTP. Please try again.");
        }
    } catch (error) {
        console.error("OTP verification error:", error);
        alert("Failed to connect to the server. Please try again later.");
    }
});
