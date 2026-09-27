/* =============================================
   VEDA - API Service Layer
   ============================================= */

const API_BASE = import.meta.env.VITE_API_BASE
  || (import.meta.env.DEV ? 'http://localhost:3001/api' : '/api');

// Helper to get auth headers
function getHeaders() {
  const token = localStorage.getItem('veda_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// Generic fetch wrapper
async function apiFetch(endpoint, options = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: getHeaders(),
    ...options,
  });
  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : {};
  if (!res.ok) {
    throw new Error(data.error || 'API request failed');
  }
  return data;
}

// ============= AUTH =============
export const authAPI = {
  login: (email, password) =>
    apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  register: (data) =>
    apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  getProfile: () => apiFetch('/auth/me'),

  updateProfile: (data) =>
    apiFetch('/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),

  changePassword: (currentPassword, newPassword) =>
    apiFetch('/auth/password', { method: 'PUT', body: JSON.stringify({ currentPassword, newPassword }) }),

  updatePlan: (plan) =>
    apiFetch('/auth/plan', { method: 'PUT', body: JSON.stringify({ plan }) }),

  toggle2FA: (type, enabled) =>
    apiFetch('/auth/2fa', { method: 'POST', body: JSON.stringify({ type, enabled }) }),

  setAgeGroup: (age_group) =>
    apiFetch('/auth/age-group', { method: 'PUT', body: JSON.stringify({ age_group }) }),
};

// ============= PUBLIC =============
export const publicAPI = {
  getConditions: () => apiFetch('/public/conditions'),
  getSymptoms: () => apiFetch('/public/symptoms'),
  getFirstAid: () => apiFetch('/public/first-aid'),
  getDoctors: () => apiFetch('/public/doctors'),
  getSubscriptionPlans: () => apiFetch('/public/subscription-plans'),

  logSymptomCheck: (data) =>
    apiFetch('/public/symptom-check', { method: 'POST', body: JSON.stringify(data) }),

  trackEvent: (event_type, event_data) =>
    apiFetch('/public/analytics', { method: 'POST', body: JSON.stringify({ event_type, event_data }) }).catch(() => {}),

  bookConsultation: (data) =>
    apiFetch('/public/consultations', { method: 'POST', body: JSON.stringify(data) }),

  getMyConsultations: () => apiFetch('/public/consultations/my'),
  getMyHistory: () => apiFetch('/public/history'),
};

// ============= ADMIN =============
export const adminAPI = {
  getDashboard: () => apiFetch('/admin/dashboard'),
  getAnalytics: (days = 30) => apiFetch(`/admin/analytics?days=${days}`),

  // Conditions
  getConditions: () => apiFetch('/admin/conditions'),
  createCondition: (data) =>
    apiFetch('/admin/conditions', { method: 'POST', body: JSON.stringify(data) }),
  updateCondition: (id, data) =>
    apiFetch(`/admin/conditions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCondition: (id) =>
    apiFetch(`/admin/conditions/${id}`, { method: 'DELETE' }),

  // Symptoms
  getSymptoms: () => apiFetch('/admin/symptoms'),
  createSymptom: (data) =>
    apiFetch('/admin/symptoms', { method: 'POST', body: JSON.stringify(data) }),
  updateSymptom: (id, data) =>
    apiFetch(`/admin/symptoms/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSymptom: (id) =>
    apiFetch(`/admin/symptoms/${id}`, { method: 'DELETE' }),

  // Medicines
  getMedicines: () => apiFetch('/admin/medicines'),
  createMedicine: (data) =>
    apiFetch('/admin/medicines', { method: 'POST', body: JSON.stringify(data) }),
  updateMedicine: (id, data) =>
    apiFetch(`/admin/medicines/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMedicine: (id) =>
    apiFetch(`/admin/medicines/${id}`, { method: 'DELETE' }),

  // Doctors
  getDoctors: () => apiFetch('/admin/doctors'),
  createDoctor: (data) =>
    apiFetch('/admin/doctors', { method: 'POST', body: JSON.stringify(data) }),
  updateDoctor: (id, data) =>
    apiFetch(`/admin/doctors/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Users
  getUsers: () => apiFetch('/admin/users'),
  updateUserRole: (id, role) =>
    apiFetch(`/admin/users/${id}/role`, { method: 'PUT', body: JSON.stringify({ role }) }),

  // Consultations
  getConsultations: () => apiFetch('/admin/consultations'),
  updateConsultationStatus: (id, status, meeting_link) =>
    apiFetch(`/admin/consultations/${id}/status`, { method: 'PUT', body: JSON.stringify({ status, meeting_link }) }),

  // First Aid
  getFirstAid: () => apiFetch('/admin/first-aid'),
  createFirstAid: (data) =>
    apiFetch('/admin/first-aid', { method: 'POST', body: JSON.stringify(data) }),
  updateFirstAid: (id, data) =>
    apiFetch(`/admin/first-aid/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
};
