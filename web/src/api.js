const getApiUrl = () => {
  const stored = localStorage.getItem('API_URL');
  if (stored) return stored;
  return import.meta.env.VITE_API_URL || 'http://localhost:5050/api';
};

export const api = {
  // Settings & Auth
  getSettings: async () => {
    const res = await fetch(`${getApiUrl()}/settings`);
    return res.json();
  },
  saveSettings: async (settings) => {
    const res = await fetch(`${getApiUrl()}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    return res.json();
  },
  login: async (pin) => {
    const res = await fetch(`${getApiUrl()}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin })
    });
    return res.json();
  },

  // Categories
  getCategories: async () => {
    const res = await fetch(`${getApiUrl()}/categories`);
    return res.json();
  },
  createCategory: async (name) => {
    const res = await fetch(`${getApiUrl()}/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    return res.json();
  },
  deleteCategory: async (id) => {
    const res = await fetch(`${getApiUrl()}/categories/${id}`, { method: 'DELETE' });
    return res.json();
  },

  // Brands
  getBrands: async () => {
    const res = await fetch(`${getApiUrl()}/brands`);
    return res.json();
  },
  createBrand: async (brand) => {
    const res = await fetch(`${getApiUrl()}/brands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(brand)
    });
    return res.json();
  },
  deleteBrand: async (id) => {
    const res = await fetch(`${getApiUrl()}/brands/${id}`, { method: 'DELETE' });
    return res.json();
  },

  // Products
  getProducts: async () => {
    const res = await fetch(`${getApiUrl()}/products`);
    return res.json();
  },
  createProduct: async (product) => {
    const res = await fetch(`${getApiUrl()}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product)
    });
    return res.json();
  },
  updateProduct: async (id, product) => {
    const res = await fetch(`${getApiUrl()}/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product)
    });
    return res.json();
  },
  deleteProduct: async (id) => {
    const res = await fetch(`${getApiUrl()}/products/${id}`, { method: 'DELETE' });
    return res.json();
  },
  adjustStock: async (id, adjustment) => {
    const res = await fetch(`${getApiUrl()}/products/${id}/stock`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(adjustment)
    });
    return res.json();
  },
  getStockHistory: async () => {
    const res = await fetch(`${getApiUrl()}/stock/history`);
    return res.json();
  },

  // Customers
  getCustomers: async () => {
    const res = await fetch(`${getApiUrl()}/customers`);
    return res.json();
  },
  createCustomer: async (customer) => {
    const res = await fetch(`${getApiUrl()}/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customer)
    });
    return res.json();
  },
  updateCustomer: async (id, customer) => {
    const res = await fetch(`${getApiUrl()}/customers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customer)
    });
    return res.json();
  },
  deleteCustomer: async (id) => {
    const res = await fetch(`${getApiUrl()}/customers/${id}`, { method: 'DELETE' });
    return res.json();
  },
  getCustomerLedger: async (id) => {
    const res = await fetch(`${getApiUrl()}/customers/${id}/ledger`);
    return res.json();
  },

  // Transactions (Daily Supplies)
  getTransactions: async () => {
    const res = await fetch(`${getApiUrl()}/transactions`);
    return res.json();
  },
  createTransaction: async (tx) => {
    const res = await fetch(`${getApiUrl()}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tx)
    });
    return res.json();
  },
  duplicateTransaction: async (id) => {
    const res = await fetch(`${getApiUrl()}/transactions/${id}/duplicate`, { method: 'POST' });
    return res.json();
  },

  // Collections
  getCollections: async () => {
    const res = await fetch(`${getApiUrl()}/collections`);
    return res.json();
  },
  createCollection: async (col) => {
    const res = await fetch(`${getApiUrl()}/collections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(col)
    });
    return res.json();
  },

  // Expenses
  getExpenseCategories: async () => {
    const res = await fetch(`${getApiUrl()}/expenses/categories`);
    return res.json();
  },
  createExpenseCategory: async (name) => {
    const res = await fetch(`${getApiUrl()}/expenses/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    return res.json();
  },
  getExpenses: async () => {
    const res = await fetch(`${getApiUrl()}/expenses`);
    return res.json();
  },
  createExpense: async (exp) => {
    const res = await fetch(`${getApiUrl()}/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(exp)
    });
    return res.json();
  },
  deleteExpense: async (id) => {
    const res = await fetch(`${getApiUrl()}/expenses/${id}`, { method: 'DELETE' });
    return res.json();
  },
  getExpenseStats: async () => {
    const res = await fetch(`${getApiUrl()}/reports/expenses/stats`);
    return res.json();
  },

  // Dashboard Stats
  getDashboardSummary: async () => {
    const res = await fetch(`${getApiUrl()}/dashboard/summary`);
    return res.json();
  },

  // Report URLs (Direct links)
  getInvoicePdfUrl: (txId) => `${getApiUrl()}/reports/invoice/${txId}/pdf`,
  getLedgerPdfUrl: (custId, start = '', end = '') => 
    `${getApiUrl()}/reports/ledger/${custId}/pdf?startDate=${start}&endDate=${end}`,
  getExpensePdfUrl: (start = '', end = '') => 
    `${getApiUrl()}/reports/expenses/pdf?startDate=${start}&endDate=${end}`,
  getExcelUrl: () => `${getApiUrl()}/reports/dashboard/excel`
};
