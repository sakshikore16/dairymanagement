import React, { useState, useEffect } from 'react';
import { api } from '../api';
import NumberPad from '../components/NumberPad';

export default function Transactions({ 
  transactionsList, 
  customersList, 
  productsList, 
  onRefresh, 
  triggerAddOpen, 
  setTriggerAddOpen 
}) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Cart/Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [txTime, setTxTime] = useState(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }));
  const [cart, setCart] = useState([]); // Array of { productId, name, price, qty }

  // Cascading product selectors
  const [selectedCatId, setSelectedCatId] = useState('');
  const [selectedBrandId, setSelectedBrandId] = useState('');
  const [selectedProdId, setSelectedProdId] = useState('');
  const [typedQty, setTypedQty] = useState('');

  // Master Lists loaded on open
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);

  useEffect(() => {
    if (triggerAddOpen) {
      handleOpenRecordSupply();
      setTriggerAddOpen(false);
    }
  }, [triggerAddOpen]);

  useEffect(() => {
    if (showAddModal) {
      loadSelectors();
    }
  }, [showAddModal]);

  const loadSelectors = async () => {
    try {
      const cats = await api.getCategories();
      const brs = await api.getBrands();
      setCategories(cats);
      setBrands(brs);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenRecordSupply = () => {
    setSelectedCustomerId('');
    setTxDate(new Date().toISOString().split('T')[0]);
    setTxTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }));
    setCart([]);
    setSelectedCatId('');
    setSelectedBrandId('');
    setSelectedProdId('');
    setTypedQty('');
    setShowAddModal(true);
  };

  // Selection cascading lookups
  const filteredBrands = brands.filter(b => b.category?._id === selectedCatId);
  const filteredProducts = productsList.filter(p => 
    p.category?._id === selectedCatId && 
    p.brand?._id === selectedBrandId && 
    p.status === 'Available'
  );

  const activeProduct = productsList.find(p => p._id === selectedProdId);

  const handleAddToCart = () => {
    if (!selectedProdId || !typedQty || Number(typedQty) <= 0) {
      alert("Please select a product and enter a valid quantity.");
      return;
    }

    // Check stock warning
    if (activeProduct.currentStock < Number(typedQty)) {
      if (!window.confirm(`Product stock is only ${activeProduct.currentStock}. Are you sure you want to sell ${typedQty} items? (Stock will go negative)`)) {
        return;
      }
    }

    const cartItem = {
      productId: activeProduct._id,
      brandName: activeProduct.brand?.name,
      categoryName: activeProduct.category?.name,
      name: activeProduct.name,
      price: activeProduct.sellingPrice,
      unit: activeProduct.unit,
      qty: Number(typedQty)
    };

    // Add to cart or increment quantity if already exists
    const existingIdx = cart.findIndex(item => item.productId === cartItem.productId);
    if (existingIdx > -1) {
      const updated = [...cart];
      updated[existingIdx].qty += cartItem.qty;
      setCart(updated);
    } else {
      setCart([...cart, cartItem]);
    }

    // Reset product selections for next item
    setSelectedProdId('');
    setTypedQty('');
  };

  const handleRemoveFromCart = (index) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  // Submit transaction to server
  const handleSaveTransaction = async (e) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      alert("Please select a customer.");
      return;
    }
    if (cart.length === 0) {
      alert("Please add at least one product to the supply list.");
      return;
    }

    const payload = {
      customerId: selectedCustomerId,
      date: txDate,
      time: txTime,
      products: cart.map(item => ({
        productId: item.productId,
        quantity: item.qty
      }))
    };

    try {
      await api.createTransaction(payload);
      setShowAddModal(false);
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  // Duplicate past transaction
  const handleDuplicate = async (txId) => {
    if (window.confirm("Duplicate this transaction? All items and quantities will be copied, stock will automatically deduct, and a new invoice generated for today.")) {
      try {
        await api.duplicateTransaction(txId);
        onRefresh();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  // Calculate cart total
  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  // Filter transaction list
  const filteredTransactions = transactionsList.filter(t => {
    const custName = t.customer?.name || '';
    const areaName = t.customer?.area || '';
    const invNo = t.invoiceNumber || '';
    const match = searchTerm.toLowerCase();
    return custName.toLowerCase().includes(match) || 
      areaName.toLowerCase().includes(match) || 
      invNo.toLowerCase().includes(match);
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h1>Daily Supply Registers</h1>
          <p style={{ color: 'var(--text-muted)' }}>Daily supply ledger, locked price history, duplicate logs & invoice sheets</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenRecordSupply} style={{ fontSize: '18px' }}>
          🥛 + Record Daily Supply
        </button>
      </div>

      {/* Search Header */}
      <div className="register-card">
        <input 
          type="text" 
          className="form-control" 
          placeholder="🔍 Search supplies by Customer Name, Area, or Invoice Number..." 
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Transactions History List */}
      <div className="register-card" style={{ marginTop: '20px' }}>
        <h2>📜 Supply Transactions Log</h2>
        <div className="ledger-book">
          <table className="ledger-table">
            <thead>
              <tr>
                <th>Date / Time</th>
                <th>Invoice No</th>
                <th>Customer</th>
                <th>Delivered Products</th>
                <th style={{ textAlign: 'right' }}>Total (INR)</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '25px' }}>No transactions recorded yet.</td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx._id}>
                    <td>
                      {new Date(tx.date).toLocaleDateString('en-IN')}
                      <br />
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{tx.time}</span>
                    </td>
                    <td><strong style={{ color: 'var(--primary)' }}>{tx.invoiceNumber}</strong></td>
                    <td>
                      <strong>{tx.customer?.name}</strong>
                      <br />
                      <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>📍 {tx.customer?.area}</span>
                    </td>
                    <td>
                      <ul style={{ paddingLeft: '15px', margin: 0, fontSize: '14px' }}>
                        {tx.products.map((p, idx) => (
                          <li key={idx}>
                            {p.brandName} {p.name}: {p.quantity} {p.unit} @ Rs.{p.unitPrice}
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="supply-amount" style={{ borderLeft: 'none', fontSize: '18px', fontWeight: '800' }}>
                      Rs. {tx.grandTotal.toFixed(2)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <a 
                          href={api.getInvoicePdfUrl(tx._id)} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="btn btn-outline" 
                          style={{ padding: '8px 12px', minHeight: '38px', fontSize: '14px', textDecoration: 'none' }}
                        >
                          📄 Invoice PDF
                        </a>
                        <button 
                          className="btn btn-outline" 
                          onClick={() => handleDuplicate(tx._id)}
                          style={{ padding: '8px 12px', minHeight: '38px', fontSize: '14px' }}
                        >
                          🔁 Duplicate
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECORD TRANSACTION MODAL */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '800px', width: '95%' }}>
            <h2>🥛 Record Daily Supply</h2>
            
            <form onSubmit={handleSaveTransaction} style={{ marginTop: '15px' }}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Delivery Date</label>
                  <input type="date" className="form-control" required value={txDate} onChange={e => setTxDate(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Delivery Time</label>
                  <input type="text" className="form-control" required value={txTime} onChange={e => setTxTime(e.target.value)} />
                </div>
              </div>

              {/* Customer Selector */}
              <div className="form-group">
                <label className="form-label">Select Customer Account *</label>
                <select 
                  className="form-control"
                  required
                  value={selectedCustomerId}
                  onChange={e => setSelectedCustomerId(e.target.value)}
                >
                  <option value="">-- Choose Customer --</option>
                  {customersList.filter(c => c.status === 'Active').map(c => (
                    <option key={c._id} value={c._id}>{c.name} ({c.area || 'No Area'})</option>
                  ))}
                </select>
              </div>

              {/* Product Cart Addition Layout */}
              <div style={{ backgroundColor: 'var(--bg-paper)', padding: '20px', borderRadius: '12px', border: '2px solid var(--border-color)', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '18px', color: 'var(--primary)', marginBottom: '15px', fontWeight: 'bold' }}>🛒 Add Delivery Item</h3>
                
                {/* Step 1: Category */}
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '15px' }}>1. Select Product Category</label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {categories.map(c => (
                      <button
                        key={c._id}
                        type="button"
                        className="btn"
                        onClick={() => {
                          setSelectedCatId(c._id);
                          setSelectedBrandId('');
                          setSelectedProdId('');
                        }}
                        style={{
                          backgroundColor: selectedCatId === c._id ? 'var(--primary)' : 'white',
                          color: selectedCatId === c._id ? 'white' : 'var(--text-main)',
                          border: '2px solid var(--border-color)',
                          padding: '8px 16px',
                          minHeight: '40px',
                          fontSize: '15px'
                        }}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Step 2: Brand */}
                {selectedCatId && (
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '15px' }}>2. Select Brand</label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {filteredBrands.map(b => (
                        <button
                          key={b._id}
                          type="button"
                          className="btn"
                          onClick={() => {
                            setSelectedBrandId(b._id);
                            setSelectedProdId('');
                          }}
                          style={{
                            backgroundColor: selectedBrandId === b._id ? 'var(--primary)' : 'white',
                            color: selectedBrandId === b._id ? 'white' : 'var(--text-main)',
                            border: '2px solid var(--border-color)',
                            padding: '8px 16px',
                            minHeight: '40px',
                            fontSize: '15px'
                          }}
                        >
                          {b.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 3: Variant */}
                {selectedBrandId && (
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '15px' }}>3. Select Product Variant</label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {filteredProducts.map(p => (
                        <button
                          key={p._id}
                          type="button"
                          className="btn"
                          onClick={() => setSelectedProdId(p._id)}
                          style={{
                            backgroundColor: selectedProdId === p._id ? 'var(--primary)' : 'white',
                            color: selectedProdId === p._id ? 'white' : 'var(--text-main)',
                            border: '2px solid var(--border-color)',
                            padding: '8px 16px',
                            minHeight: '40px',
                            fontSize: '15px'
                          }}
                        >
                          {p.name} (Rs. {p.sellingPrice})
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 4: Quantity & NumberPad */}
                {selectedProdId && (
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '15px', marginTop: '15px' }}>
                    <p style={{ fontSize: '16px', marginBottom: '10px' }}>
                      Selected: <strong>{activeProduct?.brand?.name} {activeProduct?.name}</strong> @ <strong>Rs.{activeProduct?.sellingPrice} / item</strong>
                    </p>
                    <div className="grid-2" style={{ alignItems: 'flex-start' }}>
                      <div>
                        <label className="form-label">4. Enter Quantity</label>
                        <NumberPad 
                          value={typedQty} 
                          onChange={setTypedQty} 
                          onConfirm={handleAddToCart}
                        />
                      </div>
                      <div style={{ padding: '20px', backgroundColor: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                        <h4 style={{ marginBottom: '10px' }}>Stock Alert Details:</h4>
                        <p style={{ fontSize: '16px', color: activeProduct?.currentStock <= activeProduct?.minimumStockAlert ? 'var(--danger)' : 'var(--success)' }}>
                          • Current Inventory: <strong>{activeProduct?.currentStock} units</strong>
                        </p>
                        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '5px' }}>
                          Entering quantity reduces stock automatically once the transaction is saved.
                        </p>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={handleAddToCart}
                          style={{ width: '100%', marginTop: '30px' }}
                        >
                          ➕ Add to Cart List
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Cart Summary */}
              {cart.length > 0 && (
                <div style={{ marginBottom: '25px' }}>
                  <h3 style={{ fontSize: '18px', marginBottom: '10px' }}>Cart Items List ({cart.length})</h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--bg-paper)', borderBottom: '2px solid var(--border-color)', color: 'var(--text-main)' }}>
                        <th style={{ padding: '10px', textAlign: 'left', fontSize: '14px' }}>Product</th>
                        <th style={{ padding: '10px', textAlign: 'right', fontSize: '14px' }}>Rate</th>
                        <th style={{ padding: '10px', textAlign: 'center', fontSize: '14px' }}>Qty</th>
                        <th style={{ padding: '10px', textAlign: 'right', fontSize: '14px' }}>Amount</th>
                        <th style={{ padding: '10px', textAlign: 'center', fontSize: '14px' }}>Remove</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cart.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-main)' }}>
                          <td style={{ padding: '10px', fontSize: '15px' }}><strong>{item.brandName}</strong> {item.name}</td>
                          <td style={{ padding: '10px', textAlign: 'right', fontSize: '15px' }}>Rs. {item.price}</td>
                          <td style={{ padding: '10px', textAlign: 'center', fontSize: '15px' }}><strong>{item.qty}</strong></td>
                          <td style={{ padding: '10px', textAlign: 'right', fontSize: '15px', fontWeight: 'bold' }}>Rs. {(item.price * item.qty).toFixed(2)}</td>
                          <td style={{ padding: '10px', textAlign: 'center' }}>
                            <button type="button" onClick={() => handleRemoveFromCart(idx)} style={{ border: 'none', background: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '18px' }}>×</button>
                          </td>
                        </tr>
                      ))}
                      <tr style={{ backgroundColor: 'var(--bg-paper)', fontWeight: 'bold', color: 'var(--text-main)' }}>
                        <td colSpan="3" style={{ padding: '12px', textAlign: 'right' }}>Grand Total:</td>
                        <td style={{ padding: '12px', textAlign: 'right', fontSize: '18px', color: 'var(--danger)' }}>Rs. {cartTotal.toFixed(2)}</td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* Form Controls */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '25px', justifyContent: 'flex-end', borderTop: '2px solid var(--border-color)', paddingTop: '20px' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-success" disabled={cart.length === 0}>
                  ✓ Save & Deliver Daily Supply
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
