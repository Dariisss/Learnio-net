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

// Gradients for header
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

// 1. ЗАГРУЗКА ИНФО (ОБНОВЛЕНО: ЛОГИКА КНОПКИ SUBMISSIONS)
async function loadCourseInfo() {
    try {
        const response = await fetch(`${API_URL}/Courses`);
        const courses = await response.json();
        const course = courses.find(c => c.id === courseId);

        if (course) {
            currentCourseData = course;
            document.getElementById('course-title').innerText = course.name;

            // Находим кнопку Submissions в меню (даже без ID)
            // Ищем элемент, у которого onclick содержит 'submissions'
            const subTab = document.querySelector('.menu-item[onclick*="submissions"]');
            if (subTab) subTab.style.display = 'none'; // Сначала прячем для всех

            // ПРОВЕРКА УЧИТЕЛЯ
            if (String(course.teacherId).toLowerCase() === String(userId).toLowerCase()) {
                isTeacher = true;
                document.getElementById('btn-add-assignment').style.display = 'block';
                document.getElementById('teacher-code-area').style.display = 'block';
                document.getElementById('course-join-code').innerText = course.joinCode || "NO CODE";

                // 👇 ПОКАЗЫВАЕМ ВТАБ SUBMISSIONS ТОЛЬКО УЧИТЕЛЮ 👇
                if (subTab) subTab.style.display = 'block';
            }

            renderStream();
        }
    } catch (err) { console.error(err); }
}

// 2. ПЕРЕКЛЮЧЕНИЕ ТАБОВ (ИСПРАВЛЕНО 🔥)
function switchTab(tabName) {
    // 1. Убираем класс active со ВСЕХ кнопок меню
    document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));

    // 2. Ищем кнопку, у которой в onclick написано то, что мы нажали
    // Например: если нажали switchTab('people'), ищем элемент с onclick="...('people')..."
    const activeBtn = document.querySelector(`.menu-item[onclick*="${tabName}"]`);

    // 3. Если нашли - подсвечиваем
    if (activeBtn) {
        activeBtn.classList.add('active');
    }

    const content = document.getElementById('main-content');
    content.innerHTML = '';

    if (tabName === 'stream') renderStream();
    else if (tabName === 'assignments') loadAssignments();
    else if (tabName === 'submissions') renderSubmissionsTab();
    else if (tabName === 'people') renderPeople();
    else if (tabName === 'grades') renderGrades();
}

