const API_URL = "/api";
const userEmail = localStorage.getItem('userEmail');

if (!userEmail) window.location.href = "index.html";

// 1. ЗАГРУЗКА ПРОФИЛЯ
async function loadProfileData() {
    try {
        const response = await fetch(`${API_URL}/Users/profile?email=${userEmail}`);
        if (response.ok) {
            const data = await response.json();

            document.getElementById('first-name').value = data.firstName;
            document.getElementById('last-name').value = data.lastName;
            document.getElementById('email').value = data.email;

            // Если у юзера есть аватарка в базе - показываем её
            // Иначе - показываем букву
            if (data.avatarUrl) {
                setAvatarImage(data.avatarUrl);
            } else {
                setAvatarLetter(data.firstName);
            }
        }
    } catch (err) {
        console.error(err);
    }
}

// 2. ЗАГРУЗКА ФОТО (Срабатывает сразу после выбора файла)
async function uploadPhoto() {
    const fileInput = document.getElementById('file-input');
    const file = fileInput.files[0];

    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
        // Отправляем файл на сервер
        const response = await fetch(`${API_URL}/Users/avatar?email=${userEmail}`, {
            method: "POST",
            body: formData
            // Важно: Content-Type не ставим вручную, браузер сам поставит multipart/form-data
        });

        if (response.ok) {
            const result = await response.json();
            // Сразу меняем картинку на экране
            setAvatarImage(result.avatarUrl);

            // Можно сохранить URL в localStorage, чтобы в Dashboard тоже обновилось
            localStorage.setItem('userAvatarUrl', result.avatarUrl);
            alert("Photo updated successfully! 😎");
        } else {
            alert("Error uploading photo");
        }
    } catch (err) {
        console.error(err);
        alert("Server error");
    }
}

// ПОМОЩНИКИ ДЛЯ ОТОБРАЖЕНИЯ
function setAvatarImage(url) {
    const avatarDiv = document.getElementById('avatar-display');
    // Ставим картинку фоном
    avatarDiv.style.backgroundImage = `url('${url}')`;
    avatarDiv.style.backgroundSize = "cover";
    avatarDiv.style.backgroundPosition = "center";
    // Убираем букву (первый span), но оставляем кнопку камеры (второй элемент)
    const span = avatarDiv.querySelector('span');
    if (span) span.style.display = 'none';
}

function setAvatarLetter(name) {
    const avatarDiv = document.getElementById('avatar-display');
    avatarDiv.style.backgroundImage = "none";
    const span = avatarDiv.querySelector('span');
    if (span) {
        span.style.display = 'block';
        span.innerText = name.charAt(0).toUpperCase();
    }
}

function logout() {
    if (confirm("Logout?")) {
        localStorage.clear();
        window.location.href = "index.html";
    }
}

loadProfileData();