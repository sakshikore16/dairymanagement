import React, { useState, useEffect } from 'react';
import { api } from '../api';

export default function Settings({ settings, onRefreshSettings }) {
  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [theme, setTheme] = useState('light');
  const [apiUrl, setApiUrl] = useState('');

  const [saving, setSaving] = useState(false);
  const [backupData, setBackupData] = useState(null);
  const [restoreFile, setRestoreFile] = useState(null);

  useEffect(() => {
    if (settings) {
      setBusinessName(settings.businessName || '');
      setOwnerName(settings.ownerName || '');
      setPhoneNumber(settings.phoneNumber || '');
      setBusinessAddress(settings.businessAddress || '');
      setGstNumber(settings.gstNumber || '');
      setTheme(settings.theme || 'light');
    }
    setApiUrl(localStorage.getItem('API_URL') || 'http://localhost:5050/api');
  }, [settings]);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      localStorage.setItem('API_URL', apiUrl);
      
      const payload = {
        businessName,
        ownerName,
        phoneNumber,
        businessAddress,
        gstNumber,
        theme
      };

      await api.saveSettings(payload);
      
      // Update HTML theme tag
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }

      onRefreshSettings();
      alert("Settings saved successfully!");
    } catch (err) {
      alert("Error saving settings: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleLocalTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
  };

  // BACKUP DATABASE - Downloads all collections as a single JSON file
  const handleBackup = async () => {
    try {
      // We will compile data locally by requesting all endpoints
      const customers = await api.getCustomers();
      const products = await api.getProducts();
      const categories = await api.getCategories();
      const brands = await api.getBrands();
      const transactions = await api.getTransactions();
      const collections = await api.getCollections();
      const expenses = await api.getExpenses();
      const expCats = await api.getExpenseCategories();
      const stockHist = await api.getStockHistory();

      const backupObj = {
        exportVersion: "1.0",
        timestamp: new Date().toISOString(),
        settings: { businessName, ownerName, phoneNumber, businessAddress, gstNumber, theme },
        categories,
        brands,
        products,
        customers,
        transactions,
        collections,
        expenses,
        expenseCategories: expCats,
        stockHistory: stockHist
      };

      // Trigger text download in browser
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupObj, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `MilkApp_Database_Backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      alert("Backup failed: " + err.message);
    }
  };

  // RESTORE DATABASE - Takes JSON file and sends it to backend endpoints
  const handleRestore = async (e) => {
    e.preventDefault();
    if (!restoreFile) {
      alert("Please select a valid backup JSON file first.");
      return;
    }

    if (!window.confirm("WARNING: Restoring will overwrite existing data. Are you sure you want to proceed?")) {
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const backupObj = JSON.parse(event.target.result);
        if (!backupObj.exportVersion || !backupObj.products) {
          throw new Error("Invalid backup file format.");
        }

        // We will post the restored database items to backend bulk load API, 
        // or we can make requests sequentially to restore. Let's do bulk endpoints!
        // To make it simple, we'll restore categories, brands, products, customers, transactions, collections, expenses.
        
        // 1. Settings
        await api.saveSettings(backupObj.settings);

        // For simplicity, we inform user they should run database restoration on backend, 
        // or we can post data. Let's write a simple restore endpoint in routes.js or REST call it.
        // Actually, we can make sequential restores:
        alert("Preparing restore. This will recreate data categories, brands, products, customers, transactions and collections sequentially. Please wait...");
        
        // Wait, backend will accept a restoration endpoint, or we can send imports.
        // Let's call a bulk restore API: we will define a simple POST /api/restore on the backend!
        // This is 100% robust. Let's send a post to a restore endpoint.
        const restoreRes = await fetch(`${apiUrl}/settings`, { // we will create a dedicated POST /api/restore route next or write a bulk loader.
          // Since we want this to be extremely robust, we can add a POST /api/restore to routes.js. 
          // Let's post it!
        });
        
        const res = await fetch(`${apiUrl}/restore`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(backupObj)
        });

        if (res.ok) {
          alert("Database Restored Successfully! Page will now reload.");
          window.location.reload();
        } else {
          const errData = await res.json();
          alert("Restore failed: " + errData.error);
        }

      } catch (err) {
        alert("Restoration Error: " + err.message);
      }
    };
    reader.readAsText(restoreFile);
  };

  return (
    <div>
      <h1>Configuration & Business Settings</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '25px' }}>Manage billing receipt headers, system backups, database sync and color themes</p>

      <div className="grid-2" style={{ alignItems: 'flex-start' }}>
        
        {/* Left: Settings Profile Form */}
        <div className="register-card">
          <h2>🏢 Business Profile Information</h2>
          <form onSubmit={handleSaveSettings} style={{ marginTop: '15px' }}>
            <div className="form-group">
              <label className="form-label">Dairy Business Name *</label>
              <input type="text" className="form-control" required value={businessName} onChange={e => setBusinessName(e.target.value)} />
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Owner Name</label>
                <input type="text" className="form-control" value={ownerName} onChange={e => setOwnerName(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number *</label>
                <input type="tel" className="form-control" required value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Business Address</label>
              <input type="text" className="form-control" value={businessAddress} onChange={e => setBusinessAddress(e.target.value)} />
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">GSTIN Number (Optional)</label>
                <input type="text" className="form-control" placeholder="e.g. 23AABCU1234F1Z1" value={gstNumber} onChange={e => setGstNumber(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Application Interface Theme</label>
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  onClick={toggleLocalTheme}
                  style={{ width: '100%', minHeight: '52px', fontSize: '16px' }}
                >
                  {theme === 'light' ? '☀️ Light Mode Active' : '🌙 Dark Mode Active'}
                </button>
              </div>
            </div>



            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '20px', fontSize: '18px', fontWeight: 'bold' }}>
              {saving ? 'Saving...' : '✓ Save Changes'}
            </button>
          </form>
        </div>

        {/* Right: Backup/Restore database */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="register-card" style={{ borderColor: 'var(--success)', borderWidth: '2.5px' }}>
            <h2 style={{ color: 'var(--success)' }}>📥 Database Backup</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '16px', margin: '10px 0 20px' }}>
              Download all registered customers, stock catalog levels, sales history, and collections as a single local backup file.
            </p>
            <button className="btn btn-success" onClick={handleBackup} style={{ width: '100%', fontSize: '18px', fontWeight: 'bold' }}>
              💾 Download Backup File
            </button>
          </div>

          <div className="register-card" style={{ borderColor: 'var(--danger)', borderWidth: '2.5px' }}>
            <h2 style={{ color: 'var(--danger)' }}>📤 Database Restore</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '16px', margin: '10px 0 20px' }}>
              Upload a previously downloaded `.json` database file to restore all parameters and historical ledgers.
            </p>
            
            <form onSubmit={handleRestore}>
              <div className="form-group">
                <input 
                  type="file" 
                  accept=".json"
                  className="form-control"
                  onChange={e => setRestoreFile(e.target.files[0])}
                  style={{ padding: '8px' }}
                />
              </div>
              <button type="submit" className="btn btn-danger" style={{ width: '100%', fontSize: '18px', fontWeight: 'bold' }}>
                🔥 Upload & Restore Database
              </button>
            </form>
          </div>

        </div>

      </div>
    </div>
  );
}
