// Cliente de la API real — reemplaza la antigua simulación con localStorage/IndexedDB.
// Todas las llamadas usan credentials:'include' para que la cookie de sesión viaje con cada petición.
const API_BASE = '';

async function apiCall(method, path, body) {
  const opts = { method, credentials: 'include', headers: {} };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(API_BASE + path, opts);
  let data = null;
  try { data = await res.json(); } catch (e) { /* respuesta sin cuerpo JSON */ }
  if (!res.ok) {
    const err = new Error((data && data.error) || ('Error ' + res.status));
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

const api = {
  register: (data) => apiCall('POST', '/api/auth/register', data),
  login: (email, password) => apiCall('POST', '/api/auth/login', { email, password }),
  oauthLogin: (email) => apiCall('POST', '/api/auth/oauth-login', { email }),
  logout: () => apiCall('POST', '/api/auth/logout'),
  me: () => apiCall('GET', '/api/auth/me'),
  updateMe: (data) => apiCall('PUT', '/api/me', data),
  deleteMe: () => apiCall('DELETE', '/api/me'),

  async uploadFile(category, file) {
    const form = new FormData();
    form.append('category', category);
    form.append('file', file);
    const res = await fetch('/api/me/files', { method: 'POST', credentials: 'include', body: form });
    const data = await res.json();
    if (!res.ok) throw Object.assign(new Error(data.error || 'Error al subir archivo'), { data });
    return data.file;
  },
  listMyFiles: (category) => apiCall('GET', '/api/me/files' + (category ? ('?category=' + encodeURIComponent(category)) : '')),
  listArtistFiles: (artistId) => apiCall('GET', '/api/artists/' + artistId + '/files'),
  deleteFile: (id) => apiCall('DELETE', '/api/files/' + id),
  fileUrl: (id) => '/api/files/' + id,

  queue: () => apiCall('GET', '/api/backoffice/queue'),
  approve: (id) => apiCall('POST', '/api/backoffice/applications/' + id + '/approve'),
  reject: (id) => apiCall('POST', '/api/backoffice/applications/' + id + '/reject'),
  directory: (q) => apiCall('GET', '/api/backoffice/directory' + (q ? ('?q=' + encodeURIComponent(q)) : '')),
  getArtist: (id) => apiCall('GET', '/api/backoffice/artists/' + id),
  updateArtist: (id, data) => apiCall('PUT', '/api/backoffice/artists/' + id, data),
  deleteArtist: (id) => apiCall('DELETE', '/api/backoffice/artists/' + id),

  demoAccounts: () => apiCall('GET', '/api/auth/demo-accounts'),

  // Subidas de Inscripción ANTES de tener cuenta — se asocian al registrarse (ver register()).
  async uploadDraftFile(draftToken, category, file) {
    const form = new FormData();
    form.append('category', category);
    form.append('file', file);
    const res = await fetch('/api/drafts/' + draftToken + '/files', { method: 'POST', credentials: 'include', body: form });
    const data = await res.json();
    if (!res.ok) throw Object.assign(new Error(data.error || 'Error al subir archivo'), { data });
    return data.file;
  },
  listDraftFiles: (draftToken) => apiCall('GET', '/api/drafts/' + draftToken + '/files'),
  deleteDraftFile: (draftToken, id) => apiCall('DELETE', '/api/drafts/' + draftToken + '/files/' + id),
  draftFileUrl: (id) => '/api/pending-files/' + id
};
