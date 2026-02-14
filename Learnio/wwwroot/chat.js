let currentReceiverId = null;
let currentReceiverName = null;
let connection = null;

// === НАСТРОЙКИ URL ===
let ROOT_URL = "https://localhost:7180";
if (typeof API_URL !== 'undefined') {
    ROOT_URL = API_URL.replace(/\/api\/?$/, "").replace(/\/$/, "");
}

// Берем мой ID
const myId = localStorage.getItem('userId');

document.addEventListener("DOMContentLoaded", async () => {
    // Если чат не был "убит" крестиком
    if (localStorage.getItem('chatClosedFully') !== 'true') {
        await initChatSystem();
    }
});

async function initChatSystem() {
    // 1. Грузим контакты
    const contacts = await fetchMyContacts();
    renderChatBase(contacts);

    // 2. ВОССТАНОВЛЕНИЕ ОКНА
    const wrapper = document.getElementById('chat-wrapper');

    // Получаем состояния из памяти
    // chatExpanded может быть: 'true', 'false' или null (если первый раз)
    const isExpanded = localStorage.getItem('chatExpanded') === 'true';
    const hasInteracted = localStorage.getItem('chatExpanded') !== null; // Пользователь уже трогал чат?
    const isClosedFully = localStorage.getItem('chatClosedFully') === 'true';

    // ЛОГИКА:
    // Показываем чат (хотя бы язычок), ТОЛЬКО если:
    // 1. Мы не закрыли его крестиком (isClosedFully == false)
    // 2. И (!) мы уже когда-то открывали его раньше (hasInteracted == true)

    if (!isClosedFully && hasInteracted && wrapper) {
        wrapper.style.display = 'block'; // Показываем блок (виден язычок)

        // Если он был именно РАЗВЕРНУТ, то разворачиваем
        if (isExpanded) {
            wrapper.classList.add('expanded');

            // Восстанавливаем конкретную переписку
            const savedReceiverId = localStorage.getItem('currentReceiverId');
            const savedReceiverName = localStorage.getItem('currentReceiverName');

            if (savedReceiverId && savedReceiverId !== "undefined") {
                console.log("🔄 Restoring chat with:", savedReceiverName);
                await openChatWithUser(savedReceiverId, savedReceiverName);
            }
        }
    }
    // Если hasInteracted == false (новый вход), wrapper останется display: none

    // 3. Запускаем SignalR
    if (myId) await initSignalR();
}

async function fetchMyContacts() {
    try {
        const url = `${ROOT_URL}/api/Messages/contacts/${myId}`;
        const response = await fetch(url);
        if (response.ok) return await response.json();
    } catch (e) {
        console.error("Error fetching contacts", e);
    }
    return [];
}

