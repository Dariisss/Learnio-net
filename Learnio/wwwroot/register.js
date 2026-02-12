const API_URL = "/api";

async function registerUser() {
    const firstName = document.getElementById('reg-firstname').value;
    const lastName = document.getElementById('reg-lastname').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;

    if (!firstName || !lastName || !email || !password) {
        alert("Please fill all fields");
        return;
    }

    const registerData = {
        email: email,
        password: password,
        firstName: firstName,
        lastName: lastName,
        role: "Student" // По умолчанию регистрируем как Студента. 
        // (Учителя можно поменять в базе или сделать выпадающий список)
    };

    try {
        const response = await fetch(`${API_URL}/Auth/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(registerData)
        });

        if (response.ok) {
            alert("Registration successful! Please log in.");
            window.location.href = "index.html"; // Перекидываем на вход
        } else {
            const errorText = await response.text();
            alert("Registration failed: " + errorText);
        }
    } catch (error) {
        console.error("Error:", error);
        alert("Server error. Is the backend running?");
    }
}