// 3. STREAM (READ ONLY)
async function renderStream() {
    const content = document.getElementById('main-content');
    const bgStyle = getCourseGradient(currentCourseData.id);

    let html = `
        <div style="width: 100%; height: 200px; background: ${bgStyle}; border-radius: 12px; margin-bottom: 25px; display: flex; align-items: flex-end; padding: 30px;">
            <h1 style="color: white; margin: 0; text-shadow: 0 2px 10px rgba(0,0,0,0.3); font-size: 40px;">${currentCourseData.name}</h1>
        </div>
    `;

    try {
        const response = await fetch(`${API_URL}/Assignments/course/${courseId}`);
        if (response.ok) {
            const tasks = await response.json();

            if (tasks.length === 0) {
                html += `
                    <div style="margin-bottom: 20px; color: #555;">
                        ${(currentCourseData.description && currentCourseData.description !== "string") ? currentCourseData.description : "Welcome to the course!"}
                    </div>
                    <div style="background: #f9f9f9; padding: 30px; border-radius: 8px; text-align:center; color:#888;">
                        <h3>🎉 No assignments yet!</h3>
                    </div>`;
            } else {
                tasks.reverse().forEach(task => {
                    const dateStr = new Date(task.deadline).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                    const taskData = JSON.stringify(task).replace(/"/g, '&quot;');

                    // STREAM: PASS 'true' (READ ONLY)
                    html += `
                        <div onclick="openTaskView(${taskData}, true)" style="background: white; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin-bottom: 15px; display: flex; align-items: center; gap: 15px; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;" 
                        onmouseover="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'; this.style.transform='translateY(-2px)'"
                        onmouseout="this.style.boxShadow='none'; this.style.transform='none'">
                            <div style="background: #e8f5e9; width: 45px; height: 45px; border-radius: 50%; display: flex; justify-content: center; align-items: center;">📝</div>
                            <div>
                                <div style="color: #555; font-size: 13px;">${currentCourseData.teacherName || "Teacher"} posted a new assignment:</div>
                                <div style="font-weight: bold; font-size: 16px; color: #2e7d32;">${task.title}</div>
                                <div style="font-size: 12px; color: #888; margin-top: 2px;">Due: ${dateStr}</div>
                            </div>
                        </div>
                    `;
                });
            }
        }
    } catch (e) { console.error(e); }
    content.innerHTML = html;
}

// 4. ASSIGNMENTS LIST (SUBMISSION MODE)
async function loadAssignments() {
    const content = document.getElementById('main-content');
    content.innerHTML = `<h3>Assignments</h3><div id="list" style="margin-top: 20px;">Loading...</div>`;
    const list = document.getElementById('list');

    try {
        const response = await fetch(`${API_URL}/Assignments/course/${courseId}`);
        if (!response.ok) { list.innerHTML = 'Error loading data.'; return; }

        const tasks = await response.json();
        list.innerHTML = '';

        if (!tasks || tasks.length === 0) {
            list.innerHTML = '<p style="color:#888;">No assignments yet.</p>';
            return;
        }

        tasks.forEach(task => {
            const taskData = JSON.stringify(task).replace(/"/g, '&quot;');
            const dateStr = new Date(task.deadline).toLocaleDateString();

            const item = document.createElement('div');
            item.style.borderBottom = "1px solid #eee";
            item.style.padding = "20px 0";
            item.style.display = "flex";
            item.style.justifyContent = "space-between";
            item.style.alignItems = "center";

            const leftPart = `
                <div style="display:flex; align-items:center; gap:15px;">
                    <div style="background:#e8f5e9; color:#2e7d32; width:45px; height:45px; border-radius:50%; display:flex; justify-content:center; align-items:center; font-size:20px;">📝</div>
                    <div>
                        <div style="font-weight:bold; font-size:16px;">${task.title}</div>
                        <div style="font-size:13px; color:#666;">Due: ${dateStr} • ${task.maxScore} pts</div>
                    </div>
                </div>
            `;

            // IF STUDENT -> Pass 'false' (CAN SUBMIT)
            const rightPart = !isTeacher
                ? `<button onclick="openTaskView(${taskData}, false)" class="btn-menu-add" style="display:block; width:auto; padding: 10px 20px; font-size: 14px;">Open</button>`
                : `<span style="background:#f1f3f4; padding:5px 10px; border-radius:4px; font-size:12px; color:#555;">Teacher View</span>`;

            item.innerHTML = leftPart + rightPart;
            list.appendChild(item);
        });
    } catch (e) {
        console.error(e);
        if (list) list.innerHTML = 'Error loading list.';
    }
}

// =======================================================
// MAIN OPEN TASK FUNCTION (SMART)
// isReadOnly = true (Stream/Teacher) -> Narrow, Text Only
// isReadOnly = false (Student) -> Wide, Split View with Submission Form
// =======================================================
function openTaskView(task, isReadOnly = false) {
    const modal = document.getElementById('assignment-modal');
    const contentBox = modal.querySelector('.modal-content');

    modal.style.display = 'flex';
    contentBox.innerHTML = '';

    const dateStr = new Date(task.deadline).toLocaleString();
    // Using inline style for white-space pre-wrap to preserve enters
    const descHtml = `<div style="white-space:pre-wrap; line-height:1.6; color:#333;">${task.description || "No instructions."}</div>`;
    const fileHtml = task.attachmentUrl
        ? `<a href="${task.attachmentUrl}" target="_blank" style="display:inline-block; margin-top:15px; color:#2e7d32; font-weight:bold; text-decoration:none; background:#f1f8e9; padding:8px 12px; border-radius:5px;">📎 Download Material</a>`
        : '';

    // --- OPTION 1: READ ONLY (Stream or Teacher) ---
    if (isReadOnly || isTeacher) {
        contentBox.classList.remove('modal-wide');
        contentBox.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:start;">
                <h2 style="margin-top:0; color:#2e7d32;">${task.title}</h2>
                <span onclick="closeAssignmentModal()" style="cursor:pointer; font-size:24px;">&times;</span>
            </div>
            <div style="font-size:13px; color:#666; margin-bottom:15px;">Due: ${dateStr} • ${task.maxScore} pts</div>
            ${descHtml}
            ${fileHtml}
            <div style="margin-top:30px; text-align:right;">
                <button onclick="closeAssignmentModal()" style="padding:8px 20px; border:1px solid #ccc; background:white; border-radius:5px; cursor:pointer;">Close</button>
            </div>
        `;
        return;
    }

    // --- OPTION 2: SUBMISSION (Student from Assignments) ---
    contentBox.classList.add('modal-wide'); // Wide window

    const leftSide = `
        <div class="split-left">
            <h2 style="margin-top:0; color:#2e7d32;">${task.title}</h2>
            <div style="color:#555; font-size:13px; margin-bottom:15px;">Max Score: ${task.maxScore} • Due: ${dateStr}</div>
            ${descHtml}
            ${fileHtml}
        </div>
    `;

    const rightSide = `
        <div class="split-right">
            <h3 style="margin-top:0;">Your Work</h3>
            <div id="student-work-area">Checking status...</div>
        </div>
    `;

    contentBox.innerHTML = `
        <div style="text-align:right; margin-bottom:5px;">
            <span onclick="closeAssignmentModal()" style="cursor:pointer; font-size:24px; color:#999;">&times;</span>
        </div>
        <div class="split-view">
            ${leftSide}
            ${rightSide}
        </div>
    `;

    loadStudentStatus(task.id);
}

// ПРОВЕРКА: СДАЛ ИЛИ НЕТ?
async function loadStudentStatus(assignmentId) {
    const container = document.getElementById('student-work-area');
    if (!container) return;

    try {
        const res = await fetch(`${API_URL}/Submissions/check?assignmentId=${assignmentId}&studentId=${userId}`);

        // ВАРИАНТ 1: ЗАПИСЬ НАЙДЕНА (Студент уже что-то сдавал)
        if (res.ok) {
            let sub = null;
            try {
                sub = await res.json();
            } catch (e) { sub = null; }

            // Если пришел реальный объект сдачи
            if (sub && sub.id) {
                container.innerHTML = `
                    <div class="student-card" style="border-color:#c5e1a5; background:#f1f8e9;">
                        <div style="color:#2e7d32; font-weight:bold; font-size:16px;">✅ Handed In</div>
                        
                        <div style="font-size:12px; color:#666; margin-bottom:15px;">
                            Submitted: ${new Date(sub.submissionDate).toLocaleString()}
                        </div>
                        
                        ${sub.filePath ? `<a href="${sub.filePath}" target="_blank" style="color:#1565c0; font-weight:bold;">📄 View My File</a>` : ''}
                        
                        ${sub.textAnswer ? `<div style="background:white; padding:10px; border-radius:5px; margin-top:10px; font-style:italic; font-size:13px; border:1px solid #ddd;">"${sub.textAnswer}"</div>` : ''}
                        
                        <div style="margin-top:20px; border-top:1px solid #ddd; padding-top:10px;">
                            ${sub.grade !== null
                        // Если есть оценка - показываем её
                        ? `<div style="font-size:24px; color:#2e7d32; font-weight:bold; text-align:center;">${sub.grade} / 100</div><div style="text-align:center; font-size:12px; color:#555;">Graded</div>`

                        // 👇 ТВОЯ ЗЕЛЕНАЯ КНОПКА RESUBMIT (Если оценки нет) 👇
                        : `<button onclick="renderUploadForm('${assignmentId}')" style="width:100%; padding:12px; background:#2e7d32; color:white; border:none; border-radius:8px; cursor:pointer; font-weight:bold;">Resubmit</button>`
                    }
                        </div>
                    </div>
                `;
                return; // Выходим, работу показали
            }
        }

        // ВАРИАНТ 2: БЭКЕНД СКАЗАЛ "404" ИЛИ ПУСТО
        // Значит, студент еще не сдавал. Просто рисуем форму.
        renderUploadForm(assignmentId);

    } catch (e) {
        // Даже если ошибка сети, дадим шанс загрузить (или покажем форму)
        console.error(e);
        renderUploadForm(assignmentId);
    }
}

// 👇 ТВОЯ НОВАЯ ФУНКЦИЯ (Текст с авто-размером + Файл + Кнопка "Submit")
function renderUploadForm(assignmentId) {
    const container = document.getElementById('student-work-area');
    if (!container) return;

    // 1. Рисуем HTML формы
    container.innerHTML = `
        <div class="student-card">
            <label style="font-size:12px; font-weight:bold; color:#555;">Text Answer (Optional):</label>
            
            <textarea id="student-text" rows="8" placeholder="Type your answer here..." 
                style="width:100%; padding:10px; border:1px solid #ccc; border-radius:5px; margin-bottom:15px; resize:none; overflow-y:hidden; font-family:inherit; box-sizing:border-box;"></textarea>

            <label style="font-size:12px; font-weight:bold; color:#555;">Attach File:</label>
            <div style="margin-bottom:20px;">
                <input type="file" id="student-file" style="width:100%;">
            </div>
            
            <button onclick="submitHomework('${assignmentId}')" class="btn-menu-add" style="display:block; width:100%; padding:12px; font-weight:bold;">
                Submit
            </button>
        </div>
    `;

    // 2. МАГИЯ АВТО-УВЕЛИЧЕНИЯ ПОЛЯ 🪄
    // Находим только что созданное поле
    const textarea = document.getElementById('student-text');
    if (textarea) {
        // Добавляем слушатель: при каждом вводе символа...
        textarea.addEventListener('input', function () {
            this.style.height = 'auto'; // Сначала сбрасываем высоту
            this.style.height = (this.scrollHeight) + 'px'; // Ставим высоту по контенту
        });
    }
}
// SUBMIT HOMEWORK
async function submitHomework(assignmentId) {
    const textVal = document.getElementById('student-text').value;
    const fileInput = document.getElementById('student-file');

    if (!fileInput.files[0] && !textVal.trim()) {
        if (!confirm("Submit without any file or text?")) return;
    }

    const formData = new FormData();
    formData.append('AssignmentId', assignmentId);
    formData.append('StudentId', userId);
    if (textVal.trim()) formData.append('TextAnswer', textVal.trim());
    if (fileInput.files[0]) formData.append('File', fileInput.files[0]);

    const btn = document.querySelector('.student-card button');
    if (btn) { btn.innerText = "Turning in..."; btn.disabled = true; }

    try {
        const res = await fetch(`${API_URL}/Submissions`, { method: 'POST', body: formData });
        if (res.ok) {
            loadStudentStatus(assignmentId);
        } else {
            const txt = await res.text();
            alert("Error: " + txt);
            if (btn) { btn.innerText = "Try Again"; btn.disabled = false; }
        }
    } catch (e) {
        alert("Network Error");
        if (btn) { btn.innerText = "Try Again"; btn.disabled = false; }
    }
}

// ==========================================
// TEACHER CREATE FORM - RESTORED
// ==========================================
function openAssignmentModal() {
    const modal = document.getElementById('assignment-modal');
    const contentBox = modal.querySelector('.modal-content');

    modal.style.display = 'flex';
    contentBox.classList.remove('modal-wide');

    contentBox.innerHTML = `
        <h3 style="margin-top:0;">New Assignment</h3>
        <input type="text" id="assign-name" class="modal-input" placeholder="Title (e.g. Lab work 1)">
        <textarea id="assign-desc" class="modal-input" placeholder="Instructions..." rows="5" style="resize: vertical; padding: 10px; font-family: inherit;"></textarea>
        <div style="margin-bottom: 15px;">
            <label style="font-size: 12px; font-weight: bold; color: #555;">Attach File (Doc, PDF, Img):</label>
            <input type="file" id="assign-file" style="margin-top: 5px;">
        </div>
        <div style="font-size:12px; color:#666;">Deadline:</div>
        <input type="datetime-local" id="assign-deadline" class="modal-input">
        <input type="number" id="assign-score" class="modal-input" placeholder="Max Score (e.g. 100)">
        <div class="modal-buttons" style="text-align: right; margin-top: 20px;">
            <button class="btn-cancel" onclick="closeAssignmentModal()" style="padding: 10px 20px; background: #eee; border: none; border-radius: 5px; cursor: pointer; margin-right: 10px;">Cancel</button>
            <button class="btn-create" onclick="createAssignment()" style="padding: 10px 20px; background: #2e7d32; color: white; border: none; border-radius: 5px; cursor: pointer;">Create</button>
        </div>
    `;
}

function closeAssignmentModal() {
    const modal = document.getElementById('assignment-modal');
    const contentBox = modal.querySelector('.modal-content');
    modal.style.display = 'none';
    contentBox.classList.remove('modal-wide');
    contentBox.innerHTML = '';
}

// 5. PEOPLE
async function renderPeople() {
    const content = document.getElementById('main-content');
    content.innerHTML = `<h3>People 👥</h3><div id="people-list">Loading...</div>`;

    let myIdRaw = localStorage.getItem('userId');
    const myIdClean = myIdRaw ? String(myIdRaw).toLowerCase() : "";

    try {
        const response = await fetch(`${API_URL}/Enrollments/course/${courseId}/students`);

        if (response.ok) {
            const students = await response.json();

            // 🔥🔥🔥 СМОТРИ СЮДА В КОНСОЛИ 🔥🔥🔥
            console.log("🔥 RAW DATA FROM SERVER:", students);

            const list = document.getElementById('people-list');
            list.innerHTML = '';

            // --- ДАННЫЕ УЧИТЕЛЯ ---
            const tName = currentCourseData.teacherName || "Teacher";
            let tId = currentCourseData.teacherId;
            if (tId) tId = String(tId).toLowerCase();

            const iAmTeacher = (myIdClean === tId);

            // Кнопка Учителя
            let teacherChatBtn = '';
            if (!iAmTeacher && tId) {
                teacherChatBtn = `<button onclick="startChat('${tId}', '${tName}')" style="background:#e8f5e9; color:#2e7d32; border:none; width:40px; height:40px; border-radius:50%; cursor:pointer; font-size:20px;">✉️</button>`;
            }

            list.innerHTML += `
                <div style="padding:15px; border-bottom:1px solid #eee; display:flex; justify-content: space-between; align-items:center;">
                    <div style="display:flex; align-items:center;">
                        <div style="width:40px; height:40px; background:#2e7d32; color:white; border-radius:50%; display:flex; justify-content:center; align-items:center; font-weight:bold; margin-right:15px;">T</div>
                        <div><div style="font-weight:bold;">${tName}</div><div style="font-size:12px; color:#888;">Teacher</div></div>
                    </div>
                    ${teacherChatBtn}
                </div>`;

            // СТУДЕНТЫ
            if (students.length === 0) {
                list.innerHTML += '<p style="margin-top:20px; color:#777;">No students joined yet.</p>';
            } else {
                students.forEach((s, index) => {
                    const sName = `${s.firstName || "Student"} ${s.lastName || ""}`;

                    // 🔥 ПОПЫТКА НАЙТИ ID ВО ВСЕХ ВОЗМОЖНЫХ ПОЛЯХ
                    // Добавляем сюда appUserId, user_id и т.д.
                    let rawId = s.id || s.Id || s.studentId || s.StudentId || s.userId || s.UserId || s.appUserId || s.AppUserId;

                    if (!rawId) {
                        console.error(`⚠️ STUDENT #${index} HAS NO ID FOUND! Keys available:`, Object.keys(s));
                    }

                    let sId = rawId ? String(rawId).toLowerCase() : "undefined";

                    const avatarHtml = `<div style="width:40px; height:40px; background:#555; color:white; border-radius:50%; display:flex; justify-content:center; align-items:center; font-weight:bold; margin-right:15px;">${sName[0]}</div>`;

                    let studentChatBtn = '';

                    // Рисуем кнопку, если ID валидный
                    if (iAmTeacher && sId !== "undefined" && sId !== myIdClean) {
                        studentChatBtn = `<button onclick="startChat('${sId}', '${sName}')" style="background:#e8f5e9; color:#2e7d32; border:none; width:40px; height:40px; border-radius:50%; cursor:pointer; font-size:20px;">✉️</button>`;
                    }

                    list.innerHTML += `
                        <div style="padding:15px; border-bottom:1px solid #eee; display:flex; justify-content: space-between; align-items:center;">
                            <div style="display:flex; align-items:center;">
                                ${avatarHtml}
                                <div><div style="font-weight:bold;">${sName}</div><div style="font-size:12px; color:#888;">Student</div></div>
                            </div>
                            ${studentChatBtn}
                        </div>`;
                });
            }
        }
    } catch (e) {
        console.error(e);
    }
}

