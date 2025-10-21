// Chatbot JavaScript - Minimal working version

// Use backend instead of Firebase
document.addEventListener('DOMContentLoaded', initChatbot);

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
  window.Backend.commandLocker(action).catch((err) => {
    console.error('Command error:', err);
    botReply('Gửi lệnh thất bại: ' + (err && err.message ? err.message : 'Unknown error'));
  });
}

async function readStatus() {
  try {
    const data = await window.Backend.getLocker();
    return data && data.current_status ? data.current_status : null;
  } catch (e) {
    console.error('Read status error:', e);
    return null;
  }
}

