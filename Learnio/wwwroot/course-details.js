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

const gradients = [
    "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
    "linear-gradient(135deg, #ee9ca7 0%, #ffdde1 100%)",
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

// 🔥 ФОРМАТТЕР ДАТЫ (ВСЕГДА КИЕВ)
function formatKyivDate(isoDateString) {
    if (!isoDateString) return "";
    const date = new Date(isoDateString);
    return date.toLocaleString('uk-UA', {
        timeZone: 'Europe/Kyiv', // 👈 ЖЕСТКО ЗАДАЕМ КИЕВ
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// 1. ЗАГРУЗКА ИНФО
async function loadCourseInfo() {
    try {
        const response = await fetch(`${API_URL}/Courses/${courseId}`);

        if (!response.ok) {
            document.getElementById('course-title').innerText = "Course not found";
            return;
        }

        const course = await response.json();

        if (course) {
            currentCourseData = course;

            // Якщо курс в архіві, додамо позначку біля назви
            const titleSuffix = course.isArchived ? " (ARCHIVED)" : "";
            document.getElementById('course-title').innerText = course.name + titleSuffix;

            const subTab = document.querySelector('.menu-item[onclick*="submissions"]');
            if (subTab) subTab.style.display = 'none';

            // ПЕРЕВІРКА: ЧИ Я ВЧИТЕЛЬ?
            if (String(course.teacherId).toLowerCase() === String(userId).toLowerCase()) {
                isTeacher = true;

                document.getElementById('btn-add-assignment').style.display = 'block';
                document.getElementById('teacher-code-area').style.display = 'block';
                document.getElementById('course-join-code').innerText = course.joinCode || "NO CODE";
                if (subTab) subTab.style.display = 'block';

                // 🔥 ЛОГІКА КНОПОК АРХІВУ 🔥
                const btnArchive = document.getElementById('btn-archive-course');
                const btnRestore = document.getElementById('btn-unarchive-course');

                if (course.isArchived) {
                    // Якщо курс В АРХІВІ -> Показуємо "Restore", ховаємо "Archive"
                    if (btnRestore) btnRestore.style.display = 'block';
                    if (btnArchive) btnArchive.style.display = 'none';
                } else {
                    // Якщо курс АКТИВНИЙ -> Показуємо "Archive", ховаємо "Restore"
                    if (btnRestore) btnRestore.style.display = 'none';
                    if (btnArchive) btnArchive.style.display = 'block';
                }

                // 🔥 ДОБАВЛЯЕМ КНОПКУ УДАЛЕНИЯ
                // Проверяем, нет ли ее уже (чтобы не дублировать)
                if (!document.getElementById('btn-delete-course-permanent')) {
                    const deleteBtnHtml = `
                    <button id="btn-delete-course-permanent" class="btn-menu-add" 
                            onclick="deleteCoursePermanently()"
                            style="background-color: #f95757; margin-top: 15px; display:block;">
                        🗑 Delete Course
                    </button>
                `;
                    // Вставляем кнопку в конец блока .user-controls или .sidebar (где находятся остальные кнопки)
                    // В вашем HTML кнопки лежат прямо в .sidebar
                    const sidebar = document.querySelector('.sidebar');
                    if (sidebar) {
                        sidebar.insertAdjacentHTML('beforeend', deleteBtnHtml);
                    }
                }
            }

            renderStream();
        }
    } catch (err) { console.error(err); }
}

// 2. ФУНКЦІЯ АРХІВУВАННЯ
async function archiveCourse() {
    if (!confirm("Are you sure you want to archive this course? It will be moved to the 'Completed' tab.")) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/Courses/${courseId}/archive`, {
            method: 'PUT'
        });

        if (response.ok) {
            alert("Course archived!");
            window.location.href = "dashboard.html";
        } else {
            alert("Error archiving course.");
        }
    } catch (e) {
        console.error(e);
        alert("Server error.");
    }
}

// 2.1. РАЗАРХИВИРОВАТЬ (RESTORE)
async function unarchiveCourse() {
    if (!confirm("Restore this course? It will appear in the 'Active' list again.")) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/Courses/${courseId}/unarchive`, {
            method: 'PUT'
        });

        if (response.ok) {
            alert("Course restored!");
            // Перезавантажуємо сторінку, щоб оновити кнопки
            location.reload();
        } else {
            alert("Error restoring course.");
        }
    } catch (e) {
        console.error(e);
        alert("Server error.");
    }
}

// 3. ФУНКЦИЯ ПОЛНОГО УДАЛЕНИЯ КУРСА
async function deleteCoursePermanently() {
    // Двойное подтверждение для безопасности
    if (!confirm("⚠️ DANGER ZONE ⚠️\n\nAre you sure you want to PERMANENTLY DELETE this course?")) {
        return;
    }

    if (!confirm("This action cannot be undone.\n\n- All assignments will be lost.\n- All student grades will be lost.\n- All submissions will be deleted.\n\nDelete course?")) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/Courses/${courseId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            alert("Course deleted.");
            // Редирект на главную (Dashboard)
            window.location.href = "dashboard.html";
        } else {
            const text = await response.text();
            alert("Error deleting course: " + text);
        }
    } catch (e) {
        console.error(e);
        alert("Network error.");
    }
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
                // 🔥 ИСПРАВЛЕНИЕ: ЖЕСТКАЯ СОРТИРОВКА (Новые сверху)
                // Мы берем дату создания (createdAt) или дедлайн (deadline) и сравниваем их.
                // b - a = Сортировка по убыванию (сначала 2026, потом 2025...)
                // 🔥 ИСПРАВЛЕНИЕ: СОРТИРОВКА СТРОГО ПО ДАТЕ СОЗДАНИЯ
                tasks.sort((a, b) => {
                    // Если CreatedAt нет (старые записи), используем Deadline как запасной вариант
                    const dateA = new Date(a.createdAt || a.deadline);
                    const dateB = new Date(b.createdAt || b.deadline);

                    // Сортировка: Новые (большая дата) - сверху
                    return dateB - dateA;
                });

                tasks.forEach(task => {
                    // Используем наш форматтер для красивой даты
                    const dateStr = formatKyivDate(task.deadline);
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

// 5. ASSIGNMENTS LIST (СОРТИРОВКА: НОВЫЕ СВЕРХУ 🔥)
async function loadAssignments() {
    const content = document.getElementById('main-content');
    content.innerHTML = `<h3>Assignments</h3><div id="list" style="margin-top: 20px;">Loading...</div>`;
    const list = document.getElementById('list');

    try {
        const response = await fetch(`${API_URL}/Assignments/course/${courseId}`);
        if (!response.ok) { list.innerHTML = 'Error loading data.'; return; }

        const tasks = await response.json();
        list.innerHTML = '';

        if (!tasks.length) { list.innerHTML = '<p style="color:#888;">No assignments yet.</p>'; return; }

        // 🔥 СОРТИРОВКА: Новые задания (по дате создания) - СВЕРХУ
        tasks.sort((a, b) => {
            const dateA = new Date(a.createdAt || a.deadline);
            const dateB = new Date(b.createdAt || b.deadline);
            return dateB - dateA;
        });

        tasks.forEach(task => {
            const taskData = JSON.stringify(task).replace(/"/g, '&quot;');
            const dateStr = formatKyivDate(task.deadline);

            let buttonsHtml = '';

            if (!isTeacher) {
                // СТУДЕНТ
                buttonsHtml = `<button onclick="openTaskView(${taskData}, false)" class="btn-menu-add" style="display:block; width:auto; padding: 8px 20px;">Open</button>`;
            } else {
                // УЧИТЕЛЬ: Кнопка View + Кнопка Edit (✏️)
                buttonsHtml = `
            <div style="display:flex; gap: 10px;">
                <button onclick="openEditAssignmentModal(${taskData})" class="btn-edit-task">✏️ Edit</button>
                <button onclick="openTaskView(${taskData}, true)" class="btn-menu-add" style="display:block; width:auto; padding: 8px 20px; margin:0;">View</button>
            </div>
        `;
            }

            list.innerHTML += `
        <div style="border-bottom:1px solid #eee; padding:20px 0; display:flex; justify-content:space-between; align-items:center;">
            <div style="display:flex; align-items:center; gap:15px;">
                <div style="background:#e8f5e9; color:#2e7d32; width:45px; height:45px; border-radius:50%; display:flex; justify-content:center; align-items:center; font-size:20px;">📝</div>
                <div>
                    <div style="font-weight:bold; font-size:16px;">${task.title}</div>
                    <div style="font-size:13px; color:#666;">Due: ${dateStr} • ${task.maxScore} pts</div>
                </div>
            </div>
            ${buttonsHtml}
        </div>`;
        });
    } catch (e) { list.innerHTML = 'Error loading list.'; }
}

function openEditAssignmentModal(task) {
    const modal = document.getElementById('assignment-modal');
    const contentBox = modal.querySelector('.modal-content');

    modal.style.display = 'flex';
    contentBox.classList.remove('modal-wide');

    // Дата для инпута
    const deadlineDate = new Date(task.deadline);
    deadlineDate.setMinutes(deadlineDate.getMinutes() - deadlineDate.getTimezoneOffset());
    const dateForInput = deadlineDate.toISOString().slice(0, 16);

    // Логика отображения блока с файлом
    let fileInfoHtml = '';
    if (task.attachmentUrl) {
        // Если файл есть: показываем галочку "Удалить файл"
        fileInfoHtml = `
            <div style="font-size:11px; color:#2e7d32; margin-bottom:5px;">✅ Current file attached</div>
            <label style="display:flex; align-items:center; gap:8px; font-size:12px; color:#c62828; cursor:pointer; margin-bottom:5px;">
                <input type="checkbox" id="edit-remove-file"> Remove current file
            </label>
        `;
    } else {
        fileInfoHtml = `<div style="font-size:11px; color:#888; margin-bottom:5px;">❌ No file attached</div>`;
    }

    contentBox.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <h3 style="margin-top:0; color:#ef6c00;">Edit Assignment</h3>
            <button onclick="deleteAssignment('${task.id}')" style="background:transparent; border:1px solid #c62828; color:#c62828; padding:5px 10px; border-radius:5px; cursor:pointer; font-size:12px;">🗑 Delete Task</button>
        </div>
        
        <label style="font-size:12px; color:#666;">Title:</label>
        <input type="text" id="edit-title" class="modal-input" value="${task.title}">

        <label style="font-size:12px; color:#666;">Instructions:</label>
        <textarea id="edit-desc" class="modal-input" rows="5" style="resize: vertical; font-family: inherit;">${task.description || ""}</textarea>

        <div style="margin-bottom: 15px; background:#fff3e0; padding:10px; border-radius:5px;">
            <label style="font-size: 12px; font-weight: bold; color: #555;">File Settings:</label>
            ${fileInfoHtml}
            <div style="font-size:10px; color:#555; margin-top:5px;">Upload new to replace:</div>
            <input type="file" id="edit-file" style="margin-top: 2px;">
        </div>

        <label style="font-size:12px; color:#666;">Deadline:</label>
        <input type="datetime-local" id="edit-deadline" class="modal-input" value="${dateForInput}">
        
        <label style="font-size:12px; color:#666;">Max Score:</label>
        <input type="number" id="edit-score" class="modal-input" value="${task.maxScore}">

        <div class="modal-buttons" style="text-align: right; margin-top: 20px;">
            <button class="btn-cancel" onclick="closeAssignmentModal()" style="padding: 10px 20px; background: #eee; border: none; border-radius: 5px; cursor: pointer; margin-right: 10px;">Cancel</button>
            <button class="btn-create" onclick="submitEditAssignment('${task.id}')" style="padding: 10px 20px; background: #ef6c00; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight:bold;">Save Changes</button>
        </div>
    `;
}

async function submitEditAssignment(assignmentId) {
    const titleVal = document.getElementById('edit-title').value;
    const desc = document.getElementById('edit-desc').value;
    const deadlineVal = document.getElementById('edit-deadline').value;
    const score = document.getElementById('edit-score').value;

    const fileInput = document.getElementById('edit-file');
    // Проверяем, существует ли чекбокс (он есть, только если был файл) и нажат ли он
    const removeCheck = document.getElementById('edit-remove-file');
    const shouldRemoveFile = removeCheck && removeCheck.checked;

    if (!titleVal || !deadlineVal || !score) {
        alert("Title, Deadline and Score are required.");
        return;
    }

    const formData = new FormData();
    formData.append('CourseId', courseId);
    formData.append('Title', titleVal);
    formData.append('Description', desc);
    formData.append('Deadline', deadlineVal);
    formData.append('MaxScore', score);

    // 1. Если загрузили новый файл
    if (fileInput.files[0]) {
        formData.append('File', fileInput.files[0]);
    }
    // 2. Иначе, если нажали "Удалить файл"
    else if (shouldRemoveFile) {
        formData.append('RemoveFile', 'true'); // Отправляем флаг на бэкенд
    }

    try {
        const response = await fetch(`${API_URL}/Assignments/${assignmentId}`, {
            method: "PUT",
            body: formData
        });

        if (response.ok) {
            closeAssignmentModal();
            switchTab('assignments'); // Обновляем список
        } else {
            const err = await response.text();
            alert("Error updating: " + err);
        }
    } catch (e) {
        console.error(e);
        alert("Network error");
    }
}

async function deleteAssignment(assignmentId) {
    if (!confirm("⚠️ ARE YOU SURE?\n\nThis will delete the assignment AND ALL STUDENT GRADES/SUBMISSIONS for it.\nThis cannot be undone.")) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/Assignments/${assignmentId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            alert("Assignment deleted.");
            closeAssignmentModal();
            switchTab('assignments'); // Обновляем список, задание исчезнет
        } else {
            alert("Error deleting assignment.");
        }
    } catch (e) {
        console.error(e);
        alert("Network error.");
    }
}
// ОТПРАВИТЬ ИЗМЕНЕНИЯ (PUT)
async function submitEditAssignment(assignmentId) {
    const titleVal = document.getElementById('edit-title').value;
    const desc = document.getElementById('edit-desc').value;
    const deadlineVal = document.getElementById('edit-deadline').value;
    const score = document.getElementById('edit-score').value;
    const fileInput = document.getElementById('edit-file');

    if (!titleVal || !deadlineVal || !score) {
        alert("Title, Deadline and Score are required.");
        return;
    }

    const formData = new FormData();
    formData.append('CourseId', courseId); // Нужно для валидации DTO, хоть мы его и не меняем
    formData.append('Title', titleVal);
    formData.append('Description', desc);
    formData.append('Deadline', deadlineVal);
    formData.append('MaxScore', score);

    // Если выбрали новый файл, отправляем его. Если нет - бэкенд оставит старый.
    if (fileInput.files[0]) {
        formData.append('File', fileInput.files[0]);
    }

    try {
        const response = await fetch(`${API_URL}/Assignments/${assignmentId}`, {
            method: "PUT",
            body: formData
        });

        if (response.ok) {
            closeAssignmentModal();
            // Обновляем список, чтобы увидеть изменения
            switchTab('assignments');
        } else {
            const err = await response.text();
            alert("Error updating: " + err);
        }
    } catch (e) {
        console.error(e);
        alert("Network error");
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

    const dateStr = formatKyivDate(task.deadline);
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

    loadStudentStatus(task.id, task.maxScore);
}

// ПРОВЕРКА: СДАЛ ИЛИ НЕТ? (С КОММЕНТАРИЕМ УЧИТЕЛЯ 🔥)
async function loadStudentStatus(assignmentId, maxScore = 100) {
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

                // 🔥 1. ГОТОВИМ HTML ДЛЯ КОММЕНТАРИЯ
                // Проверяем оба варианта написания (с большой и маленькой буквы)
                const tComment = sub.teacherComments || sub.TeacherComments;
                let commentHtml = '';

                if (tComment) {
                    commentHtml = `
                        <div style="
                            margin-top: 15px; 
                            padding: 12px; 
                            background: #fff9c4; /* Светло-желтый фон для важности */
                            border: 1px solid #fbc02d; 
                            border-radius: 6px; 
                            font-size: 13px; 
                            color: #555;
                        ">
                            <div style="font-weight:bold; color:#f57f17; margin-bottom:4px;">💬 Teacher Feedback:</div>
                            <div style="font-style:italic;">"${tComment}"</div>
                        </div>
                    `;
                }

                container.innerHTML = `
                    <div class="student-card" style="border-color:#c5e1a5; background:#f1f8e9;">
                        <div style="color:#2e7d32; font-weight:bold; font-size:16px;">✅ Handed In</div>
                        
                        <div style="font-size:12px; color:#666; margin-bottom:15px;">
                            Submitted: ${formatKyivDate(sub.submissionDate)}
                        </div>
                        
                        ${sub.filePath ? `<a href="${sub.filePath}" target="_blank" style="color:#1565c0; font-weight:bold;">📄 View My File</a>` : ''}
                        
                        ${sub.textAnswer ? `<div style="background:white; padding:10px; border-radius:5px; margin-top:10px; font-style:italic; font-size:13px; border:1px solid #ddd;">"${sub.textAnswer}"</div>` : ''}
                        
                        <div style="margin-top:20px; border-top:1px solid #ddd; padding-top:10px;">
                            ${sub.grade !== null
                        // Если есть оценка
                    ? `<div style="font-size:24px; color:#2e7d32; font-weight:bold; text-align:center;">${sub.grade} / ${maxScore}</div>
                                   <div style="text-align:center; font-size:12px; color:#555;">Graded</div>
                                   
                                   ${commentHtml}`

                        // Кнопка пересдачи (если оценки нет)
                        : `<button onclick="renderUploadForm('${assignmentId}')" style="width:100%; padding:12px; background:#2e7d32; color:white; border:none; border-radius:8px; cursor:pointer; font-weight:bold;">Resubmit</button>`
                    }
                        </div>
                    </div>
                `;
                return; // Выходим, работу показали
            }
        }

        // ВАРИАНТ 2: Студент еще не сдавал
        renderUploadForm(assignmentId);

    } catch (e) {
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
// TEACHER CREATE FORM (С ЗАЩИТОЙ ОТ ПРОШЛОГО ВРЕМЕНИ)
// ==========================================
function openAssignmentModal() {
    const modal = document.getElementById('assignment-modal');
    const contentBox = modal.querySelector('.modal-content');

    modal.style.display = 'flex';
    contentBox.classList.remove('modal-wide');

    // 🔥 1. ВЫЧИСЛЯЕМ ТЕКУЩЕЕ ВРЕМЯ В ФОРМАТЕ ДЛЯ INPUT (YYYY-MM-DDTHH:MM)
    const now = new Date();
    // Немного магии, чтобы получить правильный формат локального времени для input
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    const minDateTime = now.toISOString().slice(0, 16);

    contentBox.innerHTML = `
        <h3 style="margin-top:0;">New Assignment</h3>
        <input type="text" id="assign-name" class="modal-input" placeholder="Title (e.g. Lab work 1)">
        <textarea id="assign-desc" class="modal-input" placeholder="Instructions..." rows="5" style="resize: vertical; padding: 10px; font-family: inherit;"></textarea>
        <div style="margin-bottom: 15px;">
            <label style="font-size: 12px; font-weight: bold; color: #555;">Attach File (Doc, PDF, Img):</label>
            <input type="file" id="assign-file" style="margin-top: 5px;">
        </div>
        <div style="font-size:12px; color:#666;">Deadline (Kyiv Time):</div>
        
        <input type="datetime-local" id="assign-deadline" class="modal-input" min="${minDateTime}">
        
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

// 5. PEOPLE (Сортировка + Исправленная кнопка чата)
async function renderPeople() {
    const content = document.getElementById('main-content');
    content.innerHTML = `<h3>People</h3><div id="people-list">Loading...</div>`;

    let myIdRaw = localStorage.getItem('userId');
    const myIdClean = myIdRaw ? String(myIdRaw).toLowerCase() : "";

    try {
        const response = await fetch(`${API_URL}/Enrollments/course/${courseId}/students`);

        if (response.ok) {
            const students = await response.json();

            // 🔥 1. СОРТИРОВКА СТУДЕНТОВ ПО АЛФАВИТУ
            // Сравниваем полные имена
            students.sort((a, b) => {
                const nameA = ((a.firstName || "") + " " + (a.lastName || "")).trim().toLowerCase();
                const nameB = ((b.firstName || "") + " " + (b.lastName || "")).trim().toLowerCase();
                return nameA.localeCompare(nameB);
            });

            const list = document.getElementById('people-list');
            list.innerHTML = '';

            // ==========================================
            // 2. УЧИТЕЛЬ (Всегда первый, не участвует в сортировке)
            // ==========================================
            const tName = currentCourseData.teacherName || "Teacher";
            let tId = currentCourseData.teacherId;
            if (tId) tId = String(tId).toLowerCase();

            // Берем аватар учителя
            const tAvatar = currentCourseData.teacherAvatarUrl || currentCourseData.TeacherAvatarUrl || currentCourseData.avatarUrl || "";
            const iAmTeacher = (myIdClean === tId);

            let teacherChatBtn = '';
            if (!iAmTeacher && tId) {
                // 🔥 ВАЖНО: Третий параметр '${tAvatar}' передает фото в чат сразу!
                teacherChatBtn = `<button onclick="startChat('${tId}', '${tName}', '${tAvatar}')" style="background:#e8f5e9; color:#2e7d32; border:none; width:40px; height:40px; border-radius:50%; cursor:pointer; font-size:20px;">✉️</button>`;
            }

            let teacherAvatarHtml;
            if (tAvatar) {
                teacherAvatarHtml = `<img src="${tAvatar}" style="width:40px; height:40px; border-radius:50%; margin-right:15px; object-fit:cover;" alt="${tName}" />`;
            } else {
                teacherAvatarHtml = `<div style="width:40px; height:40px; background:#2e7d32; color:white; border-radius:50%; display:flex; justify-content:center; align-items:center; font-weight:bold; margin-right:15px;">${tName[0]}</div>`;
            }

            // Рендерим учителя
            list.innerHTML += `
                <div style="padding:15px; border-bottom:1px solid #eee; display:flex; justify-content: space-between; align-items:center; background-color: #fafafa;">
                    <div style="display:flex; align-items:center;">
                        ${teacherAvatarHtml}
                        <div><div style="font-weight:bold;">${tName}</div><div style="font-size:12px; color:#2e7d32; font-weight:bold;">Teacher 🎓</div></div>
                    </div>
                    ${teacherChatBtn}
                </div>`;

            // ==========================================
            // 3. СТУДЕНТЫ (Уже отсортированные)
            // ==========================================
            if (students.length === 0) {
                list.innerHTML += '<p style="margin-top:20px; color:#777; padding: 15px;">No students joined yet.</p>';
            } else {
                students.forEach((s) => {
                    const sName = `${s.firstName || "Student"} ${s.lastName || ""}`;

                    // Получаем ID
                    let rawId = s.id || s.Id || s.studentId || s.StudentId || s.userId || s.UserId;
                    let sId = rawId ? String(rawId).toLowerCase() : "undefined";

                    const userAvatar = s.avatarUrl || s.AvatarUrl;

                    // Рендер аватарки (код остался тем же)
                    let avatarHtml;
                    if (userAvatar) {
                        avatarHtml = `<img src="${userAvatar}" style="width:40px; height:40px; border-radius:50%; margin-right:15px; object-fit:cover;" alt="${sName}" />`;
                    } else {
                        avatarHtml = `<div style="width:40px; height:40px; background:#555; color:white; border-radius:50%; display:flex; justify-content:center; align-items:center; font-weight:bold; margin-right:15px;">${sName[0]}</div>`;
                    }

                    // 🔥 БЛОК КНОПОК
                    let actionsHtml = '';

                    // Если Я - Учитель, то показываю кнопки управления
                    if (iAmTeacher && sId !== "undefined" && sId !== myIdClean) {
                        actionsHtml = `
                            <div style="display:flex; gap: 8px;">
                                <button onclick="startChat('${sId}', '${sName}', '${userAvatar || ""}')" 
                                        title="Message"
                                        style="background:#e8f5e9; color:#2e7d32; border:none; width:36px; height:36px; border-radius:50%; cursor:pointer; font-size:18px; display:flex; align-items:center; justify-content:center;">
                                    ✉️
                                </button>

                                <button onclick="kickStudent('${sId}', '${sName}')" 
                                        title="Remove from course"
                                        style="background:#ffebee; color:#c62828; border:1px solid #ffcdd2; width:36px; height:36px; border-radius:50%; cursor:pointer; font-size:16px; display:flex; align-items:center; justify-content:center;">
                                    ❌
                                </button>
                            </div>
                        `;
                    }

                    // Вывод строки студента
                    list.innerHTML += `
                    <div style="padding:15px; border-bottom:1px solid #eee; display:flex; justify-content: space-between; align-items:center;">
                        <div style="display:flex; align-items:center;">
                            ${avatarHtml}
                            <div>
                                <div style="font-weight:bold;">${sName}</div>
                                <div style="font-size:12px; color:#888;">Student</div>
                            </div>
                        </div>
                        ${actionsHtml}
                    </div>`;
                });
            }
        }
    } catch (e) {
        console.error(e);
    }
}

// ФУНКЦИЯ УДАЛЕНИЯ СТУДЕНТА (KICK)
async function kickStudent(studentId, studentName) {
    if (!confirm(`⚠️ Remove ${studentName} from the course?\n\n- They will be removed from the list.\n- Their grades and submissions for THIS course will be deleted.\n- Chat history will be KEPT.`)) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/Enrollments/kick?courseId=${courseId}&studentId=${studentId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            // Успех
            alert(`${studentName} removed.`);
            // Перерисовываем список людей, чтобы студент исчез
            renderPeople();
        } else {
            const text = await response.text();
            alert("Error: " + text);
        }
    } catch (e) {
        console.error(e);
        alert("Network error.");
    }
}

// 6. CREATE ASSIGNMENT (С ПРОВЕРКОЙ ВРЕМЕНИ)
async function createAssignment() {
    const titleVal = document.getElementById('assign-name').value;
    const desc = document.getElementById('assign-desc').value;
    const deadlineVal = document.getElementById('assign-deadline').value;
    const score = document.getElementById('assign-score').value;
    const fileInput = document.getElementById('assign-file');

    if (!titleVal || !deadlineVal || !score) { alert("Fill required fields"); return; }

    // 🔥 ПРОВЕРКА НА ПРОШЛОЕ
    const selectedDate = new Date(deadlineVal);
    const now = new Date();
    if (selectedDate < now) {
        alert("⚠️ You cannot set a deadline in the past!");
        return;
    }

    const formData = new FormData();
    formData.append('CourseId', courseId);
    formData.append('Title', titleVal);
    formData.append('Description', desc);
    formData.append('Deadline', deadlineVal);
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

// 10. SUBMISSIONS (СОРТИРОВКА + АВАТАРКИ 🔥)
async function renderSubmissionsTab() {
    const content = document.getElementById('main-content');
    content.innerHTML = `<h3>Incoming Submissions</h3><div id="subs-list">Loading...</div>`;
    const list = document.getElementById('subs-list');

    try {
        const resAssign = await fetch(`${API_URL}/Assignments/course/${courseId}`);
        if (!resAssign.ok) throw new Error("Failed");

        const assignments = await resAssign.json();
        list.innerHTML = '';

        if (assignments.length === 0) { list.innerHTML = '<p>No assignments.</p>'; return; }

        // СОРТИРОВКА: Новые задания сверху
        assignments.sort((a, b) => {
            const dateA = new Date(a.createdAt || a.deadline);
            const dateB = new Date(b.createdAt || b.deadline);
            return dateB - dateA;
        });

        for (const task of assignments) {
            // Блок задания
            const taskBlock = document.createElement('div');
            taskBlock.className = 'submission-accordion-item';
            taskBlock.style.marginBottom = "10px";
            taskBlock.style.border = "1px solid #e0e0e0";
            taskBlock.style.borderRadius = "8px";
            taskBlock.style.overflow = "hidden";
            taskBlock.style.background = "white";

            // Заголовок
            const headerDiv = document.createElement('div');
            headerDiv.style.padding = "15px 20px";
            headerDiv.style.background = "#f9f9f9";
            headerDiv.style.cursor = "pointer";
            headerDiv.style.display = "flex";
            headerDiv.style.justifyContent = "space-between";
            headerDiv.style.alignItems = "center";
            headerDiv.style.fontWeight = "bold";
            headerDiv.innerHTML = `<span>${task.title}</span><span style="font-size:12px; color:#777; font-weight:normal;">Loading...</span>`;

            // Тело
            const bodyDiv = document.createElement('div');
            bodyDiv.id = `subs-body-${task.id}`;
            bodyDiv.className = 'submission-body';
            bodyDiv.style.display = "none";
            bodyDiv.style.borderTop = "1px solid #eee";
            bodyDiv.style.maxHeight = "400px";
            bodyDiv.style.overflowY = "auto";

            // Клик (Аккордеон)
            headerDiv.onclick = () => {
                const isClosed = bodyDiv.style.display === "none";
                document.querySelectorAll('.submission-body').forEach(el => el.style.display = 'none');
                document.querySelectorAll('.sub-arrow').forEach(el => el.style.transform = 'rotate(0deg)');
                if (isClosed) {
                    bodyDiv.style.display = "block";
                    const arrow = headerDiv.querySelector('.sub-arrow');
                    if (arrow) arrow.style.transform = 'rotate(180deg)';
                }
            };

            taskBlock.appendChild(headerDiv);
            taskBlock.appendChild(bodyDiv);
            list.appendChild(taskBlock);

            // Подгрузка списка сдавших
            fetch(`${API_URL}/Submissions/assignment/${task.id}`)
                .then(r => r.ok ? r.json() : [])
                .then(submissions => {
                    headerDiv.innerHTML = `
                        <span>${task.title}</span>
                        <span style="font-weight:normal; font-size:12px; color:#777; background:#eee; padding:2px 8px; border-radius:10px; display:inline-flex; align-items:center; gap:5px;">
                            ${submissions.length} submissions 
                            <span class="sub-arrow" style="display:inline-block; transition:transform 0.3s ease;">▼</span>
                        </span>`;

                    if (submissions.length > 0) {
                        bodyDiv.innerHTML = submissions.map(sub => {
                            const subDate = new Date(sub.submissionDate);
                            const deadLine = new Date(task.deadline);
                            const isLate = subDate > deadLine;

                            const dateColor = isLate ? "#d32f2f" : "#888";
                            const lateBadge = isLate ? `<span style="color:red; font-weight:bold; font-size:10px; margin-left:5px;">LATE</span>` : "";

                            // 🔥🔥🔥 ЛОГИКА АВАТАРОК 🔥🔥🔥
                            const sName = sub.studentName || "Student";
                            const sAvatar = sub.studentAvatarUrl; // Берем поле, которое добавили в C#

                            let avatarHtml;
                            if (sAvatar) {
                                // Если есть фото
                                avatarHtml = `<img src="${sAvatar}" style="width:30px; height:30px; border-radius:50%; object-fit:cover;" alt="${sName}" />`;
                            } else {
                                // Если нет фото (серый круг)
                                avatarHtml = `<div style="width:30px; height:30px; background:#ccc; border-radius:50%; color:white; display:flex; justify-content:center; align-items:center; font-size:12px;">${sName[0]}</div>`;
                            }

                            return `
                            <div style="padding:15px; border-bottom:1px solid #f0f0f0; display:flex; justify-content:space-between; align-items:center;">
                                <div style="display:flex; align-items:center; gap:10px;">
                                    
                                    ${avatarHtml}

                                    <div>
                                        <div style="font-weight:bold; font-size:14px;">${sName}</div>
                                        <div style="font-size:11px; color:${dateColor};">
                                            ${formatKyivDate(sub.submissionDate)} ${lateBadge}
                                        </div>
                                    </div>
                                </div>
                                <div style="display:flex; align-items:center; gap:10px;">
                                    ${sub.grade ? `<span style="background:#e8f5e9; color:#2e7d32; padding:3px 8px; border-radius:4px; font-size:11px; font-weight:bold;">${sub.grade}</span>` : `<span style="background:#fff3e0; color:#ef6c00; padding:3px 8px; border-radius:4px; font-size:11px; font-weight:bold;">New</span>`}
                                    <button onclick="openGradingModal(${JSON.stringify(sub).replace(/"/g, '&quot;')}, ${JSON.stringify(task).replace(/"/g, '&quot;')})" style="border:1px solid #2e7d32; background:white; color:#2e7d32; padding:5px 12px; border-radius:4px; cursor:pointer; font-size:12px;">Open</button>
                                </div>
                            </div>`;
                        }).join('');
                    } else {
                        bodyDiv.innerHTML = `<div style="padding:20px; text-align:center; color:#999;">No submissions yet.</div>`;
                    }
                });
        }
    } catch (e) { list.innerHTML = "Error loading."; }
}
function openGradingModal(sub, task) {
    const modal = document.getElementById('assignment-modal');
    const contentBox = modal.querySelector('.modal-content');

    modal.style.display = 'flex';
    contentBox.classList.add('modal-wide');

    // 🔥 РАСЧЕТ ОПОЗДАНИЯ
    const subDate = new Date(sub.submissionDate);
    const deadLine = new Date(task.deadline);
    const isLate = subDate > deadLine;

    // Плашка "LATE"
    const lateAlert = isLate
        ? `<div style="background:#ffebee; color:#c62828; padding:8px 12px; border-radius:5px; margin-bottom:15px; font-weight:bold; border:1px solid #ffcdd2; display:flex; align-items:center; gap:10px;">
             <span>⚠️</span> Turned in Late
           </div>`
        : '';

    // 1. ЛЕВАЯ ЧАСТЬ
    const fileSection = sub.filePath
        ? `<div style="margin-top:20px; padding:15px; background:#f5f5f5; border-radius:8px; border:1px solid #ddd;">
             <div style="font-size:12px; color:#666; margin-bottom:5px;">Attached File:</div>
             <a href="${sub.filePath}" target="_blank" download style="display:flex; align-items:center; gap:10px; text-decoration:none; color:#333; font-weight:bold;">
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
            
            ${lateAlert}

            <div style="font-size:12px; color:${isLate ? '#c62828' : '#888'}; margin-bottom:20px;">
                Submitted: ${formatKyivDate(sub.submissionDate)}
            </div>
            
            ${textSection}
            ${fileSection}
        </div>
    `;

    // 2. ПРАВАЯ ЧАСТЬ (Остается без изменений)
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

// 11. ТАБЛИЦА ОЦЕНОК (С ЦВЕТОВОЙ ЛОГИКОЙ %)
async function renderGrades() {
    const content = document.getElementById('main-content');
    const sidebar = document.querySelector('.sidebar');

    // 🔥 ФИКС ВЕРСТКИ 🔥
    // 1. Запрещаем меню сжиматься (фиксируем его железобетонно)
    if (sidebar) {
        sidebar.style.minWidth = "250px";
        sidebar.style.flexShrink = "0";
    }

    // 2. Заставляем контент уважать границы экрана
    content.style.minWidth = "0";
    content.style.width = "100%";

    content.innerHTML = `<div id="gradebook-header"></div><div id="gradebook-container" style="width:100%; min-width:0;">Loading...</div>`;
    const container = document.getElementById('gradebook-container');

    // ===========================================
    // 🅰️ СТУДЕНТ (Без изменений)
    // ===========================================
    if (!isTeacher) {
        document.getElementById('gradebook-header').innerHTML = `<h3 style="margin-bottom:20px;">My Grades</h3>`;
        try {
            const res = await fetch(`${API_URL}/Submissions/student-grades/${courseId}/${userId}`);
            if (!res.ok) throw new Error("Error");
            const myGrades = await res.json();

            if (myGrades.length === 0) { container.innerHTML = "<p>No assignments yet.</p>"; return; }

            // 🔥 ИСПРАВЛЕННАЯ СОРТИРОВКА: СТАРЫЕ (Lab 1) СВЕРХУ, НОВЫЕ (Lab 2) СНИЗУ
            myGrades.sort((a, b) => {
                // 1. Сортировка по дате создания (createdAt)
                // Если поля createdAt нет в JSON, пробуем deadline. Если и его нет — 0.
                const dateA = new Date(a.createdAt || a.deadline || 0);
                const dateB = new Date(b.deadline || b.createdAt || 0);

                // a - b = Сортировка по возрастанию (от прошлого к будущему)
                if (dateA.getTime() !== dateB.getTime()) {
                    return dateA - dateB;
                }

                // 2. ЗАПАСНОЙ ВАРИАНТ: Если даты совпадают (или их нет), сортируем по названию
                // Это гарантирует, что "Lab 1" будет выше "Lab 2"
                const titleA = (a.assignmentTitle || "").toLowerCase();
                const titleB = (b.assignmentTitle || "").toLowerCase();

                // Сравнение строк (алфавитный порядок)
                if (titleA < titleB) return -1;
                if (titleA > titleB) return 1;
                return 0;
            });

            let html = `<div style="max-width: 800px;">`;
            myGrades.forEach(item => {
                let statusBadge = `<span style="color:#999; font-size:12px;">Not Submitted</span>`;
                let gradeDisplay = `<span style="color:#999;">- / ${item.maxScore}</span>`;
                let borderLeftColor = "#ccc";

                if (item.hasSubmitted) {
                    if (item.grade !== null) {
                        statusBadge = `<span style="color:#2e7d32; font-weight:bold; font-size:12px;">✅ Graded</span>`;
                        gradeDisplay = `<span style="font-size:18px; font-weight:bold; color:#2e7d32;">${item.grade}</span> <span style="font-size:12px; color:#666;">/ ${item.maxScore}</span>`;
                        borderLeftColor = "#2e7d32";
                    } else {
                        statusBadge = `<span style="color:#f57c00; font-weight:bold; font-size:12px;">🕒 Turned In</span>`;
                        gradeDisplay = `<span style="font-size:14px; color:#f57c00;">Pending</span>`;
                        borderLeftColor = "#f57c00";
                    }
                }

                // Комментарий учителя
                let commentHtml = '';
                if (item.teacherComment) {
                    commentHtml = `
                        <div style="margin-top:0; padding:12px 20px; background:#fafafa; border-top:1px solid #eee; color:#555; font-size:13px; font-style:italic; border-bottom-left-radius:5px; border-bottom-right-radius:5px;">
                            <span style="font-weight:bold; color:#2e7d32; font-style:normal;">Teacher Comment:</span> "${item.teacherComment}"
                        </div>`;
                }

                html += `
                    <div style="background:white; border:1px solid #eee; border-left:5px solid ${borderLeftColor}; border-radius:5px; margin-bottom:15px; box-shadow:0 2px 5px rgba(0,0,0,0.03);">
                        <div style="display:flex; justify-content:space-between; align-items:center; padding:15px 20px;">
                            <div><div style="font-weight:bold; font-size:16px; color:#333;">${item.assignmentTitle}</div><div style="margin-top:4px;">${statusBadge}</div></div>
                            <div style="text-align:right;">${gradeDisplay}</div>
                        </div>
                        ${commentHtml}
                    </div>`;
            });
            html += `</div>`;
            container.innerHTML = html;
        } catch (e) { container.innerHTML = "Error loading grades."; }
        return;
    }

    // ===========================================
    // 🅱️ УЧИТЕЛЬ (СВЕТОФОР 🚦)
    // ===========================================
    try {
        const res = await fetch(`${API_URL}/Submissions/gradebook/${courseId}`);
        if (!res.ok) throw new Error("Error");
        const data = await res.json();

        // 👇 ВОТ СЮДА
        console.log("ASSIGNMENTS RAW:");
        data.assignments.forEach(a => {
            console.log("TITLE:", a.title, "CREATED:", a.createdAt);
        });

        // 🔥 СОРТИРОВКА СТУДЕНТОВ ПО АЛФАВИТУ
        data.students.sort((a, b) => {
            return (a.studentName || "").localeCompare(
                b.studentName || "",
                undefined,
                {
                    sensitivity: "base", // игнорирует регистр
                    numeric: true        // понимает "Student 2" перед "Student 10"
                }
            );
        });

        // 🔥 ЧИСТАЯ СОРТИРОВКА: Сначала по времени, если время равное — по названию
        const sortedAssignmentsWithIndex = data.assignments
            .map((assignment, index) => ({ ...assignment, originalIndex: index }))
            .sort((a, b) => {

                const timeA = a.createdAt ? Date.parse(a.createdAt) : 0;
                const timeB = b.createdAt ? Date.parse(b.createdAt) : 0;

                if (timeA !== timeB) {
                    return timeA - timeB; // старые слева, новые справа
                }

                return (a.title || "").localeCompare(
                    b.title || "",
                    undefined,
                    { numeric: true }
                );
            });;

        // Обновляем порядок колонок
        data.assignments = sortedAssignmentsWithIndex;

        // Синхронизируем оценки студентов под новые колонки
        data.students.forEach(student => {
            const sortedGrades = [];
            sortedAssignmentsWithIndex.forEach(sa => {
                sortedGrades.push(student.grades[sa.originalIndex]);
            });
            student.grades = sortedGrades;
        });

        document.getElementById('gradebook-header').innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="margin: 0;">Gradebook</h3>
                <button id="btn-export" class="btn-menu-add" style="width: auto; margin: 0; background:#1D6F42; display: flex; align-items: center; gap: 8px; padding: 8px 15px;"><span>📊</span> Export to Excel</button>
            </div>`;

        if (data.students.length === 0) {
            container.innerHTML = "<p style='color:#777;'>No students yet.</p>";
            return;
        }

        let tableHtml = `
            <div style="width: 100%; overflow-x: auto; border: 1px solid #ccc; border-radius: 8px; background: white;">
                <table style="width: 100%; border-collapse: separate; border-spacing: 0; min-width: max-content;">
                    <thead>
                        <tr style="background:#f9f9f9;">
                            <th style="padding:15px 20px; text-align:left; color:#555; position:sticky; left:0; background:#f9f9f9; z-index:10; border-right:2px solid #eee; border-bottom:1px solid #eee;">
                                Student Name
                            </th>
                            ${data.assignments.map(a => `
                                <th style="padding:15px 20px; text-align:center; color:#333; border-bottom:1px solid #eee; border-right:1px solid #eee; min-width: 100px;">
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
                    <td style="padding:12px 20px; font-weight:bold; color:#333; position:sticky; left:0; background:white; z-index:5; border-right:2px solid #eee; border-bottom:1px solid #eee;">
                        ${student.studentName}
                    </td>
                    ${student.grades.map((g, index) => {
                // 🔥 МАГИЯ ЦВЕТА
                // 1. Получаем макс. балл для ЭТОГО задания (используем индекс)
                const maxScore = data.assignments[index].maxScore;

                let cellContent = "-";
                let color = "#ccc";
                let bg = "transparent";
                let fontWeight = "normal";

                if (g.score !== null) {
                    cellContent = g.score;

                    // 2. Считаем процент
                    const percentage = (g.score / maxScore) * 100;

                    // 3. Выбираем цвет фона и текста
                    if (percentage < 40) {
                        // Плохо (Красный)
                        color = "#c62828";
                        bg = "#ffcdd2";
                    } else if (percentage < 80) {
                        // Норм (Желтый/Оранжевый)
                        color = "#ef6c00";
                        bg = "#ffe0b2";
                    } else {
                        // Отлично (Зеленый)
                        color = "#2e7d32";
                        bg = "#aaffad9c";
                    }
                    fontWeight = "bold";

                } else if (g.isSubmitted) {
                    cellContent = "Needs Grading";
                    color = "#1565c0"; // Синий для проверки
                    bg = "#e3f2fd";
                    fontWeight = "bold";
                }

                        // 🔥 ТЕПЕРЬ СТИЛИ (bg, color) ПРИМЕНЯЕМ К TD, А НЕ К DIV
                        return `
                            <td style="
                                padding: 12px 20px; 
                                text-align: center; 
                                border-right: 1px solid #eee; 
                                border-bottom: 1px solid #eee;
                                background-color: ${bg}; 
                                color: ${color}; 
                                font-weight: ${fontWeight};
                            ">
                                ${cellContent}
                            </td>`;
                    }).join('')}
                </tr>`;
        });

        tableHtml += `</tbody></table></div>`;
        container.innerHTML = tableHtml;
        document.getElementById('btn-export').onclick = () => downloadGradebookAsExcel(data);

    } catch (e) {
        console.error(e);
        container.innerHTML = "Error loading grades.";
    }
}

// 12. ФУНКЦИЯ СКАЧИВАНИЯ EXCEL (.XLSX)
function downloadGradebookAsExcel(data) {
    // 1. Формируем массив массивов (строки таблицы)
    const rows = [];

    // --- ЗАГОЛОВОК ---
    const headerRow = ["Student Name"];

    // Добавляем названия заданий и макс. балл в скобках
    data.assignments.forEach(a => {
        headerRow.push(`${a.title} (Max: ${a.maxScore})`);
    });
    rows.push(headerRow);

    // --- ДАННЫЕ СТУДЕНТОВ ---
    data.students.forEach(student => {
        const row = [student.studentName];

        student.grades.forEach(g => {
            // Если оценки нет, оставляем пусто, иначе пишем число
            // (Excel сам поймет, что это число)
            row.push(g.score !== null ? g.score : "");
        });

        rows.push(row);
    });

    // 2. Создаем рабочую книгу (Workbook) и лист (Worksheet)
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows); // aoa = Array of Arrays

    // 3. Автоматическая ширина колонок (для красоты)
    // Вычисляем ширину для первой колонки (Имя) и остальных (Оценки)
    const wscols = [
        { wch: 25 } // Ширина для "Student Name" (примерно 25 символов)
    ];
    // Для остальных колонок (заданий) ставим ширину 15
    data.assignments.forEach(() => wscols.push({ wch: 20 }));
    ws['!cols'] = wscols;

    // 4. Добавляем лист в книгу
    XLSX.utils.book_append_sheet(wb, ws, "Gradebook");

    // 5. Скачиваем файл .xlsx
    // Библиотека сама создаст Blob и ссылку
    const fileName = `Gradebook_${currentCourseData.name}.xlsx`;
    XLSX.writeFile(wb, fileName);
}