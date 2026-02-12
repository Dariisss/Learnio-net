const API_URL = "/api";

// Проверка при загрузке
if (!localStorage.getItem('userId')) window.location.href = "index.html";

// ГРАДИЕНТЫ
const gradients = [
    "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
    "linear-gradient(135deg, #c3cfe2 0%, #c3cfe2 100%)",
    "linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)",
    "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
    "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
    "linear-gradient(to top, #cfd9df 0%, #e2ebf0 100%)"
];
function getCourseGradient(id) {
    if (!id) return gradients[0];
    const index = id.charCodeAt(0) % gradients.length;
    return gradients[index];
}

// 1. АВАТАРКА
async function loadUserAvatar() {
    const userName = localStorage.getItem('userName');
    const userEmail = localStorage.getItem('userEmail');

    if (userName) document.getElementById('user-avatar').innerText = userName.charAt(0).toUpperCase();
    if (!userEmail) return;

    try {
        const response = await fetch(`${API_URL}/Users/profile?email=${userEmail}`);
        if (response.ok) {
            const data = await response.json();
            if (data.avatarUrl) {
                const avatarEl = document.getElementById('user-avatar');
                avatarEl.innerText = "";
                avatarEl.style.backgroundImage = `url('${data.avatarUrl}')`;
                avatarEl.style.backgroundSize = "cover";
            }
        }
    } catch (e) { }
}

// 2. ЗАГРУЗКА КУРСОВ
async function loadCourses() {
    const container = document.getElementById('courses-container');
    try {
        // Передаем userId в запрос, чтобы сервер отфильтровал лишнее
        const response = await fetch(`${API_URL}/Courses?userId=${localStorage.getItem('userId')}`);
        if (!response.ok) return;

        const courses = await response.json();
        container.innerHTML = '';

        if (courses.length === 0) {
            container.innerHTML = '<p>No courses found. Create one + or join by code</p>';
            return;
        }

        courses.forEach(course => {
            const card = document.createElement('div');
            card.className = 'course-card';
            const bgStyle = getCourseGradient(course.id);

            card.innerHTML = `
                <div class="course-image" style="background: ${bgStyle}; display:flex; align-items:flex-end; padding:15px;">
                    <h2 style="color:white; margin:0; text-shadow:0 2px 5px rgba(0,0,0,0.2);">${course.name}</h2>
                </div>
                <div class="course-body">
                    <div class="course-desc">
                        ${(course.description && course.description !== "string") ? course.description : "No description"}
                    </div>
                    <div class="teacher-info">
                        <span>🎓</span>
                        <span style="font-weight: bold; color: #555;">${course.teacherName || "Unknown"}</span>
                    </div>
                </div>
            `;

            card.onclick = () => window.location.href = `course-details.html?id=${course.id}`;
            container.appendChild(card);
        });

    } catch (err) { console.error(err); }
}

// 3. --- НОВОЕ: ВСТУПЛЕНИЕ В КУРС ---
async function joinCourse() {
    const codeInput = document.getElementById('join-code-input');
    const code = codeInput.value;
    // ВАЖНО: Читаем ID прямо сейчас, чтобы не перепутать юзера
    const currentUserId = localStorage.getItem('userId');

    if (!code) {
        alert("Please enter a code!");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/Enrollments/join`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                code: code,
                studentId: currentUserId
            })
        });

        if (response.ok) {
            const data = await response.json();
            alert(`Success! You joined ${data.courseName}`);
            codeInput.value = ''; // Очистить поле
            // Можно сразу перекинуть внутрь курса
            window.location.href = `course-details.html?id=${data.courseId}`;
        } else {
            // Если ошибка (например, неверный код)
            const errorText = await response.text();
            alert(errorText);
        }
    } catch (err) {
        console.error(err);
        alert("Server error");
    }
}

// 4. СОЗДАНИЕ КУРСА
function openModal() { document.getElementById('create-modal').style.display = 'flex'; }
function closeModal() { document.getElementById('create-modal').style.display = 'none'; }

async function createCourse() {
    const name = document.getElementById('new-course-name').value;
    const desc = document.getElementById('new-course-desc').value;
    // Читаем ID прямо сейчас
    const currentUserId = localStorage.getItem('userId');

    if (!name) { alert("Enter name"); return; }

    try {
        const response = await fetch(`${API_URL}/Courses`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: name,
                description: desc,
                teacherId: currentUserId
            })
        });

        if (response.ok) {
            closeModal();
            loadCourses();
            document.getElementById('new-course-name').value = '';
        } else {
            alert("Error creating course");
        }
    } catch (err) { console.error(err); }
}

loadUserAvatar();
loadCourses();