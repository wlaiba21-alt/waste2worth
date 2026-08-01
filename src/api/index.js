import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5001/api',
  withCredentials: true,
  timeout: 60000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('waste2worth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRedirecting = false;
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status !== 401) {
      if (error.code === 'ERR_NETWORK') {
        console.error('❌ [API ERROR] Network error - please check your internet connection', {
          url: error.config?.baseURL + error.config?.url,
        });
      } else {
        console.error('❌ [API ERROR]', {
          url: error.config?.baseURL + error.config?.url,
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        });
      }
    }
    if (error.response?.status === 401 && window.location.pathname !== '/login' && !isRedirecting) {
      isRedirecting = true;
      window.location.href = '/login';
      setTimeout(() => { isRedirecting = false; }, 1000);
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  updateProfile: (data) => api.patch('/auth/profile', data),
  changePassword: (data) => api.post('/auth/change-password', data),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post('/auth/reset-password', { token, password }),
  setRole: (role) => api.patch('/auth/role', { role }),
  googleLogin: (credential, options = {}) => api.post('/auth/google', { credential, ...options }),
};

export const requestApi = {
  create: (data) => api.post('/requests', data),
  all: () => api.get('/requests'),
  my: () => api.get('/requests/my'),
  incoming: () => api.get('/requests/incoming'),
  get: (id) => api.get(`/requests/${id}`),
  update: (id, data) => api.patch(`/requests/${id}`, data),
  vendorAction: (id, action) => api.patch(`/requests/${id}/vendor-action`, { action }),
  adminAction: (id, action) => api.patch(`/requests/${id}/admin-action`, { action }),
  assignRider: (id, riderId) => api.patch(`/requests/${id}/assign-rider`, { riderId }),
  riderAction: (id, action) => api.patch(`/requests/${id}/rider-action`, { action }),
  riderAssigned: () => api.get('/requests/rider/assigned'),
  riderPickupStatus: (id, status) => api.patch(`/requests/${id}/rider-pickup-status`, { status }),
  riderReturnStatus: (id, status) => api.patch(`/requests/${id}/rider-return-status`, { status }),
  uploadImage: (requestId, formData) => api.post(`/requests/${requestId}/images`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  cancel: (id) => api.patch(`/requests/${id}/cancel`),
  postRecyclingChoice: (id, data) => api.patch(`/requests/${id}/post-recycling-choice`, data),
  assignReturnRider: (id, riderId) => api.patch(`/requests/${id}/assign-return-rider`, { riderId }),
  updateRecyclingProgress: (id, data) => api.patch(`/requests/${id}/recycling-progress`, data),
  returnAction: (id, data) => api.patch(`/requests/${id}/return-action`, data),
};

export const vendorApi = {
  profile: () => api.get('/vendors/me'),
  updateProfile: (data) =>
    data instanceof FormData
      ? api.patch('/vendors/profile', data, { headers: { 'Content-Type': 'multipart/form-data' } })
      : api.patch('/vendors/profile', data),
  list: () => api.get('/vendors'),
  get: (id) => api.get(`/vendors/${id}`),
  updateAvailability: (availabilityStatus) => api.patch('/vendors/availability', { availabilityStatus }),
  addPortfolio: (formData) => api.post('/vendors/portfolio', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deletePortfolio: (index) => api.delete(`/vendors/portfolio/${index}`),
};

export const riderApi = {
  profile: () => api.get('/rider/profile'),
  updateAvailability: (availabilityStatus) => api.patch('/rider/availability', { availabilityStatus }),
  updateProfile: (data) =>
    data instanceof FormData
      ? api.patch('/rider/profile', data, { headers: { 'Content-Type': 'multipart/form-data' } })
      : api.patch('/rider/profile', data),
  list: () => api.get('/rider/list'),
  // NEW: Unified endpoint to fetch both recycling pickups and store deliveries as a single merged task list
  tasks: () => api.get('/rider/tasks'),
};

export const storeApi = {
  list: (params) => api.get('/store', { params }),
  product: (id) => api.get(`/store/products/${id}`),
  vendorProducts: (vendorId) => api.get(`/store/vendor/${vendorId}/products`),
  createCheckoutSession: (data) => api.post('/store/create-checkout-session', data),
  confirmCheckoutSession: (data) => api.post('/store/confirm-checkout-session', data),
  awaitingChoice: () => api.get('/store/awaiting-choice'),
  makeChoice: (id, data) => api.patch(`/store/products/${id}/choice`, data),
  createPaymentIntent: (data) => api.post('/store/create-payment-intent', data),
  confirmOrderPayment: (data) => api.post('/store/confirm-payment', data),
  purchase: (data) => api.post('/store/purchase', data),
  updateProduct: (id, data) => api.patch(`/store/products/${id}`, data),
  deleteProduct: (id) => api.delete(`/store/products/${id}`),
  myProducts: () => api.get('/store/my-products'),
  createFromRequest: (requestId, formData) => 
    api.post(`/store/products/from-request/${requestId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
};

export const productApi = {
  list: () => api.get('/products'),
  get: (id) => api.get(`/products/${id}`),
  create: (formData) => api.post('/products', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  update: (id, data) => api.patch(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  chooseProduct: (requestId, productId, choice) =>
    api.patch(`/requests/${requestId}/product-choice`, { productId, choice }),
};

export const orderApi = {
  my: () => api.get('/orders/my'),
  sales: () => api.get('/orders/sales'),
  vendorOrders: () => api.get('/orders/vendor/orders'),
  earnings: () => api.get('/orders/earnings'),
  all: () => api.get('/orders/all'),
  processOrder: (id) => api.patch(`/orders/${id}/process`),
  assignRider: (id, riderId) => api.patch(`/orders/${id}/assign-rider`, { riderId }),
  deliver: (id) => api.patch(`/orders/${id}/deliver`),
  cancelOrder: (id) => api.patch(`/orders/${id}/cancel`),
  confirmCod: (id) => api.patch(`/orders/${id}/confirm-cod`),
  riderOrders: () => api.get('/orders/rider/orders'),
  outForDelivery: (id) => api.patch(`/orders/${id}/out-for-delivery`),
};

export const chatApi = {
  threads: () => api.get('/chat/threads'),
  createThread: (data) => api.post('/chat/threads', data),
  messages: (threadId) => api.get(`/chat/threads/${threadId}/messages`),
  sendMessage: (threadId, text) =>
    api.post(`/chat/threads/${threadId}/messages`, { text }),
  markAsRead: (threadId) => api.patch(`/chat/threads/${threadId}/read`),
  getOrCreateWithUser: (userId) => api.post('/chat/threads/with-user', { userId }),
};

export const walletApi = {
  get: () => api.get('/wallet'),
  transactions: () => api.get('/wallet/transactions'),
  topup: (amount) => api.post('/wallet/topup', { amount }),
  createPaymentIntent: (amount) => api.post('/wallet/create-payment-intent', { amount }),
  confirmPayment: (paymentIntentId) => api.post('/wallet/confirm-payment', { paymentIntentId }),
  createCheckoutSession: (amount) => api.post('/wallet/create-checkout-session', { amount }),
  confirmCheckoutSession: (sessionId) => api.post('/wallet/confirm-checkout-session', { sessionId }),
};

export const aiApi = {
  detect: (formData) => api.post('/ai/detect', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  chat: (message) => api.post('/ai/chat', { message }),
};

export const notificationApi = {
  list: () => api.get('/notifications'),
  read: (id) => api.patch(`/notifications/${id}/read`),
  readAll: () => api.patch('/notifications/read-all'),
};

export const addressApi = {
  list: () => api.get('/addresses'),
  create: (data) => api.post('/addresses', data),
  update: (id, data) => api.patch(`/addresses/${id}`, data),
  remove: (id) => api.delete(`/addresses/${id}`),
};

export const reviewApi = {
  pending: () => api.get('/reviews/pending'),
  my: () => api.get('/reviews/my'),
  create: (data) => api.post('/reviews', data),
  vendor: (vendorId) => api.get(`/reviews/vendor/${vendorId}`),
  product: (productId) => api.get(`/reviews/product/${productId}`),
  reply: (id, reply) => api.patch(`/reviews/${id}/reply`, { reply }),
  edit: (id, data) => api.patch(`/reviews/${id}`, data),
};

export const adminApi = {
  stats: () => api.get('/admin/stats'),
  users: () => api.get('/admin/users'),
  vendors: () => api.get('/admin/vendors'),
  riders: () => api.get('/admin/riders'),
  analytics: () => api.get('/admin/analytics'),
  products: () => api.get('/admin/products'),
  requests: () => api.get('/requests/all'),
  orders: () => api.get('/admin/orders'),
  updateUserStatus: (id, status) => api.patch(`/admin/users/${id}/status`, { status }),
  createRider: (data) => api.post('/admin/riders', data),
  deleteRider: (id) => api.delete(`/admin/riders/${id}`),
};


export default api;