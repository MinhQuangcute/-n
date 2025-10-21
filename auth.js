(function(){
  const DEFAULT_API_BASE = (window.API_BASE) || (location.origin.includes('localhost') ? 'http://localhost:3001/api' : (location.origin + '/api'));
  const KEY_TOKEN = 'auth_token';
  const KEY_USER = 'auth_user';

  function getApiBase(){
    return DEFAULT_API_BASE;
  }

  function saveToken(token){
    localStorage.setItem(KEY_TOKEN, token);
  }
  function saveUser(user){
    localStorage.setItem(KEY_USER, JSON.stringify(user || null));
  }
  function getToken(){
    return localStorage.getItem(KEY_TOKEN);
  }
  function getUser(){
    try { return JSON.parse(localStorage.getItem(KEY_USER) || 'null'); } catch(e){ return null; }
  }
  function isLoggedIn(){
    return !!getToken();
  }
  function logout(){
    localStorage.removeItem(KEY_TOKEN);
    localStorage.removeItem(KEY_USER);
    location.reload();
  }

  async function apiFetch(path, options={}){
    const token = getToken();
    const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const res = await fetch(getApiBase() + path, Object.assign({}, options, { headers }));
    if (res.status === 401){
      logout();
      throw new Error('Unauthorized');
    }
    const contentType = res.headers.get('content-type') || '';
    const body = contentType.includes('application/json') ? await res.json() : await res.text();
    if (!res.ok){
      const msg = (body && body.error) ? body.error : ('HTTP ' + res.status);
      throw new Error(msg);
    }
    return body;
  }

  async function authLogin(username, password){
    const result = await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
    if (result && result.token){
      saveToken(result.token);
      saveUser(result.user);
      return result.user;
    }
    throw new Error('Login failed');
  }

  function ensureAuthUI(){
    const panel = document.getElementById('authPanel');
    if (!panel) return;
    const user = getUser();
    if (isLoggedIn()){
      panel.innerHTML = `
        <div class="auth-status">
          <span>👤 ${user?.username || 'user'} (${user?.role || 'role'})</span>
          <button id="logoutBtn" class="btn btn-logout">Đăng xuất</button>
        </div>
      `;
      const logoutBtn = document.getElementById('logoutBtn');
      logoutBtn && (logoutBtn.onclick = logout);
    } else {
      panel.innerHTML = `
        <div class="auth-form">
          <input id="authUser" type="text" placeholder="Tài khoản" />
          <input id="authPass" type="password" placeholder="Mật khẩu" />
          <button id="loginBtn" class="btn btn-login">Đăng nhập</button>
        </div>
      `;
      const loginBtn = document.getElementById('loginBtn');
      loginBtn && (loginBtn.onclick = async function(){
        const u = document.getElementById('authUser').value.trim();
        const p = document.getElementById('authPass').value;
        try{
          loginBtn.disabled = true;
          loginBtn.textContent = 'Đang đăng nhập...';
          await authLogin(u, p);
          ensureAuthUI();
          document.dispatchEvent(new CustomEvent('auth:ready'));
        }catch(e){
          alert('Đăng nhập thất bại: ' + (e.message || 'Lỗi'));
        } finally {
          loginBtn.disabled = false;
          loginBtn.textContent = 'Đăng nhập';
        }
      });
    }
  }

  function onAuthReady(callback){
    if (isLoggedIn()) return callback();
    const handler = () => { document.removeEventListener('auth:ready', handler); callback(); };
    document.addEventListener('auth:ready', handler);
  }

  // Expose globals
  window.auth = { apiFetch, authLogin, logout, getUser, getToken, isLoggedIn, onAuthReady, getApiBase, ensureAuthUI };

  // Auto initialize panel if present
  document.addEventListener('DOMContentLoaded', ensureAuthUI);
})();