function renderChatBase(contacts) {
    if (document.getElementById('chat-wrapper')) return;

    let contactsHtml = '';
    if (contacts && contacts.length > 0) {
        contactsHtml = `<div class="contacts-list">`;
        contacts.forEach(user => {
            const initials = user.name ? user.name.substring(0, 2).toUpperCase() : "??";

            // ЛОГИКА: Если есть непрочитанные > 0, рисуем красную точку
            const badgeHtml = user.unreadCount > 0
                ? `<div class="contact-badge" id="badge-${user.id}"></div>`
                : `<div class="contact-badge" id="badge-${user.id}" style="display:none;"></div>`;

            contactsHtml += `
                <div class="contact-avatar" 
                     id="contact-bubble-${user.id}"
                     onclick="startChat('${user.id}', '${user.name}')" 
                     title="${user.name}">
                     ${initials}
                     ${badgeHtml} </div>`;
        });
        contactsHtml += `</div>`;
    }

    const html = `
    <div id="chat-wrapper">
        <div class="chat-handle" onclick="toggleChatSidebar()">
            💬 <div id="global-unread-badge" class="global-badge" style="display:none;">0</div>
        </div>
        
        <div class="chat-sidebar">
            <div class="chat-header">
                <div class="chat-main-title">Messages</div>
                <div class="close-btn" onclick="closeChatFully()" style="cursor:pointer;">✖</div>
            </div>
            ${contactsHtml}
            <div class="chat-recipient-bar">
                <div id="recipient-avatar-placeholder" class="recipient-avatar-small"></div>
                <div class="chat-recipient-name" id="chat-recipient-text"></div>
            </div>
            <div class="chat-body" id="chat-messages">
                <div style="text-align:center; margin-top:50px; color:#aaa;">
                    ${contacts && contacts.length > 0 ? "Select a contact above" : "No open chats"}
                </div>
            </div>
            <div class="chat-footer">
                <textarea id="chat-input" placeholder="Type a message..."></textarea>
                <button id="chat-send-btn" onclick="sendMessage()">➤</button>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML("beforeend", html);

    // Сразу после рендера проверяем общее кол-во (на случай если контакты пусты, но непрочитанные есть)
    updateGlobalCounter();
}

// Эта функция вызывается при клике
async function startChat(userId, userName) {
    // 🔥 ЗАЩИТА ОТ ДУРАКА (UNDEFINED)
    if (!userId || userId === "undefined" || userId === "null") {
        console.error("❌ startChat called with INVALID ID:", userId);
        alert("Error: Cannot start chat. User ID is missing.");
        return;
    }

    await openChatFromNav();
    await openChatWithUser(userId, userName);
}

async function openChatWithUser(userId, userName) {
    currentReceiverId = userId;
    currentReceiverName = userName;

    localStorage.setItem('currentReceiverId', userId);
    localStorage.setItem('currentReceiverName', userName);

    // UI Updates
    const bar = document.querySelector('.chat-recipient-bar');
    if (bar) bar.style.display = 'flex';

    const nameEl = document.getElementById('chat-recipient-text');
    if (nameEl) nameEl.innerText = userName;

    const initials = userName ? userName.substring(0, 2).toUpperCase() : "??";
    const avatarDiv = document.getElementById('recipient-avatar-placeholder');
    if (avatarDiv) {
        avatarDiv.innerText = initials;
        avatarDiv.style.display = 'flex';
    }

    document.querySelectorAll('.contact-avatar').forEach(el => el.classList.remove('active'));
    const activeBubble = document.getElementById(`contact-bubble-${userId}`);
    if (activeBubble) activeBubble.classList.add('active');

    // --- НОВОЕ: Помечаем как прочитанное при открытии ---
    await markMessagesAsRead(userId);
    // ----------------------------------------------------

    await loadHistory(userId);
}
async function openChatFromNav() {
    localStorage.removeItem('chatClosedFully');
    if (!document.getElementById('chat-wrapper')) await initChatSystem();
    const wrapper = document.getElementById('chat-wrapper');
    if (wrapper) {
        wrapper.style.display = 'block';
        setTimeout(() => wrapper.classList.add('expanded'), 10);
        localStorage.setItem('chatExpanded', 'true');
    }
    notifyOtherTabs('open');
}

function toggleChatSidebar() {
    const wrapper = document.getElementById('chat-wrapper');
    if (wrapper) {
        wrapper.classList.toggle('expanded');
        localStorage.setItem('chatExpanded', wrapper.classList.contains('expanded'));
    }
}

function closeChatFully() {
    const wrapper = document.getElementById('chat-wrapper');
    if (wrapper) {
        wrapper.classList.remove('expanded');
        setTimeout(() => wrapper.style.display = 'none', 300);
    }
    localStorage.setItem('chatClosedFully', 'true');
    localStorage.setItem('chatExpanded', 'false');

    // Забываем собеседника
    localStorage.removeItem('currentReceiverId');
    localStorage.removeItem('currentReceiverName');

    notifyOtherTabs('close_full');
}

// === SIGNALR ===
async function initSignalR() {
    const hubUrl = `${ROOT_URL}/chatHub`;
    console.log("🔌 Connecting to SignalR at:", hubUrl);

    connection = new signalR.HubConnectionBuilder()
        .withUrl(hubUrl)
        .withAutomaticReconnect()
        .build();

    connection.on("ReceiveMessage", (senderId, senderName, messageText, time) => {
        const sId = String(senderId).toLowerCase();
        const mId = String(myId).toLowerCase();
        // Текущий открытый чат
        const rId = currentReceiverId ? String(currentReceiverId).toLowerCase() : "";

        const isMine = (sId === mId);

        // Проверяем, открыт ли чат (expanded)
        const wrapper = document.getElementById('chat-wrapper');
        const isChatOpen = wrapper && wrapper.classList.contains('expanded');

        // Сценарий 1: Я отправил или мне прислали в ОТКРЫТЫЙ текущий чат
        if (isMine || (sId === rId && isChatOpen)) {
            if (sId === rId || isMine) {
                appendMessageToUI(messageText, time, isMine);
            }
            // Если чат открыт именно с этим человеком, сразу помечаем как прочитанное (опционально)
            if (!isMine && sId === rId && isChatOpen) {
                markMessagesAsRead(senderId);
            }
        }
        // Сценарий 2: Пришло сообщение, но чат с этим юзером ЗАКРЫТ (или открыт другой юзер)
        else {
            // 1. Включаем точку на контакте
            const contactBadge = document.getElementById(`badge-${senderId}`);
            if (contactBadge) contactBadge.style.display = 'block';

            // 2. Обновляем общий счетчик на язычке (+1)
            updateGlobalCounter();

            // Можно добавить звук уведомления здесь
        }
    });

    try {
        await connection.start();
        console.log("✅ SignalR Connected!");
    } catch (err) {
        console.error("❌ SignalR Error:", err);
    }
}

async function sendMessage() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();

    if (!currentReceiverId || currentReceiverId === "undefined") {
        console.error("Attempted to send to undefined ID");
        return;
    }

    if (!text) return;

    try {
        await connection.invoke("SendMessage", myId, currentReceiverId, text);
        input.value = '';
    } catch (err) {
        console.error("❌ Send Error:", err);
    }
}

async function loadHistory(interlocutorId) {
    if (!interlocutorId || interlocutorId === "undefined") return;

    const msgContainer = document.getElementById('chat-messages');
    msgContainer.innerHTML = '<div style="text-align:center;color:#888;margin-top:20px;">Loading history...</div>';

    try {
        const url = `${ROOT_URL}/api/Messages/history/${myId}/${interlocutorId}`;
        const response = await fetch(url);

        if (response.ok) {
            const messages = await response.json();
            msgContainer.innerHTML = '';
            if (messages.length === 0) msgContainer.innerHTML = '<div style="text-align:center;color:#ccc;margin-top:20px;">No messages yet.</div>';
            else messages.forEach(m => appendMessageToUI(m.text, m.time, m.isMine));
            msgContainer.scrollTop = msgContainer.scrollHeight;
        }
    } catch (e) {
        console.error(e);
        msgContainer.innerHTML = '<div style="text-align:center;color:red;margin-top:20px;">Connection error</div>';
    }
}

function appendMessageToUI(text, time, isMine) {
    const msgContainer = document.getElementById('chat-messages');
    const cssClass = isMine ? 'outgoing' : 'incoming';
    // Защита от HTML
    const div = document.createElement('div');
    div.innerText = text;
    const safeText = div.innerHTML.replace(/\n/g, '<br>');

    const msgHtml = `<div class="message ${cssClass}"><div class="msg-content">${safeText}</div><div class="msg-time">${time}</div></div>`;
    msgContainer.insertAdjacentHTML('beforeend', msgHtml);
    msgContainer.scrollTop = msgContainer.scrollHeight;
}

function notifyOtherTabs(action) {
    localStorage.setItem('chat_sync_event', JSON.stringify({ action: action, time: Date.now() }));
}
window.addEventListener('storage', (e) => {
    if (e.key === 'chat_sync_event') {
        const data = JSON.parse(e.newValue);
        const wrapper = document.getElementById('chat-wrapper');
        if (!wrapper && data.action === 'open') { initChatSystem().then(() => openChatFromNav()); return; }
        if (!wrapper) return;
        if (data.action === 'open') { wrapper.style.display = 'block'; setTimeout(() => wrapper.classList.add('expanded'), 10); }
        else if (data.action === 'close_full') { wrapper.classList.remove('expanded'); setTimeout(() => wrapper.style.display = 'none', 300); }
    }
});

// --- НОВЫЕ ФУНКЦИИ ДЛЯ НЕПРОЧИТАННЫХ ---
async function updateGlobalCounter() {
    try {
        const response = await fetch(`${ROOT_URL}/api/Messages/unread-total/${myId}`);
        if (response.ok) {
            const data = await response.json();
            const total = data.total;

            // 1. Точка на язычке сбоку
            const sidebarBadge = document.getElementById('global-unread-badge');
            // 2. Точка в шапке сайта
            const navBadge = document.getElementById('nav-unread-badge');

            // Текст для бейджика (99+ если много)
            const countText = total > 99 ? '99+' : total;

            // Обновляем Язычок
            if (sidebarBadge) {
                sidebarBadge.innerText = countText;
                sidebarBadge.style.display = total > 0 ? 'flex' : 'none';
            }

            // Обновляем Шапку
            if (navBadge) {
                navBadge.innerText = countText;
                // В шапке используем display: flex или block, но у нас в CSS flex
                navBadge.style.display = total > 0 ? 'flex' : 'none';
            }
        }
    } catch (e) {
        console.error("Error updating global counter", e);
    }
}

// 2. Помечает сообщения как прочитанные (вызывается при открытии чата)
async function markMessagesAsRead(senderId) {
    try {
        await fetch(`${ROOT_URL}/api/Messages/read/${myId}/${senderId}`, { method: 'POST' });

        // Убираем точку с конкретного контакта
        const contactBadge = document.getElementById(`badge-${senderId}`);
        if (contactBadge) contactBadge.style.display = 'none';

        // Обновляем общую цифру на язычке
        await updateGlobalCounter();
    } catch (e) {
        console.error("Error marking read", e);
    }
}