// 6. CREATE ASSIGNMENT (Logic)
async function createAssignment() {
    const titleVal = document.getElementById('assign-name').value;
    const desc = document.getElementById('assign-desc').value;
    const deadline = document.getElementById('assign-deadline').value;
    const score = document.getElementById('assign-score').value;
    const fileInput = document.getElementById('assign-file');

    if (!titleVal || !deadline || !score) { alert("Fill required fields"); return; }

    const formData = new FormData();
    formData.append('CourseId', courseId);
    formData.append('Title', titleVal);
    formData.append('Description', desc);
    formData.append('Deadline', deadline);
    formData.append('MaxScore', score);
    if (fileInput.files[0]) formData.append('File', fileInput.files[0]);

    try {
        const response = await fetch(`${API_URL}/Assignments`, { method: "POST", body: formData });
        if (response.ok) {
            closeAssignmentModal();
            switchTab('assignments');
        } else { alert("Error creating assignment"); }
    } catch (e) { console.error(e); }
}

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

// 7. STARTUP
document.addEventListener('DOMContentLoaded', () => {
    loadUserAvatar();
    loadCourseInfo();
});

// 8. ВКЛАДКА SUBMISSIONS (ИСПРАВЛЕННАЯ)
async function renderSubmissionsTab() {
    const content = document.getElementById('main-content');
    content.innerHTML = `<h3>Incoming Submissions</h3><div id="subs-list">Loading...</div>`;
    const list = document.getElementById('subs-list');

    try {
        // 1. Получаем все задания
        const resAssign = await fetch(`${API_URL}/Assignments/course/${courseId}`);
        if (!resAssign.ok) throw new Error("Failed to load assignments");

        const assignments = await resAssign.json();
        list.innerHTML = '';

        if (assignments.length === 0) {
            list.innerHTML = '<p style="color:#777;">No assignments yet.</p>';
            return;
        }

        let hasAnyWork = false;

        // 2. Для каждого задания ищем сдачи
        for (const task of assignments) {
            try {
                const resSubs = await fetch(`${API_URL}/Submissions/assignment/${task.id}`);

                // 🔥 ЗАЩИТА ОТ ОШИБКИ JSON 🔥
                // Если статус не ОК (например 404), пропускаем
                if (!resSubs.ok) continue;

                // Проверяем, точно ли пришли данные (JSON), а не HTML ошибка
                const contentType = resSubs.headers.get("content-type");
                if (!contentType || !contentType.includes("application/json")) {
                    console.warn(`Server returned non-JSON for assignment ${task.id}`);
                    continue;
                }

                const submissions = await resSubs.json();

                // 3. РИСУЕМ ТОЛЬКО ЕСЛИ ЕСТЬ СДАЧИ
                if (submissions && submissions.length > 0) {
                    hasAnyWork = true;

                    const studentsHtml = submissions.map(sub => `
                        <div style="padding: 15px; border-top: 1px solid #f0f0f0; display:flex; justify-content:space-between; align-items:center;">
                            <div style="display:flex; align-items:center; gap:10px;">
                                <div style="width:30px; height:30px; background:#ccc; border-radius:50%; color:white; display:flex; justify-content:center; align-items:center; font-size:12px; font-weight:bold;">
                                    ${sub.studentName ? sub.studentName[0] : 'S'}
                                </div>
                                <div>
                                    <div style="font-weight:bold; font-size:14px;">${sub.studentName || 'Unknown Student'}</div>
                                    <div style="font-size:11px; color:#888;">${new Date(sub.submissionDate).toLocaleString()}</div>
                                </div>
                            </div>
                            <div style="display:flex; align-items:center; gap:15px;">
                                ${sub.grade
                            ? `<span style="background:#e8f5e9; color:#2e7d32; padding:3px 8px; border-radius:4px; font-size:11px; font-weight:bold;">Graded: ${sub.grade}</span>`
                            : `<span style="background:#fff3e0; color:#ef6c00; padding:3px 8px; border-radius:4px; font-size:11px; font-weight:bold;">Needs Grading</span>`
                        }
                                <button onclick="openGradingModal(${JSON.stringify(sub).replace(/"/g, '&quot;')}, ${JSON.stringify(task).replace(/"/g, '&quot;')})" 
                                        style="border:1px solid #2e7d32; background:white; color:#2e7d32; padding:5px 15px; border-radius:4px; cursor:pointer; font-size:12px;">
                                    Open
                                </button>
                            </div>
                        </div>
                    `).join('');

                    const taskBlock = document.createElement('div');
                    taskBlock.style.marginBottom = "30px";
                    taskBlock.style.background = "white";
                    taskBlock.style.border = "1px solid #e0e0e0";
                    taskBlock.style.borderRadius = "8px";
                    taskBlock.style.overflow = "hidden";

                    taskBlock.innerHTML = `
                        <div style="padding:15px 20px; background:#f9f9f9; border-bottom:1px solid #eee; font-weight:bold; color:#333;">
                            ${task.title} <span style="font-weight:normal; color:#777; font-size:12px; margin-left:10px;">(${submissions.length} submissions)</span>
                        </div>
                        ${studentsHtml}
                    `;
                    list.appendChild(taskBlock);
                }
            } catch (innerError) {
                console.error(`Error loading submissions for task ${task.id}`, innerError);
            }
        }

        if (!hasAnyWork) {
            list.innerHTML = `<div style="text-align:center; padding:40px; color:#888;">No submissions received yet.</div>`;
        }

    } catch (e) {
        console.error(e);
        list.innerHTML = "Error loading data. Check console.";
    }
}

