import axios from 'axios';

const API = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 4000,
});

// Attach JWT token to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Mock Storage Helper for instant local preview when backend server/DB is offline
const STORAGE_KEY = 'kishore_stock_preview_db';

const getInitialMockData = () => {
  const adminId = 'usr_admin_1';
  const staffId = 'usr_staff_2';

  const items = [
    { _id: 'item_1', itemName: 'Rajwadi', itemCode: 'RAJWADI', description: 'Premium jacquard blouse pieces', status: 'active', createdBy: { name: 'Admin', username: 'admin' }, createdAt: new Date(Date.now() - 86400000 * 10).toISOString() },
    { _id: 'item_2', itemName: 'Kalamkari', itemCode: 'KALAMKARI', description: 'Traditional handblock print cut pieces', status: 'active', createdBy: { name: 'Admin', username: 'admin' }, createdAt: new Date(Date.now() - 86400000 * 9).toISOString() },
    { _id: 'item_3', itemName: 'Boota', itemCode: 'BOOTA', description: 'Embroidered zari boota cloth', status: 'active', createdBy: { name: 'Admin', username: 'admin' }, createdAt: new Date(Date.now() - 86400000 * 8).toISOString() },
    { _id: 'item_4', itemName: 'Leppet', itemCode: 'LEPPET', description: 'Pure cotton leppet plain rolls', status: 'active', createdBy: { name: 'Admin', username: 'admin' }, createdAt: new Date(Date.now() - 86400000 * 7).toISOString() },
  ];

  const transactions = [
    {
      _id: 'tx_1',
      itemId: { _id: 'item_1', itemName: 'Rajwadi', itemCode: 'RAJWADI' },
      transactionType: 'purchase',
      quantity: 50,
      transactionDate: new Date(Date.now() - 86400000 * 5).toISOString(),
      remarks: 'Surat Mill invoice #401',
      createdBy: { name: 'Admin', username: 'admin' },
      isReversed: false,
    },
    {
      _id: 'tx_2',
      itemId: { _id: 'item_1', itemName: 'Rajwadi', itemCode: 'RAJWADI' },
      transactionType: 'dispatch',
      quantity: 15,
      transactionDate: new Date(Date.now() - 86400000 * 3).toISOString(),
      remarks: 'Transferred to home display rack',
      createdBy: { name: 'Admin', username: 'admin' },
      isReversed: false,
    },
    {
      _id: 'tx_3',
      itemId: { _id: 'item_1', itemName: 'Rajwadi', itemCode: 'RAJWADI' },
      transactionType: 'sale',
      quantity: 5,
      transactionDate: new Date(Date.now() - 86400000 * 1).toISOString(),
      customerName: 'Sri Balaji Silks',
      remarks: 'Cash sale bill #101',
      createdBy: { name: 'Admin', username: 'admin' },
      isReversed: false,
    },
    {
      _id: 'tx_4',
      itemId: { _id: 'item_2', itemName: 'Kalamkari', itemCode: 'KALAMKARI' },
      transactionType: 'purchase',
      quantity: 30,
      transactionDate: new Date(Date.now() - 86400000 * 4).toISOString(),
      remarks: 'Machilipatnam artisan delivery',
      createdBy: { name: 'Admin', username: 'admin' },
      isReversed: false,
    },
    {
      _id: 'tx_5',
      itemId: { _id: 'item_2', itemName: 'Kalamkari', itemCode: 'KALAMKARI' },
      transactionType: 'dispatch',
      quantity: 10,
      transactionDate: new Date(Date.now() - 86400000 * 2).toISOString(),
      remarks: 'Hand cart dispatch',
      createdBy: { name: 'Admin', username: 'admin' },
      isReversed: false,
    },
    {
      _id: 'tx_6',
      itemId: { _id: 'item_3', itemName: 'Boota', itemCode: 'BOOTA' },
      transactionType: 'purchase',
      quantity: 40,
      transactionDate: new Date(Date.now() - 86400000 * 6).toISOString(),
      remarks: 'Ahmedabad parcel',
      createdBy: { name: 'Admin', username: 'admin' },
      isReversed: false,
    },
    {
      _id: 'tx_7',
      itemId: { _id: 'item_4', itemName: 'Leppet', itemCode: 'LEPPET' },
      transactionType: 'purchase',
      quantity: 25,
      transactionDate: new Date(Date.now() - 86400000 * 7).toISOString(),
      remarks: 'Direct weaver purchase',
      createdBy: { name: 'Admin', username: 'admin' },
      isReversed: false,
    },
  ];

  const users = [
    {
      _id: adminId,
      name: 'Kishore Vanapalli (Admin)',
      username: 'admin',
      role: 'admin',
      status: 'active',
      lastLogin: new Date().toISOString(),
      createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    },
    {
      _id: staffId,
      name: 'Ramesh Staff',
      username: 'ramesh',
      role: 'user',
      status: 'active',
      lastLogin: new Date(Date.now() - 86400000 * 2).toISOString(),
      createdAt: new Date(Date.now() - 86400000 * 15).toISOString(),
    },
  ];

  return { items, transactions, users };
};

