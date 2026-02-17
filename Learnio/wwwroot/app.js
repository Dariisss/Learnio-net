// Адрес твоего Бэкенда (проверь порт, если менялся!)
const API_URL = "/api"; // <-- ХИТРОСТЬ: Если фронт и бек вместе, можно писать просто "/api"

async function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorText = document.getElementById('error-text');

    errorText.style.display = 'none';

    if (!email || !password) {
        showError("Please enter email and password.");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/Auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        if (response.ok) {
            const data = await response.json();
            
            // Сохраняем данные
            localStorage.setItem('userId', data.userId);
            localStorage.setItem('userName', data.name);
            localStorage.setItem('userEmail', email);

            // Успех на английском
            alert(`Login successful! Welcome back, ${data.name}!`);
            
            window.location.href = "dashboard.html"; 

        } else {
            // Ошибка на английском
            showError("Invalid email or password.");
        }

    } catch (err) {
        console.error(err);
        showError("Server connection failed. Is backend running?");
    }
}
function showError(msg) {
    const el = document.getElementById('error-text');
    el.innerText = msg;
    el.style.display = 'block';
}

// Логика для глазика на странице входа
const togglePassword = document.querySelector('#togglePassword');
const passwordInput = document.querySelector('#password');

if (togglePassword && passwordInput) {
    togglePassword.addEventListener('click', function () {
        // Переключаем тип: password <-> text
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);

        // Переключаем иконку: глаз <-> перечеркнутый глаз
        this.classList.toggle('fa-eye');
        this.classList.toggle('fa-eye-slash');
    });
}