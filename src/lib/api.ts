const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

let authToken: string | null = localStorage.getItem('auth_token');

export function setAuthToken(token: string | null) {
  authToken = token;
  if (token) {
    localStorage.setItem('auth_token', token);
  } else {
    localStorage.removeItem('auth_token');
  }
}

export function getAuthToken() {
  return authToken;
}

async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// Auth API
export const authAPI = {
  login: async (email: string, password: string) => {
    const data = await fetchAPI('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setAuthToken(data.token);
    return data;
  },
  changePassword: (currentPassword: string, newPassword: string) =>
    fetchAPI('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  register: async (userData: any) => {
    const data = await fetchAPI('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    setAuthToken(data.token);
    return data;
  },

  logout: () => {
    setAuthToken(null);
  },
};

// Users API
export const usersAPI = {
  getAll: () => fetchAPI('/users'),
  getById: (id: string) => fetchAPI(`/users/${id}`),
  update: (id: string, data: any) => fetchAPI(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => fetchAPI(`/users/${id}`, { method: 'DELETE' }),
};

// Customers API
export const customersAPI = {
  getAll: () => fetchAPI('/customers'),
  getById: (id: string) => fetchAPI(`/customers/${id}`),
  create: (data: any) => fetchAPI('/customers', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: any) => fetchAPI(`/customers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => fetchAPI(`/customers/${id}`, { method: 'DELETE' }),
};

// Orders API
export const ordersAPI = {
  getAll: () => fetchAPI('/orders'),
  getById: (id: string) => fetchAPI(`/orders/${id}`),
  create: (data: any) => fetchAPI('/orders', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: any) => fetchAPI(`/orders/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => fetchAPI(`/orders/${id}`, { method: 'DELETE' }),
};

// Payments API
export const paymentsAPI = {
  getAll: () => fetchAPI('/payments'),
  getByOrderId: (orderId: string) => fetchAPI(`/payments/order/${orderId}`),
  create: (data: any) => fetchAPI('/payments', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: any) => fetchAPI(`/payments/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => fetchAPI(`/payments/${id}`, { method: 'DELETE' }),
};

// Installments API
export const installmentsAPI = {
  getAll: () => fetchAPI('/installments'),
  getByOrderId: (orderId: string) => fetchAPI(`/installments/order/${orderId}`),
  create: (data: any) => fetchAPI('/installments', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: any) => fetchAPI(`/installments/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => fetchAPI(`/installments/${id}`, { method: 'DELETE' }),
};

// Expenses API
export const expensesAPI = {
  getAll: () => fetchAPI('/expenses'),
  getCategories: () => fetchAPI('/expenses/categories'),
  create: (data: any) => fetchAPI('/expenses', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: any) => fetchAPI(`/expenses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => fetchAPI(`/expenses/${id}`, { method: 'DELETE' }),
};

// Exchange Rates API
export const exchangeRatesAPI = {
  getAll: () => fetchAPI('/exchange-rates'),
  getCurrent: () => fetchAPI('/exchange-rates/current'),
  create: (data: any) => fetchAPI('/exchange-rates', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: any) => fetchAPI(`/exchange-rates/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
};


// Lock Sessions API
export const lockSessionsAPI = {
  getAll: () => fetchAPI('/lock-sessions'),
  getCurrent: () => fetchAPI('/lock-sessions/current'),
  getTransactions: (sessionId: string) => fetchAPI(`/lock-sessions/${sessionId}/transactions`),
  create: (data: any) => fetchAPI('/lock-sessions', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  close: (id: string, data: any) => fetchAPI(`/lock-sessions/${id}/close`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  addTransaction: (sessionId: string, data: any) => fetchAPI(`/lock-sessions/${sessionId}/transactions`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
};

// Reports API
export const reportsAPI = {
  getDashboard: (startDate: string, endDate: string) =>
    fetchAPI(`/reports/dashboard?startDate=${startDate}&endDate=${endDate}`),
  getSales: (startDate: string, endDate: string, groupBy: string = 'day') =>
    fetchAPI(`/reports/sales?startDate=${startDate}&endDate=${endDate}&groupBy=${groupBy}`),
  getCollections: (startDate: string, endDate: string) =>
    fetchAPI(`/reports/collections?startDate=${startDate}&endDate=${endDate}`),
  getExpenses: (startDate: string, endDate: string) =>
    fetchAPI(`/reports/expenses?startDate=${startDate}&endDate=${endDate}`),
  getCustomers: () => fetchAPI('/reports/customers'),
  getInstallments: () => fetchAPI('/reports/installments'),
};

// Audit API
export const auditAPI = {
  getAll: (params?: { limit?: number; offset?: number; tableName?: string; action?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return fetchAPI(`/audit${query ? `?${query}` : ''}`);
  },
  getByRecord: (tableName: string, recordId: string) =>
    fetchAPI(`/audit/record/${tableName}/${recordId}`),
  
};

