// src/api/axios.js
import axios_base from 'axios';

// Только прод-API:
const API_URL = 'https://api.vendorvillage.store';

const axios = axios_base.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 20000,
});

// CSRF для Django (если используешь куки)
function getCookie(name) {
  const m = document.cookie.match('(?:^|; )' + name.replace(/([$?*|{}\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)');
  return m ? decodeURIComponent(m[1]) : null;
}
axios.interceptors.request.use((config) => {
  const method = (config.method || 'get').toLowerCase();
  if (['post', 'put', 'patch', 'delete'].includes(method)) {
    const csrf = getCookie('csrftoken');
    if (csrf) config.headers['X-CSRFToken'] = csrf;
  }
  return config;
});

export default axios;
