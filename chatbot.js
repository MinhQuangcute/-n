// Chatbot JavaScript - Backend integration with JWT
import { login, logout, isAuthenticated, getCurrentUser, authFetch } from './auth.js';

function initChatbot() {
  const chatMessages = document.getElementById('chatMessages');
  const messageInput = document.getElementById('messageInput');

  window.handleKeyPress = function (e) {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  window.sendQuickMessage = function (text) {
    messageInput.value = text;
    sendMessage();
  };

  window.sendMessage = async function () {
    const text = (messageInput.value || '').trim();
    if (!text) return;

    appendMessage('user', text);
    messageInput.value = '';

    const lower = text.toLowerCase();
    if (lower.includes('mở tủ')) {
      await commandLocker('open');
      botReply('Đã gửi lệnh mở tủ. Vui lòng đợi vài giây.');
      return;
    }
    if (lower.includes('đóng tủ')) {
      await commandLocker('close');
      botReply('Đã gửi lệnh đóng tủ.');
      return;
    }
    if (lower.includes('trạng thái')) {
      const s = await readStatus();
      botReply('Trạng thái hiện tại: ' + (s || 'không xác định'));
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

  window.toggleVoice = function () {
    const el = document.getElementById('botStatus');
    el.textContent = el.textContent.includes('🎙') ? 'Đang hoạt động' : '🎙 Voice ON';
  };

  window.toggleTyping = function () {
    const el = document.getElementById('botStatus');
    el.textContent = el.textContent.includes('⌨') ? 'Đang hoạt động' : '⌨ Typing ON';
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
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

async function commandLocker(action) {
  if (!isAuthenticated()) {
    botReply('Vui lòng đăng nhập ở trang chính để điều khiển.');
    return;
  }
  try {
    const res = await authFetch('/api/locker/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Không thể gửi lệnh');
    }
  } catch (e) {
    console.error('Command error:', e);
    botReply('Gửi lệnh thất bại: ' + e.message);
  }
}

async function readStatus() {
  if (!isAuthenticated()) return null;
  try {
    const res = await authFetch('/api/locker/status');
    if (!res.ok) return null;
    const json = await res.json();
    return json.current_status || null;
  } catch (e) {
    return null;
  }
}

// Startup
document.addEventListener('DOMContentLoaded', () => {
  initChatbot();
});