function openGradingModal(sub, task) {
    const modal = document.getElementById('assignment-modal');
    const contentBox = modal.querySelector('.modal-content');

    modal.style.display = 'flex';
    contentBox.classList.add('modal-wide'); // Делаем широким (Сплит)

    // 1. ЛЕВАЯ ЧАСТЬ (РАБОТА СТУДЕНТА)
    // Если есть файл, рисуем красивую кнопку скачивания
    const fileSection = sub.filePath
        ? `<div style="margin-top:20px; padding:15px; background:#f5f5f5; border-radius:8px; border:1px solid #ddd;">
             <div style="font-size:12px; color:#666; margin-bottom:5px;">Attached File:</div>
             <a href="${sub.filePath}" target="_blank" download 
                style="display:flex; align-items:center; gap:10px; text-decoration:none; color:#333; font-weight:bold;">
                <span style="font-size:20px;">📄</span> Download Student's Work
             </a>
           </div>`
        : `<div style="margin-top:20px; color:#888; font-style:italic;">No file attached.</div>`;

    const textSection = sub.textAnswer
        ? `<div style="margin-top:15px;">
             <div style="font-size:12px; color:#666; margin-bottom:5px;">Student's Answer:</div>
             <div style="background:#fff; border:1px solid #eee; padding:10px; border-radius:5px; white-space:pre-wrap;">${sub.textAnswer}</div>
           </div>`
        : '';

    const leftSide = `
        <div class="split-left">
            <h3 style="margin-top:0; color:#2e7d32;">${sub.studentName}'s Submission</h3>
            <div style="font-size:13px; color:#555;">Task: <b>${task.title}</b></div>
            <div style="font-size:12px; color:#888; margin-bottom:20px;">Submitted: ${new Date(sub.submissionDate).toLocaleString()}</div>
            
            ${textSection}
            ${fileSection}
        </div>
    `;

    // 2. ПРАВАЯ ЧАСТЬ (ОЦЕНКА ТИЧЕРА)
    // Если оценка уже стоит, подставим её в поле
    const currentGrade = sub.grade !== null ? sub.grade : '';
    const currentComment = sub.teacherComments || '';

    const rightSide = `
        <div class="split-right">
            <h3 style="margin-top:0;">Grade & Feedback</h3>
            
            <label style="font-size:12px; font-weight:bold; color:#555;">Score (Max: ${task.maxScore}):</label>
            <input type="number" id="grade-input" value="${currentGrade}" 
                   style="width:100%; padding:10px; border:1px solid #ccc; border-radius:5px; margin-bottom:15px; font-size:16px;">

            <label style="font-size:12px; font-weight:bold; color:#555;">Teacher Comment:</label>
            <textarea id="grade-comment" rows="6" placeholder="Great job! Next time try to..." 
                      style="width:100%; padding:10px; border:1px solid #ccc; border-radius:5px; margin-bottom:20px; resize:vertical; font-family:inherit;">${currentComment}</textarea>

            <button onclick="submitGrade('${sub.id}')" class="btn-menu-add" 
                    style="display:block; width:100%; padding:12px; font-weight:bold; background:#2e7d32; color:white;">
                Save Grade
            </button>
        </div>
    `;

    // СОБИРАЕМ ВСЁ ВМЕСТЕ
    contentBox.innerHTML = `
        <div style="text-align:right; margin-bottom:5px;">
            <span onclick="closeAssignmentModal()" style="cursor:pointer; font-size:24px; color:#999;">&times;</span>
        </div>
        <div class="split-view">
            ${leftSide}
            ${rightSide}
        </div>
    `;
}

