// Event listeners for Signup and Login buttons
document.getElementById('signupBtn').addEventListener('click', () => {
    window.location.href = "/signup";
});

document.getElementById('loginBtn').addEventListener('click', () => {
    window.location.href = "/login";
});

app.get('/', (req, res) => {
    console.log("GET / hit"); // Log message
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


// Event listener for Profile Form Submission
document.getElementById('profileForm').addEventListener('submit', async (event) => {
    event.preventDefault(); // Prevent default form submission

    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;

    // Send data to the server via POST request
    const response = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
    });

    // Handle the server response
    const result = await response.json();
    alert(result.message); // Show a message from the response
});

