import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  ActivityIndicator, 
  Alert, 
  Linking,
  Dimensions,
  SafeAreaView,
  StatusBar
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [apiUrl, setApiUrl] = useState('http://192.168.1.15:5050/api'); // Make this editable in settings
  const [isUrlLoaded, setIsUrlLoaded] = useState(false);
  const [settings, setSettings] = useState(null);
  const [theme, setTheme] = useState('light');

  // Loading & Data States
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [collections, setCollections] = useState([]);
  const [expenses, setExpenses] = useState([]);
  
  // Ledger Subview
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [ledgerTx, setLedgerTx] = useState([]);
  const [ledgerColl, setLedgerColl] = useState([]);
  const [loadingLedger, setLoadingLedger] = useState(false);

  // Supply Flow States
  const [supplyCustomerId, setSupplyCustomerId] = useState('');
  const [step, setStep] = useState(1); // 1: Customer select, 2: Product qty checklist
  const [supplyQuantities, setSupplyQuantities] = useState({});
  const [mobileProductFilter, setMobileProductFilter] = useState('');
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);

  // Collection Flow States
  const [collCustomerId, setCollCustomerId] = useState('');
  const [collAmount, setCollAmount] = useState('');
  const [collMethod, setCollMethod] = useState('Cash');
  const [collNotes, setCollNotes] = useState('');

  // Expense Flow States
  const [expCategoryId, setExpCategoryId] = useState('');
  const [expCategories, setExpCategories] = useState([]);
  const [expAmount, setExpAmount] = useState('');
  const [expNotes, setExpNotes] = useState('');

  // Customer Creator Form
  const [custName, setCustName] = useState('');
  const [custMobile, setCustMobile] = useState('');
  const [custAddress, setCustAddress] = useState('');
  const [custArea, setCustArea] = useState('');
  const [custType, setCustType] = useState('Home');
  const [showCustForm, setShowCustForm] = useState(false);

  // Settings Fields
  const [editBusName, setEditBusName] = useState('');
  const [editOwner, setEditOwner] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');

  // Global search
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch all registers from backend
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch dashboard stats
      const statsRes = await fetch(`${apiUrl}/dashboard/summary`);
      const statsData = await statsRes.json();
      setStats(statsData);

      // 2. Fetch Customers
      const custRes = await fetch(`${apiUrl}/customers`);
      const custData = await custRes.json();
      setCustomers(custData);

      // 3. Fetch Products
      const prodRes = await fetch(`${apiUrl}/products`);
      const prodData = await prodRes.json();
      setProducts(prodData);

      // 4. Fetch Transactions
      const txRes = await fetch(`${apiUrl}/transactions`);
      const txData = await txRes.json();
      setTransactions(txData);

      // 5. Fetch Collections
      const collRes = await fetch(`${apiUrl}/collections`);
      const collData = await collRes.json();
      setCollections(collData);

      // 6. Fetch Settings
      const setRes = await fetch(`${apiUrl}/settings`);
      const setData = await setRes.json();
      setSettings(setData);
      setTheme(setData.theme || 'light');
      
      setEditBusName(setData.businessName);
      setEditOwner(setData.ownerName);
      setEditPhone(setData.phoneNumber);
      setEditAddress(setData.businessAddress);

      // 7. Load Categories & Brands
      const catRes = await fetch(`${apiUrl}/categories`);
      const catData = await catRes.json();
      setCategories(catData);

      const brandRes = await fetch(`${apiUrl}/brands`);
      const brandData = await brandRes.json();
      setBrands(brandData);

      const expCatRes = await fetch(`${apiUrl}/expenses/categories`);
      const expCatData = await expCatRes.json();
      setExpCategories(expCatData);
    } catch (err) {
      console.log("Fetch error:", err);
      // Fail silently or show alert
    } finally {
      setLoading(false);
    }
  // Load API URL from storage on Mount
  useEffect(() => {
    const loadApi = async () => {
      try {
        const stored = await AsyncStorage.getItem('MOBILE_API_URL');
        if (stored) {
          setApiUrl(stored);
        }
      } catch (err) {
        console.log("Error loading cached API URL:", err);
      } finally {
        setIsUrlLoaded(true);
      }
    };
    loadApi();
  }, []);

  // Save API URL to storage when it changes
  useEffect(() => {
    if (isUrlLoaded) {
      AsyncStorage.setItem('MOBILE_API_URL', apiUrl).catch(err => console.log("Error caching API URL:", err));
    }
  }, [apiUrl, isUrlLoaded]);

  useEffect(() => {
    if (isUrlLoaded) {
      fetchData();
    }
  }, [apiUrl, isUrlLoaded]);

  // Load customer ledger
  const handleSelectCustomer = async (cust) => {
    setSelectedCustomer(cust);
    setLoadingLedger(true);
    try {
      const res = await fetch(`${apiUrl}/customers/${cust._id}/ledger`);
      const data = await res.json();
      setLedgerTx(data.transactions);
      setLedgerColl(data.collections);
    } catch (err) {
      console.log(err);
    } finally {
      setLoadingLedger(false);
    }
  };

  // Dial Customer Phone
  const handleDial = (mobile) => {
    if (!mobile) return;
    Linking.openURL(`tel:${mobile}`);
  };

  // Open Invoice PDF in device browser
  const handleOpenPdf = (txId) => {
    Linking.openURL(`${apiUrl}/reports/invoice/${txId}/pdf`);
  };

  const handleOpenLedgerPdf = (custId) => {
    Linking.openURL(`${apiUrl}/reports/ledger/${custId}/pdf`);
  };

  // Quantity adjust handlers
  const handleMobileQtyChange = (prodId, val) => {
    const num = Math.max(0, parseInt(val) || 0);
    setSupplyQuantities(prev => ({ ...prev, [prodId]: num }));
  };

  const adjustMobileQty = (prodId, delta) => {
    const current = supplyQuantities[prodId] || 0;
    const next = Math.max(0, current + delta);
    setSupplyQuantities(prev => ({ ...prev, [prodId]: next }));
  };

  const submitSupply = async (payloadProducts) => {
    try {
      const payload = {
        customerId: supplyCustomerId,
        products: payloadProducts
      };
      const res = await fetch(`${apiUrl}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        Alert.alert("Success", "Supply transaction recorded!");
        setSupplyQuantities({});
        setSupplyCustomerId('');
        setActiveTab('dashboard');
        fetchData();
      } else {
        const errData = await res.json();
        Alert.alert("Error", errData.error || "Failed to save supply.");
      }
    } catch (err) {
      Alert.alert("Error", err.message);
    }
  };

  // Submit supply transaction
  const handleSaveSupply = async () => {
    if (!supplyCustomerId) return;
    const payloadProducts = Object.entries(supplyQuantities)
      .filter(([_, qty]) => qty > 0)
      .map(([prodId, qty]) => ({
        productId: prodId,
        quantity: qty
      }));

    if (payloadProducts.length === 0) {
      Alert.alert("Error", "Please enter quantity for at least one product.");
      return;
    }

    let needsConfirmation = false;
    for (const item of payloadProducts) {
      const prod = products.find(p => p._id === item.productId);
      if (prod && prod.currentStock < item.quantity) {
        needsConfirmation = true;
        break;
      }
    }

    if (needsConfirmation) {
      Alert.alert(
        "Low Stock Warning",
        "Some items exceed current stock. Selling them will drive inventory negative. Proceed?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Yes, Save", onPress: () => submitSupply(payloadProducts) }
        ]
      );
    } else {
      await submitSupply(payloadProducts);
    }
  };

  // Record money collection
  const handleSaveCollection = async () => {
    if (!collCustomerId || !collAmount || Number(collAmount) <= 0) return;
    try {
      const payload = {
        customerId: collCustomerId,
        amountCollected: Number(collAmount),
        paymentMethod: collMethod,
        notes: collNotes
      };
      const res = await fetch(`${apiUrl}/collections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        Alert.alert("Success", "Collection payment logged!");
        setCollAmount('');
        setCollCustomerId('');
        setCollNotes('');
        setActiveTab('dashboard');
        fetchData();
      }
    } catch (err) {
      Alert.alert("Error", err.message);
    }
  };

  // Record business expense
  const handleSaveExpense = async () => {
    if (!expCategoryId || !expAmount || Number(expAmount) <= 0) return;
    try {
      const payload = {
        category: expCategoryId,
        amount: Number(expAmount),
        notes: expNotes
      };
      const res = await fetch(`${apiUrl}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        Alert.alert("Success", "Expense outlay recorded!");
        setExpAmount('');
        setExpNotes('');
        setActiveTab('dashboard');
        fetchData();
      }
    } catch (err) {
      Alert.alert("Error", err.message);
    }
  };

  // Record New Customer
  const handleCreateCustomer = async () => {
    if (!custName) return;
    try {
      const payload = {
        name: custName,
        mobileNumber: custMobile,
        address: custAddress,
        area: custArea,
        customerType: custType
      };
      const res = await fetch(`${apiUrl}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        Alert.alert("Success", "Customer created!");
        setCustName('');
        setCustMobile('');
        setCustAddress('');
        setCustArea('');
        setShowCustForm(false);
        fetchData();
      }
    } catch (err) {
      Alert.alert("Error", err.message);
    }
  };

  // Save Settings
  const handleSaveSettings = async () => {
    try {
      const payload = {
        businessName: editBusName,
        ownerName: editOwner,
        phoneNumber: editPhone,
        businessAddress: editAddress,
        theme
      };
      const res = await fetch(`${apiUrl}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        Alert.alert("Success", "Settings saved successfully.");
        fetchData();
      }
    } catch (err) {
      Alert.alert("Error", err.message);
    }
  };

  // Virtual Keypad press for quantities
  const handleNumpadPress = (val) => {
    if (val === 'C') {
      setTypedQty('');
    } else if (val === '⌫') {
      setTypedQty(typedQty.slice(0, -1));
    } else {
      setTypedQty(typedQty + val);
    }
  };

  const numpadKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'];

  // Theme Styles
  const isDark = theme === 'dark';
  const themeStyles = StyleSheet.create({
    app: {
      flex: 1,
      backgroundColor: isDark ? '#0f172a' : '#faf8f5',
    },
    card: {
      backgroundColor: isDark ? '#1e293b' : '#ffffff',
      borderColor: isDark ? '#334155' : '#cbd5e1',
      borderWidth: 2,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
    },
    text: {
      color: isDark ? '#f8fafc' : '#1e293b',
    },
    textMuted: {
      color: isDark ? '#94a3b8' : '#64748b',
    },
    input: {
      backgroundColor: isDark ? '#1e293b' : '#ffffff',
      color: isDark ? '#f8fafc' : '#1e293b',
      borderColor: isDark ? '#334155' : '#cbd5e1',
      borderWidth: 2,
      borderRadius: 12,
      padding: 12,
      fontSize: 18,
      minHeight: 48,
    }
  });

  return (
    <SafeAreaView style={themeStyles.app}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header bar */}
      <View style={[styles.header, { borderBottomColor: isDark ? '#334155' : '#cbd5e1' }]}>
        <Text style={[styles.headerTitle, { color: isDark ? '#3b82f6' : '#1e40af' }]}>
          🥛 {settings?.businessName || "Yash General Store"}
        </Text>
        <TouchableOpacity onPress={fetchData} style={styles.refreshBtn}>
          <Text style={{ fontSize: 18 }}>🔄 Sync</Text>
        </TouchableOpacity>
      </View>

      {/* LOADING INDICATOR */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1e40af" />
          <Text style={{ marginTop: 8, color: '#1e40af', fontWeight: 'bold' }}>Syncing Ledger Database...</Text>
        </View>
      )}

      {/* MAIN CONTAINER PAGE SCROLL */}
      <ScrollView contentContainerStyle={styles.container}>
        
        {/* ==========================================================================
           1. DASHBOARD TAB
           ========================================================================== */}
        {activeTab === 'dashboard' && stats && (
          <View>
            <Text style={[styles.sectionTitle, themeStyles.text]}>Morning Delivery Register</Text>
            
            {/* Alerts */}
            {stats.lowStockProducts > 0 && (
              <View style={styles.alertBox}>
                <Text style={styles.alertTitle}>🚨 Low Stock Alert! ({stats.lowStockProducts})</Text>
                {stats.lowStockAlerts?.map((a, i) => (
                  <Text key={i} style={styles.alertItem}>• {a.name}: {a.currentStock} left</Text>
                ))}
              </View>
            )}

            {/* Quick Actions Card */}
            <View style={[themeStyles.card, { borderColor: '#1e40af', backgroundColor: isDark ? '#172554' : '#eff6ff' }]}>
              <Text style={{ fontWeight: 'bold', color: '#1e40af', fontSize: 18, marginBottom: 12 }}>⚡ QUICK ACTIONS</Text>
              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.quickBtn} onPress={() => setActiveTab('supply')}>
                  <Text style={styles.quickBtnText}>🥛 Supply</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickBtn} onPress={() => setActiveTab('money')}>
                  <Text style={styles.quickBtnText}>💸 Collect</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickBtn} onPress={() => { setShowCustForm(true); setActiveTab('customers'); }}>
                  <Text style={styles.quickBtnText}>👤 + Cust</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Summary Cards */}
            <View style={styles.grid}>
              <View style={[themeStyles.card, styles.gridCard, { borderColor: '#1e40af' }]}>
                <Text style={themeStyles.textMuted}>Today's Supplies</Text>
                <Text style={[styles.cardVal, { color: '#1e40af' }]}>{stats.todayDeliveries}</Text>
              </View>
              <View style={[themeStyles.card, styles.gridCard, { borderColor: '#1e40af' }]}>
                <Text style={themeStyles.textMuted}>Today's Sales</Text>
                <Text style={[styles.cardVal, { color: '#1e40af' }]}>Rs.{stats.todaySales}</Text>
              </View>
              <View style={[themeStyles.card, styles.gridCard, { borderColor: '#16a34a' }]}>
                <Text style={themeStyles.textMuted}>Today Collected</Text>
                <Text style={[styles.cardVal, { color: '#16a34a' }]}>Rs.{stats.todayMoneyCollected}</Text>
              </View>
              <View style={[themeStyles.card, styles.gridCard, { borderColor: '#dc2626' }]}>
                <Text style={themeStyles.textMuted}>Pending Collect</Text>
                <Text style={[styles.cardVal, { color: '#dc2626' }]}>Rs.{stats.pendingCollections}</Text>
              </View>
              <View style={[themeStyles.card, styles.gridCard, { borderColor: '#1e40af' }]}>
                <Text style={themeStyles.textMuted}>Month Revenue</Text>
                <Text style={[styles.cardVal, { color: '#1e40af' }]}>Rs.{stats.monthlyRevenue}</Text>
              </View>
              <View style={[themeStyles.card, styles.gridCard, { borderColor: '#dc2626' }]}>
                <Text style={themeStyles.textMuted}>Month Expenses</Text>
                <Text style={[styles.cardVal, { color: '#dc2626' }]}>Rs.{stats.monthlyExpenses}</Text>
              </View>
            </View>
          </View>
        )}

        {/* ==========================================================================
           2. CUSTOMERS LEDGER TAB
           ========================================================================== */}
        {activeTab === 'customers' && (
          <View>
            {!selectedCustomer ? (
              <View>
                {/* Search Customer */}
                <TextInput 
                  style={[themeStyles.input, { marginBottom: 12 }]} 
                  placeholder="🔍 Search Customer by Name or Area..."
                  placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />

                {/* Create Customer Inline Option */}
                {showCustForm ? (
                  <View style={themeStyles.card}>
                    <Text style={[styles.cardTitle, themeStyles.text]}>Create Customer Account</Text>
                    <TextInput style={[themeStyles.input, { marginBottom: 10 }]} placeholder="Customer Full Name" value={custName} onChangeText={setCustName} />
                    <TextInput style={[themeStyles.input, { marginBottom: 10 }]} placeholder="Mobile Number" keyboardType="phone-pad" value={custMobile} onChangeText={setCustMobile} />
                    <TextInput style={[themeStyles.input, { marginBottom: 10 }]} placeholder="Delivery Area (e.g. Sector 15)" value={custArea} onChangeText={setCustArea} />
                    <TextInput style={[themeStyles.input, { marginBottom: 10 }]} placeholder="Complete Address" value={custAddress} onChangeText={setCustAddress} />
                    <TouchableOpacity style={styles.saveBtn} onPress={handleCreateCustomer}>
                      <Text style={styles.btnText}>Save Customer</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={{ marginTop: 10, alignSelf: 'center' }} onPress={() => setShowCustForm(false)}>
                      <Text style={{ color: '#dc2626', fontWeight: 'bold' }}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.addBtn} onPress={() => setShowCustForm(true)}>
                    <Text style={styles.btnText}>👤 + Add New Customer</Text>
                  </TouchableOpacity>
                )}

                {/* Customers List */}
                {customers.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || (c.area && c.area.toLowerCase().includes(searchQuery.toLowerCase()))).map(c => (
                  <TouchableOpacity key={c._id} style={themeStyles.card} onPress={() => handleSelectCustomer(c)}>
                    <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                      <View>
                        <Text style={{ fontSize: 20, fontWeight: 'bold', color: isDark ? '#ffffff' : '#1e293b' }}>{c.name}</Text>
                        <Text style={themeStyles.textMuted}>📍 Area: {c.area || 'N/A'}</Text>
                      </View>
                      <View style={{ alignItems: 'end' }}>
                        <Text style={{ fontSize: 13, color: 'gray' }}>Owes:</Text>
                        <Text style={{ fontSize: 20, fontWeight: 'bold', color: c.balance > 0 ? '#dc2626' : '#16a34a' }}>Rs.{c.balance}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              // CUSTOMER LEDGER VIEW (Bahi-Khata)
              <View>
                <TouchableOpacity onPress={() => setSelectedCustomer(null)} style={{ marginBottom: 15 }}>
                  <Text style={{ color: '#1e40af', fontSize: 18, fontWeight: 'bold' }}>← Back to Customers</Text>
                </TouchableOpacity>

                <View style={themeStyles.card}>
                  <Text style={{ fontSize: 24, fontWeight: 'bold', color: isDark ? '#ffffff' : '#1e293b' }}>{selectedCustomer.name}</Text>
                  {selectedCustomer.mobileNumber && (
                    <TouchableOpacity style={styles.callBtn} onPress={() => handleDial(selectedCustomer.mobileNumber)}>
                      <Text style={styles.btnText}>📞 Call Customer ({selectedCustomer.mobileNumber})</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity 
                    style={[styles.callBtn, { backgroundColor: '#1e40af', marginTop: 8 }]} 
                    onPress={() => {
                      setSupplyCustomerId(selectedCustomer._id);
                      setSupplyQuantities({});
                      setStep(2);
                      setActiveTab('supply');
                    }}
                  >
                    <Text style={styles.btnText}>🥛 Record Supply Entry</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.callBtn, { backgroundColor: '#16a34a', marginTop: 8 }]} onPress={() => handleOpenLedgerPdf(selectedCustomer._id)}>
                    <Text style={styles.btnText}>📄 Open PDF Ledger Statement</Text>
                  </TouchableOpacity>
                </View>

                {/* Ledger entries list */}
                <Text style={{ fontSize: 18, fontWeight: 'bold', marginVertical: 10, color: isDark ? '#ffffff' : '#1e293b' }}>📖 Supply & Collection Ledger</Text>
                {loadingLedger ? (
                  <ActivityIndicator size="small" color="#1e40af" />
                ) : (
                  <View style={{ borderTopWidth: 2, borderTopColor: '#cbd5e1' }}>
                    {[...ledgerTx, ...ledgerColl]
                      .sort((a, b) => {
                        const dA = new Date(a.date).setHours(0, 0, 0, 0);
                        const dB = new Date(b.date).setHours(0, 0, 0, 0);
                        if (dA !== dB) return dA - dB;
                        return new Date(a.createdAt || a.date) - new Date(b.createdAt || b.date);
                      })
                      .map((log, idx) => {
                        const isSupply = log.grandTotal !== undefined;
                        const formattedTime = log.time || (log.createdAt ? new Date(log.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '');
                        return (
                          <View key={idx} style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#cbd5e1', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', backgroundColor: isSupply ? 'transparent' : '#f0fdf4' }}>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 14, color: 'gray' }}>
                                {new Date(log.date).toLocaleDateString('en-IN')} {formattedTime ? `| ${formattedTime}` : ''}
                              </Text>
                              <Text style={{ fontWeight: 'bold', fontSize: 16, color: isDark ? '#ffffff' : '#1e293b' }}>{isSupply ? '🥛 SUPPLY' : '💸 COLLECTION'}</Text>
                              <Text style={{ fontSize: 13, color: 'gray' }}>{isSupply ? log.products.map(p => `${p.brandName} ${p.name} x${p.quantity}`).join(', ') : `Recv via ${log.paymentMethod}`}</Text>
                            </View>
                            <Text style={{ fontSize: 18, fontWeight: 'bold', color: isSupply ? '#dc2626' : '#16a34a' }}>
                              {isSupply ? `+Rs.${log.grandTotal}` : `-Rs.${log.amountCollected}`}
                            </Text>
                          </View>
                        );
                    })}
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* ==========================================================================
           3. DAILY SUPPLY TAB
           ========================================================================== */}
        {activeTab === 'supply' && (
          <View>
            <Text style={[styles.sectionTitle, themeStyles.text]}>🥛 Record Supply Transaction</Text>
            
            {step === 1 && (
              <View>
                <Text style={{ fontSize: 18, marginBottom: 12, color: isDark ? '#ffffff' : '#1e293b' }}>Select Customer Account:</Text>
                {customers.filter(c => c.status === 'Active').map(c => (
                  <TouchableOpacity 
                    key={c._id} 
                    style={themeStyles.card} 
                    onPress={() => { 
                      setSupplyCustomerId(c._id); 
                      setSupplyQuantities({});
                      setStep(2); 
                    }}
                  >
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: isDark ? '#ffffff' : '#1e293b' }}>{c.name}</Text>
                    <Text style={themeStyles.textMuted}>📍 {c.area}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {step === 2 && (
              <View>
                {/* Back controls */}
                <TouchableOpacity onPress={() => setStep(1)} style={{ marginBottom: 15 }}>
                  <Text style={{ color: '#1e40af', fontSize: 16 }}>← Back to Customers</Text>
                </TouchableOpacity>

                {/* Customer card header */}
                {(() => {
                  const cust = customers.find(c => c._id === supplyCustomerId);
                  return cust ? (
                    <View style={[themeStyles.card, { borderLeftWidth: 5, borderLeftColor: '#1e40af', marginBottom: 15 }]}>
                      <Text style={{ fontSize: 20, fontWeight: 'bold', color: isDark ? '#ffffff' : '#1e293b' }}>
                        Customer: {cust.name}
                      </Text>
                      <Text style={themeStyles.textMuted}>📍 Area: {cust.area || 'N/A'}</Text>
                    </View>
                  ) : null;
                })()}

                <Text style={{ fontSize: 18, marginBottom: 12, color: isDark ? '#ffffff' : '#1e293b' }}>
                  Enter Product Quantities:
                </Text>

                {/* Search / Filter input */}
                <TextInput
                  style={[themeStyles.input, { marginBottom: 15 }]}
                  placeholder="🔍 Search products by name..."
                  placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
                  value={mobileProductFilter}
                  onChangeText={setMobileProductFilter}
                />

                {/* Group products by Category */}
                {(() => {
                  // Filter products
                  const filtered = products.filter(p => {
                    if (p.status !== 'Available') return false;
                    if (!mobileProductFilter) return true;
                    const search = mobileProductFilter.toLowerCase();
                    const pName = p.name.toLowerCase();
                    const bName = (p.brand?.name || '').toLowerCase();
                    const cName = (p.category?.name || '').toLowerCase();
                    return pName.includes(search) || bName.includes(search) || cName.includes(search);
                  });

                  // Group by category
                  const grouped = {};
                  filtered.forEach(p => {
                    const catName = p.category?.name || 'Uncategorized';
                    if (!grouped[catName]) grouped[catName] = [];
                    grouped[catName].push(p);
                  });

                  const keys = Object.keys(grouped);
                  if (keys.length === 0) {
                    return (
                      <View style={[themeStyles.card, { padding: 20 }]}>
                        <Text style={{ textAlign: 'center', color: 'gray' }}>No active products match search.</Text>
                      </View>
                    );
                  }

                  return keys.map(catName => (
                    <View key={catName} style={{ marginBottom: 20 }}>
                      <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1e40af', textTransform: 'uppercase', marginBottom: 8, borderBottomWidth: 1, borderBottomColor: '#1e40af', paddingBottom: 2 }}>
                        🥛 {catName}
                      </Text>
                      
                      {grouped[catName].map(p => {
                        const qty = supplyQuantities[p._id] || 0;
                        return (
                          <View key={p._id} style={[themeStyles.card, { display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, marginVertical: 4 }]}>
                            <View style={{ flex: 1, marginRight: 10 }}>
                              <Text style={{ fontSize: 16, fontWeight: 'bold', color: isDark ? '#ffffff' : '#1e293b' }}>
                                {p.brand?.name} {p.name}
                              </Text>
                              <Text style={themeStyles.textMuted}>
                                Rate: Rs.{p.sellingPrice} | Stock: {p.currentStock} {p.unit}
                              </Text>
                            </View>

                            {/* Qty controls */}
                            <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                              <TouchableOpacity 
                                style={[styles.qtyBtn, { backgroundColor: isDark ? '#334155' : '#cbd5e1' }]} 
                                onPress={() => adjustMobileQty(p._id, -1)}
                              >
                                <Text style={{ fontSize: 20, fontWeight: 'bold', color: isDark ? '#ffffff' : '#1e293b' }}>-</Text>
                              </TouchableOpacity>
                              <TextInput 
                                style={[themeStyles.input, { width: 50, height: 38, textAlign: 'center', marginHorizontal: 5, padding: 0, fontWeight: 'bold', fontSize: 16 }]} 
                                keyboardType="numeric"
                                value={qty > 0 ? qty.toString() : ''}
                                placeholder="0"
                                placeholderTextColor={isDark ? '#64748b' : '#cbd5e1'}
                                onChangeText={text => handleMobileQtyChange(p._id, text)}
                              />
                              <TouchableOpacity 
                                style={[styles.qtyBtn, { backgroundColor: isDark ? '#334155' : '#cbd5e1' }]} 
                                onPress={() => adjustMobileQty(p._id, 1)}
                              >
                                <Text style={{ fontSize: 20, fontWeight: 'bold', color: isDark ? '#ffffff' : '#1e293b' }}>+</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  ));
                })()}

                {/* Calculate and show totals */}
                {(() => {
                  const total = Object.entries(supplyQuantities).reduce((sum, [prodId, qty]) => {
                    const p = products.find(prod => prod._id === prodId);
                    return sum + (p ? p.sellingPrice * qty : 0);
                  }, 0);

                  return (
                    <View style={{ marginTop: 10, borderTopWidth: 2, borderTopColor: '#cbd5e1', paddingTop: 15 }}>
                      <Text style={{ fontSize: 18, fontWeight: 'bold', color: isDark ? '#ffffff' : '#1e293b', marginBottom: 10 }}>
                        Total Value: <Text style={{ color: '#dc2626', fontSize: 24, fontWeight: '900' }}>Rs. {total.toFixed(2)}</Text>
                      </Text>

                      <TouchableOpacity 
                        style={[styles.saveBtn, { opacity: total > 0 ? 1 : 0.6 }]} 
                        disabled={total === 0} 
                        onPress={handleSaveSupply}
                      >
                        <Text style={styles.btnText}>✓ Confirm & Complete Delivery</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })()}
              </View>
            )}
          </View>
        )}

        {/* ==========================================================================
           4. MONEY COLLECTION TAB
           ========================================================================== */}
        {activeTab === 'money' && (
          <View>
            <Text style={[styles.sectionTitle, themeStyles.text]}>💸 Log Customer Collection</Text>
            
            <Text style={[themeStyles.text, { fontSize: 16, marginBottom: 8 }]}>1. Choose Customer Account:</Text>
            <ScrollView horizontal style={{ marginBottom: 15 }}>
              {customers.filter(c => c.status === 'Active' && c.balance > 0).map(c => (
                <TouchableOpacity 
                  key={c._id} 
                  style={[themeStyles.card, { marginRight: 10, borderColor: collCustomerId === c._id ? '#16a34a' : '#cbd5e1', minWidth: 150 }]}
                  onPress={() => { setCollCustomerId(c._id); setCollAmount(c.balance.toString()); }}
                >
                  <Text style={{ fontWeight: 'bold', color: isDark ? '#ffffff' : '#1e293b' }}>{c.name}</Text>
                  <Text style={{ color: '#dc2626', fontWeight: 'bold' }}>Debt: Rs.{c.balance}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {collCustomerId !== '' && (
              <View>
                <Text style={[themeStyles.text, { fontSize: 16, marginBottom: 8 }]}>2. Amount Collected (Rs.):</Text>
                <TextInput 
                  style={[themeStyles.input, { marginBottom: 15, fontSize: 24, textAlign: 'center' }]} 
                  keyboardType="numeric" 
                  value={collAmount}
                  onChangeText={setCollAmount}
                />

                <Text style={[themeStyles.text, { fontSize: 16, marginBottom: 8 }]}>3. Payment Mode:</Text>
                <View style={[styles.buttonRow, { marginBottom: 15 }]}>
                  {['Cash', 'UPI', 'Bank'].map(method => (
                    <TouchableOpacity 
                      key={method} 
                      style={[styles.quickBtn, { backgroundColor: collMethod === method ? '#16a34a' : 'gray' }]} 
                      onPress={() => setCollMethod(method)}
                    >
                      <Text style={styles.quickBtnText}>{method}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TextInput 
                  style={[themeStyles.input, { marginBottom: 15 }]} 
                  placeholder="Notes (optional)" 
                  value={collNotes} 
                  onChangeText={setCollNotes}
                />

                <TouchableOpacity style={[styles.saveBtn, { backgroundColor: '#16a34a' }]} onPress={handleSaveCollection}>
                  <Text style={styles.btnText}>✓ Save Collection Receipt</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* ==========================================================================
           5. SETTINGS TAB
           ========================================================================== */}
        {activeTab === 'settings' && (
          <View>
            <Text style={[styles.sectionTitle, themeStyles.text]}>Settings & Configuration</Text>
            
            <View style={themeStyles.card}>
              <Text style={[styles.cardTitle, themeStyles.text]}>Sync API Server URL</Text>
              <TextInput style={themeStyles.input} value={apiUrl} onChangeText={setApiUrl} placeholder="http://192.168.1.15:5050/api" />
              <Text style={[themeStyles.textMuted, { fontSize: 13, marginTop: 5 }]}>Syncs data over your local home network (WiFi).</Text>
            </View>

            <View style={themeStyles.card}>
              <Text style={[styles.cardTitle, themeStyles.text]}>Display Preference</Text>
              <TouchableOpacity 
                style={[styles.quickBtn, { width: '100%', minHeight: 48, justifyContent: 'center' }]}
                onPress={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              >
                <Text style={styles.quickBtnText}>Toggle Theme: {theme.toUpperCase()}</Text>
              </TouchableOpacity>
            </View>

            <View style={themeStyles.card}>
              <Text style={[styles.cardTitle, themeStyles.text]}>Business Info</Text>
              <TextInput style={[themeStyles.input, { marginBottom: 8 }]} value={editBusName} onChangeText={setEditBusName} placeholder="Business Name" />
              <TextInput style={[themeStyles.input, { marginBottom: 8 }]} value={editOwner} onChangeText={setEditOwner} placeholder="Owner Name" />
              <TextInput style={[themeStyles.input, { marginBottom: 8 }]} value={editPhone} onChangeText={setEditPhone} placeholder="Phone" keyboardType="phone-pad" />
              <TextInput style={[themeStyles.input, { marginBottom: 8 }]} value={editAddress} onChangeText={setEditAddress} placeholder="Address" />
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveSettings}>
                <Text style={styles.btnText}>Save Business Info</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

      </ScrollView>

      {/* ==========================================================================
         BOTTOM TAB NAVIGATION BAR
         ========================================================================== */}
      <View style={[styles.bottomBar, { borderTopColor: isDark ? '#334155' : '#cbd5e1', backgroundColor: isDark ? '#1e293b' : '#ffffff' }]}>
        <TouchableOpacity style={styles.tabBtn} onPress={() => { setActiveTab('dashboard'); setSelectedCustomer(null); }}>
          <Text style={{ fontSize: 20 }}>📊</Text>
          <Text style={[styles.tabLabel, { color: activeTab === 'dashboard' ? '#1e40af' : '#64748b' }]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabBtn} onPress={() => { setActiveTab('customers'); setSelectedCustomer(null); }}>
          <Text style={{ fontSize: 20 }}>👤</Text>
          <Text style={[styles.tabLabel, { color: activeTab === 'customers' ? '#1e40af' : '#64748b' }]}>Ledger</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabBtn} onPress={() => { setActiveTab('supply'); setStep(1); }}>
          <Text style={{ fontSize: 20 }}>🥛</Text>
          <Text style={[styles.tabLabel, { color: activeTab === 'supply' ? '#1e40af' : '#64748b' }]}>Supply</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabBtn} onPress={() => { setActiveTab('money'); setCollCustomerId(''); }}>
          <Text style={{ fontSize: 20 }}>💸</Text>
          <Text style={[styles.tabLabel, { color: activeTab === 'money' ? '#1e40af' : '#64748b' }]}>Collect</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabBtn} onPress={() => { setActiveTab('settings'); }}>
          <Text style={{ fontSize: 20 }}>⚙️</Text>
          <Text style={[styles.tabLabel, { color: activeTab === 'settings' ? '#1e40af' : '#64748b' }]}>Settings</Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 60,
    backgroundColor: '#ffffff',
    borderBottomWidth: 3,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  refreshBtn: {
    padding: 6,
  },
  loadingContainer: {
    padding: 10,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
  },
  container: {
    padding: 16,
    paddingBottom: 90, // offset for bottom bar
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  cardVal: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 8,
  },
  grid: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridCard: {
    width: (width - 44) / 2,
    minHeight: 120,
  },
  buttonRow: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  quickBtn: {
    backgroundColor: '#1e40af',
    borderRadius: 12,
    padding: 14,
    flex: 1,
    alignItems: 'center',
  },
  quickBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  addBtn: {
    backgroundColor: '#1e40af',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  saveBtn: {
    backgroundColor: '#15803d',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 15,
  },
  callBtn: {
    backgroundColor: '#1e40af',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  btnText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
    borderTopWidth: 3,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tabBtn: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 8,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 2,
  },
  alertBox: {
    backgroundColor: '#fef2f2',
    borderColor: '#ef4444',
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  alertTitle: {
    color: '#b91c1c',
    fontSize: 16,
    fontWeight: 'bold',
  },
  alertItem: {
    color: '#b91c1c',
    fontSize: 14,
    marginTop: 4,
  },
  numpadGrid: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: 280,
    alignSelf: 'center',
    marginVertical: 10,
  },
  numpadBtn: {
    width: 80,
    height: 60,
    backgroundColor: '#e2e8f0',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 5,
  },
  qtyBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  }
});