// 10. ОТПРАВКА ОЦЕНКИ НА СЕРВЕР
async function submitGrade(submissionId) {
    const gradeVal = document.getElementById('grade-input').value;
    const commentVal = document.getElementById('grade-comment').value;

    if (!gradeVal) { alert("Please enter a score."); return; }

    try {
        const response = await fetch(`${API_URL}/Submissions/${submissionId}/grade`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                grade: parseInt(gradeVal),
                comment: commentVal
            })
        });

        if (response.ok) {
            closeAssignmentModal();
            renderSubmissionsTab(); // Обновляем список, чтобы увидеть статус Graded
        } else {
            alert("Error saving grade.");
        }
    } catch (e) {
        console.error(e);
        alert("Network error.");
    }
}

// 11. ТАБЛИЦА ОЦЕНОК (ДЛЯ ТИЧЕРА И СТУДЕНТА)
async function renderGrades() {
    const content = document.getElementById('main-content');
    content.innerHTML = `<div id="gradebook-header"></div><div id="gradebook-container">Loading...</div>`;
    const container = document.getElementById('gradebook-container');

    // ===========================================
    // 🅰️ ВАРИАНТ ДЛЯ СТУДЕНТА
    // ===========================================
    if (!isTeacher) {
        document.getElementById('gradebook-header').innerHTML = `<h3 style="margin-bottom:20px;">My Grades</h3>`;

        try {
            const res = await fetch(`${API_URL}/Submissions/student-grades/${courseId}/${userId}`);
            if (!res.ok) throw new Error("Error loading grades");

            const myGrades = await res.json();

            if (myGrades.length === 0) {
                container.innerHTML = "<p>No assignments yet.</p>";
                return;
            }

            let html = `<div style="max-width: 800px;">`; // Ограничим ширину для красоты

            myGrades.forEach(item => {
                // Определяем статус и цвет
                let statusBadge = `<span style="color:#999; font-size:12px;">Not Submitted</span>`;
                let gradeDisplay = `<span style="color:#999;">- / ${item.maxScore}</span>`;
                let borderLeftColor = "#ccc"; // Серый по умолчанию

                if (item.hasSubmitted) {
                    if (item.grade !== null) {
                        // Оценено
                        statusBadge = `<span style="color:#2e7d32; font-weight:bold; font-size:12px;">✅ Graded</span>`;
                        gradeDisplay = `<span style="font-size:18px; font-weight:bold; color:#2e7d32;">${item.grade}</span> <span style="font-size:12px; color:#666;">/ ${item.maxScore}</span>`;
                        borderLeftColor = "#2e7d32"; // Зеленая полоска
                    } else {
                        // Сдано, ждет проверки
                        statusBadge = `<span style="color:#f57c00; font-weight:bold; font-size:12px;">🕒 Turned In</span>`;
                        gradeDisplay = `<span style="font-size:14px; color:#f57c00;">Pending</span>`;
                        borderLeftColor = "#f57c00"; // Оранжевая полоска
                    }
                }

                // Рисуем карточку
                html += `
                    <div style="
                        display: flex; 
                        justify-content: space-between; 
                        align-items: center; 
                        background: white; 
                        border: 1px solid #eee; 
                        border-left: 5px solid ${borderLeftColor}; 
                        border-radius: 5px; 
                        padding: 15px 20px; 
                        margin-bottom: 10px;
                        box-shadow: 0 2px 5px rgba(0,0,0,0.03);
                    ">
                        <div>
                            <div style="font-weight:bold; font-size:16px; color:#333;">${item.assignmentTitle}</div>
                            <div style="margin-top:4px;">${statusBadge}</div>
                        </div>
                        <div style="text-align:right;">
                            ${gradeDisplay}
                        </div>
                    </div>
                `;
            });

            html += `</div>`;
            container.innerHTML = html;

        } catch (e) {
            console.error(e);
            container.innerHTML = "Error loading your grades.";
        }
        return; // Выходим, чтобы не рисовать таблицу учителя
    }

    // ===========================================
    // 🅱️ ВАРИАНТ ДЛЯ УЧИТЕЛЯ (ТАБЛИЦА)
    // ===========================================
    try {
        const res = await fetch(`${API_URL}/Submissions/gradebook/${courseId}`);
        if (!res.ok) throw new Error("Error loading gradebook");

        const data = await res.json();
        const header = document.getElementById('gradebook-header');

        // ШАПКА ТИЧЕРА
        header.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="margin: 0;">Gradebook</h3>
                <button id="btn-export" class="btn-menu-add" 
                    style="width: auto; margin: 0; background:#1D6F42; display: flex; align-items: center; gap: 8px; padding: 8px 15px;">
                    <span>📊</span> Export to Excel
                </button>
            </div>
        `;

        if (data.students.length === 0) {
            container.innerHTML = "<p style='color:#777;'>No students in this course yet.</p>";
            return;
        }

        // ТАБЛИЦА ТИЧЕРА
        let tableHtml = `
            <div style="overflow-x:auto; border: 1px solid #ccc; border-radius: 5px; display:inline-block; max-width:100%;">
            <table style="width: max-content; border-collapse: collapse; font-size: 14px;">
                <thead>
                    <tr style="background:#f5f5f5;">
                        <th style="padding:12px 20px; text-align:left; color:#333; border: 1px solid #ccc; white-space: nowrap;">
                            Student Name
                        </th>
                        ${data.assignments.map(a => `
                            <th style="padding:12px 20px; text-align:center; color:#333; border: 1px solid #ccc; white-space: nowrap;">
                                ${a.title}
                                <div style="font-size:10px; color:#888; font-weight:normal;">Max: ${a.maxScore}</div>
                            </th>
                        `).join('')}
                    </tr>
                </thead>
                <tbody>
        `;

        data.students.forEach(student => {
            tableHtml += `
                <tr>
                    <td style="padding:12px 20px; font-weight:bold; color:#333; border: 1px solid #ccc; background: #fff; white-space: nowrap;">
                        ${student.studentName}
                    </td>
                    ${student.grades.map(g => {
                let cellContent = "-";
                let color = "#bbb";
                let bg = "#fff";

                if (g.score !== null) {
                    cellContent = g.score;
                    color = "#2e7d32";
                    bg = "#e8f5e9";
                } else if (g.isSubmitted) {
                    cellContent = "Needs Grading";
                    color = "#f57c00";
                    bg = "#fff3e0";
                }

                return `<td style="padding:12px 20px; text-align:center; color:${color}; font-weight:bold; border: 1px solid #ccc; background: ${bg}; white-space: nowrap;">${cellContent}</td>`;
            }).join('')}
                </tr>
            `;
        });

        tableHtml += `</tbody></table></div>`;
        container.innerHTML = tableHtml;
        document.getElementById('btn-export').onclick = () => downloadGradebookAsExcel(data);

    } catch (e) {
        console.error(e);
        container.innerHTML = "Error loading grades.";
    }
}

// 12. ФУНКЦИЯ СКАЧИВАНИЯ EXCEL (CSV)
function downloadGradebookAsExcel(data) {
    // 1. Формируем заголовок (Student Name, Task 1, Task 2...)
    let csvContent = "Student Name";
    data.assignments.forEach(a => {
        // Убираем запятые из названий заданий, чтобы не ломать CSV
        csvContent += "," + a.title.replace(/,/g, "");
    });
    csvContent += "\n";

    // 2. Формируем строки (Jack Hardy, 100, 95...)
    data.students.forEach(student => {
        let row = student.studentName;
        student.grades.forEach(g => {
            // Если оценки нет - пустая строка
            let score = g.score !== null ? g.score : "";
            row += "," + score;
        });
        csvContent += row + "\n";
    });

    // 3. Создаем файл для скачивания
    // \uFEFF нужно, чтобы Excel понял кириллицу (рус/укр буквы)
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    // 4. Создаем невидимую ссылку и нажимаем на нее
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Gradebook_${currentCourseData.name}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}