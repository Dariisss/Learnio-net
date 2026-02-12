document.addEventListener("DOMContentLoaded", () => {
    // 1. Создаем HTML
    const chatHtml = `
        <div id="chat-sidebar">
            <div id="chat-handle" onclick="toggleChat()" title="Свернуть/Развернуть">
                💬
            </div>

            <div class="chat-header">
                <div class="chat-controls">
                    <div class="chat-title">Messages</div>
                    <span class="close-btn" onclick="closeChatFully()">✖</span>
                </div>
                
                <div class="chat-avatars-row">
                    <div class="chat-avatar active" onclick="selectChat(this, 'Teacher')">T</div>
                    <div class="chat-avatar" onclick="selectChat(this, 'Ann Smith')">A</div>
                    <div class="chat-avatar" onclick="selectChat(this, 'Jack Hardy')">J</div>
                </div>
            </div>

            <div class="chat-body" id="chat-messages">
                <div class="message incoming">
                    <div class="msg-content">Hello! How are you?</div>
                    <div class="msg-time">10:00</div>
                </div>
            </div>

            <div class="chat-footer">
                <textarea id="chat-input" placeholder="Type a message..."></textarea>
                <button id="chat-send-btn" onclick="sendMessage()">➤</button>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML("beforeend", chatHtml);

    // 2. ВОССТАНАВЛИВАЕМ СОСТОЯНИЕ ИЗ ПАМЯТИ
    const chatState = localStorage.getItem('chatState');
    const sidebar = document.getElementById('chat-sidebar');
    const handle = document.getElementById('chat-handle');

    if (chatState === 'open') {
        // Был открыт -> открываем и показываем язычок
        sidebar.classList.add('open');
        handle.style.display = 'flex';
    }
    else if (chatState === 'minimized') {
        // Был свернут -> закрываем чат, но ПОКАЗЫВАЕМ язычок
        sidebar.classList.remove('open');
        handle.style.display = 'flex';
    }
    else {
        // Был убит (dead) или первый раз -> прячем всё
        sidebar.classList.remove('open');
        handle.style.display = 'none';
    }
});

// === ФУНКЦИИ ===

// 1. ВЫЗОВ ИЗ МЕНЮ (Воскрешение)
function openChatFromNav() {
    const sidebar = document.getElementById('chat-sidebar');
    const handle = document.getElementById('chat-handle');

    sidebar.classList.add('open'); // Открываем
    handle.style.display = 'flex'; // Показываем язычок (обязательно!)

    localStorage.setItem('chatState', 'open');
}

// 2. НАЖАТИЕ НА ЯЗЫЧОК (Туда-сюда)
function toggleChat() {
    const sidebar = document.getElementById('chat-sidebar');

    // Переключаем класс
    sidebar.classList.toggle('open');

    // Если теперь открыто - запоминаем 'open'
    // Если закрыто - запоминаем 'minimized' (язычок остается)
    if (sidebar.classList.contains('open')) {
        localStorage.setItem('chatState', 'open');
    } else {
        localStorage.setItem('chatState', 'minimized');
    }
}

// 3. НАЖАТИЕ НА КРЕСТИК (Смерть)
function closeChatFully() {
    const sidebar = document.getElementById('chat-sidebar');
    const handle = document.getElementById('chat-handle');

    sidebar.classList.remove('open'); // Закрываем
    handle.style.display = 'none';    // УБИВАЕМ ЯЗЫЧОК

    localStorage.setItem('chatState', 'dead');
}

function selectChat(el, name) {
    document.querySelectorAll('.chat-avatar').forEach(a => a.classList.remove('active'));
    el.classList.add('active');
}

function sendMessage() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;

    const msgContainer = document.getElementById('chat-messages');
    const formattedText = text.replace(/\n/g, '<br>');

    const msgHtml = `
        <div class="message outgoing">
            <div class="msg-content">${formattedText}</div>
            <div class="msg-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        </div>`;

    msgContainer.insertAdjacentHTML('beforeend', msgHtml);
    input.value = '';
    msgContainer.scrollTop = msgContainer.scrollHeight;
}