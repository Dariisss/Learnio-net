const API_URL = "/api";
const userId = localStorage.getItem('userId');
const userEmail = localStorage.getItem('userEmail');
const userName = localStorage.getItem('userName');

const urlParams = new URLSearchParams(window.location.search);
const courseId = urlParams.get('id');

if (!userId) window.location.href = "index.html";
if (!courseId) window.location.href = "dashboard.html";

let isTeacher = false;
let currentCourseData = null;

// Те же градиенты
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


// 1. ЗАГРУЗКА ИНФО (Обновленная)
async function loadCourseInfo() {
    try {
        const response = await fetch(`${API_URL}/Courses`);
        const courses = await response.json();
        const course = courses.find(c => c.id === courseId);

        if (course) {
            currentCourseData = course;
            document.getElementById('course-title').innerText = course.name;

            // ПРОВЕРКА УЧИТЕЛЯ
            if (String(course.teacherId).toLowerCase() === String(userId).toLowerCase()) {
                isTeacher = true;

                // 1. Показываем кнопку
                document.getElementById('btn-add-assignment').style.display = 'block';

                // 2. ПОКАЗЫВАЕМ КОД КУРСА (Только учителю!)
                document.getElementById('teacher-code-area').style.display = 'block';
                document.getElementById('course-join-code').innerText = course.joinCode || "NO CODE";
            }

            renderStream();
        }
    } catch (err) { console.error(err); }
}

// 2. TABS
function switchTab(tabName) {
    document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));

    // Индексы кнопок меню: 0-Stream, 1-Assignments, 2-People, 3-Grades
    const menuItems = document.querySelectorAll('.menu-item');
    if (tabName === 'stream') menuItems[0].classList.add('active');
    if (tabName === 'assignments') menuItems[1].classList.add('active');
    if (tabName === 'people') menuItems[2].classList.add('active');
    if (tabName === 'grades') menuItems[3].classList.add('active');

    const content = document.getElementById('main-content');
    content.innerHTML = '';

    if (tabName === 'stream') renderStream();
    else if (tabName === 'assignments') loadAssignments();
    else if (tabName === 'people') renderPeople();
    else if (tabName === 'grades') renderGrades();
}

// 3. STREAM (С ГРАДИЕНТОМ)
function renderStream() {
    const content = document.getElementById('main-content');
    const bgStyle = getCourseGradient(currentCourseData.id);

    content.innerHTML = `
        <div style="
            width: 100%; height: 200px; 
            background: ${bgStyle}; 
            border-radius: 12px; margin-bottom: 25px;
            display: flex; align-items: flex-end; padding: 30px;
        ">
            <h1 style="color: white; margin: 0; text-shadow: 0 2px 10px rgba(0,0,0,0.3); font-size: 40px;">
                ${currentCourseData.name}
            </h1>
        </div>

        <p style="color: #555; font-size: 16px;">
            ${(currentCourseData.description && currentCourseData.description !== "string") ? currentCourseData.description : "Welcome to the course!"}
        </p>
        
        <div style="margin-top: 30px; background: #f0f7f4; padding: 20px; border-radius: 8px; border-left: 5px solid #2e7d32;">
            <h4>👋 Hello!</h4>
            <p>Check the <b>Assignments</b> tab for new tasks.</p>
        </div>
    `;
}

// 4. ASSIGNMENTS
async function loadAssignments() {
    const content = document.getElementById('main-content');
    content.innerHTML = `<h3>Assignments</h3><div id="list" style="margin-top: 20px;">Loading...</div>`;
    const list = document.getElementById('list');

    try {
        const response = await fetch(`${API_URL}/Assignments/course/${courseId}`);
        if (response.ok) {
            const tasks = await response.json();
            list.innerHTML = '';

            if (tasks.length === 0) {
                list.innerHTML = '<p style="color:#888;">No assignments yet.</p>';
                return;
            }

            tasks.forEach(task => {
                const date = new Date(task.deadline).toLocaleDateString();
                const item = document.createElement('div');
                item.style.borderBottom = "1px solid #f0f0f0";
                item.style.padding = "20px 0";
                item.style.display = "flex";
                item.style.justifyContent = "space-between";
                item.style.alignItems = "center";

                item.innerHTML = `
                    <div style="display:flex; align-items:center; gap: 15px;">
                        <div style="background:#e8f5e9; color:#2e7d32; width:40px; height:40px; border-radius:50%; display:flex; justify-content:center; align-items:center; font-weight:bold;">📝</div>
                        <div>
                            <div style="font-weight:600; font-size:16px;">${task.name}</div>
                            <div style="font-size:13px; color:#888;">Due: ${date} • ${task.maxScore} pts</div>
                        </div>
                    </div>
                    ${!isTeacher
                        ? `<button class="btn-primary" style="padding:8px 20px; width: auto;">Open</button>`
                        : `<span style="background:#eee; padding:5px 10px; border-radius:4px; font-size:12px;">Teacher View</span>`
                    }
                `;
                list.appendChild(item);
            });
        }
    } catch (e) { list.innerHTML = 'Error.'; }
}


