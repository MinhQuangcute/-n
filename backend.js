// Lightweight backend client for Smart Locker
(function () {
  const DEFAULT_BASE_URL = 'http://localhost:8080';

  function getStored(key, fallback = '') {
    try {
      const v = localStorage.getItem(key);
      return v !== null ? v : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function setStored(key, value) {
    try {
      if (value == null || value === '') localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch (_) {}
  }

  function getConfig() {
    const baseUrl = (getStored('apiBaseUrl', DEFAULT_BASE_URL) || DEFAULT_BASE_URL).replace(/\/$/, '');
    const apiKey = getStored('apiKey', '');
    return { baseUrl, apiKey };
  }

  function setConfig(baseUrl, apiKey) {
    if (typeof baseUrl === 'string') setStored('apiBaseUrl', baseUrl);
    if (typeof apiKey === 'string') setStored('apiKey', apiKey);
  }

  async function getIdToken() {
    try {
      if (typeof window.getIdToken === 'function') return await window.getIdToken();
      const token = getStored('idToken', '');
      return token || '';
    } catch (_) {
      return '';
    }
  }

  async function request(path, options = {}) {
    const { baseUrl, apiKey } = getConfig();
    const headers = new Headers(options.headers || {});
    headers.set('Content-Type', 'application/json');
    if (apiKey) headers.set('x-api-key', apiKey);
    const idToken = await getIdToken();
    if (idToken) headers.set('Authorization', 'Bearer ' + idToken);
    const res = await fetch(baseUrl + path, { ...options, headers });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(text || ('HTTP ' + res.status));
    }
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) return await res.json();
    return await res.text();
  }

  const Backend = {
    getConfig,
    setConfig,
    health() {
      return request('/health');
    },
    async getLocker() {
      const r = await request('/api/locker');
      return r && r.data ? r.data : null;
    },
    async commandLocker(action) {
      return request('/api/locker/command', {
        method: 'POST',
        body: JSON.stringify({ action })
      });
    },
    async getAnalyticsActivity() {
      const r = await request('/api/analytics/activity');
      return r && r.data ? r.data : {};
    },
    async postAnalyticsActivity(payload) {
      return request('/api/analytics/activity', {
        method: 'POST',
        body: JSON.stringify(payload || {})
      });
    },
    async clearAnalyticsActivity() {
      return request('/api/analytics/activity', { method: 'DELETE' });
    }
  };

  window.Backend = Backend;
})();
