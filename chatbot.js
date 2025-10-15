// Chatbot JavaScript - Minimal working version

let database, ref, onValue, set, get, push;

// Wait for Firebase objects that are exposed from chatbot.html inline module
(function waitForFirebase() {
	if (window.database && window.ref && window.onValue && window.set && window.get && window.push) {
		database = window.database;
		ref = window.ref;
		onValue = window.onValue;
		set = window.set;
		get = window.get;
		push = window.push;
		console.log('✅ Chatbot Firebase ready');
		initChatbot();
		return;
	}
	setTimeout(waitForFirebase, 100);
})();

function initChatbot() {
	const chatMessages = document.getElementById('chatMessages');
	const messageInput = document.getElementById('messageInput');
	const sendBtn = document.getElementById('sendBtn');

	window.handleKeyPress = function (e) {
		if (e.key === 'Enter') {
			sendMessage();
		}
	};

	window.sendQuickMessage = function (text) {
		messageInput.value = text;
		sendMessage();
	};

	window.sendMessage = function () {
		const text = (messageInput.value || '').trim();
		if (!text) return;

		appendMessage('user', text);
		messageInput.value = '';

		// Very simple rule-based responses (placeholder for AI API)
		const lower = text.toLowerCase();
		if (lower.includes('mở tủ')) {
			commandLocker('open');
			botReply('Đã gửi lệnh mở tủ. Vui lòng đợi vài giây.');
			return;
		}
		if (lower.includes('đóng tủ')) {
			commandLocker('close');
			botReply('Đã gửi lệnh đóng tủ.');
			return;
		}
		if (lower.includes('trạng thái')) {
			readStatus().then((s) => botReply('Trạng thái hiện tại: ' + (s || 'không xác định')));
			return;
		}

		botReply('Mình đã nhận tin nhắn: "' + text + '". Bạn có thể yêu cầu mở/đóng tủ hoặc hỏi trạng thái.');
	};

	window.clearChat = function () {
		chatMessages.innerHTML = '';
	};

	window.goBack = function () {
		window.location.href = 'index.html';
	};
}

function appendMessage(role, text) {
	const chatMessages = document.getElementById('chatMessages');
	const item = document.createElement('div');
	item.className = role === 'user' ? 'message user-message' : 'message bot-message';
	item.innerHTML = `
		<div class="message-avatar">${role === 'user' ? '👤' : '<i class="fas fa-robot"></i>'}</div>
		<div class="message-content">
			<div class="message-text">${escapeHtml(text)}</div>
			<div class="message-time">${new Date().toLocaleTimeString('vi-VN')}</div>
		</div>
	`;
	chatMessages.appendChild(item);
	chatMessages.scrollTop = chatMessages.scrollHeight;
}

function botReply(text) {
	appendMessage('bot', text);
}

function escapeHtml(s) {
	return s.replace(/[&<>"']/g, function (c) {
		return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
	});
}

function commandLocker(action) {
	if (!database || !ref || !set) {
		botReply('Firebase chưa sẵn sàng. Vui lòng thử lại.');
		return;
	}
	set(ref(database, '/Locker1/status'), action).catch((err) => {
		console.error('Command error:', err);
		botReply('Gửi lệnh thất bại: ' + (err && err.message ? err.message : 'Unknown error'));
	});
}

async function readStatus() {
	if (!database || !ref || !get) return null;
	try {
		const snap = await get(ref(database, '/Locker1/current_status'));
		return snap.exists() ? snap.val() : null;
	} catch (e) {
		console.error('Read status error:', e);
		return null;
	}
}