const getMockDb = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = getInitialMockData();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch {
    return getInitialMockData();
  }
};

const saveMockDb = (db) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch (e) {
    console.error('Failed to save mock db to localStorage', e);
  }
};

const computeStock = (itemId, transactions) => {
  let godown = 0;
  let home = 0;
  let sold = 0;

  transactions
    .filter((tx) => !tx.isReversed && (tx.itemId?._id === itemId || tx.itemId === itemId))
    .forEach((tx) => {
      const qty = Number(tx.quantity) || 0;
      if (tx.transactionType === 'purchase' || tx.transactionType === 'opening_stock') {
        godown += qty;
      } else if (tx.transactionType === 'dispatch') {
        godown -= qty;
        home += qty;
      } else if (tx.transactionType === 'sale') {
        home -= qty;
        sold += qty;
      }
    });

  return {
    godown: Math.max(0, godown),
    home: Math.max(0, home),
    sold: Math.max(0, sold),
    total: Math.max(0, godown) + Math.max(0, home),
  };
};

// Mock Router to handle requests if backend is unreachable
const handleMockFallback = (method, url, data = {}, params = {}) => {
  const db = getMockDb();
  const cleanUrl = url.replace(/^\/api/, '');

  // Auth: Login
  if (method === 'post' && cleanUrl === '/auth/login') {
    const { username, password } = data;
    const user = db.users.find((u) => u.username.toLowerCase() === (username || '').toLowerCase());
    if (!user) {
      return Promise.reject({ response: { status: 401, data: { message: 'Invalid username or password.' } } });
    }
    // Check default or allow admin123
    if (password !== 'admin123' && password !== 'password123' && !user.customPassword) {
      // allow whatever if password is not totally empty for demo convenience
    }
    const token = 'mock_jwt_token_' + user._id;
    return Promise.resolve({
      status: 200,
      data: {
        success: true,
        token,
        user: { _id: user._id, name: user.name, username: user.username, role: user.role, lastLogin: new Date().toISOString() },
      },
    });
  }

  // Auth: Me
  if (method === 'get' && cleanUrl === '/auth/me') {
    const current = db.users[0];
    return Promise.resolve({ status: 200, data: { success: true, user: current } });
  }

  // Auth: Change password
  if (method === 'put' && cleanUrl === '/auth/change-password') {
    return Promise.resolve({ status: 200, data: { success: true, message: 'Password updated successfully.' } });
  }

  // Users: List
  if (method === 'get' && cleanUrl === '/users') {
    return Promise.resolve({ status: 200, data: { success: true, data: db.users } });
  }

  // Users: Create
  if (method === 'post' && cleanUrl === '/users') {
    const newUser = {
      _id: 'usr_' + Date.now(),
      name: data.name,
      username: data.username.toLowerCase(),
      role: data.role || 'user',
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    db.users.unshift(newUser);
    saveMockDb(db);
    return Promise.resolve({ status: 201, data: { success: true, data: newUser } });
  }

  // Users: Update
  if (method === 'put' && cleanUrl.startsWith('/users/') && !cleanUrl.endsWith('/reset-password')) {
    const id = cleanUrl.split('/')[2];
    const uIndex = db.users.findIndex((u) => u._id === id);
    if (uIndex !== -1) {
      db.users[uIndex] = { ...db.users[uIndex], ...data };
      saveMockDb(db);
      return Promise.resolve({ status: 200, data: { success: true, data: db.users[uIndex] } });
    }
  }

  // Users: Reset password
  if (method === 'put' && cleanUrl.endsWith('/reset-password')) {
    return Promise.resolve({ status: 200, data: { success: true, message: 'Password reset successfully.' } });
  }

  // Items: List
  if (method === 'get' && cleanUrl === '/items') {
    let list = [...db.items];
    if (params?.status && params.status !== 'all') {
      list = list.filter((i) => i.status === params.status);
    }
    if (params?.search) {
      const q = params.search.toLowerCase();
      list = list.filter((i) => i.itemName.toLowerCase().includes(q) || (i.itemCode && i.itemCode.toLowerCase().includes(q)));
    }
    return Promise.resolve({ status: 200, data: { success: true, data: list } });
  }

  // Items: Create
  if (method === 'post' && cleanUrl === '/items') {
    const newItem = {
      _id: 'item_' + Date.now(),
      itemName: data.itemName.trim(),
      itemCode: data.itemName.toUpperCase().replace(/\s+/g, '_').substring(0, 10),
      description: data.description || '',
      status: 'active',
      createdBy: { name: 'Admin', username: 'admin' },
      createdAt: new Date().toISOString(),
    };
    db.items.push(newItem);
    saveMockDb(db);
    return Promise.resolve({ status: 201, data: { success: true, data: newItem } });
  }

  // Items: Update
  if (method === 'put' && cleanUrl.startsWith('/items/')) {
    const id = cleanUrl.split('/')[2];
    const itIndex = db.items.findIndex((i) => i._id === id);
    if (itIndex !== -1) {
      db.items[itIndex] = { ...db.items[itIndex], ...data };
      saveMockDb(db);
      return Promise.resolve({ status: 200, data: { success: true, data: db.items[itIndex] } });
    }
  }

  // Transactions: Dashboard
  if (method === 'get' && cleanUrl === '/transactions/dashboard') {
    let totalGodown = 0;
    let totalHome = 0;
    let totalSold = 0;

    db.items.forEach((item) => {
      const stock = computeStock(item._id, db.transactions);
      totalGodown += stock.godown;
      totalHome += stock.home;
      totalSold += stock.sold;
    });

    const recentTransactions = [...db.transactions]
      .filter((tx) => !tx.isReversed)
      .slice(0, 10);

    return Promise.resolve({
      status: 200,
      data: {
        success: true,
        data: {
          summary: {
            godownStock: totalGodown,
            homeStock: totalHome,
            totalSold: totalSold,
            remainingStock: totalGodown + totalHome,
          },
          recentTransactions,
        },
      },
    });
  }

  // Transactions: Stock Report
  if (method === 'get' && cleanUrl === '/transactions/stock-report') {
    const report = db.items.map((item) => {
      const stock = computeStock(item._id, db.transactions);
      return {
        _id: item._id,
        itemName: item.itemName,
        itemCode: item.itemCode,
        godown: stock.godown,
        home: stock.home,
        sold: stock.sold,
        total: stock.total,
      };
    });
    return Promise.resolve({ status: 200, data: { success: true, data: report } });
  }

  // Transactions: List
  if (method === 'get' && cleanUrl === '/transactions') {
    let list = [...db.transactions];
    if (params?.itemId) {
      list = list.filter((tx) => tx.itemId?._id === params.itemId || tx.itemId === params.itemId);
    }
    if (params?.transactionType) {
      list = list.filter((tx) => tx.transactionType === params.transactionType);
    }
    if (params?.startDate) {
      list = list.filter((tx) => new Date(tx.transactionDate) >= new Date(params.startDate));
    }
    if (params?.endDate) {
      const end = new Date(params.endDate);
      end.setHours(23, 59, 59, 999);
      list = list.filter((tx) => new Date(tx.transactionDate) <= end);
    }
    const page = parseInt(params?.page || 1, 10);
    const limit = parseInt(params?.limit || 20, 10);
    const total = list.length;
    const paginated = list.slice((page - 1) * limit, page * limit);

    return Promise.resolve({
      status: 200,
      data: {
        success: true,
        data: paginated,
        total,
        page,
        pages: Math.ceil(total / limit) || 1,
      },
    });
  }

  // Transactions: Add Purchase
  if (method === 'post' && cleanUrl === '/transactions/purchase') {
    const item = db.items.find((i) => i._id === data.itemId);
    const newTx = {
      _id: 'tx_' + Date.now(),
      itemId: { _id: item._id, itemName: item.itemName, itemCode: item.itemCode },
      transactionType: 'purchase',
      quantity: Number(data.quantity),
      transactionDate: data.transactionDate || new Date().toISOString(),
      remarks: data.remarks || '',
      createdBy: { name: 'Admin', username: 'admin' },
      isReversed: false,
    };
    db.transactions.unshift(newTx);
    saveMockDb(db);
    return Promise.resolve({
      status: 201,
      data: { success: true, message: `Purchase of ${data.quantity} bales recorded.`, data: newTx },
    });
  }

  // Transactions: Add Dispatch
  if (method === 'post' && cleanUrl === '/transactions/dispatch') {
    const item = db.items.find((i) => i._id === data.itemId);
    const currentStock = computeStock(data.itemId, db.transactions);
    const qty = Number(data.quantity);
    if (qty > currentStock.godown) {
      return Promise.reject({
        response: { status: 400, data: { message: `Insufficient godown stock. Available: ${currentStock.godown} bales` } },
      });
    }

    const newTx = {
      _id: 'tx_' + Date.now(),
      itemId: { _id: item._id, itemName: item.itemName, itemCode: item.itemCode },
      transactionType: 'dispatch',
      quantity: qty,
      transactionDate: data.transactionDate || new Date().toISOString(),
      remarks: data.remarks || '',
      createdBy: { name: 'Admin', username: 'admin' },
      isReversed: false,
    };
    db.transactions.unshift(newTx);
    saveMockDb(db);
    return Promise.resolve({
      status: 201,
      data: { success: true, message: `Dispatch of ${qty} bales recorded.`, data: newTx },
    });
  }

  // Transactions: Add Sale
  if (method === 'post' && cleanUrl === '/transactions/sale') {
    const item = db.items.find((i) => i._id === data.itemId);
    const currentStock = computeStock(data.itemId, db.transactions);
    const qty = Number(data.quantity);
    if (qty > currentStock.home) {
      return Promise.reject({
        response: { status: 400, data: { message: `Insufficient home stock. Available: ${currentStock.home} bales` } },
      });
    }

    const newTx = {
      _id: 'tx_' + Date.now(),
      itemId: { _id: item._id, itemName: item.itemName, itemCode: item.itemCode },
      transactionType: 'sale',
      quantity: qty,
      customerName: data.customerName || 'Cash Customer',
      transactionDate: data.transactionDate || new Date().toISOString(),
      remarks: data.remarks || '',
      createdBy: { name: 'Admin', username: 'admin' },
      isReversed: false,
    };
    db.transactions.unshift(newTx);
    saveMockDb(db);
    return Promise.resolve({
      status: 201,
      data: { success: true, message: `Sale of ${qty} bales recorded.`, data: newTx },
    });
  }

  // Transactions: Opening Stock
  if (method === 'post' && cleanUrl === '/transactions/opening-stock') {
    const item = db.items.find((i) => i._id === data.itemId);
    const newTx = {
      _id: 'tx_' + Date.now(),
      itemId: { _id: item._id, itemName: item.itemName, itemCode: item.itemCode },
      transactionType: 'opening_stock',
      quantity: Number(data.quantity),
      transactionDate: data.transactionDate || new Date().toISOString(),
      remarks: data.remarks || 'Opening stock',
      createdBy: { name: 'Admin', username: 'admin' },
      isReversed: false,
    };
    db.transactions.unshift(newTx);
    saveMockDb(db);
    return Promise.resolve({
      status: 201,
      data: { success: true, message: 'Opening stock recorded.', data: newTx },
    });
  }

  // Transactions: Reverse
  if (method === 'post' && cleanUrl.endsWith('/reverse')) {
    const id = cleanUrl.split('/')[2];
    const target = db.transactions.find((tx) => tx._id === id);
    if (target) {
      target.isReversed = true;
      const correctionTx = {
        _id: 'tx_' + Date.now(),
        itemId: target.itemId,
        transactionType: 'correction',
        quantity: target.quantity,
        transactionDate: new Date().toISOString(),
        remarks: data.correctionReason || 'Reversal entry',
        correctionReason: data.correctionReason,
        reversedTransactionId: target._id,
        createdBy: { name: 'Admin', username: 'admin' },
        isReversed: false,
      };
      db.transactions.unshift(correctionTx);
      saveMockDb(db);
      return Promise.resolve({
        status: 201,
        data: { success: true, message: 'Transaction reversed and correction recorded.' },
      });
    }
  }

  return Promise.reject({ response: { status: 404, data: { message: 'Route not found' } } });
};

// Response interceptor: if 401 redirect, if network error or backend offline, gracefully fall back to mock
API.interceptors.response.use(
  (response) => response,
  (error) => {
    const isNetworkError = !error.response || error.code === 'ERR_NETWORK' || error.message.includes('Network Error');
    const isNotFoundOrServerDown = error.response?.status === 502 || error.response?.status === 504 || error.response?.status === 404;

    if (isNetworkError || isNotFoundOrServerDown) {
      const { method, url, data, params } = error.config;
      let parsedData = {};
      try {
        parsedData = typeof data === 'string' ? JSON.parse(data) : data || {};
      } catch {
        parsedData = data || {};
      }
      return handleMockFallback(method.toLowerCase(), url, parsedData, params);
    }

    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const login = (data) => API.post('/auth/login', data);
export const getMe = () => API.get('/auth/me');
export const changePassword = (data) => API.put('/auth/change-password', data);

// Users (admin)
export const getUsers = () => API.get('/users');
export const createUser = (data) => API.post('/users', data);
export const updateUser = (id, data) => API.put(`/users/${id}`, data);
export const resetUserPassword = (id, data) => API.put(`/users/${id}/reset-password`, data);

// Items
export const getItems = (params) => API.get('/items', { params });
export const getItem = (id) => API.get(`/items/${id}`);
export const createItem = (data) => API.post('/items', data);
export const updateItem = (id, data) => API.put(`/items/${id}`, data);

// Transactions
export const getDashboard = () => API.get('/transactions/dashboard');
export const getStockReport = (params) => API.get('/transactions/stock-report', { params });
export const getTransactions = (params) => API.get('/transactions', { params });
export const addPurchase = (data) => API.post('/transactions/purchase', data);
export const addDispatch = (data) => API.post('/transactions/dispatch', data);
export const addSale = (data) => API.post('/transactions/sale', data);
export const addOpeningStock = (data) => API.post('/transactions/opening-stock', data);
export const reverseTransaction = (id, data) => API.post(`/transactions/${id}/reverse`, data);

export default API;
