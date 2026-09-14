// Si VITE_API_URL n'est pas fourni, on déduit l'adresse de l'API à partir de
// celle utilisée pour charger le site — ainsi un collègue qui accède au site
// via l'IP du réseau local (ex. http://192.168.1.94:5173) atteint la bonne
// API (http://192.168.1.94:4000/api) au lieu de chercher sur son propre poste.
const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:4000/api`;

async function request(path, options = {}) {
  const token = localStorage.getItem('cortex_token');
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Erreur ${res.status}`);
  }
  return res.json();
}

export const api = {
  getHealth: () => request('/health'),
  getLanguages: () => request('/languages'),
  getCategories: (params = {}) => request(`/categories?${new URLSearchParams(params)}`),
  getArticles: (params = {}) => request(`/articles?${new URLSearchParams(params)}`),
  getArticle: (slug) => request(`/articles/${slug}`),
  getVideos: (params = {}) => request(`/videos?${new URLSearchParams(params)}`),
  getVideo: (slug) => request(`/videos/${slug}`),
  getFeedItems: (params = {}) => request(`/feeds/items?${new URLSearchParams(params)}`),
  getTags: (params = {}) => request(`/tags?${new URLSearchParams(params)}`),
  subscribeNewsletter: (email) => request('/newsletter', { method: 'POST', body: JSON.stringify({ email }) }),
  unsubscribeNewsletter: (email) => request('/newsletter', { method: 'DELETE', body: JSON.stringify({ email }) }),
  adminGetNewsletterSubscribers: () => request('/newsletter/admin/all'),
  adminDeleteNewsletterSubscriber: (id) => request(`/newsletter/admin/${id}`, { method: 'DELETE' }),
  getNewsletterCount: () => request('/newsletter/count'),
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  verifyTwoFactorLogin: (tempToken, code) =>
    request('/auth/2fa/verify-login', { method: 'POST', body: JSON.stringify({ tempToken, code }) }),
  startTwoFactorSetup: () => request('/auth/2fa/setup/start', { method: 'POST' }),
  confirmTwoFactorSetup: (code) => request('/auth/2fa/setup/confirm', { method: 'POST', body: JSON.stringify({ code }) }),
  disableTwoFactor: (password) => request('/auth/2fa/disable', { method: 'POST', body: JSON.stringify({ password }) }),
  getSecurityOverview: () => request('/admin/security-overview'),
  getUsers: () => request('/users'),
  createUser: (data) => request('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id, data) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id) => request(`/users/${id}`, { method: 'DELETE' }),
  getUserSessions: (id) => request(`/users/${id}/sessions`),
  forceLogout: (id) => request(`/users/${id}/force-logout`, { method: 'POST' }),
  startDeveloperAccess: (id) => request(`/users/${id}/developer-access/start`, { method: 'POST' }),
  confirmDeveloperAccess: (id, code) =>
    request(`/users/${id}/developer-access/confirm`, { method: 'POST', body: JSON.stringify({ code }) }),
  suspendUser: (id) => request(`/users/${id}/suspend`, { method: 'POST' }),
  startBanUser: (id) => request(`/users/${id}/ban/start`, { method: 'POST' }),
  confirmBanUser: (id, code) => request(`/users/${id}/ban/confirm`, { method: 'POST', body: JSON.stringify({ code }) }),
  startUnbanUser: (id) => request(`/users/${id}/unban/start`, { method: 'POST' }),
  confirmUnbanUser: (id, code) => request(`/users/${id}/unban/confirm`, { method: 'POST', body: JSON.stringify({ code }) }),
  startImpersonate: (id) => request(`/users/${id}/impersonate/start`, { method: 'POST' }),
  confirmImpersonate: (id, code) =>
    request(`/users/${id}/impersonate/confirm`, { method: 'POST', body: JSON.stringify({ code }) }),
  adminGetArticles: (params = {}) => request(`/articles/admin/all?${new URLSearchParams(params)}`),
  adminGetArticle: (id) => request(`/articles/admin/${id}`),
  createArticle: (data) => request('/articles', { method: 'POST', body: JSON.stringify(data) }),
  updateArticle: (id, data) => request(`/articles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateArticleTranslation: (id, lang, data) =>
    request(`/articles/${id}/translations/${lang}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteArticleTranslation: (id, lang) =>
    request(`/articles/${id}/translations/${lang}`, { method: 'DELETE' }),
  deleteArticle: (id) => request(`/articles/${id}`, { method: 'DELETE' }),
  adminGetVideos: () => request('/videos/admin/all'),
  adminGetVideo: (id) => request(`/videos/admin/${id}`),
  createVideo: (data) => request('/videos', { method: 'POST', body: JSON.stringify(data) }),
  updateVideo: (id, data) => request(`/videos/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateVideoTranslation: (id, lang, data) =>
    request(`/videos/${id}/translations/${lang}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteVideoTranslation: (id, lang) =>
    request(`/videos/${id}/translations/${lang}`, { method: 'DELETE' }),
  deleteVideo: (id) => request(`/videos/${id}`, { method: 'DELETE' }),
  getFeedSources: () => request('/feeds/sources'),
  createFeedSource: (data) => request('/feeds/sources', { method: 'POST', body: JSON.stringify(data) }),
  deleteFeedSource: (id) => request(`/feeds/sources/${id}`, { method: 'DELETE' }),
  refreshFeeds: () => request('/feeds/refresh', { method: 'POST' }),
  getLive: (slug = 'main') => request(`/live/${slug}`),
  updateLive: (data, slug = 'main') => request(`/live/${slug}`, { method: 'PUT', body: JSON.stringify(data) }),
  adminGetLiveStreams: () => request('/live/admin/all'),
  getTvSchedule: () => request('/tv/schedule'),
  createTvSlot: (data) => request('/tv/schedule', { method: 'POST', body: JSON.stringify(data) }),
  deleteTvSlot: (id) => request(`/tv/schedule/${id}`, { method: 'DELETE' }),
  getAnalytics: () => request('/analytics'),
  getMedia: () => request('/media'),
  getPartners: () => request('/partners'),
  adminGetPartners: () => request('/partners/admin/all'),
  createPartner: (data) => request('/partners', { method: 'POST', body: JSON.stringify(data) }),
  updatePartner: (id, data) => request(`/partners/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePartner: (id) => request(`/partners/${id}`, { method: 'DELETE' }),
  getShows: () => request('/shows'),
  adminGetShows: () => request('/shows/admin/all'),
  createShow: (data) => request('/shows', { method: 'POST', body: JSON.stringify(data) }),
  updateShow: (id, data) => request(`/shows/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteShow: (id) => request(`/shows/${id}`, { method: 'DELETE' }),
  getAnnouncements: () => request('/announcements'),
  adminGetAnnouncements: () => request('/announcements/admin/all'),
  createAnnouncement: (data) => request('/announcements', { method: 'POST', body: JSON.stringify(data) }),
  updateAnnouncement: (id, data) => request(`/announcements/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAnnouncement: (id) => request(`/announcements/${id}`, { method: 'DELETE' }),
  getSettings: () => request('/settings'),
  updateSettings: (data) => request('/settings', { method: 'PUT', body: JSON.stringify(data) }),
  getActivityLogs: (q) => request(`/admin/activity-logs${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  getLogsOverview: (q) => request(`/admin/logs-overview${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  reportClientError: (payload) =>
    fetch(`${API_URL}/logs/client-error`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {}),
  getSystemStatus: () => request('/admin/system-status'),
  getApiOverview: () => request('/admin/api-overview'),
  getDatabaseOverview: () => request('/admin/database-overview'),
  getMediaOverview: () => request('/admin/media-overview'),
  checkMediaLinks: () => request('/admin/media-overview/check-links', { method: 'POST' }),
  getDeploymentOverview: () => request('/admin/deployment-overview'),
  getConfigOverview: () => request('/admin/config-overview'),
  getMaintenanceOverview: () => request('/admin/maintenance-overview'),
  checkServicesNow: () => request('/admin/maintenance/check-services', { method: 'POST' }),
  resetMetrics: () => request('/admin/maintenance/reset-metrics', { method: 'POST' }),
  startEnableMaintenance: () => request('/admin/maintenance/enable/start', { method: 'POST' }),
  confirmEnableMaintenance: (code, message) =>
    request('/admin/maintenance/enable/confirm', { method: 'POST', body: JSON.stringify({ code, message }) }),
  runIntegrityCheck: () => request('/admin/database-overview/integrity-check', { method: 'POST' }),
  startDatabaseRestore: (backup) =>
    request('/admin/database-overview/restore/start', { method: 'POST', body: JSON.stringify({ backup }) }),
  confirmDatabaseRestore: (code) =>
    request('/admin/database-overview/restore/confirm', { method: 'POST', body: JSON.stringify({ code }) }),
  triggerBackup: () => request('/admin/backup', { method: 'POST' }),
  changePassword: (currentPassword, newPassword) =>
    request('/auth/password', { method: 'PUT', body: JSON.stringify({ currentPassword, newPassword }) }),
  submitContactMessage: (data) => request('/contact', { method: 'POST', body: JSON.stringify(data) }),
  adminGetContactMessages: () => request('/contact/admin/all'),
  markContactMessageRead: (id) => request(`/contact/admin/${id}/read`, { method: 'PUT' }),
  deleteContactMessage: (id) => request(`/contact/admin/${id}`, { method: 'DELETE' }),
};