// 5. ЛЮДИ (TEPERЬ РЕАЛЬНЫЕ!)
async function renderPeople() {
    const content = document.getElementById('main-content');
    content.innerHTML = `<h3>People 👥</h3><div id="people-list">Loading...</div>`;

    try {
        const response = await fetch(`${API_URL}/Enrollments/course/${courseId}/students`);
        if (response.ok) {
            const students = await response.json();
            const list = document.getElementById('people-list');
            list.innerHTML = '';

            // Всегда показываем Учителя первым
            list.innerHTML += `
                <div style="padding:15px; border-bottom:1px solid #eee; display:flex; align-items:center;">
                   <div style="width:40px; height:40px; background:#2e7d32; color:white; border-radius:50%; display:flex; justify-content:center; align-items:center; font-weight:bold; margin-right:15px;">T</div>
                   <div>
                       <div style="font-weight:bold;">${currentCourseData.teacherName || "Teacher"}</div>
                       <div style="font-size:12px; color:#888;">Teacher</div>
                   </div>
                </div>
            `;

            if (students.length === 0) {
                list.innerHTML += '<p style="margin-top:20px; color:#777;">No students joined yet.</p>';
            } else {
                students.forEach(s => {
                    // Аватарка или буква
                    const avatar = s.avatarUrl
                        ? `<div style="width:40px; height:40px; background-image:url('${s.avatarUrl}'); background-size:cover; border-radius:50%; margin-right:15px;"></div>`
                        : `<div style="width:40px; height:40px; background:#555; color:white; border-radius:50%; display:flex; justify-content:center; align-items:center; font-weight:bold; margin-right:15px;">${s.firstName[0]}</div>`;

                    list.innerHTML += `
                        <div style="padding:15px; border-bottom:1px solid #eee; display:flex; align-items:center;">
                           ${avatar}
                           <div>
                               <div style="font-weight:bold;">${s.firstName} ${s.lastName}</div>
                               <div style="font-size:12px; color:#888;">Student</div>
                           </div>
                        </div>
                    `;
                });
            }
        }
    } catch (e) { console.error(e); }
}
// 5. GRADES (Заглушки)
function renderGrades() {
    document.getElementById('main-content').innerHTML = `<h3>Grades</h3><p>${isTeacher ? "Gradebook (Teacher)" : "My Grades (Student)"}</p>`;
}

// 6. CREATE ASSIGNMENT
async function createAssignment() {
    const title = document.getElementById('assign-name').value;
    const deadline = document.getElementById('assign-deadline').value;
    const score = document.getElementById('assign-score').value;

    if (!title || !deadline || !score) { alert("Fill all fields"); return; }

    try {
        await fetch(`${API_URL}/Assignments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                courseId: courseId,
                name: title,
                description: document.getElementById('assign-desc').value,
                deadline: deadline,
                maxScore: parseInt(score)
            })
        });
        closeAssignmentModal();
        switchTab('assignments');
    } catch (e) { alert("Error"); }
}

function openAssignmentModal() { document.getElementById('assignment-modal').style.display = 'flex'; }
function closeAssignmentModal() { document.getElementById('assignment-modal').style.display = 'none'; }

async function loadUserAvatar() {
    if (userName) document.getElementById('user-avatar').innerText = userName.charAt(0).toUpperCase();
    if (!userEmail) return;
    try {
        const res = await fetch(`${API_URL}/Users/profile?email=${userEmail}`);
        const data = await res.json();
        if (data.avatarUrl) {
            const av = document.getElementById('user-avatar');
            av.style.backgroundImage = `url('${data.avatarUrl}')`;
            av.innerText = "";
            av.style.backgroundSize = "cover";
        }
    } catch (e) { }
}

loadUserAvatar();
loadCourseInfo();