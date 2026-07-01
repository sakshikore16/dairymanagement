import React, { useState, useEffect } from 'react';
import { api } from './api';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Products from './pages/Products';
import Transactions from './pages/Transactions';
import Collections from './pages/Collections';
import Expenses from './pages/Expenses';
import Settings from './pages/Settings';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [pin, setPin] = useState('');
  const [settings, setSettings] = useState(null);
  
  // Data lists
  const [stats, setStats] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [collections, setCollections] = useState([]);
  const [expenses, setExpenses] = useState([]);

  // Redirect action triggers
  const [triggerCustomerAdd, setTriggerCustomerAdd] = useState(false);
  const [triggerProductAdd, setTriggerProductAdd] = useState(false);
  const [triggerSupplyAdd, setTriggerSupplyAdd] = useState(false);
  const [triggerCollectionAdd, setTriggerCollectionAdd] = useState(false);
  const [triggerExpenseAdd, setTriggerExpenseAdd] = useState(false);

  // Auto Login Flow & Port Migration on Mount
  useEffect(() => {
    // Automatically migrate old localhost:5000 API URL if saved in browser storage
    const storedUrl = localStorage.getItem('API_URL');
    if (storedUrl && storedUrl.includes('localhost:5000')) {
      localStorage.setItem('API_URL', 'http://localhost:5050/api');
    }

    const token = localStorage.getItem('milk-token');
    if (token) {
      setIsLoggedIn(true);
    } else {
      // Prompt requests auto login or simple click bypass
      // To satisfy "No login screen every time, open directly to dashboard"
      localStorage.setItem('milk-token', 'milk-admin-token-12345');
      setIsLoggedIn(true);
    }
  }, []);

  // Fetch all registers data
  const refreshData = async () => {
    try {
      const statsData = await api.getDashboardSummary();
      const custData = await api.getCustomers();
      const prodData = await api.getProducts();
      const txData = await api.getTransactions();
      const collData = await api.getCollections();
      const expData = await api.getExpenses();

      setStats(statsData);
      setCustomers(custData);
      setProducts(prodData);
      setTransactions(txData);
      setCollections(collData);
      setExpenses(expData);
    } catch (err) {
      console.error("Error refreshing dashboard data:", err);
    }
  };

  const refreshSettings = async () => {
    try {
      const setts = await api.getSettings();
      setSettings(setts);
      // Apply theme
      if (setts.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      refreshSettings();
      refreshData();
    }
  }, [isLoggedIn]);

  // Quick Action triggers from Dashboard
  const handleQuickAction = (action) => {
    if (action === 'excel-url') {
      return api.getExcelUrl();
    }
    if (action === 'add-supply') {
      setTriggerSupplyAdd(true);
      setActiveTab('transactions');
    } else if (action === 'add-collection') {
      setTriggerCollectionAdd(true);
      setActiveTab('collections');
    } else if (action === 'add-customer') {
      setTriggerCustomerAdd(true);
      setActiveTab('customers');
    } else if (action === 'add-product') {
      setTriggerProductAdd(true);
      setActiveTab('products');
    } else if (action === 'add-expense') {
      setTriggerExpenseAdd(true);
      setActiveTab('expenses');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('milk-token');
    setIsLoggedIn(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await api.login(pin);
      if (res.success) {
        localStorage.setItem('milk-token', res.token);
        setIsLoggedIn(true);
      }
    } catch (err) {
      alert("Invalid Pin!");
    }
  };

  if (!isLoggedIn) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#faf8f5', padding: '20px' }}>
        <div className="register-card" style={{ maxWidth: '400px', width: '100%', border: '3px solid var(--primary)', textAlign: 'center' }}>
          <h1 style={{ color: 'var(--primary)', marginBottom: '10px' }}>🥛 Dairy Register</h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>Enter 4-Digit Security PIN</p>
          <form onSubmit={handleLogin}>
            <input 
              type="password" 
              maxLength="4" 
              className="form-control" 
              placeholder="••••"
              value={pin}
              onChange={e => setPin(e.target.value)}
              style={{ fontSize: '32px', letterSpacing: '8px', textAlign: 'center', marginBottom: '20px' }}
            />
            <button type="submit" className="btn btn-primary" style={{ width: '100%', fontSize: '18px', fontWeight: 'bold' }}>
              ✓ Open Register Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Active Tab Rendering Router
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            stats={stats} 
            onNavigate={setActiveTab} 
            onQuickAction={handleQuickAction} 
          />
        );
      case 'customers':
        return (
          <Customers 
            customersList={customers} 
            onRefresh={refreshData} 
            triggerAddOpen={triggerCustomerAdd} 
            setTriggerAddOpen={setTriggerCustomerAdd} 
          />
        );
      case 'products':
        return (
          <Products 
            productsList={products} 
            onRefresh={refreshData} 
            triggerAddOpen={triggerProductAdd} 
            setTriggerAddOpen={setTriggerProductAdd} 
          />
        );
      case 'transactions':
        return (
          <Transactions 
            transactionsList={transactions} 
            customersList={customers} 
            productsList={products} 
            onRefresh={refreshData} 
            triggerAddOpen={triggerSupplyAdd} 
            setTriggerAddOpen={setTriggerSupplyAdd} 
          />
        );
      case 'collections':
        return (
          <Collections 
            collectionsList={collections} 
            customersList={customers} 
            onRefresh={refreshData} 
            triggerAddOpen={triggerCollectionAdd} 
            setTriggerAddOpen={setTriggerCollectionAdd} 
          />
        );
      case 'expenses':
        return (
          <Expenses 
            expensesList={expenses} 
            onRefresh={refreshData} 
            triggerAddOpen={triggerExpenseAdd} 
            setTriggerAddOpen={setTriggerExpenseAdd} 
          />
        );
      case 'settings':
        return (
          <Settings 
            settings={settings} 
            onRefreshSettings={refreshSettings} 
          />
        );
      default:
        return <Dashboard stats={stats} onNavigate={setActiveTab} onQuickAction={handleQuickAction} />;
    }
  };

  return (
    <div className="app-container">
      
      {/* DESKTOP SIDEBAR */}
      <div className="sidebar">
        <div style={{ marginBottom: '30px', textAlign: 'center', borderBottom: '2px solid var(--border-color)', paddingBottom: '15px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: 'var(--primary)' }}>
            🥛 {settings?.businessName || 'Yash General Store'}
          </h2>
          <span style={{ fontSize: '12px', color: 'var(--success)', fontWeight: 'bold' }}>● ONLINE LOGGED IN</span>
        </div>

        <nav style={{ flex: 1 }}>
          <a className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            📊 Dashboard
          </a>
          <a className={`nav-item ${activeTab === 'customers' ? 'active' : ''}`} onClick={() => setActiveTab('customers')}>
            👤 Customers Ledger
          </a>
          <a className={`nav-item ${activeTab === 'products' ? 'active' : ''}`} onClick={() => setActiveTab('products')}>
            📦 Products & Stock
          </a>
          <a className={`nav-item ${activeTab === 'transactions' ? 'active' : ''}`} onClick={() => setActiveTab('transactions')}>
            🥛 Daily Supplies
          </a>
          <a className={`nav-item ${activeTab === 'collections' ? 'active' : ''}`} onClick={() => setActiveTab('collections')}>
            💸 Money Collections
          </a>
          <a className={`nav-item ${activeTab === 'expenses' ? 'active' : ''}`} onClick={() => setActiveTab('expenses')}>
            ⛽ Expenses Log
          </a>
          <a className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
            ⚙️ Settings
          </a>
        </nav>

        <button className="btn btn-outline" onClick={handleLogout} style={{ marginTop: '20px', minHeight: '44px', width: '100%' }}>
          🔒 Logout PIN Lock
        </button>
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <div className="bottom-bar">
        <a className={`bottom-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
          <span>📊</span>
          <span>Home</span>
        </a>
        <a className={`bottom-nav-item ${activeTab === 'customers' ? 'active' : ''}`} onClick={() => setActiveTab('customers')}>
          <span>👤</span>
          <span>Ledger</span>
        </a>
        <a className={`bottom-nav-item ${activeTab === 'transactions' ? 'active' : ''}`} onClick={() => setActiveTab('transactions')}>
          <span>🥛</span>
          <span>Supply</span>
        </a>
        <a className={`bottom-nav-item ${activeTab === 'collections' ? 'active' : ''}`} onClick={() => setActiveTab('collections')}>
          <span>💸</span>
          <span>Money</span>
        </a>
        <a className={`bottom-nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
          <span>⚙️</span>
          <span>Settings</span>
        </a>
      </div>

      {/* MAIN CONTAINER */}
      <div className="main-content">
        {/* Mobile Header indicator */}
        <div style={{ display: 'none' }} className="mobile-header-block">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ fontSize: '18px', color: 'var(--primary)' }}>🥛 {settings?.businessName || 'Yash General Store'}</h3>
            <span style={{ fontSize: '12px', color: 'var(--success)' }}>● Syncing</span>
          </div>
        </div>

        {renderTabContent()}
      </div>

      {/* Inject custom mobile styles locally in styled script */}
      <style>{`
        @media (max-width: 768px) {
          .mobile-header-block {
            display: block !important;
            border-bottom: 2px solid var(--border-color);
            padding-bottom: 8px;
          }
        }
      `}</style>

    </div>
  );
}
