import axios from 'axios';
const BASE = (import.meta.env.VITE_API_URL || 'https://agrotech-mendoza-puma-code-production.up.railway.app') + '/api/v1';
const api = axios.create({ baseURL: BASE });

// Adjunta el token del panel admin si existe
api.interceptors.request.use((cfg) => {
  const t = localStorage.getItem('token');
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

const apiService = {
  getVinedos:           async () => (await api.get('/vinedos')).data,
  getCuarteles:         async () => (await api.get('/telemetria/cuarteles')).data,
  getTelemetria:        async (id, limit = 24) => (await api.get(`/telemetria/${id}?limit=${limit}`)).data,
  getPrediccionHelada:  async (id) => (await api.get(`/analisis/helada/${id}`)).data,
  getAnalisisCosecha:   async (id) => (await api.get(`/analisis/cosecha/${id}`)).data,
  getHistorico:         async (id, periodo = 'mensual') => (await api.get(`/analisis/historico/${id}?periodo=${periodo}`)).data,
  getClima:             async (id) => (await api.get(`/clima/${id}`)).data,
  getRiego:             async (id) => (await api.get(`/riego/${id}`)).data,
  getFitosanitario:     async (id) => (await api.get(`/fitosanitario/${id}`)).data,
  getModeloFito:        async () => (await api.get('/fitosanitario/modelo')).data,
  comandoRiego:         async (id, accion) => (await api.post(`/riego/${id}/comando`, { accion })).data,
  chat:                 async (message, history = []) => (await api.post('/chat', { message, history })).data,
  enviarContacto:       async (data) => (await api.post('/contacto', data)).data,
  pedirPresupuesto:     async (chatHistory, userData) => (await api.post('/presupuesto', { chatHistory, userData })).data,
  // Auth
  login:                async (username, password) => (await api.post('/auth/login', { username, password })).data,
  setupPassword:        async (email, password) => (await api.post('/auth/setup-password', { email, password })).data,
  invite:               async (nombre, email) => (await api.post('/auth/invite', { nombre, email })).data,
  getAdmins:            async () => (await api.get('/auth/admins')).data,
};

export default apiService;
export { BASE };