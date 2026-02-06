const API_URL = "/api";

// 1. Проверка входа
const userId = localStorage.getItem('userId');
const userEmail = localStorage.getItem('userEmail'); // Нам нужен Email для запроса
const userName = localStorage.getItem('userName');

if (!userId) {
    window.location.href = "index.html";
} else {
    if (userName) document.getElementById('user-avatar').innerText = userName.charAt(0).toUpperCase();

    // !!! НОВОЕ: Сразу загружаем реальную аватарку !!!
    loadUserAvatar();
}

// ФУНКЦИЯ ЗАГРУЗКИ АВАТАРКИ В ШАПКУ
async function loadUserAvatar() {
    if (!userEmail) return;

    try {
        // Спрашиваем у сервера профиль текущего юзера
        const response = await fetch(`${API_URL}/Users/profile?email=${userEmail}`);
        if (response.ok) {
            const data = await response.json();

            // Если аватарка есть в базе
            if (data.avatarUrl) {
                const avatarEl = document.getElementById('user-avatar');

                // Убираем букву
                avatarEl.innerText = "";

                // Ставим картинку фоном
                avatarEl.style.backgroundImage = `url('${data.avatarUrl}')`;
                avatarEl.style.backgroundSize = "cover";
                avatarEl.style.backgroundPosition = "center";
            }
        }
    } catch (err) {
        console.error("Не удалось загрузить аватарку в шапку", err);
    }
}

// 2. Загрузка курсов (Твой старый код без изменений)
async function loadCourses() {
    const container = document.getElementById('courses-container');

    try {
        const response = await fetch(`${API_URL}/Courses`);

        if (!response.ok) {
            container.innerHTML = '<p>Error loading courses.</p>';
            return;
        }

        const courses = await response.json();
        container.innerHTML = '';

        if (courses.length === 0) {
            container.innerHTML = '<p>No courses found.</p>';
            return;
        }

        courses.forEach(course => {
            const card = document.createElement('div');
            card.className = 'course-card';

            const imageUrl = `https://picsum.photos/seed/${course.id}/400/250`;

            card.innerHTML = `
                <div class="course-image" style="background-image: url('${imageUrl}');"></div>
                
                <div class="course-body">
                    <h3 class="course-title">${course.name}</h3>
                    
                    <div class="course-desc">
                         ${(course.description && course.description !== "string") ? course.description : ""}
                    </div>

                    <div class="teacher-info">
                        <span>👨‍🏫 Teacher:</span>
                        <span style="font-weight: bold;">${course.teacherId ? "ID " + course.teacherId.substring(0, 8) + "..." : "Unknown"}</span>
                    </div>
                </div>
            `;

            card.onclick = () => alert("Opening course: " + course.name);
            container.appendChild(card);
        });

    } catch (err) {
        console.error(err);
        container.innerHTML = '<p>Server error.</p>';
    }
}

loadCourses();